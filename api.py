from flask import Flask, request, jsonify, send_file
from databricks import sql
import os, uuid, datetime, smtplib, textwrap
from email.mime.text import MIMEText

app = Flask(__name__)

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    print(f"[unhandled] {traceback.format_exc()}")
    return jsonify({"error": str(e)}), 500

# ── Frontend routes ───────────────────────────────────────────────────────────

_NO_CACHE = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
}

def _nocache(resp):
    for k, v in _NO_CACHE.items():
        resp.headers[k] = v
    return resp

@app.route("/")
def index():
    return _nocache(send_file(os.path.join(os.path.dirname(__file__), "index.html")))

@app.route("/dashboard.jsx")
def dashboard():
    return _nocache(send_file(
        os.path.join(os.path.dirname(__file__), "dashboard.jsx"),
        mimetype="text/plain"
    ))

# ── Database connection ───────────────────────────────────────────────────────

DATABRICKS_HOST = os.environ.get("DATABRICKS_HOST", "adb-527625614048962.2.azuredatabricks.net")
HTTP_PATH       = os.environ.get("DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/0cd0e380d94af214")

# L-1: warn loudly at startup if env vars are missing so hardcoded fallbacks are never silent
if not os.environ.get("DATABRICKS_HOST"):
    print("[WARNING] DATABRICKS_HOST env var not set — using hardcoded fallback value")
if not os.environ.get("DATABRICKS_HTTP_PATH"):
    print("[WARNING] DATABRICKS_HTTP_PATH env var not set — using hardcoded fallback value")

CATALOG       = "usp_data"
SCHEMA        = f"{CATALOG}.usp_strategy"
INVEST_SCHEMA = f"{CATALOG}.invest"

# ── Activity log toggle ───────────────────────────────────────────────────────
# Set to False to suspend activity logging during bulk edit sessions.
# Flip back to True when done.
LOGGING_ENABLED = True

# ── Email notifications ───────────────────────────────────────────────────────
# Set SMTP_USER + SMTP_PASSWORD as Databricks App environment variables.
# Defaults to Office 365; change SMTP_HOST/PORT if your org uses a different relay.
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.office365.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")      # sender address, e.g. insights-hub@gatesfoundation.org
SMTP_PASS = os.environ.get("SMTP_PASSWORD", "")  # app password for the sender account

def _send_notification_email(to_email, subject, body_text):
    """Send a plain-text email via SMTP.  Silently logs and continues on any error
    so a mis-configured mail server never breaks the approval API."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[email] SMTP not configured — skipping notification to {to_email}")
        return
    try:
        msg = MIMEText(body_text, "plain")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = to_email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo()
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, [to_email], msg.as_string())
        print(f"[email] Sent '{subject}' → {to_email}")
    except Exception as e:
        print(f"[email] Failed to send to {to_email}: {e}")

def get_connection():
    token = request.headers.get("X-Forwarded-Access-Token")
    if not token:
        raise Exception("X-Forwarded-Access-Token header is missing")
    return sql.connect(
        server_hostname = DATABRICKS_HOST,
        http_path       = HTTP_PATH,
        access_token    = token,
    )

def query(sql_str, params=None):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql_str, params or [])
            cols = [d[0] for d in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]

def _qc(cursor, sql_str, params=None):
    """Run a query on an existing cursor — avoids reopening a connection per call."""
    cursor.execute(sql_str, params or [])
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

def execute(sql_str, params=None):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql_str, params or [])

def new_id():
    return str(uuid.uuid4())

# ── Health check ──────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    """Lightweight process-alive check — does not hit the database."""
    return jsonify({"status": "ok", "db": "ok"})

@app.route("/api/debug")
def debug():
    """Surfaces DB connection details and any errors — use to diagnose connectivity issues."""
    # L-2: require authenticated caller (header injected by Databricks App proxy)
    if not request.headers.get("X-Forwarded-Email"):
        return jsonify({"error": "Authentication required"}), 403
    token = request.headers.get("X-Forwarded-Access-Token")
    result = {
        "token_present": bool(token),
        "token_prefix": token[:20] if token else None,
        "host": DATABRICKS_HOST,
        "http_path": HTTP_PATH,
        "host_source": "env" if os.environ.get("DATABRICKS_HOST") else "hardcoded default",
        "http_path_source": "env" if os.environ.get("DATABRICKS_HTTP_PATH") else "hardcoded default",
        "schema": SCHEMA,
    }
    try:
        counts = query(f"""
            SELECT
              (SELECT COUNT(*) FROM {SCHEMA}.strategy_goals)            AS goals,
              (SELECT COUNT(DISTINCT goal_id) FROM {SCHEMA}.strategy_goals) AS goals_distinct,
              (SELECT COUNT(*) FROM {SCHEMA}.bows)                      AS bows,
              (SELECT COUNT(*) FROM {SCHEMA}.bow_outcomes)              AS bow_outcomes,
              (SELECT COUNT(*) FROM {SCHEMA}.execution_targets)         AS execution_targets,
              (SELECT COUNT(*) FROM {SCHEMA}.execution_target_status)   AS target_statuses,
              (SELECT COUNT(*) FROM {SCHEMA}.bow_indicators)            AS bow_indicators,
              (SELECT COUNT(*) FROM {SCHEMA}.bow_indicator_actuals)     AS indicator_actuals,
              (SELECT COUNT(*) FROM {SCHEMA}.portfolio_outcomes)        AS portfolio_outcomes,
              (SELECT COUNT(*) FROM {SCHEMA}.portfolio_indicators)      AS portfolio_indicators
        """)
        result["db_status"] = "ok"
        result["table_counts"] = counts[0] if counts else {}

        # Sample IDs from each key table — helps diagnose ID mismatches
        bow_ids      = query(f"SELECT bow_id, title FROM {SCHEMA}.bows ORDER BY sort_order")
        ind_bow_ids  = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.bow_indicators ORDER BY bow_id")
        out_bow_ids  = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.bow_outcomes ORDER BY bow_id")
        tgt_bow_ids  = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.execution_targets ORDER BY bow_id")
        sample_ind   = query(f"SELECT indicator_id, bow_id, outcome_id, `text` FROM {SCHEMA}.bow_indicators LIMIT 3")
        result["bows_table_ids"]       = [r["bow_id"] for r in bow_ids]
        result["bow_indicators_bow_ids"] = [r["bow_id"] for r in ind_bow_ids]
        result["bow_outcomes_bow_ids"]   = [r["bow_id"] for r in out_bow_ids]
        result["execution_targets_bow_ids"] = [r["bow_id"] for r in tgt_bow_ids]
        result["sample_indicators"]    = sample_ind
    except Exception as e:
        result["db_status"] = "error"
        result["error"] = str(e)
        result["error_type"] = type(e).__name__

    # Check invest tables individually so we can pinpoint which one is failing
    invest_tables = [
        "invest_investments",
        "invest_bow_allocation",
        "invest_bow_details",
        "investment_overlays",
    ]
    invest_status = {}
    for tbl in invest_tables:
        try:
            rows = query(f"SELECT COUNT(*) AS n FROM {SCHEMA}.{tbl}")
            invest_status[tbl] = rows[0]["n"] if rows else 0
        except Exception as e:
            invest_status[tbl] = f"ERROR: {str(e)[:200]}"
    result["invest_table_status"] = invest_status

    # Probe candidate view names in usp_data.invest directly
    candidate_views = [
        "v_investments", "v_bow_allocation", "v_bow_details",
        "investments", "bow_allocation", "bow_details",
        "v_invest_investments", "v_invest_bow_allocation",
    ]
    invest_source_status = {}
    for v in candidate_views:
        try:
            rows = query(f"SELECT COUNT(*) AS n FROM {INVEST_SCHEMA}.{v}")
            invest_source_status[v] = rows[0]["n"] if rows else 0
        except Exception as e:
            msg = str(e)[:120]
            invest_source_status[v] = "NOT FOUND" if "TABLE_OR_VIEW_NOT_FOUND" in msg or "does not exist" in msg.lower() else f"ERROR: {msg}"
    result["invest_source_candidates"] = invest_source_status

    return jsonify(result)


# ═════════════════════════════════════════════════════════════════════════════
# TIER 1 — Strategy structure (read-only)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/debug-ids")
def debug_ids():
    """Exposes the actual bow_id values in each table — use to diagnose ID mismatches."""
    if not request.headers.get("X-Forwarded-Email"):
        return jsonify({"error": "Authentication required"}), 403
    try:
        bows    = query(f"SELECT bow_id FROM {SCHEMA}.bows ORDER BY sort_order")
        ind_ids = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.bow_indicators")
        out_ids = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.bow_outcomes")
        tgt_ids = query(f"SELECT DISTINCT bow_id FROM {SCHEMA}.execution_targets")
        sample  = query(f"SELECT indicator_id, bow_id, outcome_id FROM {SCHEMA}.bow_indicators LIMIT 5")
        return jsonify({
            "bows":               [r["bow_id"] for r in bows],
            "bow_indicators":     [r["bow_id"] for r in ind_ids],
            "bow_outcomes":       [r["bow_id"] for r in out_ids],
            "execution_targets":  [r["bow_id"] for r in tgt_ids],
            "sample_indicator_rows": sample,
        })
    except Exception as e:
        return jsonify({"error": str(e), "type": type(e).__name__}), 500

@app.route("/api/goals")
def get_goals():
    rows = query(f"SELECT * FROM {SCHEMA}.strategy_goals ORDER BY sort_order")
    return jsonify(rows)

@app.route("/api/portfolios")
def get_portfolios():
    rows = query(f"SELECT * FROM {SCHEMA}.portfolios ORDER BY sort_order")
    return jsonify(rows)

@app.route("/api/portfolios/<portfolio_id>", methods=["PATCH"])
def update_portfolio(portfolio_id):
    data = request.json or {}
    user = _actor(data)
    allowed = {"description", "name", "title"}
    sets, vals = [], []
    for f in allowed:
        if f in data:
            sets.append(f"`{f}` = ?")
            vals.append(data[f])
    if not sets:
        return jsonify({"status": "no_change"})
    vals.append(portfolio_id)
    execute(f"UPDATE {SCHEMA}.portfolios SET {', '.join(sets)} WHERE portfolio_id = ?", vals)
    if "description" in data:
        _log_edit("portfolio_description", portfolio_id, None, portfolio_id,
                  {"description": {"new": data["description"]}}, None, None, user)
    return jsonify({"status": "ok"})

@app.route("/api/portfolios/<portfolio_id>/goals")
def get_portfolio_goals(portfolio_id):
    rows = query(
        f"SELECT goal_id FROM {SCHEMA}.portfolio_goal_links WHERE portfolio_id = ?",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/bows")
def get_all_bows():
    rows = query(f"SELECT * FROM {SCHEMA}.bows ORDER BY sort_order")
    return jsonify(rows)

@app.route("/api/completeness")
def get_completeness():
    """Aggregate indicator completeness stats per BOW and portfolio.
    Returns: { bow: {bow_id: {total, with_targets, with_actuals}},
               portfolio: {portfolio_id: {total, with_targets, with_actuals}} }
    """
    bow_stats = {}
    port_stats = {}

    try:
        bow_rows = query(f"""
            SELECT
                i.bow_id,
                COUNT(*)                                                   AS total,
                COUNT(CASE WHEN (
                    i.target_2026 IS NOT NULL OR i.target_2027 IS NOT NULL OR
                    i.target_2028 IS NOT NULL OR i.target_2029 IS NOT NULL OR
                    i.target_2030 IS NOT NULL
                ) THEN 1 END)                                              AS with_targets,
                COUNT(DISTINCT a.indicator_id)                             AS with_actuals
            FROM {SCHEMA}.bow_indicators i
            LEFT JOIN {SCHEMA}.bow_indicator_actuals a ON a.indicator_id = i.indicator_id
            WHERE COALESCE(i.is_active, true) = true
            GROUP BY i.bow_id
        """)
        bow_stats = {r["bow_id"]: r for r in bow_rows}
    except Exception as e:
        print(f"[completeness] bow query failed: {e}")

    try:
        port_rows = query(f"""
            SELECT
                i.portfolio_id,
                COUNT(*)                                                   AS total,
                COUNT(CASE WHEN (
                    i.target_2026 IS NOT NULL OR i.target_2027 IS NOT NULL OR
                    i.target_2028 IS NOT NULL OR i.target_2029 IS NOT NULL OR
                    i.target_2030 IS NOT NULL
                ) THEN 1 END)                                              AS with_targets,
                COUNT(DISTINCT a.indicator_id)                             AS with_actuals
            FROM {SCHEMA}.portfolio_indicators i
            LEFT JOIN {SCHEMA}.portfolio_indicator_actuals a ON a.indicator_id = i.indicator_id
            GROUP BY i.portfolio_id
        """)
        port_stats = {r["portfolio_id"]: r for r in port_rows}
    except Exception as e:
        print(f"[completeness] portfolio query failed: {e}")

    return jsonify({"bow": bow_stats, "portfolio": port_stats})


@app.route("/api/bows/<portfolio_id>")
def get_bows_by_portfolio(portfolio_id):
    rows = query(
        f"SELECT * FROM {SCHEMA}.bows WHERE portfolio_id = ? ORDER BY sort_order",
        [portfolio_id]
    )
    return jsonify(rows)


@app.route("/api/bows/<bow_id>", methods=["PATCH"])
def update_bow(bow_id):
    """Update bow title and/or portfolio_id."""
    data = request.json or {}
    user = _actor(data)
    rows = query(f"SELECT * FROM {SCHEMA}.bows WHERE bow_id = ?", [bow_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    row   = rows[0]
    sets  = []
    vals  = []
    changes = {}
    if "title" in data:
        new_val = (data["title"] or "").strip()
        if new_val != (row.get("title") or ""):
            sets.append("title = ?"); vals.append(new_val)
            changes["title"] = {"old": row.get("title"), "new": new_val}
    if "portfolio_id" in data:
        new_val = (data["portfolio_id"] or "").strip()
        if new_val != (row.get("portfolio_id") or ""):
            sets.append("portfolio_id = ?"); vals.append(new_val)
            changes["portfolio_id"] = {"old": row.get("portfolio_id"), "new": new_val}
    if not sets:
        return jsonify({"status": "no_change"})
    vals.append(bow_id)
    execute(f"UPDATE {SCHEMA}.bows SET {', '.join(sets)} WHERE bow_id = ?", vals)
    _log_edit("bow", bow_id, bow_id, None, changes, "BOW updated", None, user)
    return jsonify({"status": "ok", "changes": changes})

@app.route("/api/bows/<bow_id>/description", methods=["PATCH"])
def update_bow_description(bow_id):
    data        = request.json or {}
    description = (data.get("description") or "").strip()
    user        = _actor(data)
    rows        = query(f"SELECT * FROM {SCHEMA}.bows WHERE bow_id = ?", [bow_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old_desc = rows[0].get("description") or ""
    if description == old_desc:
        return jsonify({"status": "no_change"})
    execute(f"UPDATE {SCHEMA}.bows SET description = ? WHERE bow_id = ?",
            [description, bow_id])
    _log_edit("bow", bow_id, bow_id, None,
              {"description": {"old": old_desc, "new": description}},
              "BOW description updated", None, user)
    return jsonify({"status": "ok"})

@app.route("/api/portfolio-outcomes/<portfolio_id>")
def get_portfolio_outcomes(portfolio_id):
    rows = query(
        f"""SELECT po.*
            FROM {SCHEMA}.portfolio_outcomes po
            WHERE po.portfolio_id = ?
            ORDER BY po.sort_order""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/portfolio-indicators/<portfolio_id>")
def get_portfolio_indicators(portfolio_id):
    try:
        rows = query(
            f"""SELECT
                    i.indicator_id, i.portfolio_id, i.outcome_id, i.bow_indicator_id,
                    i.baseline,
                    i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                    COALESCE(b.name,  i.name)  AS name,
                    COALESCE(b.text,  i.text)  AS text,
                    COALESCE(b.unit,  i.unit)  AS unit,
                    COALESCE(b.collection_frequency, i.collection_frequency) AS collection_frequency,
                    COALESCE(b.source_id, i.source_id) AS source_id,
                    COALESCE(b.measurement_level, i.measurement_level) AS measurement_level,
                    COALESCE(b.status, i.status) AS status
                FROM {SCHEMA}.portfolio_indicators i
                LEFT JOIN {SCHEMA}.bow_indicators b ON i.bow_indicator_id = b.indicator_id
                WHERE i.portfolio_id = ?
                ORDER BY i.outcome_id, i.indicator_id""",
            [portfolio_id]
        )
    except Exception:
        rows = query(
            f"SELECT * FROM {SCHEMA}.portfolio_indicators WHERE portfolio_id = ? ORDER BY outcome_id, indicator_id",
            [portfolio_id]
        )
    return jsonify(rows)

@app.route("/api/bow-outcomes/<bow_id>")
def get_bow_outcomes(bow_id):
    rows = query(
        f"""SELECT * FROM {SCHEMA}.bow_outcomes
            WHERE bow_id = ?
            ORDER BY sort_order""",
        [bow_id]
    )
    return jsonify(rows)

@app.route("/api/bow-portfolio-links/<bow_id>")
def get_bow_portfolio_links(bow_id):
    """Returns portfolio outcomes linked to this BOW's outcomes, with contribution type."""
    rows = query(
        f"""SELECT
              l.bow_outcome_id,
              l.portfolio_outcome_id,
              l.contribution_type,
              bo.title         AS bow_outcome_title,
              COALESCE(NULLIF(po.title, ''), po.short_title) AS portfolio_outcome_title
            FROM {SCHEMA}.bow_portfolio_outcome_links l
            JOIN {SCHEMA}.bow_outcomes bo
              ON bo.outcome_id = l.bow_outcome_id
            LEFT JOIN {SCHEMA}.portfolio_outcomes po
              ON po.outcome_id = l.portfolio_outcome_id
            WHERE bo.bow_id = ?
            ORDER BY l.contribution_type, l.sort_order""",
        [bow_id]
    )
    return jsonify(rows)


@app.route("/api/debug/bow-links/<bow_id>")
def debug_bow_links(bow_id):
    """Diagnostic: shows raw bow_outcomes and bow_portfolio_outcome_links for a BOW."""
    if not request.headers.get("X-Forwarded-Email"):
        return jsonify({"error": "Authentication required"}), 403
    bow_outcomes = query(
        f"SELECT outcome_id, title FROM {SCHEMA}.bow_outcomes WHERE bow_id = ? ORDER BY sort_order",
        [bow_id]
    )
    outcome_ids = [r["outcome_id"] for r in bow_outcomes]
    links = []
    if outcome_ids:
        placeholders = ",".join(["?" for _ in outcome_ids])
        links = query(
            f"SELECT * FROM {SCHEMA}.bow_portfolio_outcome_links WHERE bow_outcome_id IN ({placeholders})",
            outcome_ids
        )
    return jsonify({"bow_outcomes": bow_outcomes, "links": links, "bow_id": bow_id})


@app.route("/api/debug/portfolio-outcomes/<portfolio_id>")
def debug_portfolio_outcomes(portfolio_id):
    """Diagnostic: shows outcome_id values stored in portfolio_outcomes for this portfolio."""
    if not request.headers.get("X-Forwarded-Email"):
        return jsonify({"error": "Authentication required"}), 403
    rows = query(
        f"SELECT outcome_id, short_title, sort_order FROM {SCHEMA}.portfolio_outcomes WHERE portfolio_id = ? ORDER BY sort_order",
        [portfolio_id]
    )
    return jsonify({"portfolio_id": portfolio_id, "outcomes": rows})


@app.route("/api/admin/seed-sfl-links", methods=["POST"])
def seed_sfl_links():
    """Seed/re-seed bow_portfolio_outcome_links for all SFL BOW outcomes.
    Uses the actual portfolio_outcome_id values from the portfolio_outcomes table.
    Restricted to Leadership and MLE permission levels."""
    # L-8: require authenticated Leadership/MLE user
    email = request.headers.get("X-Forwarded-Email", "").strip() or "unknown"
    if email == "unknown":
        return jsonify({"error": "Authentication required"}), 403
    member = query(
        f"SELECT permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    if not member or member[0]["permission_level"] not in ("Leadership", "MLE"):
        return jsonify({"error": "Insufficient permissions"}), 403

    # Full mapping: (bow_outcome_id, portfolio_outcome_id, sort_order)
    # portfolio_outcome_ids match portfolio_outcomes.outcome_id in the DB
    links = [
        # EDU-Net (sfl-bow1)
        ("sfl-bow1-o1", "sfl-data-util",    1),
        ("sfl-bow1-o1", "sfl-governance",   2),
        ("sfl-bow1-o1", "sfl-ecosystem",    3),
        ("sfl-bow1-o2", "sfl-data-avail",   1),
        ("sfl-bow1-o2", "sfl-data-util",    2),
        ("sfl-bow1-o3", "sfl-sensemaking",  1),
        ("sfl-bow1-o3", "sfl-inplace",      2),
        # DAIP / Data in Place (sfl-bow2)
        ("sfl-bow2-o1", "sfl-data-avail",   1),
        ("sfl-bow2-o1", "sfl-data-util",    2),
        ("sfl-bow2-o1", "sfl-sensemaking",  3),
        ("sfl-bow2-o1", "sfl-ecosystem",    4),
        ("sfl-bow2-o2", "sfl-governance",   1),
        ("sfl-bow2-o2", "sfl-inplace",      2),
        ("sfl-bow2-o3", "sfl-inplace",      1),
        ("sfl-bow2-o3", "sfl-ecosystem",    2),
        ("sfl-bow2-o4", "sfl-data-avail",   1),
        ("sfl-bow2-o4", "sfl-data-util",    2),
        ("sfl-bow2-o4", "sfl-inplace",      3),
        # CSGA (sfl-bow3)
        ("sfl-bow3-o1", "sfl-data-util",    1),
        ("sfl-bow3-o1", "sfl-governance",   2),
        ("sfl-bow3-o1", "sfl-ecosystem",    3),
        ("sfl-bow3-o2", "sfl-data-util",    1),
        ("sfl-bow3-o3", "sfl-data-avail",   1),
        ("sfl-bow3-o3", "sfl-sensemaking",  2),
        ("sfl-bow3-o3", "sfl-inplace",      3),
    ]

    try:
        # Replace all SFL bow_portfolio_outcome_links
        sfl_bow_outcome_ids = [
            "sfl-bow1-o1","sfl-bow1-o2","sfl-bow1-o3",
            "sfl-bow2-o1","sfl-bow2-o2","sfl-bow2-o3","sfl-bow2-o4",
            "sfl-bow3-o1","sfl-bow3-o2","sfl-bow3-o3",
        ]
        placeholders = ",".join(["?" for _ in sfl_bow_outcome_ids])
        execute(
            f"DELETE FROM {SCHEMA}.bow_portfolio_outcome_links WHERE bow_outcome_id IN ({placeholders})",
            sfl_bow_outcome_ids
        )

        for (bow_oid, po_id, sort) in links:
            execute(
                f"""INSERT INTO {SCHEMA}.bow_portfolio_outcome_links
                    (bow_outcome_id, portfolio_outcome_id, contribution_type, sort_order)
                    VALUES (?, ?, 'direct', ?)""",
                [bow_oid, po_id, sort]
            )

        return jsonify({"status": "ok", "links_inserted": len(links)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


# ═════════════════════════════════════════════════════════════════════════════
# EXECUTION TARGETS & STATUS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/targets/<bow_id>")
def get_targets(bow_id):
    """Returns execution targets joined with their current status."""
    rows = query(
        f"""SELECT
              t.target_id,
              t.bow_id,
              t.outcome_id,
              t.year,
              t.text,
              t.sort_order,
              s.completion,
              s.notes,
              s.last_updated,
              s.updated_by
            FROM {SCHEMA}.execution_targets t
            LEFT JOIN {SCHEMA}.execution_target_status s
              ON t.target_id = s.target_id
             AND t.year      = s.year
            WHERE t.bow_id = ?
            ORDER BY t.year, t.sort_order""",
        [bow_id]
    )
    return jsonify(rows)

@app.route("/api/targets/<target_id>/status", methods=["POST"])
def update_target_status(target_id):
    """Upsert execution target status. Write to execution_target_status only — target text is read-only."""
    data       = request.json or {}
    year       = data.get("year")
    completion = data.get("completion")
    notes      = data.get("notes")
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if email:
        member = query(
            f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [email]
        )
        updated_by = (member[0]["display_name"] if member and member[0].get("display_name") else email)
    else:
        updated_by = data.get("updated_by") or "unknown"
    # M-1: verify parent execution_targets row exists before writing status
    parent = query(
        f"SELECT 1 FROM {SCHEMA}.execution_targets WHERE target_id = ? AND `year` = ?",
        [target_id, year]
    )
    if not parent:
        return jsonify({"error": "execution target not found"}), 404
    # M-6: use MERGE INTO to eliminate SELECT-then-INSERT/UPDATE race condition
    execute(
        f"""MERGE INTO {SCHEMA}.execution_target_status AS tgt
            USING (SELECT ? AS target_id, ? AS yr, ? AS completion,
                          ? AS notes, ? AS updated_by) AS src
            ON tgt.target_id = src.target_id AND tgt.`year` = src.yr
            WHEN MATCHED THEN UPDATE SET
                tgt.completion   = src.completion,
                tgt.notes        = src.notes,
                tgt.last_updated = current_timestamp(),
                tgt.updated_by   = src.updated_by
            WHEN NOT MATCHED THEN INSERT
                (target_id, `year`, completion, notes, last_updated, updated_by)
                VALUES (src.target_id, src.yr, src.completion, src.notes,
                        current_timestamp(), src.updated_by)""",
        [target_id, year, completion, notes, updated_by]
    )
    return jsonify({"status": "ok", "target_id": target_id})


# ═════════════════════════════════════════════════════════════════════════════
# INDICATORS & ACTUALS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/indicators/<bow_id>")
def get_indicators(bow_id):
    """Returns BOW indicators with most recent actual per (year, period).
    Multiple rows per indicator when the collection frequency produces several
    periods in the same year (quarterly / bimonthly).  The dashboard accumulates
    rows by year key, so the last period row for a year becomes the displayed value.
    Falls back gracefully if optional columns (unit, collection_frequency,
    last_updated) haven't been added via migration yet."""
    # Dedup: one row per (indicator, year, period) — keeps the latest loaded_at.
    # COALESCE(period,'') normalises NULLs so annual indicators still deduplicate.
    actuals_join = f"""
        LEFT JOIN (
          SELECT a1.indicator_id, a1.year, a1.period, a1.actual_value,
                 a1.reading_date, a1.source_notes
          FROM {SCHEMA}.bow_indicator_actuals a1
          INNER JOIN (
            SELECT indicator_id, year, COALESCE(period, '') AS period_key,
                   MAX(loaded_at) AS max_loaded
            FROM {SCHEMA}.bow_indicator_actuals
            GROUP BY indicator_id, year, COALESCE(period, '')
          ) a2 ON a1.indicator_id                  = a2.indicator_id
               AND a1.year                          = a2.year
               AND COALESCE(a1.period, '')           = a2.period_key
               AND a1.loaded_at                     = a2.max_loaded
        ) a ON i.indicator_id = a.indicator_id
    """
    try:
        rows = query(
            f"""SELECT
                  i.indicator_id, i.bow_id, i.outcome_id, i.text, i.data_source,
                  i.baseline, i.collection_frequency, i.unit,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  i.source_id,
                  s.source_name, s.source_url,
                  a.year, a.period, a.actual_value, a.reading_date, a.source_notes
                FROM {SCHEMA}.bow_indicators i
                {actuals_join}
                LEFT JOIN {SCHEMA}.sources s ON i.source_id = s.source_id
                WHERE i.bow_id = ?
                  AND COALESCE(i.is_active, true) = true
                ORDER BY i.outcome_id, i.indicator_id, a.year, a.period""",
            [bow_id]
        )
    except Exception:
        # Fallback: omit optional columns if migration hasn't run yet
        rows = query(
            f"""SELECT
                  i.indicator_id, i.bow_id, i.outcome_id, i.text, i.data_source,
                  i.baseline, i.collection_frequency, NULL AS unit,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  NULL AS source_id, NULL AS source_name, NULL AS source_url,
                  a.year, a.period, a.actual_value, a.reading_date, a.source_notes
                FROM {SCHEMA}.bow_indicators i
                {actuals_join}
                WHERE i.bow_id = ?
                ORDER BY i.outcome_id, i.indicator_id, a.year, a.period""",
            [bow_id]
        )
    return jsonify(rows)

@app.route("/api/portfolio-actuals/<portfolio_id>")
def get_portfolio_actuals(portfolio_id):
    """Returns portfolio-level indicator actuals."""
    rows = query(
        f"""SELECT
              i.indicator_id,
              i.outcome_id,
              i.text,
              i.data_source,
              i.baseline,
              i.target_2026,
              i.target_2027,
              i.target_2028,
              i.target_2029,
              i.target_2030,
              i.source_id,
              s.source_name,
              s.source_url,
              a.year,
              a.actual_value,
              a.reading_date
            FROM {SCHEMA}.portfolio_indicators i
            LEFT JOIN {SCHEMA}.sources s ON i.source_id = s.source_id
            LEFT JOIN (
              SELECT a1.*
              FROM {SCHEMA}.portfolio_indicator_actuals a1
              WHERE a1.loaded_at = (
                SELECT MAX(a2.loaded_at)
                FROM {SCHEMA}.portfolio_indicator_actuals a2
                WHERE a2.indicator_id = a1.indicator_id
                  AND a2.year         = a1.year
              )
            ) a ON i.indicator_id = a.indicator_id
            WHERE i.portfolio_id = ?
            ORDER BY i.outcome_id, i.indicator_id, a.year""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/goal-actuals")
def get_goal_actuals():
    """Returns goal-level actuals for all goals."""
    rows = query(
        f"""SELECT
              g.goal_id,
              g.metric,
              g.unit,
              g.goal_2030,
              g.current_2026,
              a.year,
              a.actual_value,
              a.reading_date
            FROM {SCHEMA}.strategy_goals g
            LEFT JOIN (
              SELECT a1.*
              FROM {SCHEMA}.strategy_goal_actuals a1
              WHERE a1.loaded_at = (
                SELECT MAX(a2.loaded_at)
                FROM {SCHEMA}.strategy_goal_actuals a2
                WHERE a2.goal_id = a1.goal_id
                  AND a2.year    = a1.year
              )
            ) a ON g.goal_id = a.goal_id
            ORDER BY g.sort_order, a.year"""
    )
    return jsonify(rows)

@app.route("/api/actuals/bow/add", methods=["POST"])
def add_bow_actual():
    data = request.json or {}
    # M-5: verify indicator exists
    ind_id = data.get("indicator_id")
    ind_exists = query(
        f"SELECT 1 FROM {SCHEMA}.bow_indicators WHERE indicator_id = ? AND COALESCE(is_active, true) = true",
        [ind_id]
    ) if ind_id else []
    if not ind_exists:
        return jsonify({"error": "indicator_id not found"}), 404
    # L-3: cast year to int
    try:
        year_val = int(data["year"])
    except (TypeError, ValueError):
        return jsonify({"error": "year must be a valid integer"}), 400
    execute(
        f"""INSERT INTO {SCHEMA}.bow_indicator_actuals
            (actual_id, indicator_id, bow_id, outcome_id, `year`,
             actual_value, reading_date, source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), ind_id, data["bow_id"],
         data["outcome_id"], year_val, data["actual_value"],
         data.get("reading_date"), data.get("source_notes"),
         data.get("loaded_by", "dashboard")]
    )
    return jsonify({"status": "ok"})

@app.route("/api/actuals/portfolio/add", methods=["POST"])
def add_portfolio_actual():
    data = request.json or {}
    # L-3: cast year to int
    try:
        year_val = int(data["year"])
    except (TypeError, ValueError):
        return jsonify({"error": "year must be a valid integer"}), 400
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_indicator_actuals
            (actual_id, indicator_id, portfolio_id, outcome_id, `year`,
             actual_value, reading_date, source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), data["indicator_id"], data["portfolio_id"],
         data["outcome_id"], year_val, data["actual_value"],
         data.get("reading_date"), data.get("source_notes"),
         data.get("loaded_by", "dashboard")]
    )
    return jsonify({"status": "ok"})

@app.route("/api/actuals/goal/add", methods=["POST"])
def add_goal_actual():
    data = request.json or {}
    # L-3: cast year to int
    try:
        year_val = int(data["year"])
    except (TypeError, ValueError):
        return jsonify({"error": "year must be a valid integer"}), 400
    execute(
        f"""INSERT INTO {SCHEMA}.strategy_goal_actuals
            (actual_id, goal_id, `year`, actual_value, reading_date,
             source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), data["goal_id"], year_val,
         data["actual_value"], data.get("reading_date"),
         data.get("source_notes"), data.get("loaded_by", "dashboard")]
    )
    return jsonify({"status": "ok"})


# ═════════════════════════════════════════════════════════════════════════════
# RATINGS — Claude-assessed (read) + restricted override (write)
# Current year: read from bow_ratings / portfolio_outcome_ratings / goal_ratings
# Historical confirmed: read from invest_bow_details (INVEST source of truth)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/ratings/bow/<bow_id>")
def get_bow_ratings(bow_id):
    """Returns current Claude estimate for current year + confirmed historical from INVEST."""
    current = query(
        f"""SELECT
              br.*,
              TRUE AS is_estimate,
              'Current year estimate — to be confirmed at annual reporting' AS rating_status
            FROM {SCHEMA}.current_bow_ratings br
            WHERE br.bow_id = ?""",
        [bow_id]
    )
    historical = query(
        f"""SELECT
              b.bow_id,
              d.Impact_Performance_Rating       AS impact_rating,
              d.Impact_Performance_Rating_Rationale  AS impact_rationale,
              d.Execution_Performance_Rating    AS execution_rating,
              d.Execution_Performance_Rating_Rationale AS execution_rationale,
              FALSE AS is_estimate,
              'Confirmed — INVEST' AS rating_status
            FROM {SCHEMA}.bows b
            JOIN {SCHEMA}.invest_bow_details d
              ON b.invest_bow_id = d.BoW_ID
            WHERE b.bow_id = ?""",
        [bow_id]
    )
    return jsonify({"current": current, "historical": historical})

@app.route("/api/ratings/portfolio/<portfolio_id>")
def get_portfolio_ratings(portfolio_id):
    """Returns most recent Claude estimate per portfolio outcome."""
    rows = query(
        f"""SELECT r.*
            FROM {SCHEMA}.portfolio_outcome_ratings r
            JOIN {SCHEMA}.portfolio_outcomes po
              ON r.outcome_id = po.outcome_id
            WHERE po.portfolio_id = ?
              AND r.assessed_at = (
                SELECT MAX(r2.assessed_at)
                FROM {SCHEMA}.portfolio_outcome_ratings r2
                WHERE r2.outcome_id = r.outcome_id
                  AND r2.year       = r.year
              )
            ORDER BY po.sort_order""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/ratings/goals")
def get_goal_ratings():
    """Returns most recent Claude estimate per goal."""
    rows = query(
        f"""SELECT r.*
            FROM {SCHEMA}.goal_ratings r
            WHERE r.assessed_at = (
              SELECT MAX(r2.assessed_at)
              FROM {SCHEMA}.goal_ratings r2
              WHERE r2.goal_id = r.goal_id
                AND r2.year    = r.year
            )
            ORDER BY r.goal_id, r.year"""
    )
    return jsonify(rows)

@app.route("/api/ratings/bow/<bow_id>/override", methods=["POST"])
def override_bow_rating(bow_id):
    """Restricted. Append a human override row to bow_ratings."""
    data  = request.json or {}
    email = request.headers.get("X-Forwarded-Email", "unknown").strip() or "unknown"
    if email != "unknown":
        member = query(
            f"SELECT permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [email]
        )
        if not member or member[0]["permission_level"] not in ("Leadership", "MLE"):
            return jsonify({"error": "Insufficient permissions"}), 403
    else:
        return jsonify({"error": "Authentication required"}), 403
    execute(
        f"""INSERT INTO {SCHEMA}.bow_ratings
            (rating_id, bow_id, year,
             impact_rating, impact_rationale, impact_override, impact_override_reasoning,
             execution_rating, execution_rationale, execution_override, execution_override_reasoning,
             assessed_by, assessed_at)
            VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, TRUE, ?, ?, current_timestamp())""",
        [new_id(), bow_id, data["year"],
         data.get("impact_rating"), data.get("impact_rationale"), data.get("impact_override_reasoning"),
         data.get("execution_rating"), data.get("execution_rationale"), data.get("execution_override_reasoning"),
         data.get("assessed_by", "dashboard")]
    )
    return jsonify({"status": "ok"})


# ═════════════════════════════════════════════════════════════════════════════
# KEY DECISIONS — multi-level
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/decisions/bow/<bow_id>")
def get_bow_decisions(bow_id):
    """Returns BOW-level and BOW-outcome-level decisions for a given BOW."""
    rows = query(
        f"""SELECT * FROM {SCHEMA}.key_decisions
            WHERE bow_id = ?
              AND level IN ('bow', 'bow_outcome')
            ORDER BY status, timing""",
        [bow_id]
    )
    return jsonify(rows)

@app.route("/api/decisions/portfolio/<portfolio_id>")
def get_portfolio_decisions(portfolio_id):
    """Returns portfolio-outcome-level decisions for a given portfolio."""
    rows = query(
        f"""SELECT kd.*
            FROM {SCHEMA}.key_decisions kd
            JOIN {SCHEMA}.portfolio_outcomes po
              ON kd.portfolio_outcome_id = po.outcome_id
            WHERE po.portfolio_id = ?
              AND kd.level = 'portfolio_outcome'
            ORDER BY kd.status, kd.timing""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/decisions/goal/<goal_id>")
def get_goal_decisions(goal_id):
    """Returns goal-level decisions."""
    rows = query(
        f"""SELECT * FROM {SCHEMA}.key_decisions
            WHERE goal_id = ?
              AND level = 'goal'
            ORDER BY status, timing""",
        [goal_id]
    )
    return jsonify(rows)

@app.route("/api/decisions/all")
def get_all_decisions():
    """Returns all decisions across all levels. Optional filter: ?level=bow&portfolio_id=ai-infra"""
    level       = request.args.get("level")
    portfolio_id = request.args.get("portfolio_id")
    status      = request.args.get("status")

    where = ["1=1"]
    params = []

    if level:
        where.append("kd.level = ?")
        params.append(level)
    if status:
        where.append("kd.status = ?")
        params.append(status)
    if portfolio_id:
        where.append(f"""(
            kd.goal_id IN (
              SELECT goal_id FROM {SCHEMA}.portfolio_goal_links WHERE portfolio_id = ?
            )
            OR kd.portfolio_outcome_id IN (
              SELECT outcome_id FROM {SCHEMA}.portfolio_outcomes WHERE portfolio_id = ?
            )
            OR kd.bow_id IN (
              SELECT bow_id FROM {SCHEMA}.bows WHERE portfolio_id = ?
            )
        )""")
        params.extend([portfolio_id, portfolio_id, portfolio_id])

    rows = query(
        f"""SELECT kd.*
            FROM {SCHEMA}.key_decisions kd
            WHERE {' AND '.join(where)}
            ORDER BY kd.level, kd.status, kd.timing
            LIMIT 500""",
        params
    )
    return jsonify(rows)

@app.route("/api/decisions/<decision_id>/update", methods=["POST"])
def update_decision(decision_id):
    data = request.json or {}
    # M-2: verify row exists so we never silently return ok on a no-op UPDATE
    existing = query(
        f"SELECT 1 FROM {SCHEMA}.key_decisions WHERE decision_id = ?",
        [decision_id]
    )
    if not existing:
        return jsonify({"error": "Decision not found"}), 404
    execute(
        f"""UPDATE {SCHEMA}.key_decisions
            SET signals          = ?,
                recorded_outcome = ?,
                `status`         = ?,
                last_updated     = current_timestamp(),
                updated_by       = ?
            WHERE decision_id    = ?""",
        [data.get("signals"), data.get("recorded_outcome"),
         data.get("status"), data.get("updated_by", "dashboard"),
         decision_id]
    )
    return jsonify({"status": "ok", "id": decision_id})


# ═════════════════════════════════════════════════════════════════════════════
# INVESTMENTS — via INVEST views, joined through bows.invest_bow_id
# All column names use INVEST PascalCase convention
# ═════════════════════════════════════════════════════════════════════════════

# Subquery: for each investment, collect BoW_Managing_Strategy from co-funding
# BOWs — i.e. BOWs in invest_bow_allocation that are NOT in our own bows table.
COFUND_SUBQUERY = f"""
  SELECT
    a.Investment_ID,
    array_join(array_sort(collect_set(d.BoW_Managing_Strategy)), ', ') AS co_funding_teams
  FROM {SCHEMA}.invest_bow_allocation a
  JOIN {SCHEMA}.invest_bow_details d
    ON a.BoW_ID = d.BoW_ID
  WHERE a.BoW_ID NOT IN (
    SELECT invest_bow_id
    FROM {SCHEMA}.bows
    WHERE invest_bow_id IS NOT NULL
  )
    AND d.BoW_Managing_Strategy IS NOT NULL
    AND d.BoW_Managing_Strategy != ''
    AND d.BoW_Managing_Strategy != 'USP Data'
  GROUP BY a.Investment_ID
"""

@app.route("/api/investments/all")
def get_all_investments():
    """All investments with optional filters: ?portfolio_id=ai-infra&status=Active&year=2026"""
    portfolio_id = request.args.get("portfolio_id")
    status       = request.args.get("status")
    year         = request.args.get("year")

    where = ["i.Status IN ('Active', 'In Process')"]
    params = []

    if portfolio_id:
        where.append("b.portfolio_id = ?")
        params.append(portfolio_id)
    if status:
        where.append("i.Status = ?")
        params.append(status)

    rows = query(
        f"""SELECT
              i.*,
              b.bow_id,
              b.portfolio_id,
              b.title AS bow_title,
              o.internal_notes,
              o.approver,
              o.overlay_id,
              o.last_updated   AS notes_updated_at,
              o.updated_by     AS notes_updated_by,
              COALESCE(cf.co_funding_teams, '') AS co_funding_teams
            FROM {SCHEMA}.invest_investments i
            JOIN (SELECT DISTINCT Investment_ID, BoW_ID FROM {SCHEMA}.invest_bow_allocation) a
              ON i.Investment_ID = a.Investment_ID
            JOIN {SCHEMA}.bows b
              ON a.BoW_ID = b.invest_bow_id
            LEFT JOIN {SCHEMA}.investment_overlays o
              ON i.Investment_ID = o.investment_id
            LEFT JOIN ({COFUND_SUBQUERY}) cf
              ON i.Investment_ID = cf.Investment_ID
            WHERE {' AND '.join(where)}
            ORDER BY b.portfolio_id, b.sort_order, i.Investment_Name""",
        params
    )
    return jsonify(rows)

@app.route("/api/investments/bow/<bow_id>")
def get_investments_by_bow(bow_id):
    """Investments tagged to a specific BOW, joined via invest_bow_id."""
    rows = query(
        f"""SELECT
              i.*,
              o.internal_notes,
              o.approver,
              o.overlay_id,
              o.last_updated   AS notes_updated_at,
              o.updated_by     AS notes_updated_by,
              COALESCE(cf.co_funding_teams, '') AS co_funding_teams
            FROM {SCHEMA}.bows b
            JOIN (SELECT DISTINCT Investment_ID, BoW_ID FROM {SCHEMA}.invest_bow_allocation) a
              ON b.invest_bow_id = a.BoW_ID
            JOIN {SCHEMA}.invest_investments i
              ON a.Investment_ID = i.Investment_ID
            LEFT JOIN {SCHEMA}.investment_overlays o
              ON i.Investment_ID = o.investment_id
            LEFT JOIN ({COFUND_SUBQUERY}) cf
              ON i.Investment_ID = cf.Investment_ID
            WHERE b.bow_id = ?
              AND i.Status IN ('Active', 'In Process')
            ORDER BY i.Status, i.Investment_Name""",
        [bow_id]
    )
    return jsonify(rows)

@app.route("/api/investments/portfolio/<portfolio_id>")
def get_investments_by_portfolio(portfolio_id):
    """Investments for all BOWs in a portfolio."""
    rows = query(
        f"""SELECT
              i.*,
              b.bow_id,
              b.title AS bow_title,
              o.internal_notes,
              o.approver,
              o.overlay_id,
              o.last_updated   AS notes_updated_at,
              o.updated_by     AS notes_updated_by,
              COALESCE(cf.co_funding_teams, '') AS co_funding_teams
            FROM {SCHEMA}.bows b
            JOIN (SELECT DISTINCT Investment_ID, BoW_ID FROM {SCHEMA}.invest_bow_allocation) a
              ON b.invest_bow_id = a.BoW_ID
            JOIN {SCHEMA}.invest_investments i
              ON a.Investment_ID = i.Investment_ID
            LEFT JOIN {SCHEMA}.investment_overlays o
              ON i.Investment_ID = o.investment_id
            LEFT JOIN ({COFUND_SUBQUERY}) cf
              ON i.Investment_ID = cf.Investment_ID
            WHERE b.portfolio_id = ?
              AND i.Status IN ('Active', 'In Process')
            ORDER BY b.sort_order, i.Status, i.Investment_Name""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/investments/<investment_id>/bow-details")
def get_investment_bow_details(investment_id):
    """BOW details from INVEST for a specific investment."""
    rows = query(
        f"""SELECT
              d.*,
              b.bow_id,
              b.portfolio_id
            FROM {SCHEMA}.invest_bow_details d
            JOIN {SCHEMA}.bows b
              ON d.BoW_ID = b.invest_bow_id
            JOIN {SCHEMA}.invest_bow_allocation a
              ON d.BoW_ID = a.BoW_ID
            WHERE a.Investment_ID = ?""",
        [investment_id]
    )
    return jsonify(rows)

@app.route("/api/investments/<investment_id>/overlay", methods=["POST"])
def update_investment_overlay(investment_id):
    """Upsert internal notes overlay for an investment."""
    data = request.json or {}
    # Resolve author server-side — don't trust client-supplied updated_by
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if email:
        member = query(
            f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [email]
        )
        updated_by = (member[0]["display_name"] if member and member[0]["display_name"] else email)
    else:
        updated_by = data.get("updated_by") or "unknown"
    existing = query(
        f"SELECT overlay_id FROM {SCHEMA}.investment_overlays WHERE investment_id = ?",
        [investment_id]
    )
    if existing:
        execute(
            f"""UPDATE {SCHEMA}.investment_overlays
                SET internal_notes = ?,
                    approver       = ?,
                    last_updated   = current_timestamp(),
                    updated_by     = ?
                WHERE investment_id = ?""",
            [data.get("internal_notes"), data.get("approver"), updated_by, investment_id]
        )
    else:
        execute(
            f"""INSERT INTO {SCHEMA}.investment_overlays
                (overlay_id, investment_id, internal_notes, approver, last_updated, updated_by)
                VALUES (?, ?, ?, ?, current_timestamp(), ?)""",
            [new_id(), investment_id, data.get("internal_notes"),
             data.get("approver"), updated_by]
        )
    return jsonify({"status": "ok", "updated_by": updated_by})

@app.route("/api/investments/<investment_id>/payments")
def get_investment_payments(investment_id):
    """Year-by-year payment breakdown for a single investment from invest_bow_allocation."""
    rows = query(
        f"""SELECT
              Investment_Payment_Year                       AS year,
              SUM(`Investment_Payment_Allocation Amount`)   AS amount
            FROM {SCHEMA}.invest_bow_allocation
            WHERE Investment_ID = ?
            GROUP BY Investment_Payment_Year
            ORDER BY Investment_Payment_Year""",
        [investment_id]
    )
    return jsonify(rows)

@app.route("/api/investments/budget-summary/<portfolio_id>")
def get_budget_summary(portfolio_id):
    """Payment summary by BOW for a portfolio, derived from invest_bow_allocation."""
    rows = query(
        f"""SELECT
              b.bow_id,
              b.title AS bow_title,
              a.Investment_Payment_Year,
              SUM(CASE WHEN a.Investment_Payment_Status = 'Paid'
                  THEN a.`Investment_Payment_Allocation Amount` ELSE 0 END) AS paid,
              SUM(CASE WHEN a.Investment_Payment_Status != 'Paid'
                  THEN a.`Investment_Payment_Allocation Amount` ELSE 0 END) AS unpaid,
              SUM(a.`Investment_Payment_Allocation Amount`) AS total
            FROM {SCHEMA}.bows b
            JOIN {SCHEMA}.invest_bow_allocation a
              ON b.invest_bow_id = a.BoW_ID
            JOIN {SCHEMA}.invest_investments i
              ON a.Investment_ID = i.Investment_ID
            WHERE b.portfolio_id = ?
              AND i.Status IN ('Active', 'In Process')
            GROUP BY b.bow_id, b.title, a.Investment_Payment_Year
            ORDER BY b.sort_order, a.Investment_Payment_Year""",
        [portfolio_id]
    )
    return jsonify(rows)


# ═════════════════════════════════════════════════════════════════════════════
# BUDGET FORECASTS
# ═════════════════════════════════════════════════════════════════════════════

PIPELINE_STAGES = [
    'Start Concept', 'Request Proposal', 'Refine Proposal',
    'Create Agreement', 'Request Approval', 'Obtain Signatures',
]

def _build_budget_forecast(year):
    """Assembles the full budget forecast table for all USP portfolios for a given year.
    Merges three sources: allocation view (budget + committed), invest tables (committed
    by type, potential by stage/type). Uses a single connection for all four queries."""

    stage_placeholders = ','.join(['?' for _ in PIPELINE_STAGES])

    with get_connection() as conn:
        with conn.cursor() as cur:
            # All app BOWs that have an INVEST link
            bow_rows = _qc(cur,
                f"""SELECT b.bow_id, b.title AS bow_title, b.invest_bow_id,
                           b.portfolio_id, b.sort_order AS bow_sort,
                           p.title AS portfolio_title, p.sort_order AS portfolio_sort
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.portfolios p ON b.portfolio_id = p.portfolio_id
                    WHERE b.invest_bow_id IS NOT NULL
                    ORDER BY p.sort_order, b.sort_order"""
            )

            # Budget allocation + committed totals from INVEST allocation view
            alloc_rows = _qc(cur,
                f"""SELECT
                      f.BoW_ID,
                      TRY_CAST(f.BoW_Funding_Allocation_Amount AS DECIMAL(18,2)) AS budget_allocation,
                      TRY_CAST(f.Allocation_Amount_Committed   AS DECIMAL(18,2)) AS committed_total,
                      TRY_CAST(f.Allocation_Amount_Paid        AS DECIMAL(18,2)) AS committed_paid,
                      TRY_CAST(f.Allocation_Amount_Unpaid      AS DECIMAL(18,2)) AS committed_unpaid
                    FROM {INVEST_SCHEMA}.v_bow_annual_funding_allocation f
                    WHERE f.BoW_Funding_Strategy = 'USP Data'
                      AND TRY_CAST(f.BoW_Funding_Allocation_Year AS INT) = ?""",
                [year]
            )

            # Committed grants vs contracts (Status = Active)
            committed_type_rows = _qc(cur,
                f"""SELECT b.bow_id, i.Type AS investment_type,
                           SUM(a.`Investment_Payment_Allocation Amount`) AS amount
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.invest_bow_allocation a ON b.invest_bow_id = a.BoW_ID
                    JOIN {SCHEMA}.invest_investments i    ON a.Investment_ID = i.Investment_ID
                    WHERE i.Status = 'Active'
                      AND a.Investment_Payment_Year = ?
                    GROUP BY b.bow_id, i.Type""",
                [year]
            )

            # Potential by workflow stage and type (Status = In Process)
            potential_rows = _qc(cur,
                f"""SELECT b.bow_id, i.Workflow_Step AS stage, i.Type AS investment_type,
                           SUM(a.`Investment_Payment_Allocation Amount`) AS amount
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.invest_bow_allocation a ON b.invest_bow_id = a.BoW_ID
                    JOIN {SCHEMA}.invest_investments i    ON a.Investment_ID = i.Investment_ID
                    WHERE i.Status = 'In Process'
                      AND a.Investment_Payment_Year = ?
                      AND i.Workflow_Step IN ({stage_placeholders})
                    GROUP BY b.bow_id, i.Workflow_Step, i.Type""",
                [year] + PIPELINE_STAGES
            )

    alloc_by_invest_id = {r['BoW_ID']: r for r in alloc_rows}

    committed_type = {}
    for r in committed_type_rows:
        bid = r['bow_id']
        if bid not in committed_type:
            committed_type[bid] = {'Grant': 0.0, 'Contract': 0.0}
        committed_type[bid][r['investment_type']] = float(r['amount'] or 0)
    potential_by_bow = {}
    for r in potential_rows:
        bid    = r['bow_id']
        stage  = r['stage']
        t      = r['investment_type']
        amount = float(r['amount'] or 0)
        if bid not in potential_by_bow:
            potential_by_bow[bid] = {'total': 0.0, 'grants': 0.0, 'contracts': 0.0, 'by_stage': {}}
        potential_by_bow[bid]['total'] += amount
        if t == 'Grant':
            potential_by_bow[bid]['grants'] += amount
        elif t == 'Contract':
            potential_by_bow[bid]['contracts'] += amount
        by_stage = potential_by_bow[bid]['by_stage']
        if stage not in by_stage:
            by_stage[stage] = {'total': 0.0, 'grants': 0.0, 'contracts': 0.0}
        by_stage[stage]['total'] += amount
        if t == 'Grant':
            by_stage[stage]['grants'] += amount
        elif t == 'Contract':
            by_stage[stage]['contracts'] += amount

    # Merge all sources into final BOW-level rows
    result = []
    for b in bow_rows:
        bid      = b['bow_id']
        alloc    = alloc_by_invest_id.get(b['invest_bow_id'], {})
        ct       = committed_type.get(bid, {'Grant': 0.0, 'Contract': 0.0})
        pot      = potential_by_bow.get(bid, {'total': 0.0, 'grants': 0.0, 'contracts': 0.0, 'by_stage': {}})

        budget_allocation = float(alloc.get('budget_allocation') or 0)
        committed_total   = float(alloc.get('committed_total')   or 0)
        committed_paid    = float(alloc.get('committed_paid')    or 0)
        committed_unpaid  = float(alloc.get('committed_unpaid')  or 0)
        potential_total   = pot['total']
        pipeline_total    = committed_total + potential_total

        result.append({
            'bow_id':              bid,
            'bow_title':           b['bow_title'],
            'portfolio_id':        b['portfolio_id'],
            'portfolio_title':     b['portfolio_title'],
            'portfolio_sort':      b['portfolio_sort'],
            'bow_sort':            b['bow_sort'],
            'budget_allocation':   budget_allocation,
            'committed_total':     committed_total,
            'committed_paid':      committed_paid,
            'committed_unpaid':    committed_unpaid,
            'committed_grants':    ct['Grant'],
            'committed_contracts': ct['Contract'],
            'potential_total':     potential_total,
            'potential_grants':    pot['grants'],
            'potential_contracts': pot['contracts'],
            'potential_by_stage':  pot['by_stage'],
            'pipeline_total':      pipeline_total,
            'headroom':            budget_allocation - pipeline_total,
            'expected_forecast':   None,
            'expected_headroom':   None,
        })
    return result


def _build_budget_forecast_multi(years):
    """Builds forecast for multiple years in a single Databricks connection.
    Returns {str(year): [bow_rows]} using IN-clause queries for efficiency."""
    year_ph  = ','.join(['?' for _ in years])
    stage_ph = ','.join(['?' for _ in PIPELINE_STAGES])

    with get_connection() as conn:
        with conn.cursor() as cur:
            bow_rows = _qc(cur,
                f"""SELECT b.bow_id, b.title AS bow_title, b.invest_bow_id,
                           b.portfolio_id, b.sort_order AS bow_sort,
                           p.title AS portfolio_title, p.sort_order AS portfolio_sort
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.portfolios p ON b.portfolio_id = p.portfolio_id
                    WHERE b.invest_bow_id IS NOT NULL
                    ORDER BY p.sort_order, b.sort_order"""
            )
            alloc_rows = _qc(cur,
                f"""SELECT f.BoW_ID,
                      TRY_CAST(f.BoW_Funding_Allocation_Year AS INT)   AS year,
                      TRY_CAST(f.BoW_Funding_Allocation_Amount AS DECIMAL(18,2)) AS budget_allocation,
                      TRY_CAST(f.Allocation_Amount_Committed   AS DECIMAL(18,2)) AS committed_total,
                      TRY_CAST(f.Allocation_Amount_Paid        AS DECIMAL(18,2)) AS committed_paid,
                      TRY_CAST(f.Allocation_Amount_Unpaid      AS DECIMAL(18,2)) AS committed_unpaid
                    FROM {INVEST_SCHEMA}.v_bow_annual_funding_allocation f
                    WHERE f.BoW_Funding_Strategy = 'USP Data'
                      AND TRY_CAST(f.BoW_Funding_Allocation_Year AS INT) IN ({year_ph})""",
                years
            )
            committed_type_rows = _qc(cur,
                f"""SELECT b.bow_id, a.Investment_Payment_Year AS year,
                           i.Type AS investment_type,
                           SUM(a.`Investment_Payment_Allocation Amount`) AS amount
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.invest_bow_allocation a ON b.invest_bow_id = a.BoW_ID
                    JOIN {SCHEMA}.invest_investments i    ON a.Investment_ID = i.Investment_ID
                    WHERE i.Status = 'Active'
                      AND a.Investment_Payment_Year IN ({year_ph})
                    GROUP BY b.bow_id, a.Investment_Payment_Year, i.Type""",
                years
            )
            potential_rows = _qc(cur,
                f"""SELECT b.bow_id, a.Investment_Payment_Year AS year,
                           i.Workflow_Step AS stage, i.Type AS investment_type,
                           SUM(a.`Investment_Payment_Allocation Amount`) AS amount
                    FROM {SCHEMA}.bows b
                    JOIN {SCHEMA}.invest_bow_allocation a ON b.invest_bow_id = a.BoW_ID
                    JOIN {SCHEMA}.invest_investments i    ON a.Investment_ID = i.Investment_ID
                    WHERE i.Status = 'In Process'
                      AND a.Investment_Payment_Year IN ({year_ph})
                      AND i.Workflow_Step IN ({stage_ph})
                    GROUP BY b.bow_id, a.Investment_Payment_Year, i.Workflow_Step, i.Type""",
                years + PIPELINE_STAGES
            )

    results = {}
    for year in years:
        alloc_by_invest = {r['BoW_ID']: r for r in alloc_rows if r['year'] == year}

        ct = {}
        for r in committed_type_rows:
            if r['year'] != year: continue
            bid = r['bow_id']
            if bid not in ct: ct[bid] = {'Grant': 0.0, 'Contract': 0.0}
            ct[bid][r['investment_type']] = float(r['amount'] or 0)

        pot = {}
        for r in potential_rows:
            if r['year'] != year: continue
            bid, stage, t, amount = r['bow_id'], r['stage'], r['investment_type'], float(r['amount'] or 0)
            if bid not in pot: pot[bid] = {'total': 0.0, 'grants': 0.0, 'contracts': 0.0, 'by_stage': {}}
            pot[bid]['total'] += amount
            if t == 'Grant':    pot[bid]['grants']    += amount
            elif t == 'Contract': pot[bid]['contracts'] += amount
            by_stage = pot[bid]['by_stage']
            if stage not in by_stage: by_stage[stage] = {'total': 0.0, 'grants': 0.0, 'contracts': 0.0}
            by_stage[stage]['total'] += amount
            if t == 'Grant':    by_stage[stage]['grants']    += amount
            elif t == 'Contract': by_stage[stage]['contracts'] += amount

        year_rows = []
        for b in bow_rows:
            bid   = b['bow_id']
            alloc = alloc_by_invest.get(b['invest_bow_id'], {})
            c     = ct.get(bid, {'Grant': 0.0, 'Contract': 0.0})
            p     = pot.get(bid, {'total': 0.0, 'grants': 0.0, 'contracts': 0.0, 'by_stage': {}})
            budget_allocation = float(alloc.get('budget_allocation') or 0)
            committed_total   = float(alloc.get('committed_total')   or 0)
            potential_total   = p['total']
            pipeline_total    = committed_total + potential_total
            year_rows.append({
                'bow_id': bid, 'bow_title': b['bow_title'],
                'portfolio_id': b['portfolio_id'], 'portfolio_title': b['portfolio_title'],
                'portfolio_sort': b['portfolio_sort'], 'bow_sort': b['bow_sort'],
                'budget_allocation': budget_allocation,
                'committed_total': committed_total,
                'committed_paid':    float(alloc.get('committed_paid')    or 0),
                'committed_unpaid':  float(alloc.get('committed_unpaid')  or 0),
                'committed_grants':  c['Grant'], 'committed_contracts': c['Contract'],
                'potential_total': potential_total,
                'potential_grants': p['grants'], 'potential_contracts': p['contracts'],
                'potential_by_stage': p['by_stage'],
                'pipeline_total': pipeline_total,
                'headroom': budget_allocation - pipeline_total,
                'expected_forecast': None, 'expected_headroom': None,
            })
        results[str(year)] = year_rows

    return results


@app.route("/api/budget-forecasts/multi-year")
def get_budget_forecast_multi_year():
    """Returns budget forecast for all budget years (2026–2030) in one response,
    using a single Databricks connection. Returns {year: [bow_rows]}."""
    return jsonify(_build_budget_forecast_multi([2026, 2027, 2028, 2029, 2030]))


@app.route("/api/budget-forecasts/summary")
def get_budget_forecast_summary():
    """Full budget forecast table for all USP portfolios, merged from the INVEST
    allocation view (budget + committed) and invest tables (committed by type,
    potential by stage/type). Returns BOW-level rows."""
    year = request.args.get("year", 2026, type=int)
    return jsonify(_build_budget_forecast(year))


@app.route("/api/budget-forecasts/snapshots")
def list_budget_forecast_snapshots():
    """Lists all snapshot metadata (no data blob). Optionally filter by fiscal_year."""
    year   = request.args.get("year", type=int)
    where  = "WHERE fiscal_year = ?" if year else ""
    params = [year] if year else []
    rows   = query(
        f"""SELECT snapshot_id, label, fiscal_year, snapshot_date, taken_by
            FROM {SCHEMA}.budget_forecast_snapshots
            {where}
            ORDER BY snapshot_date DESC""",
        params
    )
    return jsonify(rows)


@app.route("/api/budget-forecasts/snapshots/<snapshot_id>")
def get_budget_forecast_snapshot(snapshot_id):
    """Returns a single snapshot including its full data blob (parsed from JSON)."""
    rows = query(
        f"SELECT * FROM {SCHEMA}.budget_forecast_snapshots WHERE snapshot_id = ?",
        [snapshot_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    import json as _j
    row = rows[0]
    row['snapshot_data'] = _j.loads(row['snapshot_data'])
    return jsonify(row)


@app.route("/api/budget-forecasts/snapshots", methods=["POST"])
def take_budget_forecast_snapshot():
    """Captures current budget forecast state as a named snapshot.
    Restricted to Leadership and MLE permission levels."""
    import json as _j
    email = request.headers.get("X-Forwarded-Email", "").strip() or "unknown"

    # C-4: block unauthenticated requests — previously skipped the check when email == "unknown"
    if email == "unknown":
        return jsonify({"error": "Authentication required to take a snapshot"}), 403
    member = query(
        f"SELECT permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    if not member or member[0]['permission_level'] not in ('Leadership', 'MLE'):
        return jsonify({"error": "Insufficient permissions to take a snapshot"}), 403

    data  = request.json or {}
    label = (data.get("label") or "").strip()
    year  = data.get("fiscal_year", 2026)

    if not label:
        return jsonify({"error": "label is required"}), 400

    execute(
        f"""INSERT INTO {SCHEMA}.budget_forecast_snapshots
            (snapshot_id, label, fiscal_year, snapshot_date, taken_by, snapshot_data)
            VALUES (?, ?, ?, current_date(), ?, ?)""",
        [new_id(), label, year, email, _j.dumps(_build_budget_forecast(year))]
    )
    return jsonify({"status": "ok"})


# ═════════════════════════════════════════════════════════════════════════════
# PORTAL ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/portal")
def portal():
    return _nocache(send_file(os.path.join(os.path.dirname(__file__), "portal.html")))

@app.route("/portal.jsx")
def portal_jsx():
    return _nocache(send_file(
        os.path.join(os.path.dirname(__file__), "portal.jsx"),
        mimetype="text/plain"
    ))

@app.route("/api/me")
def get_me():
    """Returns current user's display name and permission level from team_members."""
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if not email:
        current_user = query("SELECT current_user() AS user")
        email = current_user[0]["user"] if current_user else None
    if not email:
        return jsonify({"email": None, "display_name": "Unknown", "permission_level": "Team", "portfolio_id": None})
    member = query(
        f"SELECT display_name, permission_level, portfolio_id FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    if member:
        return jsonify({
            "email": email,
            "display_name": member[0]["display_name"],
            "permission_level": member[0]["permission_level"],
            "portfolio_id": member[0]["portfolio_id"]
        })
    return jsonify({"email": email, "display_name": email, "permission_level": "Team", "portfolio_id": None})

@app.route("/api/indicators/all")
def get_all_indicators():
    """Returns all active BOW indicators with BOW, portfolio, and outcome context.
    Uses LEFT JOINs so indicators show even if bow_outcomes is sparse.
    Falls back gracefully if unit/collection_frequency columns don't exist yet."""
    try:
        rows = query(
            f"""SELECT
                  i.indicator_id,
                  i.bow_id,
                  i.outcome_id,
                  i.name,
                  i.text,
                  i.unit,
                  i.data_source,
                  i.collection_frequency,
                  i.measurement_level,
                  i.baseline,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  b.title        AS bow_title,
                  b.portfolio_id,
                  o.title        AS outcome_title
                FROM {SCHEMA}.bow_indicators i
                JOIN      {SCHEMA}.bows b         ON i.bow_id     = b.bow_id
                LEFT JOIN {SCHEMA}.bow_outcomes o ON i.outcome_id = o.outcome_id
                WHERE COALESCE(i.is_active, true) = true
                ORDER BY b.portfolio_id, b.sort_order, i.outcome_id, i.indicator_id"""
        )
    except Exception:
        # Fallback: omit unit/collection_frequency if migration hasn't run yet
        rows = query(
            f"""SELECT
                  i.indicator_id,
                  i.bow_id,
                  i.outcome_id,
                  i.text,
                  NULL          AS unit,
                  i.data_source,
                  NULL          AS collection_frequency,
                  i.baseline,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  b.title        AS bow_title,
                  b.portfolio_id,
                  o.title        AS outcome_title
                FROM {SCHEMA}.bow_indicators i
                JOIN      {SCHEMA}.bows b         ON i.bow_id     = b.bow_id
                LEFT JOIN {SCHEMA}.bow_outcomes o ON i.outcome_id = o.outcome_id
                WHERE COALESCE(i.is_active, true) = true
                ORDER BY b.portfolio_id, b.sort_order, i.outcome_id, i.indicator_id"""
        )
    return jsonify(rows)


@app.route("/api/portfolio-indicators/all")
def get_all_portfolio_indicators():
    """Returns all portfolio indicators with portfolio and outcome context."""
    try:
        rows = query(
            f"""SELECT
                  i.indicator_id,
                  i.portfolio_id,
                  i.outcome_id,
                  i.text,
                  i.unit,
                  i.data_source,
                  NULL           AS collection_frequency,
                  i.baseline,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  NULL           AS bow_id,
                  NULL           AS bow_title,
                  COALESCE(NULLIF(po.title, ''), po.short_title) AS outcome_title
                FROM {SCHEMA}.portfolio_indicators i
                LEFT JOIN {SCHEMA}.portfolio_outcomes po ON i.outcome_id = po.outcome_id
                ORDER BY i.portfolio_id, po.sort_order, i.indicator_id"""
        )
    except Exception:
        rows = query(
            f"""SELECT
                  i.indicator_id,
                  i.portfolio_id,
                  i.outcome_id,
                  i.text,
                  NULL           AS unit,
                  i.data_source,
                  NULL           AS collection_frequency,
                  i.baseline,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  NULL           AS bow_id,
                  NULL           AS bow_title,
                  COALESCE(NULLIF(po.title, ''), po.short_title) AS outcome_title
                FROM {SCHEMA}.portfolio_indicators i
                LEFT JOIN {SCHEMA}.portfolio_outcomes po ON i.outcome_id = po.outcome_id
                ORDER BY i.portfolio_id, po.sort_order, i.indicator_id"""
        )
    return jsonify(rows)


@app.route("/api/portal-debug")
def portal_debug():
    """Checks all tables the portal depends on — use to diagnose empty dropdowns."""
    if not request.headers.get("X-Forwarded-Email"):
        return jsonify({"error": "Authentication required"}), 403
    result = {}
    tables = [
        ("bows",             f"SELECT COUNT(*) AS n FROM {SCHEMA}.bows"),
        ("portfolios",       f"SELECT COUNT(*) AS n FROM {SCHEMA}.portfolios"),
        ("goals",            f"SELECT COUNT(*) AS n FROM {SCHEMA}.strategy_goals"),
        ("bow_outcomes",     f"SELECT COUNT(*) AS n FROM {SCHEMA}.bow_outcomes"),
        ("bow_indicators",   f"SELECT COUNT(*) AS n FROM {SCHEMA}.bow_indicators"),
        ("portfolio_indicators", f"SELECT COUNT(*) AS n FROM {SCHEMA}.portfolio_indicators"),
    ]
    for name, sql_str in tables:
        try:
            rows = query(sql_str)
            result[name] = rows[0]["n"] if rows else 0
        except Exception as e:
            result[name] = f"ERROR: {str(e)[:200]}"

    # Check whether unit/collection_frequency columns exist on bow_indicators
    for col in ("unit", "collection_frequency"):
        try:
            query(f"SELECT {col} FROM {SCHEMA}.bow_indicators LIMIT 1")
            result[f"bow_indicators.{col}"] = "exists"
        except Exception:
            result[f"bow_indicators.{col}"] = "MISSING — run schema_migration_units_v1.sql"

    # Sample a few indicators to confirm data shape
    try:
        sample = query(
            f"""SELECT i.indicator_id, i.bow_id, i.outcome_id, i.text,
                       b.portfolio_id, b.title AS bow_title
                FROM {SCHEMA}.bow_indicators i
                JOIN {SCHEMA}.bows b ON i.bow_id = b.bow_id
                LIMIT 5"""
        )
        result["sample_indicators"] = sample
    except Exception as e:
        result["sample_indicators"] = f"ERROR: {str(e)[:300]}"

    return jsonify(result)

@app.route("/api/pending-actuals/mine")
def get_my_actuals():
    """Returns submissions by the current logged-in user, newest first."""
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if not email:
        current_user = query("SELECT current_user() AS user")
        email = current_user[0]["user"] if current_user else None
    member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    ) if email else []
    display_name = member[0]["display_name"] if member else email
    if not display_name:
        return jsonify([])
    rows = query(
        f"""SELECT * FROM {SCHEMA}.pending_actuals
            WHERE submitted_by = ?
            ORDER BY submitted_at DESC""",
        [display_name]
    )
    return jsonify(rows)


# ═════════════════════════════════════════════════════════════════════════════
# PENDING ACTUALS — submission queue
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/pending-actuals")
def get_pending_actuals():
    """Returns all pending submissions. Optional filter: ?status=pending"""
    status = request.args.get("status", "pending")
    rows = query(
        f"""SELECT * FROM {SCHEMA}.pending_actuals
            WHERE status = ?
            ORDER BY submitted_at DESC""",
        [status]
    )
    return jsonify(rows)

@app.route("/api/pending-actuals/submit", methods=["POST"])
def submit_actual():
    """Submit a new actual for review. Name and role resolved from Databricks login token."""
    data = request.json or {}
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if not email:
        current_user = query("SELECT current_user() AS user")
        email = current_user[0]["user"] if current_user else "unknown"
    member = query(
        f"SELECT display_name, permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    submitted_by         = member[0]["display_name"] if member else email
    submitted_permission = member[0]["permission_level"] if member else None
    # M-5: verify indicator exists before queuing the submission
    ind_id = data.get("indicator_id")
    if ind_id:
        ind_exists = query(
            f"""SELECT 1 FROM {SCHEMA}.bow_indicators
                    WHERE indicator_id = ? AND COALESCE(is_active, true) = true
                UNION ALL
                SELECT 1 FROM {SCHEMA}.portfolio_indicators
                    WHERE indicator_id = ?
                LIMIT 1""",
            [ind_id, ind_id]
        )
        if not ind_exists:
            return jsonify({"error": "indicator_id not found"}), 404
    # L-3: validate and cast year
    try:
        year_val = int(data["year"])
    except (TypeError, ValueError):
        return jsonify({"error": "year must be a valid integer"}), 400
    if not 2020 <= year_val <= 2035:
        return jsonify({"error": "year out of valid range (2020–2035)"}), 400
    execute(
        f"""INSERT INTO {SCHEMA}.pending_actuals
            (pending_id, indicator_id, `level`, entity_id, `year`, `period`,
             submitted_value, reading_date, source_notes, notes,
             submitted_by, submitted_permission, submitted_at, `status`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp(), 'pending')""",
        [new_id(), ind_id, data["level"],
         data["entity_id"], year_val, data.get("period"),
         data["submitted_value"], data.get("reading_date"), data.get("source_notes"),
         data.get("notes"),
         submitted_by, submitted_permission]
    )
    return jsonify({"status": "ok", "submitted_by": submitted_by})

@app.route("/api/pending-actuals/<pending_id>/approve", methods=["POST"])
def approve_actual(pending_id):
    """Approve a pending actual. Moves to appropriate actuals table based on level."""
    import traceback
    try:
        data = request.json or {}
        row = query(
            f"SELECT * FROM {SCHEMA}.pending_actuals WHERE pending_id = ?",
            [pending_id]
        )
        if not row:
            return jsonify({"error": "Not found"}), 404

        r = row[0]
        level          = r["level"]
        reviewed_value = data.get("reviewed_value", r["submitted_value"])

        # C-2: resolve reviewer server-side BEFORE any DB writes so INSERT and UPDATE
        # both use the same identity (never trust client-supplied reviewed_by).
        reviewer_email  = _actor()
        reviewer_member = query(
            f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [reviewer_email]
        ) if reviewer_email != "unknown" else []
        reviewed_by = reviewer_member[0]["display_name"] if reviewer_member else (reviewer_email or "reviewer")

        # Look up outcome_id from the indicator row (pending_actuals doesn't store it)
        ind_meta = query(
            f"SELECT outcome_id FROM {SCHEMA}.bow_indicators WHERE indicator_id = ?",
            [r["indicator_id"]]
        )
        outcome_id = ind_meta[0]["outcome_id"] if ind_meta else r.get("outcome_id")

        # C-1: INSERT actual first so data is written before status flips.
        # reviewed_by is server-derived (same value used in UPDATE below).
        if level == "bow":
            execute(
                f"""INSERT INTO {SCHEMA}.bow_indicator_actuals
                    (actual_id, indicator_id, bow_id, outcome_id, `year`, `period`,
                     actual_value, reading_date, source_notes, loaded_by, loaded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?, current_timestamp())""",
                [new_id(), r["indicator_id"], r["entity_id"], outcome_id,
                 r["year"], r.get("period"), reviewed_value,
                 r.get("reading_date"), r.get("source_notes"), reviewed_by]
            )
        elif level == "portfolio":
            ind_meta_port = query(
                f"SELECT outcome_id FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?",
                [r["indicator_id"]]
            )
            port_outcome_id = ind_meta_port[0]["outcome_id"] if ind_meta_port else r.get("outcome_id")
            execute(
                f"""INSERT INTO {SCHEMA}.portfolio_indicator_actuals
                    (actual_id, indicator_id, portfolio_id, outcome_id, `year`, `period`,
                     actual_value, reading_date, source_notes, loaded_by, loaded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?, current_timestamp())""",
                [new_id(), r["indicator_id"], r["entity_id"], port_outcome_id,
                 r["year"], r.get("period"), reviewed_value,
                 r.get("reading_date"), r.get("source_notes"), reviewed_by]
            )
        elif level == "goal":
            execute(
                f"""INSERT INTO {SCHEMA}.strategy_goal_actuals
                    (actual_id, goal_id, `year`, actual_value, reading_date,
                     source_notes, loaded_by, loaded_at)
                    VALUES (?, ?, ?, ?, current_date(), ?, ?, current_timestamp())""",
                [new_id(), r["entity_id"], r["year"], reviewed_value,
                 "pending_actuals_review", reviewed_by]
            )
        else:
            # M-4: unknown level — reject before touching pending_actuals
            return jsonify({"error": f"Unknown approval level: {level!r}"}), 400

        was_edited = (reviewed_value != r["submitted_value"])
        decision   = "approved with edit" if was_edited else "approved"

        execute(
            f"""UPDATE {SCHEMA}.pending_actuals
                SET `status`       = 'approved',
                    reviewed_value = ?,
                    reviewed_by    = ?,
                    reviewed_at    = current_timestamp()
                WHERE pending_id   = ?""",
            [reviewed_value, reviewed_by, pending_id]
        )

        # Look up indicator label for the email body
        ind_rows = query(
            f"SELECT `text` FROM {SCHEMA}.bow_indicators WHERE indicator_id = ? UNION ALL "
            f"SELECT `text` FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?",
            [r["indicator_id"], r["indicator_id"]]
        )
        ind_label = ind_rows[0]["text"] if ind_rows else r["indicator_id"]

        # Send email to submitter (look up email by display name)
        submitter_rows = query(
            f"SELECT email FROM {SCHEMA}.team_members WHERE display_name = ? AND is_active = true",
            [r["submitted_by"]]
        )
        if submitter_rows:
            submitter_email = submitter_rows[0]["email"]
            val_note = (f"\n\nThe reviewer adjusted your submitted value "
                        f"from {r['submitted_value']} to {reviewed_value}.") if was_edited else ""
            body = textwrap.dedent(f"""\
                Hi {r['submitted_by']},

                Your data submission has been {decision}.

                Indicator: {ind_label}
                Year / period: {r['year']}{' · ' + r['period'] if r.get('period') else ''}
                Submitted value: {r['submitted_value']}{val_note}

                Reviewed by: {reviewed_by}

                You can view your submission history in the Data Hub portal under "My Submissions".

                — Measurement & Insights Data Hub
            """)
            _send_notification_email(
                submitter_email,
                f"Data submission {decision}: {ind_label} ({r['year']})",
                body
            )

        return jsonify({"status": "ok", "decision": decision})

    except Exception as e:
        msg = str(e)
        print(f"[approve_actual] ERROR for {pending_id}:\n{traceback.format_exc()}")
        return jsonify({"error": msg}), 500

@app.route("/api/pending-actuals/<pending_id>/reject", methods=["POST"])
def reject_actual(pending_id):
    import traceback
    try:
        data = request.json or {}
        row  = query(f"SELECT * FROM {SCHEMA}.pending_actuals WHERE pending_id = ?", [pending_id])
        if not row:
            return jsonify({"error": "Not found"}), 404
        r = row[0]

        reviewer_email = _actor(data)
        reviewer_member = query(
            f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [reviewer_email]
        ) if reviewer_email != "unknown" else []
        reviewed_by = reviewer_member[0]["display_name"] if reviewer_member else (reviewer_email or "reviewer")

        execute(
            f"""UPDATE {SCHEMA}.pending_actuals
                SET `status`       = 'rejected',
                    reviewer_notes = ?,
                    reviewed_by    = ?,
                    reviewed_at    = current_timestamp()
                WHERE pending_id   = ?""",
            [data.get("reviewer_notes"), reviewed_by, pending_id]
        )

        # Look up indicator label for the email body
        ind_rows = query(
            f"SELECT `text` FROM {SCHEMA}.bow_indicators WHERE indicator_id = ? UNION ALL "
            f"SELECT `text` FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?",
            [r["indicator_id"], r["indicator_id"]]
        )
        ind_label = ind_rows[0]["text"] if ind_rows else r["indicator_id"]

        # Send email to submitter
        submitter_rows = query(
            f"SELECT email FROM {SCHEMA}.team_members WHERE display_name = ? AND is_active = true",
            [r["submitted_by"]]
        )
        if submitter_rows:
            submitter_email = submitter_rows[0]["email"]
            reviewer_notes  = data.get("reviewer_notes") or ""
            body = textwrap.dedent(f"""\
                Hi {r['submitted_by']},

                Your data submission has been rejected.

                Indicator: {ind_label}
                Year / period: {r['year']}{' · ' + r['period'] if r.get('period') else ''}
                Submitted value: {r['submitted_value']}

                Reviewer feedback:
                {reviewer_notes}

                Reviewed by: {reviewed_by}

                If you have questions or would like to resubmit, please reach out to the MLE team or
                resubmit corrected data through the Data Hub portal.

                — Measurement & Insights Data Hub
            """)
            _send_notification_email(
                submitter_email,
                f"Data submission rejected: {ind_label} ({r['year']})",
                body
            )

        return jsonify({"status": "ok"})

    except Exception as e:
        msg = str(e)
        print(f"[reject_actual] ERROR for {pending_id}:\n{traceback.format_exc()}")
        return jsonify({"error": msg}), 500


@app.route("/api/indicators/<indicator_id>/actuals")
def get_indicator_actuals(indicator_id):
    """Returns all actuals on record for a single indicator (BOW or portfolio), ordered by year and period."""
    rows = []
    for table in ["bow_indicator_actuals", "portfolio_indicator_actuals"]:
        try:
            r = query(
                f"""SELECT year, period, actual_value, reading_date, source_notes
                    FROM {SCHEMA}.{table}
                    WHERE indicator_id = ?
                    ORDER BY year, period""",
                [indicator_id]
            )
            rows.extend(r)
        except Exception:
            pass
    # Deduplicate by (year, period, actual_value) and sort
    seen = set()
    unique = []
    for r in rows:
        key = (r.get("year"), r.get("period"), r.get("actual_value"))
        if key not in seen:
            seen.add(key)
            unique.append(r)
    unique.sort(key=lambda r: (r.get("year") or 0, r.get("period") or ""))
    return jsonify(unique)

@app.route("/api/indicators/<indicator_id>/context")
def get_indicator_context(indicator_id):
    """Returns count of assumptions and decisions linked to an indicator — shown in portal Step 2."""
    try:
        rows = query(
            f"""SELECT
                  (SELECT COUNT(*) FROM {SCHEMA}.assumption_indicator_links
                   WHERE indicator_id = ?) AS assumption_count,
                  (SELECT COUNT(DISTINCT dal.decision_id)
                   FROM {SCHEMA}.assumption_indicator_links ail
                   JOIN {SCHEMA}.decision_assumption_links dal
                     ON ail.assumption_id = dal.assumption_id
                   WHERE ail.indicator_id = ?) AS decision_count""",
            [indicator_id, indicator_id]
        )
        return jsonify(rows[0] if rows else {"assumption_count": 0, "decision_count": 0})
    except Exception:
        return jsonify({"assumption_count": 0, "decision_count": 0})

@app.route("/api/insights/submit", methods=["POST"])
def submit_insight():
    """Submit a qualitative insight directly to bow_notes (no review queue)."""
    data = request.json or {}
    email = request.headers.get("X-Forwarded-Email", "").strip() or None
    if not email:
        current_user_row = query("SELECT current_user() AS user")
        email = current_user_row[0]["user"] if current_user_row else "unknown"
    member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    submitted_by = member[0]["display_name"] if member else (email or "unknown")

    type_labels = {
        "field_observation": "Field observation",
        "partner_update":    "Partner update",
        "market_signal":     "Market signal",
        "risk_concern":      "Risk / concern",
        "general_note":      "General note",
    }
    label       = type_labels.get(data.get("insight_type", ""), data.get("insight_type", "Insight"))
    description = data.get("description", "")
    source      = data.get("source", "")
    insight_date = data.get("insight_date", "")
    bow_id      = data["bow_id"]
    year        = int(data.get("year", datetime.date.today().year))

    note_text = f"[{label}] {description}"
    if source:
        note_text += f"\nSource: {source}"
    if insight_date:
        note_text += f"\nDate: {insight_date}"
    note_text += f"\nSubmitted by: {submitted_by}"

    execute(
        f"""INSERT INTO {SCHEMA}.bow_notes
            (note_id, bow_id, outcome_id, `year`, note_text, last_updated, updated_by)
            VALUES (?, ?, NULL, ?, ?, current_timestamp(), ?)""",
        [new_id(), bow_id, year, note_text, submitted_by]
    )
    return jsonify({"status": "ok", "submitted_by": submitted_by})


# ═════════════════════════════════════════════════════════════════════════════
# DECISION SCHEMA — confidence review (restricted access)
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/assumption-confidence")
def get_assumption_confidence():
    """Returns current confidence state per assumption. Optional filter: ?confidence=low"""
    confidence = request.args.get("confidence")
    portfolio_id = request.args.get("portfolio_id")

    where = ["1=1"]
    params = []

    if confidence:
        where.append("ac.confidence = ?")
        params.append(confidence)

    rows = query(
        f"""SELECT ac.*
            FROM {SCHEMA}.current_assumption_confidence ac
            WHERE {' AND '.join(where)}
            ORDER BY ac.confidence, ac.assumption_id""",
        params
    )
    return jsonify(rows)

@app.route("/api/assumption-confidence/<assumption_id>/override", methods=["POST"])
def override_assumption_confidence(assumption_id):
    """Restricted. Append a human override row to assumption_confidence."""
    data  = request.json or {}
    email = request.headers.get("X-Forwarded-Email", "unknown").strip() or "unknown"
    if email != "unknown":
        member = query(
            f"SELECT permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [email]
        )
        if not member or member[0]["permission_level"] not in ("Leadership", "MLE"):
            return jsonify({"error": "Insufficient permissions"}), 403
    else:
        return jsonify({"error": "Authentication required"}), 403
    execute(
        f"""INSERT INTO {SCHEMA}.assumption_confidence
            (confidence_id, assumption_id, confidence, rationale,
             data_considered, human_override, override_reasoning,
             assessed_by, assessed_at)
            VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, current_timestamp())""",
        [new_id(), assumption_id, data.get("confidence"), data.get("rationale"),
         data.get("data_considered"), data.get("override_reasoning"),
         email]
    )
    return jsonify({"status": "ok"})


# ═════════════════════════════════════════════════════════════════════════════
# NOTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/notes/bow/<bow_id>")
def get_bow_notes(bow_id):
    rows = query(
        f"""SELECT * FROM {SCHEMA}.bow_notes
            WHERE bow_id = ?
            ORDER BY last_updated DESC""",
        [bow_id]
    )
    return jsonify(rows)

@app.route("/api/notes/bow/<bow_id>/upsert", methods=["POST"])
def upsert_bow_note(bow_id):
    data       = request.json or {}
    outcome_id = data.get("outcome_id")
    note_text  = data.get("note_text")
    updated_by = _actor(data) or data.get("updated_by", "dashboard")
    year_val   = data.get("year")
    # M-6: MERGE INTO eliminates SELECT-then-INSERT/UPDATE race condition.
    # Databricks MERGE requires the source to carry all columns needed for INSERT.
    execute(
        f"""MERGE INTO {SCHEMA}.bow_notes AS tgt
            USING (
                SELECT ? AS bow_id,
                       ? AS outcome_id,
                       ? AS note_text,
                       ? AS updated_by,
                       ? AS yr
            ) AS src
            ON tgt.bow_id = src.bow_id
               AND (tgt.outcome_id = src.outcome_id
                    OR (tgt.outcome_id IS NULL AND src.outcome_id IS NULL))
            WHEN MATCHED THEN UPDATE SET
                tgt.note_text    = src.note_text,
                tgt.last_updated = current_timestamp(),
                tgt.updated_by   = src.updated_by
            WHEN NOT MATCHED THEN INSERT
                (note_id, bow_id, outcome_id, `year`, note_text, last_updated, updated_by)
                VALUES ('{new_id()}', src.bow_id, src.outcome_id, src.yr,
                        src.note_text, current_timestamp(), src.updated_by)""",
        [bow_id, outcome_id, note_text, updated_by, year_val]
    )
    return jsonify({"status": "ok"})

@app.route("/api/notes/portfolio/<portfolio_id>")
def get_portfolio_notes(portfolio_id):
    rows = query(
        f"""SELECT * FROM {SCHEMA}.portfolio_tracking
            WHERE portfolio_id = ?
            ORDER BY year DESC""",
        [portfolio_id]
    )
    return jsonify(rows)

@app.route("/api/notes/portfolio/<portfolio_id>/upsert", methods=["POST"])
def upsert_portfolio_notes(portfolio_id):
    data              = request.json or {}
    year              = data.get("year")
    notes             = data.get("notes")
    budget_annotation = data.get("budget_annotation")
    updated_by        = _actor(data) or data.get("updated_by", "dashboard")
    # M-6: MERGE INTO eliminates SELECT-then-INSERT/UPDATE race condition
    execute(
        f"""MERGE INTO {SCHEMA}.portfolio_tracking AS tgt
            USING (
                SELECT ? AS portfolio_id, ? AS yr,
                       ? AS notes, ? AS budget_annotation, ? AS updated_by
            ) AS src
            ON tgt.portfolio_id = src.portfolio_id AND tgt.`year` = src.yr
            WHEN MATCHED THEN UPDATE SET
                tgt.notes             = src.notes,
                tgt.budget_annotation = src.budget_annotation,
                tgt.last_updated      = current_timestamp(),
                tgt.updated_by        = src.updated_by
            WHEN NOT MATCHED THEN INSERT
                (tracking_id, portfolio_id, `year`, notes, budget_annotation,
                 last_updated, updated_by)
                VALUES ('{new_id()}', src.portfolio_id, src.yr, src.notes,
                        src.budget_annotation, current_timestamp(), src.updated_by)""",
        [portfolio_id, year, notes, budget_annotation, updated_by]
    )
    return jsonify({"status": "ok"})


# =============================================================================
# Portal v2 — Content editing, CRUD, and activity feed
# =============================================================================

import json as _json

MAJOR_TEXT_FIELDS = {"title", "text", "outcome", "name"}
TARGET_FIELDS     = {"target_2026", "target_2027", "target_2028", "target_2029", "target_2030"}

def _actor(body=None):
    """Resolve the acting user's email.
    Priority: Databricks-injected X-Forwarded-Email header → client-supplied
    edited_by in request body → 'unknown'.
    This is server-side so it works even if the client omits the field."""
    email = request.headers.get("X-Forwarded-Email")
    if email:
        return email.strip()
    if body is None:
        body = request.get_json(silent=True) or {}
    return (body.get("edited_by") or "").strip() or "unknown"

def _attach_last_edited(entities, id_field, edit_map):
    """Attach last_edited_by / last_edited_at from edit_map to each entity dict."""
    for e in entities:
        edit = edit_map.get(e.get(id_field), {})
        e["last_edited_by"] = edit.get("edited_by", "")
        e["last_edited_at"] = edit.get("edited_at", "")

def _fetch_edit_map(entity_ids, cursor=None):
    """Return {entity_id: {edited_by, edited_at}} for the most recent log entry per ID.
    Pass an open cursor to reuse an existing connection instead of opening a new one."""
    if not entity_ids:
        return {}
    try:
        ph = ",".join(["?" for _ in entity_ids])
        sql_str = (
            f"SELECT entity_id, edited_by, CAST(edited_at AS STRING) AS edited_at"
            f" FROM {SCHEMA}.content_edit_log"
            f" WHERE entity_id IN ({ph})"
            f" QUALIFY ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY edited_at DESC) = 1"
        )
        rows = _qc(cursor, sql_str, entity_ids) if cursor is not None else query(sql_str, entity_ids)
        return {r["entity_id"]: r for r in rows}
    except Exception:
        return {}

def _log_edit(entity_type, entity_id, bow_id, portfolio_id, changes_dict, rationale, revision_reason, edited_by):
    if not LOGGING_ENABLED:
        return True
    # L-7: wrap in try/except so a log failure never kills the parent data write
    try:
        execute(
            f"""INSERT INTO {SCHEMA}.content_edit_log
                (log_id, entity_type, entity_id, bow_id, portfolio_id,
                 changes, rationale, revision_reason, edited_by, edited_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
            [new_id(), entity_type, entity_id, bow_id, portfolio_id,
             _json.dumps(changes_dict), rationale or None, revision_reason or None, edited_by]
        )
        return True
    except Exception as e:
        print(f"[_log_edit] WARNING: audit trail write failed for {entity_type}/{entity_id}: {e}")
        return False

def _build_changes(old_row, new_data, allowed_fields):
    """Returns dict of {field: {old, new}} for fields that actually changed."""
    changes = {}
    for f in allowed_fields:
        if f not in new_data:
            continue
        old_v = str(old_row.get(f, "") or "")
        new_v = str(new_data[f] or "")
        if old_v != new_v:
            changes[f] = {"old": old_v, "new": new_v}
    return changes

# ── BOW full detail ────────────────────────────────────────────────────────────

@app.route("/api/bow/<bow_id>/full")
def get_bow_full(bow_id):
    # L-5: single connection for all queries — avoids 6-7 separate handshakes per request
    with get_connection() as conn:
        with conn.cursor() as cur:
            bow_rows = _qc(cur, f"SELECT * FROM {SCHEMA}.bows WHERE bow_id = ?", [bow_id])
            if not bow_rows:
                return jsonify({"error": "not found"}), 404
            bow = bow_rows[0]

            outcomes = _qc(cur,
                f"SELECT * FROM {SCHEMA}.bow_outcomes WHERE bow_id = ? ORDER BY sort_order",
                [bow_id]
            )

            try:
                ind_rows = _qc(cur,
                    f"""SELECT i.*,
                               a.actual_value  AS latest_actual,
                               a.year          AS latest_actual_year,
                               a.reading_date  AS latest_actual_date,
                               a.loaded_by     AS latest_actual_by
                        FROM {SCHEMA}.bow_indicators i
                        LEFT JOIN (
                            SELECT indicator_id, actual_value, year,
                                   reading_date, loaded_by,
                                   ROW_NUMBER() OVER (
                                       PARTITION BY indicator_id ORDER BY year DESC, loaded_at DESC
                                   ) AS rn
                            FROM {SCHEMA}.bow_indicator_actuals
                        ) a ON i.indicator_id = a.indicator_id AND a.rn = 1
                        WHERE i.bow_id = ?
                          AND COALESCE(i.is_active, true) = true
                        ORDER BY i.outcome_id, i.indicator_id""",
                    [bow_id]
                )
            except Exception:
                ind_rows = _qc(cur,
                    f"""SELECT * FROM {SCHEMA}.bow_indicators
                        WHERE bow_id = ? AND COALESCE(is_active, true) = true
                        ORDER BY outcome_id, indicator_id""",
                    [bow_id]
                )

            try:
                all_actuals = _qc(cur,
                    f"""SELECT a.indicator_id, a.year, a.period, a.actual_value, a.reading_date
                        FROM {SCHEMA}.bow_indicator_actuals a
                        INNER JOIN (
                            SELECT indicator_id, year, period, MAX(loaded_at) AS max_loaded
                            FROM {SCHEMA}.bow_indicator_actuals
                            WHERE indicator_id IN (
                                SELECT indicator_id FROM {SCHEMA}.bow_indicators
                                WHERE bow_id = ? AND COALESCE(is_active, true) = true
                            )
                            GROUP BY indicator_id, year, period
                        ) b ON a.indicator_id = b.indicator_id
                            AND a.year        = b.year
                            AND COALESCE(a.period, '')  = COALESCE(b.period, '')
                            AND a.loaded_at   = b.max_loaded
                        ORDER BY a.indicator_id, a.year, a.period""",
                    [bow_id]
                )
            except Exception:
                all_actuals = []

            source_ids = list({i["source_id"] for i in ind_rows if i.get("source_id")})
            source_map = {}
            if source_ids:
                try:
                    ph = ",".join(["?" for _ in source_ids])
                    src_rows = _qc(cur,
                        f"SELECT source_id, source_name, source_url FROM {SCHEMA}.sources WHERE source_id IN ({ph})",
                        source_ids
                    )
                    source_map = {r["source_id"]: r for r in src_rows}
                except Exception:
                    pass

            execution_targets = _qc(cur,
                f"""SELECT t.*, s.completion, s.notes AS status_notes, s.last_updated, s.updated_by
                    FROM {SCHEMA}.execution_targets t
                    LEFT JOIN {SCHEMA}.execution_target_status s
                      ON t.target_id = s.target_id AND t.year = s.year
                    WHERE t.bow_id = ? AND COALESCE(t.is_active, true) = true
                    ORDER BY t.year, t.sort_order""",
                [bow_id]
            )

            all_ids = [o["outcome_id"] for o in outcomes] + [i["indicator_id"] for i in ind_rows]
            edit_map = _fetch_edit_map(all_ids, cursor=cur)

    # ── Python post-processing (connection already closed) ──────────────────
    actuals_by_ind = {}
    for a in all_actuals:
        actuals_by_ind.setdefault(a["indicator_id"], []).append({
            "year":         a["year"],
            "period":       a.get("period"),
            "actual_value": a["actual_value"],
            "reading_date": a.get("reading_date"),
        })

    indicators = []
    for ind in ind_rows:
        ind["actuals"] = actuals_by_ind.get(ind["indicator_id"], [])
        src = source_map.get(ind.get("source_id"), {})
        ind["source_name"] = src.get("source_name", "") if src else ""
        ind["source_url"]  = src.get("source_url", "")  if src else ""
        indicators.append(ind)

    ind_by_outcome = {}
    for ind in indicators:
        key = ind.get("outcome_id") or "__none"
        ind_by_outcome.setdefault(key, []).append(ind)

    for out in outcomes:
        out["indicators"] = ind_by_outcome.get(out["outcome_id"], [])

    _attach_last_edited(outcomes, "outcome_id", edit_map)
    _attach_last_edited(indicators, "indicator_id", edit_map)

    return jsonify({
        "bow": bow,
        "outcomes": outcomes,
        "execution_targets": execution_targets,
    })


# ── Theory of Action ───────────────────────────────────────────────────────────

@app.route("/api/toa/<portfolio_id>")
def get_portfolio_toa(portfolio_id):
    toa_rows = query(
        f"SELECT * FROM {SCHEMA}.portfolio_toa WHERE portfolio_id = ?",
        [portfolio_id]
    )
    if not toa_rows:
        return jsonify({"toa": None, "lanes": []})

    toa = toa_rows[0]

    lanes = query(
        f"""SELECT * FROM {SCHEMA}.portfolio_toa_lanes
            WHERE portfolio_id = ? AND COALESCE(is_active, true) = true
            ORDER BY sort_order""",
        [portfolio_id]
    )

    for lane in lanes:
        lid = lane["lane_id"]
        acts = query(
            f"""SELECT activity_id, activity_text, sort_order
                FROM {SCHEMA}.portfolio_toa_activities
                WHERE lane_id = ? ORDER BY sort_order""",
            [lid]
        )
        lane["activities"] = acts  # full objects with activity_id

        inds = query(
            f"""SELECT indicator_id, indicator_text, sort_order
                FROM {SCHEMA}.portfolio_toa_lane_indicators
                WHERE lane_id = ? ORDER BY sort_order""",
            [lid]
        )
        lane["indicators"] = inds  # full objects with indicator_id

    return jsonify({"toa": toa, "lanes": lanes})


# ── Theory of Action — edit endpoints ─────────────────────────────────────────

@app.route("/api/toa/<portfolio_id>", methods=["PATCH"])
def update_portfolio_toa(portfolio_id):
    data    = request.json or {}
    user    = _actor(data)
    allowed = {
        "problem_statement", "col1_label", "col2_label",
        "cross_indicators_json", "cross_indicators_label",
        "amb45_intro_text", "amb45_label", "amb45_full_text", "amb45_buckets_json"
    }
    sets, vals = [], []
    for f in allowed:
        if f in data:
            sets.append(f"`{f}` = ?")
            vals.append(data[f])
    if not sets:
        return jsonify({"status": "no_change"})
    vals.append(portfolio_id)
    execute(f"UPDATE {SCHEMA}.portfolio_toa SET {', '.join(sets)} WHERE portfolio_id = ?", vals)
    if "problem_statement" in data:
        _log_edit("portfolio_problem_statement", portfolio_id, None, portfolio_id,
                  {"problem_statement": {"new": data["problem_statement"]}}, None, None, user)
    return jsonify({"status": "ok"})


@app.route("/api/toa/lanes/<lane_id>", methods=["PATCH"])
def update_toa_lane(lane_id):
    data    = request.json or {}
    allowed = {"label", "outcome_text", "icon", "color"}
    sets, vals = [], []
    for f in allowed:
        if f in data:
            sets.append(f"`{f}` = ?")
            vals.append(data[f])
    if not sets:
        return jsonify({"status": "no_change"})
    vals.append(lane_id)
    execute(f"UPDATE {SCHEMA}.portfolio_toa_lanes SET {', '.join(sets)} WHERE lane_id = ?", vals)
    return jsonify({"status": "ok"})


@app.route("/api/toa/activities", methods=["POST"])
def add_toa_activity():
    data = request.json or {}
    aid  = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_toa_activities
            (activity_id, lane_id, portfolio_id, activity_text, sort_order)
            VALUES (?, ?, ?, ?, ?)""",
        [aid, data["lane_id"], data["portfolio_id"], data["activity_text"], data.get("sort_order", 99)]
    )
    return jsonify({"status": "ok", "activity_id": aid})


@app.route("/api/toa/activities/<activity_id>", methods=["PATCH"])
def update_toa_activity(activity_id):
    data = request.json or {}
    execute(
        f"UPDATE {SCHEMA}.portfolio_toa_activities SET activity_text = ? WHERE activity_id = ?",
        [data.get("activity_text", ""), activity_id]
    )
    return jsonify({"status": "ok"})


@app.route("/api/toa/activities/<activity_id>", methods=["DELETE"])
def delete_toa_activity(activity_id):
    execute(f"DELETE FROM {SCHEMA}.portfolio_toa_activities WHERE activity_id = ?", [activity_id])
    return jsonify({"status": "ok"})


@app.route("/api/toa/lane-indicators", methods=["POST"])
def add_toa_lane_indicator():
    data = request.json or {}
    iid  = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_toa_lane_indicators
            (indicator_id, lane_id, portfolio_id, indicator_text, sort_order)
            VALUES (?, ?, ?, ?, ?)""",
        [iid, data["lane_id"], data["portfolio_id"], data["indicator_text"], data.get("sort_order", 99)]
    )
    return jsonify({"status": "ok", "indicator_id": iid})


@app.route("/api/toa/lane-indicators/<indicator_id>", methods=["PATCH"])
def update_toa_lane_indicator(indicator_id):
    data = request.json or {}
    execute(
        f"UPDATE {SCHEMA}.portfolio_toa_lane_indicators SET indicator_text = ? WHERE indicator_id = ?",
        [data.get("indicator_text", ""), indicator_id]
    )
    return jsonify({"status": "ok"})


@app.route("/api/toa/lane-indicators/<indicator_id>", methods=["DELETE"])
def delete_toa_lane_indicator(indicator_id):
    execute(f"DELETE FROM {SCHEMA}.portfolio_toa_lane_indicators WHERE indicator_id = ?", [indicator_id])
    return jsonify({"status": "ok"})


# ── BOW edit summary (passive timestamps) ─────────────────────────────────────

def _latest_stamp(table, bow_id):
    """Return {edited_by, edited_at} for the most recently updated row in
    table for this BOW.  Reads last_updated / updated_by directly — no
    dependency on content_edit_log."""
    try:
        rows = query(
            f"""SELECT updated_by AS edited_by,
                       CAST(last_updated AS STRING) AS edited_at
                FROM {SCHEMA}.{table}
                WHERE bow_id = ? AND last_updated IS NOT NULL
                ORDER BY last_updated DESC
                LIMIT 1""",
            [bow_id]
        )
        return rows[0] if rows else {}
    except Exception:
        return {}


@app.route("/api/bow/<bow_id>/edit-summary")
def get_bow_edit_summary(bow_id):
    """Return the most-recent edit per section for passive timestamp display.
    Reads last_updated / updated_by directly from each entity table so the
    timestamp is always in sync with the most recent write — no dependency
    on content_edit_log."""

    # Outcomes & Execution Targets: pick the more recent of bow_outcomes vs execution_targets
    ot_candidates = [
        _latest_stamp("bow_outcomes",      bow_id),
        _latest_stamp("execution_targets", bow_id),
    ]
    ot_candidates = [c for c in ot_candidates if c.get("edited_at")]
    ot = max(ot_candidates, key=lambda r: r["edited_at"]) if ot_candidates else {}

    # Indicators
    ind = _latest_stamp("bow_indicators", bow_id)

    return jsonify({
        "outcomes_targets": {
            "edited_by": ot.get("edited_by"),
            "edited_at": ot.get("edited_at"),
        },
        "indicators": {
            "edited_by": ind.get("edited_by"),
            "edited_at": ind.get("edited_at"),
        },
    })


# ── Portfolio full detail ───────────────────────────────────────────────────────

@app.route("/api/portfolio/<portfolio_id>/full")
def get_portfolio_full(portfolio_id):
    # L-5: single connection for all queries — avoids 7-8 separate handshakes per request
    with get_connection() as conn:
        with conn.cursor() as cur:
            port_rows = _qc(cur, f"SELECT * FROM {SCHEMA}.portfolios WHERE portfolio_id = ?", [portfolio_id])
            if not port_rows:
                return jsonify({"error": "not found"}), 404
            portfolio = port_rows[0]

            try:
                outcomes = _qc(cur,
                    f"""SELECT outcome_id, portfolio_id,
                               COALESCE(NULLIF(title, ''), short_title) AS title,
                               COALESCE(text, outcome) AS text,
                               sort_order, investments_inputs
                        FROM {SCHEMA}.portfolio_outcomes
                        WHERE portfolio_id = ?
                        ORDER BY sort_order""",
                    [portfolio_id]
                )
            except Exception:
                outcomes = _qc(cur,
                    f"SELECT * FROM {SCHEMA}.portfolio_outcomes WHERE portfolio_id = ? ORDER BY sort_order",
                    [portfolio_id]
                )
                for o in outcomes:
                    if not o.get("text") and o.get("outcome"):
                        o["text"] = o["outcome"]
                    if not o.get("title") and o.get("short_title"):
                        o["title"] = o["short_title"]

            try:
                indicators = _qc(cur,
                    f"""SELECT
                            i.indicator_id, i.portfolio_id, i.outcome_id, i.bow_indicator_id,
                            i.baseline,
                            i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                            COALESCE(b.name,  i.name)  AS name,
                            COALESCE(b.text,  i.text)  AS text,
                            COALESCE(b.purpose, i.purpose) AS purpose,
                            COALESCE(b.unit,  i.unit)  AS unit,
                            COALESCE(b.collection_frequency, i.collection_frequency) AS collection_frequency,
                            COALESCE(b.source_id, i.source_id) AS source_id,
                            COALESCE(b.measurement_level, i.measurement_level) AS measurement_level,
                            COALESCE(b.status, i.status) AS status,
                            COALESCE(b.data_quality_notes, i.data_quality_notes) AS data_quality_notes,
                            COALESCE(b.tracking_notes, i.tracking_notes) AS tracking_notes,
                            b.bow_id, b.outcome_id AS bow_outcome_id,
                            a.actual_value  AS latest_actual,
                            a.year          AS latest_actual_year,
                            a.reading_date  AS latest_actual_date,
                            a.loaded_by     AS latest_actual_by
                        FROM {SCHEMA}.portfolio_indicators i
                        LEFT JOIN {SCHEMA}.bow_indicators b ON i.bow_indicator_id = b.indicator_id
                        LEFT JOIN (
                            SELECT indicator_id, actual_value, year,
                                   reading_date, loaded_by,
                                   ROW_NUMBER() OVER (
                                       PARTITION BY indicator_id ORDER BY year DESC, loaded_at DESC
                                   ) AS rn
                            FROM {SCHEMA}.portfolio_indicator_actuals
                        ) a ON i.indicator_id = a.indicator_id AND a.rn = 1
                        WHERE i.portfolio_id = ?
                        ORDER BY i.outcome_id, i.indicator_id""",
                    [portfolio_id]
                )
            except Exception:
                indicators = _qc(cur,
                    f"""SELECT * FROM {SCHEMA}.portfolio_indicators
                        WHERE portfolio_id = ?
                        ORDER BY outcome_id, indicator_id""",
                    [portfolio_id]
                )

            port_source_ids = list({i["source_id"] for i in indicators if i.get("source_id")})
            port_source_map = {}
            if port_source_ids:
                try:
                    ph = ",".join(["?" for _ in port_source_ids])
                    src_rows = _qc(cur,
                        f"SELECT source_id, source_name, source_url FROM {SCHEMA}.sources WHERE source_id IN ({ph})",
                        port_source_ids
                    )
                    port_source_map = {r["source_id"]: r for r in src_rows}
                except Exception:
                    pass

            toa_lanes = _qc(cur,
                f"""SELECT * FROM {SCHEMA}.portfolio_toa_lanes
                    WHERE portfolio_id = ? AND COALESCE(is_active, true) = true
                    ORDER BY sort_order""",
                [portfolio_id]
            )
            all_acts = _qc(cur,
                f"""SELECT a.lane_id, a.activity_id, a.activity_text, a.sort_order
                    FROM {SCHEMA}.portfolio_toa_activities a
                    JOIN {SCHEMA}.portfolio_toa_lanes l ON a.lane_id = l.lane_id
                    WHERE l.portfolio_id = ?
                    ORDER BY a.sort_order""",
                [portfolio_id]
            )

            try:
                toa_rows = _qc(cur,
                    f"SELECT problem_statement FROM {SCHEMA}.portfolio_toa WHERE portfolio_id = ?",
                    [portfolio_id]
                )
                problem_statement = toa_rows[0].get("problem_statement", "") if toa_rows else ""
            except Exception:
                problem_statement = ""

            all_ids = [o["outcome_id"] for o in outcomes] + [i["indicator_id"] for i in indicators]
            edit_map = _fetch_edit_map(all_ids, cursor=cur)

    # ── Python post-processing (connection already closed) ──────────────────
    for ind in indicators:
        src = port_source_map.get(ind.get("source_id"), {})
        ind["source_name"] = src.get("source_name", "") if src else ""
        ind["source_url"]  = src.get("source_url", "")  if src else ""

    ind_by_outcome = {}
    for ind in indicators:
        key = ind.get("outcome_id") or "__none"
        ind_by_outcome.setdefault(key, []).append(ind)

    acts_by_lane = {}
    for a in all_acts:
        acts_by_lane.setdefault(a["lane_id"], []).append(a)

    lane_by_id    = {l["lane_id"]: l for l in toa_lanes}
    lane_by_label = {(l.get("label") or "").strip().lower(): l for l in toa_lanes}

    for out in outcomes:
        out["indicators"] = ind_by_outcome.get(out["outcome_id"], [])
        lane = lane_by_id.get(out["outcome_id"])
        if not lane:
            key = (out.get("short_title") or out.get("title") or "").strip().lower()
            lane = lane_by_label.get(key)
        out["toa_activities"] = acts_by_lane.get(lane["lane_id"], []) if lane else []

    _attach_last_edited(outcomes, "outcome_id", edit_map)
    _attach_last_edited(indicators, "indicator_id", edit_map)

    return jsonify({
        "portfolio": portfolio,
        "outcomes": outcomes,
        "problem_statement": problem_statement,
    })


# ── Portfolio edit summary (passive timestamps) ────────────────────────────────

@app.route("/api/portfolio/<portfolio_id>/edit-summary")
def get_portfolio_edit_summary(portfolio_id):
    """Return the most-recent edit per section for passive timestamp display."""
    try:
        rows = query(
            f"""SELECT entity_type, edited_by, CAST(edited_at AS STRING) AS edited_at
                FROM {SCHEMA}.content_edit_log
                WHERE portfolio_id = ?
                QUALIFY ROW_NUMBER() OVER (PARTITION BY entity_type ORDER BY edited_at DESC) = 1""",
            [portfolio_id]
        )
    except Exception:
        rows = []

    by_type = {r["entity_type"]: r for r in rows}

    def _entry(key):
        r = by_type.get(key, {})
        return {"edited_by": r.get("edited_by"), "edited_at": r.get("edited_at")}

    return jsonify({
        "description":       _entry("portfolio_description"),
        "problem_statement": _entry("portfolio_problem_statement"),
        "outcomes":          _entry("portfolio_outcome"),
        "indicators":        _entry("portfolio_indicator"),
    })


# ── BOW outcomes CRUD ──────────────────────────────────────────────────────────

BOW_OUTCOME_EDITABLE = {"title", "text"}

@app.route("/api/bow-outcomes/<outcome_id>", methods=["PATCH"])
def update_bow_outcome(outcome_id):
    data    = request.json or {}
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.bow_outcomes WHERE outcome_id = ?", [outcome_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old     = rows[0]
    changes = _build_changes(old, data, BOW_OUTCOME_EDITABLE)
    if not changes:
        return jsonify({"status": "no_change"})

    has_major = any(f in MAJOR_TEXT_FIELDS for f in changes)
    rationale = data.get("rationale", "").strip() if has_major else None
    if has_major and not rationale:
        return jsonify({"error": "rationale required for text field changes"}), 400

    sets = ", ".join(f"`{f}` = ?" for f in changes) + ", last_updated = current_timestamp(), updated_by = ?"
    vals = [changes[f]["new"] for f in changes] + [user, outcome_id]
    execute(f"UPDATE {SCHEMA}.bow_outcomes SET {sets} WHERE outcome_id = ?", vals)
    _log_edit("bow_outcome", outcome_id, old["bow_id"], None, changes, rationale, None, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/bow-outcomes", methods=["POST"])
def add_bow_outcome():
    data    = request.json or {}
    bow_id  = data.get("bow_id")
    title   = (data.get("title") or "").strip()
    user    = _actor(data)
    if not bow_id or not title:
        return jsonify({"error": "bow_id and title required"}), 400
    max_sort = query(f"SELECT MAX(sort_order) AS m FROM {SCHEMA}.bow_outcomes WHERE bow_id = ?", [bow_id])
    sort_order = (max_sort[0]["m"] or 0) + 1
    oid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.bow_outcomes
            (outcome_id, bow_id, title, `text`, sort_order, last_updated, updated_by)
            VALUES (?, ?, ?, ?, ?, current_timestamp(), ?)""",
        [oid, bow_id, title, data.get("text", ""), sort_order, user]
    )
    _log_edit("bow_outcome", oid, bow_id, None,
              {"title": {"old": None, "new": title}}, "New outcome added", None, user)
    return jsonify({"status": "ok", "outcome_id": oid})


@app.route("/api/bow-outcomes/<outcome_id>", methods=["DELETE"])
def delete_bow_outcome(outcome_id):
    rows = query(f"SELECT * FROM {SCHEMA}.bow_outcomes WHERE outcome_id = ?", [outcome_id])
    if rows:
        o = rows[0]
        user = _actor()
        _log_edit("bow_outcome", outcome_id, o.get("bow_id"), None,
                  {"title": {"old": o.get("title"), "new": None}}, "Outcome removed", None, user)
    execute(f"DELETE FROM {SCHEMA}.bow_outcomes WHERE outcome_id = ?", [outcome_id])
    execute(f"UPDATE {SCHEMA}.bow_indicators SET is_active = false WHERE outcome_id = ?", [outcome_id])
    return jsonify({"status": "ok"})


# ── BOW indicators CRUD ────────────────────────────────────────────────────────

BOW_IND_EDITABLE = {
    "name", "text", "purpose", "unit", "collection_frequency", "baseline", "data_source",
    "source_id", "measurement_level", "status", "data_quality_notes",
    "tracking_notes",
    "target_2026", "target_2027", "target_2028", "target_2029", "target_2030",
}

@app.route("/api/bow-indicators/<indicator_id>", methods=["PATCH"])
def update_bow_indicator(indicator_id):
    data    = request.json or {}
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.bow_indicators WHERE indicator_id = ?", [indicator_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old     = rows[0]
    changes = _build_changes(old, data, BOW_IND_EDITABLE)
    if not changes:
        return jsonify({"status": "no_change"})

    has_major  = any(f in MAJOR_TEXT_FIELDS for f in changes)
    has_target = any(f in TARGET_FIELDS for f in changes)
    rationale       = data.get("rationale", "").strip() if has_major else None
    revision_reason = data.get("revision_reason", "").strip() if has_target else None

    if has_major and not rationale:
        return jsonify({"error": "rationale required for indicator text changes"}), 400
    if has_target and not revision_reason:
        return jsonify({"error": "revision_reason required for target changes"}), 400

    sets = ", ".join(f"`{f}` = ?" for f in changes) + ", last_updated = current_timestamp(), updated_by = ?"
    vals = [changes[f]["new"] for f in changes] + [user, indicator_id]
    execute(f"UPDATE {SCHEMA}.bow_indicators SET {sets} WHERE indicator_id = ?", vals)
    _log_edit("bow_indicator", indicator_id, old["bow_id"], None, changes, rationale, revision_reason, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/bow-indicators", methods=["POST"])
def add_bow_indicator():
    data        = request.json or {}
    bow_id      = data.get("bow_id")
    outcome_id  = data.get("outcome_id")
    text        = (data.get("text") or "").strip()
    user        = _actor(data)
    if not bow_id or not text:
        return jsonify({"error": "bow_id and text required"}), 400
    iid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.bow_indicators
            (indicator_id, bow_id, outcome_id, `name`, `text`, purpose, unit, collection_frequency,
             baseline, source_id, measurement_level, `status`,
             data_quality_notes, tracking_notes,
             target_2026, target_2027, target_2028, target_2029, target_2030,
             is_active, last_updated, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, current_timestamp(), ?)""",
        [iid, bow_id, outcome_id or None,
         data.get("name") or None, text, data.get("purpose") or None,
         data.get("unit") or None, data.get("collection_frequency") or None,
         data.get("baseline") or None, data.get("source_id") or None,
         data.get("measurement_level") or None, data.get("status") or "active",
         data.get("data_quality_notes") or None, data.get("tracking_notes") or None,
         data.get("target_2026") or None, data.get("target_2027") or None,
         data.get("target_2028") or None, data.get("target_2029") or None,
         data.get("target_2030") or None, user]
    )
    _log_edit("bow_indicator", iid, bow_id, None,
              {"name": {"old": None, "new": data.get("name") or text}}, "New indicator added", None, user)
    return jsonify({"status": "ok", "indicator_id": iid})


@app.route("/api/bow-indicators/<indicator_id>", methods=["DELETE"])
def delete_bow_indicator(indicator_id):
    rows = query(f"SELECT * FROM {SCHEMA}.bow_indicators WHERE indicator_id = ?", [indicator_id])
    user = _actor()
    if rows:
        ind = rows[0]
        _log_edit("bow_indicator", indicator_id, ind.get("bow_id"), None,
                  {"text": {"old": ind.get("text"), "new": None}}, "Indicator removed", None, user)
    execute(
        f"UPDATE {SCHEMA}.bow_indicators SET is_active = false, last_updated = current_timestamp(), updated_by = ? WHERE indicator_id = ?",
        [user, indicator_id]
    )
    return jsonify({"status": "ok"})


# ── Execution targets CRUD ─────────────────────────────────────────────────────

@app.route("/api/execution-targets/<target_id>", methods=["PATCH"])
def update_execution_target(target_id):
    data    = request.json or {}
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.execution_targets WHERE target_id = ?", [target_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old     = rows[0]
    changes = _build_changes(old, data, {"text"})
    if not changes:
        return jsonify({"status": "no_change"})

    rationale = data.get("rationale", "").strip()
    if not rationale:
        return jsonify({"error": "rationale required for execution target text changes"}), 400

    execute(
        f"UPDATE {SCHEMA}.execution_targets SET `text` = ?, last_updated = current_timestamp(), updated_by = ? WHERE target_id = ?",
        [changes["text"]["new"], user, target_id]
    )
    logged = _log_edit("execution_target", target_id, old["bow_id"], None, changes, rationale, None, user)
    resp = {"status": "ok"}
    if not logged:
        resp["log_warning"] = True
    return jsonify(resp)


@app.route("/api/execution-targets", methods=["POST"])
def add_execution_target():
    data       = request.json or {}
    bow_id     = data.get("bow_id")
    outcome_id = data.get("outcome_id")
    year       = data.get("year")
    text       = (data.get("text") or "").strip()
    user       = _actor(data)
    if not bow_id or not year or not text:
        return jsonify({"error": "bow_id, year, and text required"}), 400
    max_sort = query(
        f"SELECT MAX(sort_order) AS m FROM {SCHEMA}.execution_targets WHERE bow_id = ? AND `year` = ?",
        [bow_id, year]
    )
    sort_order = (max_sort[0]["m"] or 0) + 1
    tid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.execution_targets
            (target_id, bow_id, outcome_id, `year`, `text`, sort_order, last_updated, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, current_timestamp(), ?)""",
        [tid, bow_id, outcome_id or None, year, text, sort_order, user]
    )
    _log_edit("execution_target", tid, bow_id, None,
              {"text": {"old": None, "new": text}, "year": {"old": None, "new": year}},
              f"New target added for {year}", None, user)
    return jsonify({"status": "ok", "target_id": tid})


@app.route("/api/execution-targets/<target_id>", methods=["DELETE"])
def delete_execution_target(target_id):
    rows = query(f"SELECT * FROM {SCHEMA}.execution_targets WHERE target_id = ?", [target_id])
    user = _actor()
    if rows:
        t = rows[0]
        _log_edit("execution_target", target_id, t.get("bow_id"), None,
                  {"text": {"old": t.get("text"), "new": None}},
                  "Target removed", None, user)
    # Soft-delete so last_updated stays readable for the section timestamp
    execute(
        f"UPDATE {SCHEMA}.execution_targets SET is_active = false, last_updated = current_timestamp(), updated_by = ? WHERE target_id = ?",
        [user, target_id]
    )
    execute(f"DELETE FROM {SCHEMA}.execution_target_status WHERE target_id = ?", [target_id])
    return jsonify({"status": "ok"})


# ── Portfolio outcomes CRUD ────────────────────────────────────────────────────

PORT_OUTCOME_EDITABLE = {"title", "outcome", "investments_inputs"}

@app.route("/api/portfolio-outcomes/<outcome_id>", methods=["PATCH"])
def update_portfolio_outcome(outcome_id):
    data    = request.json or {}
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.portfolio_outcomes WHERE outcome_id = ?", [outcome_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old     = rows[0]
    changes = _build_changes(old, data, PORT_OUTCOME_EDITABLE)
    if not changes:
        return jsonify({"status": "no_change"})

    has_major = any(f in MAJOR_TEXT_FIELDS for f in changes)
    rationale = data.get("rationale", "").strip() if has_major else None
    if has_major and not rationale:
        return jsonify({"error": "rationale required for text field changes"}), 400

    sets = ", ".join(f"`{f}` = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [outcome_id]
    execute(f"UPDATE {SCHEMA}.portfolio_outcomes SET {sets} WHERE outcome_id = ?", vals)
    _log_edit("portfolio_outcome", outcome_id, None, old["portfolio_id"], changes, rationale, None, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/portfolio-outcomes", methods=["POST"])
def add_portfolio_outcome():
    data         = request.json or {}
    portfolio_id = data.get("portfolio_id")
    title        = (data.get("title") or "").strip()
    if not portfolio_id or not title:
        return jsonify({"error": "portfolio_id and title required"}), 400
    max_sort = query(
        f"SELECT MAX(sort_order) AS m FROM {SCHEMA}.portfolio_outcomes WHERE portfolio_id = ?",
        [portfolio_id]
    )
    sort_order = (max_sort[0]["m"] or 0) + 1
    oid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_outcomes
            (outcome_id, portfolio_id, title, short_title, outcome, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)""",
        [oid, portfolio_id, title, data.get("short_title", ""), data.get("outcome", data.get("text", "")), sort_order]
    )
    return jsonify({"status": "ok", "outcome_id": oid})


@app.route("/api/portfolio-outcomes/<outcome_id>", methods=["DELETE"])
def delete_portfolio_outcome(outcome_id):
    execute(f"DELETE FROM {SCHEMA}.portfolio_outcomes WHERE outcome_id = ?", [outcome_id])
    execute(
        f"UPDATE {SCHEMA}.portfolio_indicators SET is_active = false WHERE outcome_id = ?",
        [outcome_id]
    )
    return jsonify({"status": "ok"})


# ── Portfolio indicators CRUD ──────────────────────────────────────────────────

PORT_IND_EDITABLE = {
    "name", "text", "purpose", "unit", "collection_frequency", "baseline", "data_source",
    "source_id", "measurement_level", "status", "data_quality_notes",
    "tracking_notes",
    "target_2026", "target_2027", "target_2028", "target_2029", "target_2030",
}

@app.route("/api/portfolio-indicators/<indicator_id>", methods=["PATCH"])
def update_portfolio_indicator(indicator_id):
    data    = request.json or {}
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?", [indicator_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old = rows[0]
    # When linked to a BOW indicator, only targets/baseline are editable here;
    # metadata edits go to the BOW indicator record directly.
    editable = ({"baseline"} | TARGET_FIELDS) if old.get("bow_indicator_id") else PORT_IND_EDITABLE
    changes = _build_changes(old, data, editable)
    if not changes:
        return jsonify({"status": "no_change"})

    has_major  = any(f in MAJOR_TEXT_FIELDS for f in changes)
    has_target = any(f in TARGET_FIELDS for f in changes)
    rationale       = data.get("rationale", "").strip() if has_major else None
    revision_reason = data.get("revision_reason", "").strip() if has_target else None

    if has_major and not rationale:
        return jsonify({"error": "rationale required for indicator text changes"}), 400
    if has_target and not revision_reason:
        return jsonify({"error": "revision_reason required for target changes"}), 400

    sets = ", ".join(f"`{f}` = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [indicator_id]
    execute(f"UPDATE {SCHEMA}.portfolio_indicators SET {sets} WHERE indicator_id = ?", vals)
    _log_edit("portfolio_indicator", indicator_id, None, old["portfolio_id"], changes, rationale, revision_reason, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/portfolio-indicators", methods=["POST"])
def add_portfolio_indicator():
    data             = request.json or {}
    portfolio_id     = data.get("portfolio_id")
    outcome_id       = data.get("outcome_id")
    bow_indicator_id = data.get("bow_indicator_id")
    user             = _actor(data)

    if not portfolio_id:
        return jsonify({"error": "portfolio_id required"}), 400

    if bow_indicator_id:
        # Linked case — only store the FK + outcome/targets; metadata lives on the BOW indicator
        bow_rows = query(
            f"SELECT name, `text` FROM {SCHEMA}.bow_indicators WHERE indicator_id = ?",
            [bow_indicator_id]
        )
        if not bow_rows:
            return jsonify({"error": "bow_indicator_id not found"}), 404
        iid = new_id()
        execute(
            f"""INSERT INTO {SCHEMA}.portfolio_indicators
                (indicator_id, portfolio_id, outcome_id, bow_indicator_id,
                 baseline, target_2026, target_2027, target_2028, target_2029, target_2030)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [iid, portfolio_id, outcome_id or None, bow_indicator_id,
             data.get("baseline") or None,
             data.get("target_2026") or None, data.get("target_2027") or None,
             data.get("target_2028") or None, data.get("target_2029") or None,
             data.get("target_2030") or None]
        )
        label = bow_rows[0].get("name") or bow_rows[0].get("text") or bow_indicator_id
        _log_edit("portfolio_indicator", iid, None, portfolio_id,
                  {"bow_indicator_id": {"old": None, "new": bow_indicator_id},
                   "name": {"old": None, "new": label}},
                  "Linked BOW indicator added to portfolio", None, user)
        return jsonify({"status": "ok", "indicator_id": iid})

    # Standalone case
    text = (data.get("text") or data.get("name") or "").strip()
    if not text:
        return jsonify({"error": "bow_indicator_id or name/text required"}), 400
    iid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_indicators
            (indicator_id, portfolio_id, outcome_id, `name`, `text`, purpose, unit, collection_frequency,
             baseline, source_id, measurement_level, `status`,
             data_quality_notes, tracking_notes,
             target_2026, target_2027, target_2028, target_2029, target_2030)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [iid, portfolio_id, outcome_id or None,
         data.get("name") or None, text, data.get("purpose") or None,
         data.get("unit") or None, data.get("collection_frequency") or None,
         data.get("baseline") or None, data.get("source_id") or None,
         data.get("measurement_level") or None, data.get("status") or "active",
         data.get("data_quality_notes") or None, data.get("tracking_notes") or None,
         data.get("target_2026") or None, data.get("target_2027") or None,
         data.get("target_2028") or None, data.get("target_2029") or None,
         data.get("target_2030") or None]
    )
    _log_edit("portfolio_indicator", iid, None, portfolio_id,
              {"name": {"old": None, "new": data.get("name") or text}}, "New standalone indicator added", None, user)
    return jsonify({"status": "ok", "indicator_id": iid})


@app.route("/api/portfolio-indicators/<indicator_id>", methods=["DELETE"])
def delete_portfolio_indicator(indicator_id):
    execute(
        f"UPDATE {SCHEMA}.portfolio_indicators SET is_active = false WHERE indicator_id = ?",
        [indicator_id]
    )
    return jsonify({"status": "ok"})


# ── Activity feed ──────────────────────────────────────────────────────────────

@app.route("/api/activity-feed")
def get_activity_feed():
    # Prune records older than 100 days on every load (no scheduler needed)
    try:
        execute(
            f"DELETE FROM {SCHEMA}.content_edit_log"
            f" WHERE edited_at < CURRENT_TIMESTAMP() - INTERVAL 100 DAYS"
        )
    except Exception as e:
        print(f"[activity-feed] cleanup warning: {e}")

    bow_filter       = request.args.get("bow_id")
    portfolio_filter = request.args.get("portfolio_id")
    type_filter      = request.args.get("type")       # 'edit' | 'submission'
    actor_filter     = request.args.get("actor")
    limit            = min(int(request.args.get("limit", 100)), 200)

    where_edit = "1=1"
    where_sub  = "1=1"
    params_edit, params_sub = [], []

    if bow_filter:
        where_edit += " AND l.bow_id = ?"
        params_edit.append(bow_filter)
        where_sub  += " AND i.bow_id = ?"
        params_sub.append(bow_filter)
    if portfolio_filter:
        where_edit += " AND l.portfolio_id = ?"
        params_edit.append(portfolio_filter)
        where_sub  += " AND i.portfolio_id = ?"
        params_sub.append(portfolio_filter)
    if actor_filter:
        where_edit += " AND l.edited_by = ?"
        params_edit.append(actor_filter)
        where_sub  += " AND p.submitted_by = ?"
        params_sub.append(actor_filter)

    edits, subs = [], []

    if type_filter != "submission":
        try:
            edits = query(
                f"""SELECT
                      'edit'              AS type,
                      l.log_id            AS id,
                      l.entity_type,
                      l.entity_id,
                      l.bow_id,
                      l.portfolio_id,
                      l.changes,
                      l.rationale,
                      l.revision_reason,
                      l.edited_by         AS actor,
                      CAST(l.edited_at AS STRING) AS ts,
                      b.title             AS bow_title
                    FROM {SCHEMA}.content_edit_log l
                    LEFT JOIN {SCHEMA}.bows b ON l.bow_id = b.bow_id
                    WHERE {where_edit}
                    ORDER BY l.edited_at DESC
                    LIMIT {limit}""",
                params_edit or None
            )
        except Exception:
            edits = []

    if type_filter != "edit":
      try:
        subs = query(
            f"""SELECT
                  'submission'           AS type,
                  p.pending_id           AS id,
                  NULL                   AS entity_type,
                  p.indicator_id         AS entity_id,
                  i.bow_id,
                  i.portfolio_id,
                  NULL                   AS changes,
                  NULL                   AS rationale,
                  NULL                   AS revision_reason,
                  p.submitted_by         AS actor,
                  CAST(p.submitted_at AS STRING) AS ts,
                  b.title                AS bow_title,
                  i.text                 AS indicator_text,
                  p.submitted_value,
                  p.status,
                  p.period,
                  p.year
                FROM {SCHEMA}.pending_actuals p
                LEFT JOIN {SCHEMA}.bow_indicators i  ON p.indicator_id  = i.indicator_id
                LEFT JOIN {SCHEMA}.bows b            ON i.bow_id        = b.bow_id
                WHERE {where_sub}
                ORDER BY p.submitted_at DESC
                LIMIT {limit}""",
            params_sub or None
        )
      except Exception:
        subs = []

    combined = sorted(edits + subs, key=lambda r: r.get("ts") or "", reverse=True)[:limit]
    return jsonify(combined)


@app.route("/api/activity/<log_id>", methods=["DELETE"])
def delete_activity(log_id):
    execute(
        f"DELETE FROM {SCHEMA}.content_edit_log WHERE log_id = ?",
        [log_id]
    )
    return jsonify({"deleted": log_id})


# ── Feedback ──────────────────────────────────────────────────────────────────

@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    data        = request.json or {}
    actor_email = _actor()
    # Look up display name from team_members
    author_name = None
    if actor_email and actor_email != "unknown":
        member = query(
            f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
            [actor_email]
        )
        if member:
            author_name = member[0]["display_name"]
    fb_id = str(uuid.uuid4())
    execute(
        f"""INSERT INTO {SCHEMA}.feedback
               (feedback_id, submitted_by, author_name, submitted_at,
                source, rating, working_well, improve)
            VALUES (?, ?, ?, current_timestamp(), ?, ?, ?, ?)""",
        [fb_id,
         actor_email,
         author_name,
         data.get("source") or "unknown",
         int(data.get("rating") or 0),
         data.get("working_well") or None,
         data.get("improve")      or None]
    )
    return jsonify({"feedback_id": fb_id})


@app.route("/api/feedback", methods=["GET"])
def get_feedback():
    rows = query(
        f"""SELECT feedback_id, submitted_by, author_name,
                   CAST(submitted_at AS STRING) AS submitted_at,
                   source, rating, working_well, improve
              FROM {SCHEMA}.feedback
             ORDER BY submitted_at DESC
             LIMIT 200"""
    )
    return jsonify(rows or [])


# ── Sources registry ──────────────────────────────────────────────────────────
# Schema (run once in Databricks):
#   CREATE TABLE usp_data.usp_strategy.sources (
#     source_id STRING, source_name STRING, source_type STRING,
#     source_url STRING, owner STRING, coverage_notes STRING,
#     created_at TIMESTAMP, created_by STRING
#   );
#   CREATE TABLE usp_data.usp_strategy.source_rounds (
#     round_id STRING, source_id STRING, round_label STRING,
#     collection_date DATE, document_url STRING, notes STRING,
#     created_at TIMESTAMP, created_by STRING
#   );
# Indicator table additions (run once):
#   ALTER TABLE usp_data.usp_strategy.bow_indicators ADD COLUMNS (
#     name STRING, purpose STRING, source_id STRING, measurement_level STRING,
#     status STRING, data_quality_notes STRING,
#     tracking_notes STRING
#   );
#   ALTER TABLE usp_data.usp_strategy.portfolio_indicators ADD COLUMNS (
#     name STRING, purpose STRING, source_id STRING, measurement_level STRING,
#     status STRING, data_quality_notes STRING,
#     tracking_notes STRING
#   );

@app.route("/api/indicators/catalog")
def get_indicators_catalog():
    """Returns every indicator (BOW + portfolio) normalised for the catalog view.
    Uses the same query shapes as the proven get_all_indicators /
    get_all_portfolio_indicators endpoints, then enriches with portfolio names
    and source details in separate safe queries."""

    # ── BOW indicators (mirrors get_all_indicators) ──────────────────────────
    try:
        bow_rows = query(f"""
            SELECT i.indicator_id, i.bow_id, i.outcome_id,
                   COALESCE(i.name, i.text) AS name,
                   i.text AS description,
                   i.source_id, i.collection_frequency, i.unit,
                   i.baseline,
                   i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                   COALESCE(i.status, 'draft') AS status,
                   b.title AS entity_name, b.portfolio_id
            FROM {SCHEMA}.bow_indicators i
            JOIN {SCHEMA}.bows b ON b.bow_id = i.bow_id
            WHERE COALESCE(i.is_active, true) = true
            ORDER BY b.portfolio_id, b.sort_order, i.indicator_id
        """)
    except Exception:
        try:
            bow_rows = query(f"""
                SELECT i.indicator_id, i.bow_id, i.outcome_id,
                       i.text AS name, i.text AS description,
                       NULL AS source_id,
                       NULL AS collection_frequency, NULL AS unit,
                       i.baseline,
                       i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                       'draft' AS status,
                       b.title AS entity_name, b.portfolio_id
                FROM {SCHEMA}.bow_indicators i
                JOIN {SCHEMA}.bows b ON b.bow_id = i.bow_id
                ORDER BY b.portfolio_id, i.indicator_id
            """)
        except Exception:
            bow_rows = []
    for r in bow_rows:
        r["entity_type"] = "bow"
        r["entity_id"]   = r.get("bow_id")

    # ── Portfolio indicators (mirrors get_all_portfolio_indicators) ───────────
    try:
        port_rows = query(f"""
            SELECT i.indicator_id, i.portfolio_id, i.outcome_id,
                   COALESCE(b.name, i.text) AS name,
                   COALESCE(b.text, i.text) AS description,
                   COALESCE(b.source_id, i.source_id) AS source_id,
                   COALESCE(b.collection_frequency, i.collection_frequency) AS collection_frequency,
                   COALESCE(b.unit, i.unit) AS unit,
                   i.baseline,
                   i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                   COALESCE(b.status, 'draft') AS status,
                   COALESCE(NULLIF(po.title, ''), po.short_title) AS outcome_title
            FROM {SCHEMA}.portfolio_indicators i
            LEFT JOIN {SCHEMA}.bow_indicators b ON b.indicator_id = i.bow_indicator_id
            LEFT JOIN {SCHEMA}.portfolio_outcomes po ON po.outcome_id = i.outcome_id
            ORDER BY i.portfolio_id, po.sort_order, i.indicator_id
        """)
    except Exception:
        try:
            port_rows = query(f"""
                SELECT i.indicator_id, i.portfolio_id, i.outcome_id,
                       i.text AS name, i.text AS description,
                       NULL AS source_id,
                       NULL AS collection_frequency, NULL AS unit,
                       i.baseline,
                       i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                       'draft' AS status, NULL AS outcome_title
                FROM {SCHEMA}.portfolio_indicators i
                ORDER BY i.portfolio_id, i.indicator_id
            """)
        except Exception:
            port_rows = []
    for r in port_rows:
        r["entity_type"] = "portfolio"
        r["entity_id"]   = r.get("portfolio_id")

    all_rows = bow_rows + port_rows

    # ── Portfolio name lookup (separate simple query) ─────────────────────────
    try:
        port_label_rows = query(f"SELECT portfolio_id, title FROM {SCHEMA}.portfolios")
        port_label_map = {r["portfolio_id"]: r["title"] for r in port_label_rows}
    except Exception:
        port_label_map = {}
    for r in all_rows:
        r["portfolio_name"] = port_label_map.get(r.get("portfolio_id"), "")
        # For portfolio-type rows, entity_name falls back to portfolio_name
        if r["entity_type"] == "portfolio" and not r.get("entity_name"):
            r["entity_name"] = r["portfolio_name"]

    # ── Source name + URL lookup ──────────────────────────────────────────────
    source_ids = list({r["source_id"] for r in all_rows if r.get("source_id")})
    source_map = {}
    if source_ids:
        try:
            ph = ",".join(["?" for _ in source_ids])
            src_rows = query(
                f"SELECT source_id, source_name, source_url FROM {SCHEMA}.sources WHERE source_id IN ({ph})",
                source_ids
            )
            source_map = {r["source_id"]: r for r in src_rows}
        except Exception:
            pass
    for r in all_rows:
        src = source_map.get(r.get("source_id"), {})
        r["source_name"] = src.get("source_name", "") if src else ""
        r["source_url"]  = src.get("source_url", "")  if src else ""

    return jsonify(all_rows)


@app.route("/api/sources")
def list_sources():
    try:
        rows = query(
            f"""SELECT source_id, source_name, source_type, source_url,
                       owner, coverage_notes, CAST(created_at AS STRING) AS created_at
                FROM {SCHEMA}.sources
                ORDER BY source_name"""
        )
    except Exception:
        rows = []
    return jsonify(rows)


@app.route("/api/sources", methods=["POST"])
def create_source():
    data        = request.json or {}
    source_name = (data.get("source_name") or "").strip()
    if not source_name:
        return jsonify({"error": "source_name required"}), 400
    sid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.sources
            (source_id, source_name, source_type, source_url, owner, coverage_notes,
             created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, current_timestamp(), ?)""",
        [sid, source_name,
         data.get("source_type") or None, data.get("source_url") or None,
         data.get("owner") or None, data.get("coverage_notes") or None,
         data.get("created_by") or None]
    )
    return jsonify({"status": "ok", "source_id": sid})


@app.route("/api/sources/browse")
def browse_sources():
    """Returns all sources with portfolio/BOW context, optionally excluding one BOW.
    Uses separate lookups to avoid JOIN failures caused by bow_id format mismatches."""
    exclude_bow = request.args.get("exclude_bow")
    try:
        # Step 1: source_id + bow_id pairs from bow_indicators only (no bows JOIN)
        where  = "WHERE source_id IS NOT NULL" + (" AND bow_id != ?" if exclude_bow else "")
        params = [exclude_bow] if exclude_bow else []
        usage  = query(
            f"SELECT DISTINCT source_id, bow_id FROM {SCHEMA}.bow_indicators {where}",
            params
        )
        if not usage:
            return jsonify([])

        # Step 2: bow metadata — index by bow_id AND invest_bow_id (seeded data may use either)
        bows_raw = query(f"SELECT bow_id, invest_bow_id, title, portfolio_id FROM {SCHEMA}.bows")
        bows_map = {}
        for b in bows_raw:
            for key in [b.get("bow_id"), b.get("invest_bow_id")]:
                if key:
                    bows_map[key] = b
                    bows_map[key.strip().lower()] = b

        # Step 3: portfolio titles
        port_map = {p["portfolio_id"]: p["title"] for p in
                    query(f"SELECT portfolio_id, title FROM {SCHEMA}.portfolios")}

        # Step 4: source details for every source_id we found
        src_ids = list({r["source_id"] for r in usage})
        ph      = ", ".join("?" * len(src_ids))
        src_map = {s["source_id"]: s for s in query(
            f"SELECT source_id, source_name, source_type, source_url, owner, coverage_notes "
            f"FROM {SCHEMA}.sources WHERE source_id IN ({ph})",
            src_ids
        )}

        # Step 5: assemble, deduplicate, sort
        # bow lookup: exact match first, normalised fallback, then graceful missing
        def _bow(bid):
            return bows_map.get(bid) or bows_map.get((bid or "").strip().lower())

        seen, results = set(), []
        for row in usage:
            key = (row["source_id"], row["bow_id"])
            if key in seen:
                continue
            seen.add(key)
            src = src_map.get(row["source_id"])
            if not src:
                continue
            bow          = _bow(row["bow_id"])
            portfolio_id = bow.get("portfolio_id", "") if bow else ""
            results.append({
                **src,
                "bow_id":          row["bow_id"],
                "bow_title":       bow.get("title", row["bow_id"]) if bow else row["bow_id"],
                "portfolio_id":    portfolio_id,
                "portfolio_label": port_map.get(portfolio_id, "Other"),
            })
        results.sort(key=lambda x: (x["portfolio_label"], x["bow_title"], x["source_name"]))
    except Exception:
        results = []
    return jsonify(results)


@app.route("/api/bow/<bow_id>/sources")
def list_bow_sources(bow_id):
    try:
        rows = query(
            f"""SELECT s.source_id, s.source_name, s.source_type, s.source_url,
                       s.owner, s.coverage_notes,
                       COUNT(i.indicator_id) AS usage_count
                FROM {SCHEMA}.sources s
                INNER JOIN {SCHEMA}.bow_indicators i ON i.source_id = s.source_id
                WHERE i.bow_id = ?
                GROUP BY s.source_id, s.source_name, s.source_type, s.source_url,
                         s.owner, s.coverage_notes
                ORDER BY s.source_name""",
            [bow_id]
        )
    except Exception:
        rows = []
    return jsonify(rows)


@app.route("/api/sources/<source_id>", methods=["DELETE"])
def delete_source(source_id):
    try:
        bow_rows  = query(
            f"SELECT COUNT(*) AS cnt FROM {SCHEMA}.bow_indicators WHERE source_id = ?",
            [source_id]
        )
        port_rows = query(
            f"SELECT COUNT(*) AS cnt FROM {SCHEMA}.portfolio_indicators WHERE source_id = ?",
            [source_id]
        )
        total = (bow_rows[0]["cnt"] if bow_rows else 0) + (port_rows[0]["cnt"] if port_rows else 0)
        if total > 0:
            noun = "indicator" if total == 1 else "indicators"
            return jsonify({"error": f"This source is linked to {total} {noun}. Unlink it from all indicators before deleting."}), 400
        execute(f"DELETE FROM {SCHEMA}.source_rounds WHERE source_id = ?", [source_id])
        execute(f"DELETE FROM {SCHEMA}.sources WHERE source_id = ?", [source_id])
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sources/<source_id>", methods=["PATCH"])
def update_source(source_id):
    data    = request.json or {}
    EDITABLE = {"source_name", "source_type", "source_url", "owner", "coverage_notes"}
    rows    = query(f"SELECT * FROM {SCHEMA}.sources WHERE source_id = ?", [source_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    changes = _build_changes(rows[0], data, EDITABLE)
    if not changes:
        return jsonify({"status": "no_change"})
    sets = ", ".join(f"`{f}` = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [source_id]
    execute(f"UPDATE {SCHEMA}.sources SET {sets} WHERE source_id = ?", vals)
    return jsonify({"status": "ok"})


@app.route("/api/sources/<source_id>/rounds")
def list_source_rounds(source_id):
    try:
        rows = query(
            f"""SELECT round_id, source_id, round_label,
                       CAST(collection_date AS STRING) AS collection_date,
                       document_url, notes, CAST(created_at AS STRING) AS created_at
                FROM {SCHEMA}.source_rounds
                WHERE source_id = ?
                ORDER BY collection_date DESC, round_label""",
            [source_id]
        )
    except Exception:
        rows = []
    return jsonify(rows)


@app.route("/api/sources/<source_id>/rounds", methods=["POST"])
def create_source_round(source_id):
    data        = request.json or {}
    round_label = (data.get("round_label") or "").strip()
    if not round_label:
        return jsonify({"error": "round_label required"}), 400
    rid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.source_rounds
            (round_id, source_id, round_label, collection_date, document_url, notes,
             created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, current_timestamp(), ?)""",
        [rid, source_id, round_label,
         data.get("collection_date") or None, data.get("document_url") or None,
         data.get("notes") or None, data.get("created_by") or None]
    )
    return jsonify({"status": "ok", "round_id": rid})


# ─────────────────────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════════════════════════════
# INVESTMENT IDEA TRACKER
# ══════════════════════════════════════════════════════════════════════════════
#
# CREATE TABLE DDL (run once in Databricks):
#
#   CREATE TABLE usp_data.usp_strategy.investment_ideas (
#     idea_id            STRING NOT NULL,
#     title              STRING,
#     submitted_by       STRING,
#     submitted_at       TIMESTAMP,
#     stage              STRING,
#     idea_type          STRING,
#     objective          STRING,
#     primary_portfolio  STRING,
#     primary_bow        STRING,
#     additional_bows    STRING,
#     potential_partner  STRING,
#     est_total_amount   DOUBLE,
#     est_2026_amount    DOUBLE,
#     co_funding_details STRING,
#     desired_start_date STRING,
#     est_duration       STRING,
#     notes              STRING,
#     approved_by        STRING,
#     approved_at        TIMESTAMP,
#     moved_to_invest    BOOLEAN,
#     moved_to_invest_at TIMESTAMP,
#     inv_number         STRING,
#     archived           BOOLEAN DEFAULT FALSE,
#     archived_at        TIMESTAMP,
#     archived_by        STRING
#   );
#
# ── Pending ALTER TABLE migrations (run once in Databricks SQL) ───────────────
#   ALTER TABLE usp_data.usp_strategy.investment_ideas ADD COLUMN approver_note STRING;
#   ALTER TABLE usp_data.usp_strategy.investment_ideas ADD COLUMN designated_approver STRING;
#   ALTER TABLE usp_data.usp_strategy.investment_ideas ADD COLUMN reviewer_note STRING;
#
#   CREATE TABLE usp_data.usp_strategy.investment_idea_comments (
#     comment_id          STRING NOT NULL,
#     idea_id             STRING,
#     comment_text        STRING,
#     commented_by        STRING,
#     commented_at        TIMESTAMP,
#     is_approval_comment BOOLEAN DEFAULT FALSE
#   );
#
# Valid stages (in order):
#   Brainstorming → More Info Needed → Ready for Review →
#   Okay to Proceed → On Hold → Moved to Invest
#
# Valid idea_type values:
#   Grant, Contract, Bucket (multiple INVs), Supplement to existing INV
#
# Approval gate: permission_level must be "Leadership", "DMT", or "MLE"
# ══════════════════════════════════════════════════════════════════════════════

_IDEA_STAGES   = ["Brainstorming", "More Info Needed", "Ready for Review",
                  "Okay to Proceed", "On Hold", "Moved to Invest"]
_IDEA_TYPES    = ["Grant", "Contract", "Bucket (multiple INVs)", "Supplement to existing INV"]
_IDEA_EDITABLE = {
    "title", "stage", "idea_type", "objective", "primary_portfolio",
    "primary_bow", "additional_bows", "potential_partner",
    "est_total_amount", "est_2026_amount", "co_funding_details",
    "desired_start_date", "est_duration", "notes",
    "designated_approver",
}


@app.route("/api/investment-ideas", methods=["GET"])
def list_investment_ideas():
    """Return all non-archived investment ideas, most-recently-submitted first.
    approver_note is selected opportunistically — falls back gracefully if the
    column has not yet been added via ALTER TABLE."""
    _base = f"""
              idea_id, title, submitted_by,
              CAST(submitted_at AS STRING)       AS submitted_at,
              stage, idea_type, objective,
              primary_portfolio, primary_bow, additional_bows,
              potential_partner, est_total_amount, est_2026_amount,
              co_funding_details, desired_start_date, est_duration, notes,
              approved_by,
              CAST(approved_at AS STRING)        AS approved_at,
              moved_to_invest,
              CAST(moved_to_invest_at AS STRING) AS moved_to_invest_at,
              inv_number,
              COALESCE(archived, false)          AS archived,
              CAST(archived_at AS STRING)        AS archived_at,
              archived_by
            FROM {SCHEMA}.investment_ideas
            WHERE COALESCE(archived, false) = false
            ORDER BY submitted_at DESC"""
    try:
        rows = query(f"SELECT {_base.replace('archived_by', 'archived_by, approver_note, designated_approver, reviewer_note', 1)}")
    except Exception:
        try:
            rows = query(f"SELECT {_base.replace('archived_by', 'archived_by, approver_note, designated_approver', 1)}")
            for r in (rows or []):
                r["reviewer_note"] = None
        except Exception:
            try:
                rows = query(f"SELECT {_base.replace('archived_by', 'archived_by, approver_note', 1)}")
                for r in (rows or []):
                    r["designated_approver"] = None
                    r["reviewer_note"] = None
            except Exception:
                rows = query(f"SELECT {_base}")
                for r in (rows or []):
                    r["approver_note"] = None
                    r["designated_approver"] = None
                    r["reviewer_note"] = None
    return jsonify(rows or [])


@app.route("/api/investment-ideas", methods=["POST"])
def create_investment_idea():
    """Create a new investment idea.
    submitted_by is resolved from X-Forwarded-Email → display_name in team_members."""
    data  = request.json or {}
    email = _actor(data)

    # Resolve display_name for submitted_by
    member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    submitted_by = member[0]["display_name"] if member and member[0].get("display_name") else email

    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400

    idea_id = str(uuid.uuid4())
    execute(
        f"""INSERT INTO {SCHEMA}.investment_ideas
            (idea_id, title, submitted_by, submitted_at, stage, idea_type,
             objective, primary_portfolio, primary_bow, additional_bows,
             potential_partner, est_total_amount, est_2026_amount,
             co_funding_details, desired_start_date, est_duration, notes,
             designated_approver, archived)
            VALUES (?, ?, ?, current_timestamp(), ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, false)""",
        [idea_id, title, submitted_by,
         data.get("stage") or "Brainstorming",
         data.get("idea_type") or None,
         data.get("objective") or None,
         data.get("primary_portfolio") or None,
         data.get("primary_bow") or None,
         data.get("additional_bows") or None,
         data.get("potential_partner") or None,
         data.get("est_total_amount") or None,
         data.get("est_2026_amount") or None,
         data.get("co_funding_details") or None,
         data.get("desired_start_date") or None,
         data.get("est_duration") or None,
         data.get("notes") or None,
         data.get("designated_approver") or None]
    )
    return jsonify({"status": "ok", "idea_id": idea_id}), 201


@app.route("/api/investment-ideas/archive", methods=["GET"])
def list_archived_investment_ideas():
    """Return all archived investment ideas with full column set, most-recently archived first."""
    _base = f"""
              idea_id, title, submitted_by,
              CAST(submitted_at AS STRING)       AS submitted_at,
              stage, idea_type, objective,
              primary_portfolio, primary_bow, additional_bows,
              potential_partner, est_total_amount, est_2026_amount,
              co_funding_details, desired_start_date, est_duration, notes,
              inv_number,
              CAST(moved_to_invest_at AS STRING) AS moved_to_invest_at,
              CAST(archived_at AS STRING)        AS archived_at,
              approved_by
            FROM {SCHEMA}.investment_ideas
            WHERE COALESCE(archived, false) = true
            ORDER BY archived_at DESC"""
    try:
        rows = query(f"SELECT {_base.replace('approved_by', 'approved_by, approver_note, designated_approver, reviewer_note', 1)}")
    except Exception:
        try:
            rows = query(f"SELECT {_base.replace('approved_by', 'approved_by, approver_note, designated_approver', 1)}")
            for r in (rows or []):
                r["reviewer_note"] = None
        except Exception:
            try:
                rows = query(f"SELECT {_base.replace('approved_by', 'approved_by, approver_note', 1)}")
                for r in (rows or []):
                    r["designated_approver"] = None
                    r["reviewer_note"] = None
            except Exception:
                rows = query(f"SELECT {_base}")
                for r in (rows or []):
                    r["approver_note"] = None
                    r["designated_approver"] = None
                    r["reviewer_note"] = None
    return jsonify(rows or [])


@app.route("/api/investment-ideas/<idea_id>", methods=["PATCH"])
def update_investment_idea(idea_id):
    """Update editable fields on an investment idea.
    Setting stage='Okay to Proceed' is blocked here — use the /approve endpoint instead."""
    data = request.json or {}

    rows = query(
        f"SELECT * FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    if rows[0].get("archived"):
        return jsonify({"error": "cannot edit an archived idea"}), 400

    # Block setting "Okay to Proceed" via this endpoint
    if data.get("stage") == "Okay to Proceed":
        return jsonify({"error": "Use the /approve endpoint to set stage to 'Okay to Proceed'"}), 400

    sets, vals = [], []
    for field in _IDEA_EDITABLE:
        if field in data:
            sets.append(f"`{field}` = ?")
            vals.append(data[field] if data[field] != "" else None)

    if not sets:
        return jsonify({"status": "no_change"})

    vals.append(idea_id)
    execute(
        f"UPDATE {SCHEMA}.investment_ideas SET {', '.join(sets)} WHERE idea_id = ?",
        vals
    )
    return jsonify({"status": "ok"})


@app.route("/api/investment-ideas/<idea_id>/approve", methods=["POST"])
def approve_investment_idea(idea_id):
    """Leadership/DMT only.
    Sets stage='Okay to Proceed', records approved_by + approved_at.
    Optionally adds an approval comment to investment_idea_comments."""
    data  = request.json or {}
    email = _actor(data)

    # Permission check
    member = query(
        f"SELECT display_name, permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    if not member or member[0].get("permission_level") not in ("Leadership", "DMT", "MLE"):
        return jsonify({"error": "Insufficient permissions to approve"}), 403

    approved_by = member[0].get("display_name") or email

    rows = query(
        f"SELECT * FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    if rows[0].get("archived"):
        return jsonify({"error": "cannot approve an archived idea"}), 400

    approver_note = (data.get("comment") or "").strip() or None
    execute(
        f"""UPDATE {SCHEMA}.investment_ideas
            SET stage = 'Okay to Proceed',
                approved_by = ?,
                approved_at = current_timestamp(),
                approver_note = ?
            WHERE idea_id = ?""",
        [approved_by, approver_note, idea_id]
    )

    # Optionally record an approval comment
    comment_text = (data.get("comment") or "").strip()
    if comment_text:
        cid = str(uuid.uuid4())
        execute(
            f"""INSERT INTO {SCHEMA}.investment_idea_comments
                (comment_id, idea_id, comment_text, commented_by, commented_at, is_approval_comment)
                VALUES (?, ?, ?, ?, current_timestamp(), true)""",
            [cid, idea_id, comment_text, approved_by]
        )

    return jsonify({"status": "ok", "approved_by": approved_by})


@app.route("/api/investment-ideas/<idea_id>/move-to-invest", methods=["POST"])
def move_idea_to_invest(idea_id):
    """Sets stage='Moved to Invest', moved_to_invest=true, moved_to_invest_at.
    Optionally records inv_number."""
    data = request.json or {}

    rows = query(
        f"SELECT * FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    if rows[0].get("archived"):
        return jsonify({"error": "cannot move an archived idea to invest"}), 400

    inv_number = data.get("inv_number") or None
    execute(
        f"""UPDATE {SCHEMA}.investment_ideas
            SET stage              = 'Moved to Invest',
                moved_to_invest    = true,
                moved_to_invest_at = current_timestamp(),
                inv_number         = COALESCE(?, inv_number),
                archived           = true,
                archived_at        = current_timestamp()
            WHERE idea_id = ?""",
        [inv_number, idea_id]
    )
    return jsonify({"status": "ok"})


@app.route("/api/investment-ideas/<idea_id>/archive", methods=["POST"])
def archive_investment_idea(idea_id):
    """Sets archived=true, archived_at, archived_by (display_name)."""
    data  = request.json or {}
    email = _actor(data)

    rows = query(
        f"SELECT * FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    if rows[0].get("archived"):
        return jsonify({"status": "no_change", "message": "already archived"})

    # Resolve display_name for archived_by
    member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    archived_by = member[0]["display_name"] if member and member[0].get("display_name") else email

    execute(
        f"""UPDATE {SCHEMA}.investment_ideas
            SET archived    = true,
                archived_at = current_timestamp(),
                archived_by = ?
            WHERE idea_id = ?""",
        [archived_by, idea_id]
    )
    return jsonify({"status": "ok", "archived_by": archived_by})


@app.route("/api/investment-ideas/<idea_id>/request-changes", methods=["POST"])
def request_idea_changes(idea_id):
    """Leadership/DMT/MLE only.
    Sets stage='More Info Needed' and records a reviewer_note so the submitter
    knows exactly what changes are needed before re-submitting for review.
    A non-empty note is required."""
    data  = request.json or {}
    email = _actor(data)

    member = query(
        f"SELECT display_name, permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    if not member or member[0].get("permission_level") not in ("Leadership", "DMT", "MLE"):
        return jsonify({"error": "Insufficient permissions to request changes"}), 403

    reviewer_note = (data.get("note") or "").strip()
    if not reviewer_note:
        return jsonify({"error": "A reviewer note is required when requesting changes"}), 400

    rows = query(
        f"SELECT * FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    if rows[0].get("archived"):
        return jsonify({"error": "cannot request changes on an archived idea"}), 400

    reviewed_by = member[0].get("display_name") or email
    try:
        execute(
            f"""UPDATE {SCHEMA}.investment_ideas
                SET stage         = 'More Info Needed',
                    reviewer_note = ?
                WHERE idea_id = ?""",
            [reviewer_note, idea_id]
        )
    except Exception:
        # reviewer_note column may not exist yet — update stage only
        execute(
            f"""UPDATE {SCHEMA}.investment_ideas
                SET stage = 'More Info Needed'
                WHERE idea_id = ?""",
            [idea_id]
        )

    return jsonify({"status": "ok", "reviewed_by": reviewed_by})


@app.route("/api/investment-ideas/<idea_id>", methods=["DELETE"])
def delete_investment_idea(idea_id):
    """Hard-delete an investment idea and its comments. Available to all authenticated users."""
    rows = query(
        f"SELECT idea_id FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "not found"}), 404
    execute(f"DELETE FROM {SCHEMA}.investment_idea_comments WHERE idea_id = ?", [idea_id])
    execute(f"DELETE FROM {SCHEMA}.investment_ideas WHERE idea_id = ?", [idea_id])
    return jsonify({"status": "ok"})


@app.route("/api/investment-ideas/<idea_id>/comments", methods=["GET"])
def list_idea_comments(idea_id):
    """List all comments for an idea, oldest first."""
    rows = query(
        f"""SELECT
              comment_id,
              idea_id,
              comment_text,
              commented_by,
              CAST(commented_at AS STRING) AS commented_at,
              COALESCE(is_approval_comment, false) AS is_approval_comment
            FROM {SCHEMA}.investment_idea_comments
            WHERE idea_id = ?
            ORDER BY commented_at ASC""",
        [idea_id]
    )
    return jsonify(rows)


@app.route("/api/investment-ideas/<idea_id>/comments", methods=["POST"])
def add_idea_comment(idea_id):
    """Add a comment to an investment idea.
    commented_by is resolved from X-Forwarded-Email → display_name in team_members."""
    data = request.json or {}
    comment_text = (data.get("comment_text") or data.get("comment") or "").strip()
    if not comment_text:
        return jsonify({"error": "comment_text required"}), 400

    # Verify idea exists
    rows = query(
        f"SELECT idea_id FROM {SCHEMA}.investment_ideas WHERE idea_id = ?",
        [idea_id]
    )
    if not rows:
        return jsonify({"error": "idea not found"}), 404

    email = _actor(data)
    member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    commented_by = member[0]["display_name"] if member and member[0].get("display_name") else email

    cid = str(uuid.uuid4())
    execute(
        f"""INSERT INTO {SCHEMA}.investment_idea_comments
            (comment_id, idea_id, comment_text, commented_by, commented_at, is_approval_comment)
            VALUES (?, ?, ?, ?, current_timestamp(), false)""",
        [cid, idea_id, comment_text, commented_by]
    )
    return jsonify({"status": "ok", "comment_id": cid}), 201


@app.route("/api/investment-ideas/<idea_id>/comments/<comment_id>", methods=["DELETE"])
def delete_idea_comment(idea_id, comment_id):
    """Hard-delete a single comment. Available to all authenticated users."""
    execute(
        f"DELETE FROM {SCHEMA}.investment_idea_comments WHERE comment_id = ? AND idea_id = ?",
        [comment_id, idea_id]
    )
    return jsonify({"status": "ok"})


# ── BOW / Portfolio comments ──────────────────────────────────────────────────

@app.route("/api/comments/debug")
def debug_comments():
    """Quick check — returns all rows from the comments table (for diagnosis only)."""
    try:
        rows = query(
            f"""SELECT comment_id, entity_type, entity_id, author,
                       body, CAST(created_at AS STRING) AS created_at
                FROM {SCHEMA}.comments ORDER BY created_at DESC"""
        )
        return jsonify({"status": "ok", "total_comments": len(rows), "rows": rows})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


@app.route("/api/comments/<entity_type>/<entity_id>")
def get_comments(entity_type, entity_id):
    """Return all comments for a BOW or portfolio, oldest first."""
    try:
        rows = query(
            f"""SELECT comment_id, entity_type, entity_id, author, author_email,
                       body, CAST(created_at AS STRING) AS created_at,
                       COALESCE(is_resolved, false) AS is_resolved
                FROM {SCHEMA}.comments
                WHERE entity_type = ? AND entity_id = ?
                ORDER BY created_at ASC""",
            [entity_type, entity_id]
        )
    except Exception as e:
        print(f"[get_comments] query failed for {entity_type}/{entity_id}: {e}")
        return jsonify({"error": f"Could not load comments: {e}"}), 500
    return jsonify(rows)


@app.route("/api/comments/<entity_type>/<entity_id>", methods=["POST"])
def add_comment(entity_type, entity_id):
    """Post a new comment. Author resolved server-side from the session header."""
    data = request.json or {}
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "body required"}), 400

    email = _actor()
    member = []
    if email and email != "unknown":
        try:
            member = query(
                f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
                [email]
            )
        except Exception:
            pass
    if member:
        author = member[0]["display_name"]
    elif email and email != "unknown":
        # Fall back to humanised email prefix
        author = email.split("@")[0].replace(".", " ").title()
    else:
        author = "Unknown"

    cid = new_id()
    try:
        execute(
            f"""INSERT INTO {SCHEMA}.comments
                (comment_id, entity_type, entity_id, author, author_email, body, created_at)
                VALUES (?, ?, ?, ?, ?, ?, current_timestamp())""",
            [cid, entity_type, entity_id, author, email or "", body]
        )
    except Exception as e:
        print(f"[add_comment] INSERT failed: {e}")
        return jsonify({"error": "Failed to save comment. Please try again."}), 500

    # Return the saved row so the client can display it immediately
    try:
        row = query(
            f"""SELECT comment_id, entity_type, entity_id, author, author_email,
                       body, CAST(created_at AS STRING) AS created_at,
                       COALESCE(is_resolved, false) AS is_resolved
                FROM {SCHEMA}.comments WHERE comment_id = ?""",
            [cid]
        )
        return jsonify(row[0] if row else {
            "comment_id": cid, "entity_type": entity_type, "entity_id": entity_id,
            "author": author, "author_email": email or "", "body": body, "created_at": "",
            "is_resolved": False,
        })
    except Exception:
        return jsonify({
            "comment_id": cid, "entity_type": entity_type, "entity_id": entity_id,
            "author": author, "author_email": email or "", "body": body, "created_at": "",
            "is_resolved": False,
        })


@app.route("/api/comments/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    """Hard-delete a comment. Any team member may delete any comment."""
    execute(
        f"DELETE FROM {SCHEMA}.comments WHERE comment_id = ?",
        [comment_id]
    )
    return jsonify({"deleted": comment_id})


@app.route("/api/comments/<comment_id>/resolve", methods=["PATCH"])
def resolve_comment(comment_id):
    """Toggle the resolved state of a comment. Requires is_resolved column (schema_migration_comments_v1.sql)."""
    data = request.json or {}
    is_resolved = bool(data.get("is_resolved", True))
    try:
        execute(
            f"UPDATE {SCHEMA}.comments SET is_resolved = ? WHERE comment_id = ?",
            [is_resolved, comment_id]
        )
    except Exception as e:
        print(f"[resolve_comment] UPDATE failed (is_resolved column may not exist): {e}")
        return jsonify({"error": "Resolve not available — run schema_migration_comments_v1.sql first."}), 500
    return jsonify({"comment_id": comment_id, "is_resolved": is_resolved})


# ── Indicator period targets ──────────────────────────────────────────────────

@app.route("/api/indicators/<indicator_id>/period-targets")
def get_period_targets(indicator_id):
    """Return all period targets for an indicator, ordered by year then period."""
    try:
        rows = query(
            f"""SELECT year, period, target_value
                FROM {SCHEMA}.indicator_period_targets
                WHERE indicator_id = ?
                ORDER BY year, period""",
            [indicator_id]
        )
    except Exception as e:
        print(f"[get_period_targets] query failed for {indicator_id}: {e}")
        return jsonify({"error": str(e)}), 500
    return jsonify(rows)


@app.route("/api/indicators/<indicator_id>/period-targets", methods=["PUT"])
def upsert_period_targets(indicator_id):
    """Replace all period targets for an indicator.
    Body: { entity_type: 'bow'|'portfolio', targets: [{year, period, value}, ...] }
    Rows with null/blank value are skipped (treated as cleared).
    """
    data        = request.json or {}
    entity_type = data.get("entity_type", "bow")
    targets     = data.get("targets", [])
    email       = _actor(data)

    try:
        execute(
            f"DELETE FROM {SCHEMA}.indicator_period_targets WHERE indicator_id = ?",
            [indicator_id]
        )
        for t in targets:
            raw = t.get("value")
            if raw is None or str(raw).strip() == "":
                continue
            try:
                val = float(raw)
            except (ValueError, TypeError):
                continue
            execute(
                f"""INSERT INTO {SCHEMA}.indicator_period_targets
                    (target_id, indicator_id, entity_type, year, period,
                     target_value, updated_by, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
                [new_id(), indicator_id, entity_type, int(t["year"]), t["period"], val, email]
            )
    except Exception as e:
        print(f"[upsert_period_targets] failed for {indicator_id}: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify({"status": "ok"})


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)