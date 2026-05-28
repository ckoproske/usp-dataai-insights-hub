#!/usr/bin/env python3
"""
import_investment_ideas.py

Imports investment ideas from the 2026 USP Data & AI Pipeline Planning List CSV
into usp_data.usp_strategy.investment_ideas.

Usage:
    DATABRICKS_TOKEN=<your-pat> python import_investment_ideas.py

    # Dry run (preview without inserting):
    DATABRICKS_TOKEN=<your-pat> python import_investment_ideas.py --dry-run

Requirements:
    pip install databricks-sql-connector
"""

import csv
import os
import re
import sys
import uuid
import argparse
from databricks import sql

# ── Config ────────────────────────────────────────────────────────────────────
DATABRICKS_HOST = os.environ.get("DATABRICKS_HOST", "adb-527625614048962.2.azuredatabricks.net")
HTTP_PATH       = os.environ.get("DATABRICKS_HTTP_PATH", "/sql/1.0/warehouses/0cd0e380d94af214")
TOKEN           = os.environ.get("DATABRICKS_TOKEN", "")
SCHEMA          = "usp_data.usp_strategy"
CSV_PATH        = os.path.join(
    os.path.expanduser("~"), "Downloads",
    "2026 USP Data & AI Pipeline Planning List.csv"
)

# ── Mappings ──────────────────────────────────────────────────────────────────
PORTFOLIO_MAP = {
    "AI Infrastructure":        "ai-infra",
    "System Feedback Loops":    "sfl",
    "Data & AI Enablement Hub": "hub",
    "Cross-cutting Supports":   "cross-cutting",
    "Cross-Cutting Supports":   "cross-cutting",
}

BOW_MAP = {
    "AI Evaluation Technologies & Evidence Acceleration": "ai-infra-bow2",
    "Portable Memory & Context":                          "ai-infra-bow1",
    "Hyperscaler Consortium":                             "ai-infra-bow1",
    "EDU-Net":                                            "sfl-bow1",
    "Data in Place":                                      "sfl-bow2",
    "Competencies & Skills Genome Accelerator":           "sfl-bow3",
    "MLE / Impact Accounting":                            "bow1",
    "Business and Strategy Support":                      "bow2",
    "Cross-division AI & Data Support and Learning":      "hub-bow1",
    "Insights for AI in Education":                       "hub-bow1",
}

STAGE_MAP = {
    "Brainstorming":    "Brainstorming",
    "More Info Needed": "More Info Needed",
    "Ready for Review": "Ready for Review",
    "OK to Proceed":    "Okay to Proceed",
    "On Hold":          "On Hold",
    "Moved to INVEST":  "Moved to Invest",
}

IDEA_TYPE_MAP = {
    "Grant":                         "Grant",
    "Contract":                      "Contract",
    "Bucket (multiple investments)": "Bucket (multiple INVs)",
    "Supplement to existing INV":    "Supplement to existing INV",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def new_id():
    return str(uuid.uuid4())

def clean_amount(val):
    """Strip $, commas, whitespace → float or None."""
    if not val or not val.strip():
        return None
    cleaned = re.sub(r"[$,\s]", "", val.strip())
    try:
        return float(cleaned)
    except ValueError:
        return None

def parse_row(row):
    """Convert a CSV row dict into a normalised record dict."""
    title         = (row.get("Investment Idea") or "").strip()
    submitted_by  = (row.get("Submitted By")    or "").strip() or None
    raw_stage     = (row.get("Stage")           or "").strip()
    stage         = STAGE_MAP.get(raw_stage, raw_stage) or "Brainstorming"
    objective     = (row.get("Objective / Intended Impact") or "").strip() or None
    raw_type      = (row.get("Idea Type")       or "").strip()
    idea_type     = IDEA_TYPE_MAP.get(raw_type, raw_type or None)
    portfolio_raw = (row.get("Portfolio")       or "").strip()
    bow_raw       = (row.get("Body of Work")    or "").strip()
    inv_number    = (row.get("(Admin use) INV Number") or "").strip() or None

    # Ideas with an INV number are already in INVEST → archive them
    is_invested = bool(inv_number) or (stage == "Moved to Invest")
    if is_invested:
        stage = "Moved to Invest"

    return {
        "idea_id":          new_id(),
        "title":            title,
        "submitted_by":     submitted_by,
        "stage":            stage,
        "idea_type":        idea_type,
        "objective":        objective,
        "primary_portfolio": PORTFOLIO_MAP.get(portfolio_raw) or None,
        "primary_bow":      BOW_MAP.get(bow_raw) or None,
        "potential_partner": (row.get("Potential Partner") or "").strip() or None,
        "est_total_amount": clean_amount(row.get("Est. Total Data $")),
        "est_2026_amount":  clean_amount(row.get("Est. Data $ in 2026")),
        "co_funding_details": (row.get("Potential Co-funding Details") or "").strip() or None,
        "desired_start_date": (row.get("Desired Start Date") or "").strip() or None,
        "est_duration":     (row.get("Est. Duration")     or "").strip() or None,
        "notes":            (row.get("Additional Notes")  or "").strip() or None,
        "approver_note":    (row.get("Approver Comments (Optional)") or "").strip() or None,
        "inv_number":       inv_number,
        "is_invested":      is_invested,
        # flag any BOW that couldn't be matched
        "_bow_unmatched":   bool(bow_raw and not BOW_MAP.get(bow_raw)),
        "_portfolio_unmatched": bool(portfolio_raw and not PORTFOLIO_MAP.get(portfolio_raw)),
    }

# ── Insert helpers ────────────────────────────────────────────────────────────
_INSERT_ACTIVE = f"""
    INSERT INTO {{schema}}.investment_ideas
        (idea_id, title, submitted_by, submitted_at,
         stage, idea_type, objective,
         primary_portfolio, primary_bow,
         potential_partner, est_total_amount, est_2026_amount,
         co_funding_details, desired_start_date, est_duration,
         notes, approver_note,
         archived)
    VALUES (?, ?, ?, current_timestamp(),
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            false)
"""

_INSERT_ARCHIVED = f"""
    INSERT INTO {{schema}}.investment_ideas
        (idea_id, title, submitted_by, submitted_at,
         stage, idea_type, objective,
         primary_portfolio, primary_bow,
         potential_partner, est_total_amount, est_2026_amount,
         co_funding_details, desired_start_date, est_duration,
         notes, approver_note, inv_number,
         archived, archived_at,
         moved_to_invest, moved_to_invest_at)
    VALUES (?, ?, ?, current_timestamp(),
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            true, current_timestamp(),
            true, current_timestamp())
"""

def build_params(r):
    base = [
        r["idea_id"], r["title"], r["submitted_by"],
        r["stage"], r["idea_type"], r["objective"],
        r["primary_portfolio"], r["primary_bow"],
        r["potential_partner"], r["est_total_amount"], r["est_2026_amount"],
        r["co_funding_details"], r["desired_start_date"], r["est_duration"],
        r["notes"], r["approver_note"],
    ]
    if r["is_invested"]:
        base.append(r["inv_number"])  # extra param for archived insert
    return base

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and preview rows without inserting")
    args = parser.parse_args()

    if not args.dry_run and not TOKEN:
        print("ERROR: Set DATABRICKS_TOKEN to your personal access token.")
        sys.exit(1)

    # ── Read CSV ──────────────────────────────────────────────────────────────
    records = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = (row.get("Investment Idea") or "").strip()
            if not title:
                continue          # skip blank / BOW-option rows
            records.append(parse_row(row))

    print(f"Parsed {len(records)} investment ideas from CSV.\n")

    # ── Preview ───────────────────────────────────────────────────────────────
    active   = [r for r in records if not r["is_invested"]]
    archived = [r for r in records if r["is_invested"]]
    unmatched_bow  = [r for r in records if r["_bow_unmatched"]]
    unmatched_port = [r for r in records if r["_portfolio_unmatched"]]

    print(f"  Active ideas  : {len(active)}")
    print(f"  Archived (INVEST): {len(archived)}")

    if unmatched_bow:
        print(f"\n  ⚠️  {len(unmatched_bow)} rows with unmatched BOW (primary_bow will be NULL):")
        for r in unmatched_bow:
            print(f"     - \"{r['title'][:55]}\"")

    if unmatched_port:
        print(f"\n  ⚠️  {len(unmatched_port)} rows with unmatched portfolio (primary_portfolio will be NULL):")
        for r in unmatched_port:
            print(f"     - \"{r['title'][:55]}\"")

    if args.dry_run:
        print("\n[DRY RUN] No data written. Remove --dry-run to import.")
        print("\nSample (first 5 rows):")
        for r in records[:5]:
            print(f"  title={r['title'][:45]!r:50} "
                  f"stage={r['stage']!r:22} "
                  f"portfolio={r['primary_portfolio']!r:15} "
                  f"bow={r['primary_bow']!r:18} "
                  f"archived={r['is_invested']}")
        return

    # ── Insert ────────────────────────────────────────────────────────────────
    print("\nConnecting to Databricks…")
    conn = sql.connect(
        server_hostname=DATABRICKS_HOST,
        http_path=HTTP_PATH,
        access_token=TOKEN,
    )

    inserted = 0
    errors   = []

    with conn:
        with conn.cursor() as cur:
            for r in records:
                sql_str = (_INSERT_ARCHIVED if r["is_invested"] else _INSERT_ACTIVE).format(schema=SCHEMA)
                params  = build_params(r)
                try:
                    cur.execute(sql_str, params)
                    inserted += 1
                    tag = "archived" if r["is_invested"] else "active"
                    print(f"  ✓ [{tag:8}] {r['title'][:65]}")
                except Exception as e:
                    errors.append((r["title"], str(e)))
                    print(f"  ✗ [error   ] {r['title'][:55]}: {e}")

    print(f"\n{'─'*60}")
    print(f"Done.  Inserted: {inserted}  |  Failed: {len(errors)}")
    if errors:
        print("\nFailed rows:")
        for title, err in errors:
            print(f"  - {title}: {err}")

if __name__ == "__main__":
    main()
