from flask import Flask, request, jsonify, send_file
from databricks import sql
import os, uuid, datetime, smtplib, textwrap
from email.mime.text import MIMEText

app = Flask(__name__)

# ── Frontend routes ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_file(os.path.join(os.path.dirname(__file__), "index.html"))

@app.route("/dashboard.jsx")
def dashboard():
    return send_file(
        os.path.join(os.path.dirname(__file__), "dashboard.jsx"),
        mimetype="text/plain"
    )

# ── Database connection ───────────────────────────────────────────────────────

DATABRICKS_HOST = os.environ.get("DATABRICKS_HOST", "adb-527625614048962.2.azuredatabricks.net")
HTTP_PATH       = os.environ.get("DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/0cd0e380d94af214")

CATALOG = "usp_data"
SCHEMA  = f"{CATALOG}.usp_strategy"

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
        sample_ind   = query(f"SELECT indicator_id, bow_id, outcome_id, text FROM {SCHEMA}.bow_indicators LIMIT 3")
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
    INVEST_SCHEMA = "usp_data.invest"
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

@app.route("/api/bows/<portfolio_id>")
def get_bows_by_portfolio(portfolio_id):
    rows = query(
        f"SELECT * FROM {SCHEMA}.bows WHERE portfolio_id = ? ORDER BY sort_order",
        [portfolio_id]
    )
    return jsonify(rows)


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
    rows = query(
        f"""SELECT * FROM {SCHEMA}.portfolio_indicators
            WHERE portfolio_id = ?
            ORDER BY outcome_id, indicator_id""",
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
              po.short_title AS portfolio_outcome_title
            FROM {SCHEMA}.bow_portfolio_outcome_links l
            JOIN {SCHEMA}.portfolio_outcomes po
              ON l.portfolio_outcome_id = po.outcome_id
            WHERE l.bow_outcome_id IN (
              SELECT outcome_id FROM {SCHEMA}.bow_outcomes WHERE bow_id = ?
            )
            ORDER BY l.contribution_type, l.sort_order""",
        [bow_id]
    )
    return jsonify(rows)


@app.route("/api/admin/seed-sfl-links", methods=["POST"])
def seed_sfl_links():
    """One-time seed: upserts sfl-po6 into portfolio_outcomes and populates
    bow_portfolio_outcome_links for all SFL BOW outcomes per the April 2026
    Portfolio-BOW Outcome Alignment slide."""

    # sfl-po6 row to upsert into portfolio_outcomes
    po6 = {
        "outcome_id":  "sfl-po6",
        "portfolio_id": "sfl",
        "sort_order":  6,
        "short_title": "Shared Agreement & Alignment",
        "activity":    "Build shared agreement and alignment across key stakeholders",
        "outcome_text": "Shared agreement and alignment across key stakeholders.",
    }

    # Full mapping: (bow_outcome_id, portfolio_outcome_id, sort_order)
    links = [
        # CSGA (sfl-bow3)
        ("sfl-bow3-o1", "sfl-po2", 1),
        ("sfl-bow3-o1", "sfl-po4", 2),
        ("sfl-bow3-o1", "sfl-po6", 3),
        ("sfl-bow3-o2", "sfl-po2", 1),
        ("sfl-bow3-o3", "sfl-po1", 1),
        ("sfl-bow3-o3", "sfl-po3", 2),
        ("sfl-bow3-o3", "sfl-po5", 3),
        # EDU-Net (sfl-bow1)
        ("sfl-bow1-o1", "sfl-po2", 1),
        ("sfl-bow1-o1", "sfl-po4", 2),
        ("sfl-bow1-o1", "sfl-po6", 3),
        ("sfl-bow1-o2", "sfl-po1", 1),
        ("sfl-bow1-o2", "sfl-po2", 2),
        ("sfl-bow1-o3", "sfl-po3", 1),
        ("sfl-bow1-o3", "sfl-po5", 2),
        # DAIP / Data in Place (sfl-bow2)
        ("sfl-bow2-o1", "sfl-po1", 1),
        ("sfl-bow2-o1", "sfl-po2", 2),
        ("sfl-bow2-o1", "sfl-po3", 3),
        ("sfl-bow2-o1", "sfl-po6", 4),
        ("sfl-bow2-o2", "sfl-po4", 1),
        ("sfl-bow2-o2", "sfl-po5", 2),
        ("sfl-bow2-o3", "sfl-po5", 1),
        ("sfl-bow2-o3", "sfl-po6", 2),
        ("sfl-bow2-o4", "sfl-po1", 1),
        ("sfl-bow2-o4", "sfl-po2", 2),
        ("sfl-bow2-o4", "sfl-po5", 3),
    ]

    try:
        # Upsert sfl-po6
        execute(
            f"""MERGE INTO {SCHEMA}.portfolio_outcomes AS t
                USING (SELECT
                  '{po6["outcome_id"]}'  AS outcome_id,
                  '{po6["portfolio_id"]}' AS portfolio_id,
                  {po6["sort_order"]}    AS sort_order,
                  '{po6["short_title"]}' AS short_title,
                  '{po6["activity"]}'    AS activity,
                  '{po6["outcome_text"]}' AS outcome_text
                ) AS s ON t.outcome_id = s.outcome_id
                WHEN MATCHED THEN UPDATE SET
                  t.sort_order  = s.sort_order,
                  t.short_title = s.short_title,
                  t.activity    = s.activity,
                  t.outcome_text = s.outcome_text
                WHEN NOT MATCHED THEN INSERT
                  (outcome_id, portfolio_id, sort_order, short_title, activity, outcome_text)
                VALUES (s.outcome_id, s.portfolio_id, s.sort_order, s.short_title, s.activity, s.outcome_text)"""
        )

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
    data = request.json
    year = data.get("year")
    # Check if row exists
    existing = query(
        f"SELECT target_id FROM {SCHEMA}.execution_target_status WHERE target_id = ? AND year = ?",
        [target_id, year]
    )
    if existing:
        execute(
            f"""UPDATE {SCHEMA}.execution_target_status
                SET completion   = ?,
                    notes        = ?,
                    last_updated = current_timestamp(),
                    updated_by   = ?
                WHERE target_id  = ?
                  AND year       = ?""",
            [data.get("completion"), data.get("notes"),
             data.get("updated_by", "dashboard"), target_id, year]
        )
    else:
        execute(
            f"""INSERT INTO {SCHEMA}.execution_target_status
                (target_id, year, completion, notes, last_updated, updated_by)
                VALUES (?, ?, ?, ?, current_timestamp(), ?)""",
            [target_id, year, data.get("completion"), data.get("notes"),
             data.get("updated_by", "dashboard")]
        )
    return jsonify({"status": "ok", "target_id": target_id})


# ═════════════════════════════════════════════════════════════════════════════
# INDICATORS & ACTUALS
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/api/indicators/<bow_id>")
def get_indicators(bow_id):
    """Returns BOW indicators with most recent actual per year.
    One row per (indicator × year) — dashboard accumulates actuals across rows.
    Falls back gracefully if optional columns (unit, collection_frequency,
    last_updated) haven't been added via migration yet."""
    actuals_join = f"""
        LEFT JOIN (
          SELECT a1.indicator_id, a1.year, a1.actual_value,
                 a1.reading_date, a1.source_notes
          FROM {SCHEMA}.bow_indicator_actuals a1
          INNER JOIN (
            SELECT indicator_id, year, MAX(loaded_at) AS max_loaded
            FROM {SCHEMA}.bow_indicator_actuals
            GROUP BY indicator_id, year
          ) a2 ON a1.indicator_id = a2.indicator_id
               AND a1.year        = a2.year
               AND a1.loaded_at   = a2.max_loaded
        ) a ON i.indicator_id = a.indicator_id
    """
    try:
        rows = query(
            f"""SELECT
                  i.indicator_id, i.bow_id, i.outcome_id, i.text, i.data_source,
                  i.baseline, i.collection_frequency, i.last_updated, i.unit,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  a.year, a.actual_value, a.reading_date, a.source_notes
                FROM {SCHEMA}.bow_indicators i
                {actuals_join}
                WHERE i.bow_id = ?
                  AND COALESCE(i.is_active, true) = true
                ORDER BY i.outcome_id, i.indicator_id, a.year""",
            [bow_id]
        )
    except Exception:
        # Fallback: omit optional columns if migration hasn't run yet
        rows = query(
            f"""SELECT
                  i.indicator_id, i.bow_id, i.outcome_id, i.text, i.data_source,
                  i.baseline,
                  NULL AS collection_frequency, NULL AS last_updated, NULL AS unit,
                  i.target_2026, i.target_2027, i.target_2028, i.target_2029, i.target_2030,
                  a.year, a.actual_value, a.reading_date, a.source_notes
                FROM {SCHEMA}.bow_indicators i
                {actuals_join}
                WHERE i.bow_id = ?
                ORDER BY i.outcome_id, i.indicator_id, a.year""",
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
              a.year,
              a.actual_value,
              a.reading_date
            FROM {SCHEMA}.portfolio_indicators i
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
    data = request.json
    execute(
        f"""INSERT INTO {SCHEMA}.bow_indicator_actuals
            (actual_id, indicator_id, bow_id, outcome_id, year,
             actual_value, reading_date, source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), data["indicator_id"], data["bow_id"],
         data["outcome_id"], data["year"], data["actual_value"],
         data.get("reading_date"), data.get("source_notes"),
         data.get("loaded_by", "dashboard")]
    )
    return jsonify({"status": "ok"})

@app.route("/api/actuals/portfolio/add", methods=["POST"])
def add_portfolio_actual():
    data = request.json
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_indicator_actuals
            (actual_id, indicator_id, portfolio_id, outcome_id, year,
             actual_value, reading_date, source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), data["indicator_id"], data["portfolio_id"],
         data["outcome_id"], data["year"], data["actual_value"],
         data.get("reading_date"), data.get("source_notes"),
         data.get("loaded_by", "dashboard")]
    )
    return jsonify({"status": "ok"})

@app.route("/api/actuals/goal/add", methods=["POST"])
def add_goal_actual():
    data = request.json
    execute(
        f"""INSERT INTO {SCHEMA}.strategy_goal_actuals
            (actual_id, goal_id, year, actual_value, reading_date,
             source_notes, loaded_by, loaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [data.get("actual_id", new_id()), data["goal_id"], data["year"],
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
    data = request.json
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
            ORDER BY kd.level, kd.status, kd.timing""",
        params
    )
    return jsonify(rows)

@app.route("/api/decisions/<decision_id>/update", methods=["POST"])
def update_decision(decision_id):
    data = request.json
    execute(
        f"""UPDATE {SCHEMA}.key_decisions
            SET signals          = ?,
                recorded_outcome = ?,
                status           = ?,
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
  FROM usp_data.usp_strategy.invest_bow_allocation a
  JOIN usp_data.usp_strategy.invest_bow_details d
    ON a.BoW_ID = d.BoW_ID
  WHERE a.BoW_ID NOT IN (
    SELECT invest_bow_id
    FROM usp_data.usp_strategy.bows
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
    data = request.json
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
            [data.get("internal_notes"), data.get("approver"),
             data.get("updated_by", "dashboard"), investment_id]
        )
    else:
        execute(
            f"""INSERT INTO {SCHEMA}.investment_overlays
                (overlay_id, investment_id, internal_notes, approver, last_updated, updated_by)
                VALUES (?, ?, ?, ?, current_timestamp(), ?)""",
            [new_id(), investment_id, data.get("internal_notes"),
             data.get("approver"), data.get("updated_by", "dashboard")]
        )
    return jsonify({"status": "ok"})

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
# PORTAL ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.route("/portal")
def portal():
    return send_file(os.path.join(os.path.dirname(__file__), "portal.html"))

@app.route("/portal.jsx")
def portal_jsx():
    return send_file(
        os.path.join(os.path.dirname(__file__), "portal.jsx"),
        mimetype="text/plain"
    )

@app.route("/api/me")
def get_me():
    """Returns current user's display name and permission level from team_members."""
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
                  i.text,
                  i.unit,
                  i.data_source,
                  i.collection_frequency,
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
                  po.short_title AS outcome_title
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
                  po.short_title AS outcome_title
                FROM {SCHEMA}.portfolio_indicators i
                LEFT JOIN {SCHEMA}.portfolio_outcomes po ON i.outcome_id = po.outcome_id
                ORDER BY i.portfolio_id, po.sort_order, i.indicator_id"""
        )
    return jsonify(rows)


@app.route("/api/portal-debug")
def portal_debug():
    """Checks all tables the portal depends on — use to diagnose empty dropdowns."""
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
    data = request.json
    current_user = query("SELECT current_user() AS user")
    email = current_user[0]["user"] if current_user else "unknown"
    member = query(
        f"SELECT display_name, permission_level FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [email]
    )
    submitted_by         = member[0]["display_name"] if member else email
    submitted_permission = member[0]["permission_level"] if member else None
    execute(
        f"""INSERT INTO {SCHEMA}.pending_actuals
            (pending_id, indicator_id, level, entity_id, year, period,
             submitted_value, reading_date, source_notes, notes,
             submitted_by, submitted_permission, submitted_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp(), 'pending')""",
        [new_id(), data.get("indicator_id"), data["level"],
         data["entity_id"], data["year"], data.get("period"),
         data["submitted_value"], data.get("reading_date"), data.get("source_notes"),
         data.get("notes"),
         submitted_by, submitted_permission]
    )
    return jsonify({"status": "ok", "submitted_by": submitted_by, "submitted_permission": submitted_permission})

@app.route("/api/pending-actuals/<pending_id>/approve", methods=["POST"])
def approve_actual(pending_id):
    """Approve a pending actual. Moves to appropriate actuals table based on level."""
    data = request.json
    row = query(
        f"SELECT * FROM {SCHEMA}.pending_actuals WHERE pending_id = ?",
        [pending_id]
    )
    if not row:
        return jsonify({"error": "Not found"}), 404

    r = row[0]
    level    = r["level"]
    reviewed_value = data.get("reviewed_value", r["submitted_value"])
    reviewed_by    = data.get("reviewed_by", "dashboard")

    if level == "bow":
        execute(
            f"""INSERT INTO {SCHEMA}.bow_indicator_actuals
                (actual_id, indicator_id, bow_id, outcome_id, year, period,
                 actual_value, reading_date, source_notes, loaded_by, loaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?, current_timestamp())""",
            [new_id(), r["indicator_id"], r["entity_id"], r.get("outcome_id"),
             r["year"], r.get("period"), reviewed_value,
             r.get("reading_date"), r.get("source_notes"), reviewed_by]
        )
    elif level == "portfolio":
        execute(
            f"""INSERT INTO {SCHEMA}.portfolio_indicator_actuals
                (actual_id, indicator_id, portfolio_id, outcome_id, year, period,
                 actual_value, reading_date, source_notes, loaded_by, loaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?, current_timestamp())""",
            [new_id(), r["indicator_id"], r["entity_id"], r.get("outcome_id"),
             r["year"], r.get("period"), reviewed_value,
             r.get("reading_date"), r.get("source_notes"), reviewed_by]
        )
    elif level == "goal":
        execute(
            f"""INSERT INTO {SCHEMA}.strategy_goal_actuals
                (actual_id, goal_id, year, actual_value, reading_date,
                 source_notes, loaded_by, loaded_at)
                VALUES (?, ?, ?, ?, current_date(), ?, ?, current_timestamp())""",
            [new_id(), r["entity_id"], r["year"], reviewed_value,
             "pending_actuals_review", reviewed_by]
        )

    reviewer_email = _actor()
    reviewer_member = query(
        f"SELECT display_name FROM {SCHEMA}.team_members WHERE email = ? AND is_active = true",
        [reviewer_email]
    ) if reviewer_email != "unknown" else []
    reviewed_by = reviewer_member[0]["display_name"] if reviewer_member else (reviewer_email or "reviewer")

    was_edited = (reviewed_value != r["submitted_value"])
    decision   = "approved with edit" if was_edited else "approved"

    execute(
        f"""UPDATE {SCHEMA}.pending_actuals
            SET status         = 'approved',
                reviewed_value = ?,
                reviewed_by    = ?,
                reviewed_at    = current_timestamp()
            WHERE pending_id   = ?""",
        [reviewed_value, reviewed_by, pending_id]
    )

    # Look up indicator label for the email body
    ind_rows = query(
        f"SELECT text FROM {SCHEMA}.bow_indicators WHERE indicator_id = ? UNION ALL "
        f"SELECT text FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?",
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

@app.route("/api/pending-actuals/<pending_id>/reject", methods=["POST"])
def reject_actual(pending_id):
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
            SET status         = 'rejected',
                reviewer_notes = ?,
                reviewed_by    = ?,
                reviewed_at    = current_timestamp()
            WHERE pending_id   = ?""",
        [data.get("reviewer_notes"), reviewed_by, pending_id]
    )

    # Look up indicator label for the email body
    ind_rows = query(
        f"SELECT text FROM {SCHEMA}.bow_indicators WHERE indicator_id = ? UNION ALL "
        f"SELECT text FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?",
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


@app.route("/api/indicators/<indicator_id>/actuals")
def get_indicator_actuals(indicator_id):
    """Returns all actuals on record for a single indicator, ordered by year and period."""
    rows = query(
        f"""SELECT year, period, actual_value, reading_date, source_notes
            FROM {SCHEMA}.bow_indicator_actuals
            WHERE indicator_id = ?
            ORDER BY year, period""",
        [indicator_id]
    )
    return jsonify(rows)

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
    data = request.json
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
            (note_id, bow_id, outcome_id, year, note_text, last_updated, updated_by)
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
    data = request.json
    execute(
        f"""INSERT INTO {SCHEMA}.assumption_confidence
            (confidence_id, assumption_id, confidence, rationale,
             data_considered, human_override, override_reasoning,
             assessed_by, assessed_at)
            VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, current_timestamp())""",
        [new_id(), assumption_id, data["confidence"], data.get("rationale"),
         data.get("data_considered"), data.get("override_reasoning"),
         data.get("assessed_by", "dashboard")]
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
    data = request.json
    outcome_id = data.get("outcome_id")
    existing = query(
        f"""SELECT note_id FROM {SCHEMA}.bow_notes
            WHERE bow_id = ?
              AND (outcome_id = ? OR (outcome_id IS NULL AND ? IS NULL))""",
        [bow_id, outcome_id, outcome_id]
    )
    if existing:
        execute(
            f"""UPDATE {SCHEMA}.bow_notes
                SET note_text    = ?,
                    last_updated = current_timestamp(),
                    updated_by   = ?
                WHERE note_id    = ?""",
            [data.get("note_text"), data.get("updated_by", "dashboard"),
             existing[0]["note_id"]]
        )
    else:
        execute(
            f"""INSERT INTO {SCHEMA}.bow_notes
                (note_id, bow_id, outcome_id, year, note_text, last_updated, updated_by)
                VALUES (?, ?, ?, ?, ?, current_timestamp(), ?)""",
            [new_id(), bow_id, outcome_id, data.get("year"),
             data.get("note_text"), data.get("updated_by", "dashboard")]
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
    data = request.json
    year = data.get("year")
    existing = query(
        f"""SELECT tracking_id FROM {SCHEMA}.portfolio_tracking
            WHERE portfolio_id = ? AND year = ?""",
        [portfolio_id, year]
    )
    if existing:
        execute(
            f"""UPDATE {SCHEMA}.portfolio_tracking
                SET notes            = ?,
                    budget_annotation = ?,
                    last_updated     = current_timestamp(),
                    updated_by       = ?
                WHERE tracking_id    = ?""",
            [data.get("notes"), data.get("budget_annotation"),
             data.get("updated_by", "dashboard"), existing[0]["tracking_id"]]
        )
    else:
        execute(
            f"""INSERT INTO {SCHEMA}.portfolio_tracking
                (tracking_id, portfolio_id, year, notes, budget_annotation,
                 last_updated, updated_by)
                VALUES (?, ?, ?, ?, ?, current_timestamp(), ?)""",
            [new_id(), portfolio_id, year, data.get("notes"),
             data.get("budget_annotation"), data.get("updated_by", "dashboard")]
        )
    return jsonify({"status": "ok"})


# =============================================================================
# Portal v2 — Content editing, CRUD, and activity feed
# =============================================================================

import json as _json

MAJOR_TEXT_FIELDS = {"title", "text"}
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

def _log_edit(entity_type, entity_id, bow_id, portfolio_id, changes_dict, rationale, revision_reason, edited_by):
    if not LOGGING_ENABLED:
        return
    execute(
        f"""INSERT INTO {SCHEMA}.content_edit_log
            (log_id, entity_type, entity_id, bow_id, portfolio_id,
             changes, rationale, revision_reason, edited_by, edited_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp())""",
        [new_id(), entity_type, entity_id, bow_id, portfolio_id,
         _json.dumps(changes_dict), rationale or None, revision_reason or None, edited_by]
    )

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
    bow_rows = query(f"SELECT * FROM {SCHEMA}.bows WHERE bow_id = ?", [bow_id])
    if not bow_rows:
        return jsonify({"error": "not found"}), 404
    bow = bow_rows[0]

    outcomes = query(
        f"SELECT * FROM {SCHEMA}.bow_outcomes WHERE bow_id = ? ORDER BY sort_order",
        [bow_id]
    )

    try:
        indicators = query(
            f"""SELECT i.*,
                       a.actual_value AS latest_actual,
                       a.year         AS latest_actual_year
                FROM {SCHEMA}.bow_indicators i
                LEFT JOIN (
                    SELECT indicator_id, actual_value, year,
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
        indicators = query(
            f"""SELECT * FROM {SCHEMA}.bow_indicators
                WHERE bow_id = ? AND COALESCE(is_active, true) = true
                ORDER BY outcome_id, indicator_id""",
            [bow_id]
        )

    execution_targets = query(
        f"""SELECT t.*, s.completion, s.notes AS status_notes, s.last_updated, s.updated_by
            FROM {SCHEMA}.execution_targets t
            LEFT JOIN {SCHEMA}.execution_target_status s
              ON t.target_id = s.target_id AND t.year = s.year
            WHERE t.bow_id = ?
            ORDER BY t.year, t.sort_order""",
        [bow_id]
    )

    ind_by_outcome = {}
    for ind in indicators:
        key = ind.get("outcome_id") or "__none"
        ind_by_outcome.setdefault(key, []).append(ind)

    for out in outcomes:
        out["indicators"] = ind_by_outcome.get(out["outcome_id"], [])

    return jsonify({
        "bow": bow,
        "outcomes": outcomes,
        "execution_targets": execution_targets,
    })


# ── Portfolio full detail ───────────────────────────────────────────────────────

@app.route("/api/portfolio/<portfolio_id>/full")
def get_portfolio_full(portfolio_id):
    port_rows = query(f"SELECT * FROM {SCHEMA}.portfolios WHERE portfolio_id = ?", [portfolio_id])
    if not port_rows:
        return jsonify({"error": "not found"}), 404
    portfolio = port_rows[0]

    outcomes = query(
        f"SELECT * FROM {SCHEMA}.portfolio_outcomes WHERE portfolio_id = ? ORDER BY sort_order",
        [portfolio_id]
    )

    try:
        indicators = query(
            f"""SELECT i.*,
                       a.actual_value AS latest_actual,
                       a.year         AS latest_actual_year
                FROM {SCHEMA}.portfolio_indicators i
                LEFT JOIN (
                    SELECT indicator_id, actual_value, year,
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
        indicators = query(
            f"""SELECT * FROM {SCHEMA}.portfolio_indicators
                WHERE portfolio_id = ?
                ORDER BY outcome_id, indicator_id""",
            [portfolio_id]
        )

    ind_by_outcome = {}
    for ind in indicators:
        key = ind.get("outcome_id") or "__none"
        ind_by_outcome.setdefault(key, []).append(ind)

    for out in outcomes:
        out["indicators"] = ind_by_outcome.get(out["outcome_id"], [])

    return jsonify({
        "portfolio": portfolio,
        "outcomes": outcomes,
    })


# ── BOW outcomes CRUD ──────────────────────────────────────────────────────────

BOW_OUTCOME_EDITABLE = {"title", "short_title", "text"}

@app.route("/api/bow-outcomes/<outcome_id>", methods=["PATCH"])
def update_bow_outcome(outcome_id):
    data    = request.json
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

    sets   = ", ".join(f"{f} = ?" for f in changes)
    vals   = [changes[f]["new"] for f in changes] + [outcome_id]
    execute(f"UPDATE {SCHEMA}.bow_outcomes SET {sets} WHERE outcome_id = ?", vals)
    _log_edit("bow_outcome", outcome_id, old["bow_id"], None, changes, rationale, None, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/bow-outcomes", methods=["POST"])
def add_bow_outcome():
    data    = request.json
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
            (outcome_id, bow_id, title, short_title, text, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)""",
        [oid, bow_id, title, data.get("short_title", ""), data.get("text", ""), sort_order]
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

BOW_IND_EDITABLE = {"text", "unit", "collection_frequency", "baseline",
                    "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"}

@app.route("/api/bow-indicators/<indicator_id>", methods=["PATCH"])
def update_bow_indicator(indicator_id):
    data    = request.json
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

    sets = ", ".join(f"{f} = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [indicator_id]
    execute(f"UPDATE {SCHEMA}.bow_indicators SET {sets} WHERE indicator_id = ?", vals)
    _log_edit("bow_indicator", indicator_id, old["bow_id"], None, changes, rationale, revision_reason, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/bow-indicators", methods=["POST"])
def add_bow_indicator():
    data        = request.json
    bow_id      = data.get("bow_id")
    outcome_id  = data.get("outcome_id")
    text        = (data.get("text") or "").strip()
    user        = _actor(data)
    if not bow_id or not text:
        return jsonify({"error": "bow_id and text required"}), 400
    iid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.bow_indicators
            (indicator_id, bow_id, outcome_id, text, unit, collection_frequency,
             baseline, target_2026, target_2027, target_2028, target_2029, target_2030, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)""",
        [iid, bow_id, outcome_id or None, text,
         data.get("unit") or None, data.get("collection_frequency") or None,
         data.get("baseline") or None,
         data.get("target_2026") or None, data.get("target_2027") or None,
         data.get("target_2028") or None, data.get("target_2029") or None,
         data.get("target_2030") or None]
    )
    _log_edit("bow_indicator", iid, bow_id, None,
              {"text": {"old": None, "new": text}}, "New indicator added", None, user)
    return jsonify({"status": "ok", "indicator_id": iid})


@app.route("/api/bow-indicators/<indicator_id>", methods=["DELETE"])
def delete_bow_indicator(indicator_id):
    rows = query(f"SELECT * FROM {SCHEMA}.bow_indicators WHERE indicator_id = ?", [indicator_id])
    if rows:
        ind = rows[0]
        user = _actor()
        _log_edit("bow_indicator", indicator_id, ind.get("bow_id"), None,
                  {"text": {"old": ind.get("text"), "new": None}}, "Indicator removed", None, user)
    execute(f"UPDATE {SCHEMA}.bow_indicators SET is_active = false WHERE indicator_id = ?", [indicator_id])
    return jsonify({"status": "ok"})


# ── Execution targets CRUD ─────────────────────────────────────────────────────

@app.route("/api/execution-targets/<target_id>", methods=["PATCH"])
def update_execution_target(target_id):
    data    = request.json
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

    execute(f"UPDATE {SCHEMA}.execution_targets SET text = ? WHERE target_id = ?",
            [changes["text"]["new"], target_id])
    _log_edit("execution_target", target_id, old["bow_id"], None, changes, rationale, None, user)
    return jsonify({"status": "ok"})


@app.route("/api/execution-targets", methods=["POST"])
def add_execution_target():
    data       = request.json
    bow_id     = data.get("bow_id")
    outcome_id = data.get("outcome_id")
    year       = data.get("year")
    text       = (data.get("text") or "").strip()
    user       = _actor(data)
    if not bow_id or not year or not text:
        return jsonify({"error": "bow_id, year, and text required"}), 400
    max_sort = query(
        f"SELECT MAX(sort_order) AS m FROM {SCHEMA}.execution_targets WHERE bow_id = ? AND year = ?",
        [bow_id, year]
    )
    sort_order = (max_sort[0]["m"] or 0) + 1
    tid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.execution_targets
            (target_id, bow_id, outcome_id, year, text, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)""",
        [tid, bow_id, outcome_id or None, year, text, sort_order]
    )
    _log_edit("execution_target", tid, bow_id, None,
              {"text": {"old": None, "new": text}, "year": {"old": None, "new": year}},
              f"New target added for {year}", None, user)
    return jsonify({"status": "ok", "target_id": tid})


@app.route("/api/execution-targets/<target_id>", methods=["DELETE"])
def delete_execution_target(target_id):
    rows = query(f"SELECT * FROM {SCHEMA}.execution_targets WHERE target_id = ?", [target_id])
    if rows:
        t = rows[0]
        user = _actor()
        _log_edit("execution_target", target_id, t.get("bow_id"), None,
                  {"text": {"old": t.get("text"), "new": None}},
                  "Target removed", None, user)
    execute(f"DELETE FROM {SCHEMA}.execution_targets WHERE target_id = ?", [target_id])
    execute(f"DELETE FROM {SCHEMA}.execution_target_status WHERE target_id = ?", [target_id])
    return jsonify({"status": "ok"})


# ── Portfolio outcomes CRUD ────────────────────────────────────────────────────

PORT_OUTCOME_EDITABLE = {"title", "short_title", "text"}

@app.route("/api/portfolio-outcomes/<outcome_id>", methods=["PATCH"])
def update_portfolio_outcome(outcome_id):
    data    = request.json
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

    sets = ", ".join(f"{f} = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [outcome_id]
    execute(f"UPDATE {SCHEMA}.portfolio_outcomes SET {sets} WHERE outcome_id = ?", vals)
    _log_edit("portfolio_outcome", outcome_id, None, old["portfolio_id"], changes, rationale, None, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/portfolio-outcomes", methods=["POST"])
def add_portfolio_outcome():
    data         = request.json
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
            (outcome_id, portfolio_id, title, short_title, text, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)""",
        [oid, portfolio_id, title, data.get("short_title", ""), data.get("text", ""), sort_order]
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

PORT_IND_EDITABLE = {"text", "unit", "collection_frequency", "baseline",
                     "target_2026", "target_2027", "target_2028", "target_2029", "target_2030"}

@app.route("/api/portfolio-indicators/<indicator_id>", methods=["PATCH"])
def update_portfolio_indicator(indicator_id):
    data    = request.json
    user    = _actor(data)
    rows    = query(f"SELECT * FROM {SCHEMA}.portfolio_indicators WHERE indicator_id = ?", [indicator_id])
    if not rows:
        return jsonify({"error": "not found"}), 404
    old     = rows[0]
    changes = _build_changes(old, data, PORT_IND_EDITABLE)
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

    sets = ", ".join(f"{f} = ?" for f in changes)
    vals = [changes[f]["new"] for f in changes] + [indicator_id]
    execute(f"UPDATE {SCHEMA}.portfolio_indicators SET {sets} WHERE indicator_id = ?", vals)
    _log_edit("portfolio_indicator", indicator_id, None, old["portfolio_id"], changes, rationale, revision_reason, user)
    return jsonify({"status": "ok", "changes": changes})


@app.route("/api/portfolio-indicators", methods=["POST"])
def add_portfolio_indicator():
    data         = request.json
    portfolio_id = data.get("portfolio_id")
    outcome_id   = data.get("outcome_id")
    text         = (data.get("text") or "").strip()
    if not portfolio_id or not text:
        return jsonify({"error": "portfolio_id and text required"}), 400
    iid = new_id()
    execute(
        f"""INSERT INTO {SCHEMA}.portfolio_indicators
            (indicator_id, portfolio_id, outcome_id, text, unit, collection_frequency,
             baseline, target_2026, target_2027, target_2028, target_2029, target_2030)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [iid, portfolio_id, outcome_id or None, text,
         data.get("unit") or None, data.get("collection_frequency") or None,
         data.get("baseline") or None,
         data.get("target_2026") or None, data.get("target_2027") or None,
         data.get("target_2028") or None, data.get("target_2029") or None,
         data.get("target_2030") or None]
    )
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


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)