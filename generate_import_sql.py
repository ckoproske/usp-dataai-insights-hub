#!/usr/bin/env python3
"""
generate_import_sql.py
Reads the CSV and writes import_investment_ideas.sql — no Databricks connection needed.
Run:  python generate_import_sql.py
Then paste the resulting .sql file into the Databricks SQL Editor.
"""

import csv, os, re, uuid

CSV_PATH    = os.path.join(os.path.expanduser("~"), "Downloads",
                           "2026 USP Data & AI Pipeline Planning List.csv")
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "import_investment_ideas.sql")
SCHEMA = "usp_data.usp_strategy"

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

def S(val):
    """Python value → SQL literal (string or NULL)."""
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"

def N(val):
    """Python float/None → SQL numeric literal or NULL."""
    return "NULL" if val is None else str(val)

def clean_amount(v):
    if not v or not v.strip():
        return None
    try:
        return float(re.sub(r"[$,\s]", "", v.strip()))
    except ValueError:
        return None

def parse_row(row):
    title        = (row.get("Investment Idea") or "").strip()
    submitted_by = (row.get("Submitted By")    or "").strip() or None
    raw_stage    = (row.get("Stage")           or "").strip()
    stage        = STAGE_MAP.get(raw_stage, raw_stage) or "Brainstorming"
    objective    = (row.get("Objective / Intended Impact") or "").strip() or None
    raw_type     = (row.get("Idea Type")       or "").strip()
    idea_type    = IDEA_TYPE_MAP.get(raw_type, raw_type or None)
    port_raw     = (row.get("Portfolio")       or "").strip()
    bow_raw      = (row.get("Body of Work")    or "").strip()
    inv_number   = (row.get("(Admin use) INV Number") or "").strip() or None

    is_invested  = bool(inv_number) or (stage == "Moved to Invest")
    if is_invested:
        stage = "Moved to Invest"

    return {
        "idea_id":           str(uuid.uuid4()),
        "title":             title,
        "submitted_by":      submitted_by,
        "stage":             stage,
        "idea_type":         idea_type,
        "objective":         objective,
        "primary_portfolio": PORTFOLIO_MAP.get(port_raw) or None,
        "primary_bow":       BOW_MAP.get(bow_raw) or None,
        "potential_partner": (row.get("Potential Partner") or "").strip() or None,
        "est_total_amount":  clean_amount(row.get("Est. Total Data $")),
        "est_2026_amount":   clean_amount(row.get("Est. Data $ in 2026")),
        "co_funding_details":(row.get("Potential Co-funding Details") or "").strip() or None,
        "desired_start_date":(row.get("Desired Start Date") or "").strip() or None,
        "est_duration":      (row.get("Est. Duration")     or "").strip() or None,
        "notes":             (row.get("Additional Notes")  or "").strip() or None,
        "approver_note":     (row.get("Approver Comments (Optional)") or "").strip() or None,
        "inv_number":        inv_number,
        "is_invested":       is_invested,
        "_bow_unmatched":    bool(bow_raw and not BOW_MAP.get(bow_raw)),
        "_port_unmatched":   bool(port_raw and not PORTFOLIO_MAP.get(port_raw)),
    }

# ── Read CSV ──────────────────────────────────────────────────────────────────
records = []
with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        t = (row.get("Investment Idea") or "").strip()
        if t:
            records.append(parse_row(row))

active   = [r for r in records if not r["is_invested"]]
archived = [r for r in records if r["is_invested"]]
warn_bow  = [r for r in records if r["_bow_unmatched"]]
warn_port = [r for r in records if r["_port_unmatched"]]

# ── Build SQL ─────────────────────────────────────────────────────────────────
lines = [
    f"-- ============================================================",
    f"-- Investment Ideas import ({len(records)} records: "
    f"{len(active)} active, {len(archived)} archived)",
    f"-- Source: 2026 USP Data & AI Pipeline Planning List.csv",
    f"-- ============================================================",
    "",
]

if warn_bow:
    lines.append(f"-- ⚠  {len(warn_bow)} rows with unmatched BOW → primary_bow will be NULL")
    for r in warn_bow:
        lines.append(f"--    {r['title'][:70]}")
    lines.append("")
if warn_port:
    lines.append(f"-- ⚠  {len(warn_port)} rows with unmatched portfolio → primary_portfolio will be NULL")
    for r in warn_port:
        lines.append(f"--    {r['title'][:70]}")
    lines.append("")

for r in records:
    if not r["is_invested"]:
        lines.append(
            f"INSERT INTO {SCHEMA}.investment_ideas\n"
            f"    (idea_id, title, submitted_by, submitted_at,\n"
            f"     stage, idea_type, objective,\n"
            f"     primary_portfolio, primary_bow,\n"
            f"     potential_partner, est_total_amount, est_2026_amount,\n"
            f"     co_funding_details, desired_start_date, est_duration,\n"
            f"     notes, approver_note, archived)\n"
            f"VALUES ({S(r['idea_id'])}, {S(r['title'])}, {S(r['submitted_by'])}, current_timestamp(),\n"
            f"        {S(r['stage'])}, {S(r['idea_type'])}, {S(r['objective'])},\n"
            f"        {S(r['primary_portfolio'])}, {S(r['primary_bow'])},\n"
            f"        {S(r['potential_partner'])}, {N(r['est_total_amount'])}, {N(r['est_2026_amount'])},\n"
            f"        {S(r['co_funding_details'])}, {S(r['desired_start_date'])}, {S(r['est_duration'])},\n"
            f"        {S(r['notes'])}, {S(r['approver_note'])}, false);"
        )
    else:
        lines.append(
            f"INSERT INTO {SCHEMA}.investment_ideas\n"
            f"    (idea_id, title, submitted_by, submitted_at,\n"
            f"     stage, idea_type, objective,\n"
            f"     primary_portfolio, primary_bow,\n"
            f"     potential_partner, est_total_amount, est_2026_amount,\n"
            f"     co_funding_details, desired_start_date, est_duration,\n"
            f"     notes, approver_note, inv_number,\n"
            f"     archived, archived_at,\n"
            f"     moved_to_invest, moved_to_invest_at)\n"
            f"VALUES ({S(r['idea_id'])}, {S(r['title'])}, {S(r['submitted_by'])}, current_timestamp(),\n"
            f"        {S(r['stage'])}, {S(r['idea_type'])}, {S(r['objective'])},\n"
            f"        {S(r['primary_portfolio'])}, {S(r['primary_bow'])},\n"
            f"        {S(r['potential_partner'])}, {N(r['est_total_amount'])}, {N(r['est_2026_amount'])},\n"
            f"        {S(r['co_funding_details'])}, {S(r['desired_start_date'])}, {S(r['est_duration'])},\n"
            f"        {S(r['notes'])}, {S(r['approver_note'])}, {S(r['inv_number'])},\n"
            f"        true, current_timestamp(),\n"
            f"        true, current_timestamp());"
        )
    lines.append("")

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"✓ Wrote {len(records)} INSERT statements to:")
print(f"  {OUTPUT_PATH}")
print(f"\n  Active  : {len(active)}")
print(f"  Archived: {len(archived)}")
if warn_bow:
    print(f"\n  ⚠  {len(warn_bow)} rows with unmatched BOW (primary_bow = NULL):")
    for r in warn_bow:
        print(f"     - {r['title'][:65]}")
if warn_port:
    print(f"\n  ⚠  {len(warn_port)} rows with unmatched portfolio (primary_portfolio = NULL):")
    for r in warn_port:
        print(f"     - {r['title'][:65]}")
print("\nNext: open import_investment_ideas.sql in Databricks SQL Editor and run it.")
