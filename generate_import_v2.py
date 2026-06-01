"""
generate_import_v2.py
Reads the SharePoint CSV export and produces import_investment_ideas_v2.sql.
Run: python generate_import_v2.py
"""

import csv, uuid, re, json

CSV_PATH    = r"C:\Users\chelseako\Downloads\2026 USP Data & AI Pipeline Planning List (4).csv"
OUTPUT_PATH = r"C:\Users\chelseako\usp-dataai-insights-hub\import_investment_ideas_v2.sql"
SCHEMA      = "usp_data.usp_strategy"

# ── Lookup tables ─────────────────────────────────────────────────────────────

PORTFOLIO_MAP = {
    "AI Infrastructure":        "ai-infra",
    "System Feedback Loops":    "sfl",
    "Data & AI Enablement Hub": "hub",
    "Cross-cutting Supports":   "cross-cutting",
    "Reserve":                  "reserve",
}

BOW_MAP = {
    # New names
    "Enhance Context & Personalization":                  "ai-infra-bow1",
    "Accelerate AI Evaluation, Evidence, and Guardrails": "ai-infra-bow2",
    "Mobilize Frontier Labs for Learner Success":         "ai-infra-bow3",
    "Build and Sustain EDU-Net":                          "sfl-bow1",
    "Advance Data & AI Feedback Loops in Place":          "sfl-bow2",
    "Launch Competencies & Skills Genome Accelerator":    "sfl-bow3",
    "Launch Competencies and Skills Genome Accelerator":  "sfl-bow3",
    "Enable Data & AI Capabilities for Division":         "hub-bow1",
    "Advance Strategy Learning & Insight":                "bow1",
    "Enable Business & Strategy Execution":               "bow2",
    # Old / variant names kept for safety
    "Build Model Capabilities & Learner Context":         "ai-infra-bow1",
    "Develop AI Evaluation Infrastructure":               "ai-infra-bow2",
    "Integrated Delivery":                                "sfl-bow2",
    "AI Evaluation Technologies & Evidence Acceleration": "ai-infra-bow2",
    "Portable Memory & Context":                          "ai-infra-bow1",
    "Hyperscaler Consortium":                             "ai-infra-bow3",
    "EDU-Net":                                            "sfl-bow1",
    "Data in Place":                                      "sfl-bow2",
    "Competencies & Skills Genome Accelerator":           "sfl-bow3",
    "Cross-division AI & Data Support and Learning":      "hub-bow1",
    "Insights for AI in Education":                       "hub-bow1",
    "MLE / Impact Accounting":                            "bow1",
    "Business and Strategy Support":                      "bow2",
}

STAGE_MAP = {
    "OK to Proceed":   "Okay to Proceed",
    "Moved to INVEST": "Moved to Invest",
    # pass-through
    "Brainstorming":    "Brainstorming",
    "Ready for Review": "Ready for Review",
    "More Info Needed": "More Info Needed",
    "On Hold":          "On Hold",
    "Moved to Invest":  "Moved to Invest",
    "Okay to Proceed":  "Okay to Proceed",
}

EMAIL_MAP = {
    "brianna.moore-trieu@gatesfoundation.org": "Brianna Moore-Trieu",
    "chelsea.koproske@gatesfoundation.org":    "Chelsea Koproske",
    "julia.bloomweltman@gatesfoundation.org":  "Julia Bloom-Weltman",
    "lilian.tan@gatesfoundation.org":          "Lilian Tan",
    "marten.roorda@gatesfoundation.org":       "Marten Roorda",
    "matt.gee@gatesfoundation.org":            "Matt Gee",
    "megan.coolidge@gatesfoundation.org":      "Megan Coolidge",
    "nicole.ifill@gatesfoundation.org":        "Nicole Ifill",
    "pavani.reddy@gatesfoundation.org":        "Pavani Reddy",
    "rachel.scherer@gatesfoundation.org":      "Rachel Scherer",
    "vic.vuchic@gatesfoundation.org":          "Vic Vuchic",
    "xiaoxue.du@gatesfoundation.org":          "Xiaoxue Du",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def esc(s):
    """Escape a string for SQL single-quoted literal, or return NULL."""
    if s is None or str(s).strip() == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def parse_amount(s):
    if not s or str(s).strip() in ("", "0", "$0"):
        return "NULL"
    s = re.sub(r"[$,\s]", "", str(s).strip())
    try:
        v = float(s)
        return str(int(v)) if v == int(v) else str(v)
    except Exception:
        return "NULL"

def resolve_email(raw):
    if not raw or not raw.strip():
        return None
    return EMAIL_MAP.get(raw.strip().lower()) or EMAIL_MAP.get(raw.strip()) or raw.strip()

def resolve_bow(name):
    if not name or not name.strip():
        return None
    return BOW_MAP.get(name.strip())

def resolve_portfolio(name):
    if not name or not name.strip():
        return None
    return PORTFOLIO_MAP.get(name.strip())

def resolve_stage(raw):
    if not raw or not raw.strip():
        return "Brainstorming"
    return STAGE_MAP.get(raw.strip(), raw.strip())

def parse_additional_bows(raw):
    """Parse the Additional BOW(s) JSON array field from SharePoint."""
    if not raw or not raw.strip():
        return None
    try:
        # SharePoint exports multi-choice as JSON array string
        items = json.loads(raw.strip())
        bow_ids = [BOW_MAP.get(i.strip()) for i in items if i.strip()]
        bow_ids = [b for b in bow_ids if b]
        return ";".join(bow_ids) if bow_ids else None
    except Exception:
        # Fallback: try as plain text
        mapped = BOW_MAP.get(raw.strip())
        return mapped

# ── Read CSV ──────────────────────────────────────────────────────────────────
# Row 0: SharePoint schema XML  → skip
# Row 1: column headers
# Rows 2+: data

data_rows = []
with open(CSV_PATH, newline="", encoding="utf-8-sig") as fh:
    reader = csv.reader(fh)
    next(reader)          # skip schema XML row
    headers = next(reader)
    for row in reader:
        if not any(c.strip() for c in row):
            continue
        while len(row) < len(headers):
            row.append("")
        data_rows.append(dict(zip(headers, row)))

print(f"Parsed {len(data_rows)} rows from CSV")

# ── Build VALUES ──────────────────────────────────────────────────────────────

unmapped_bows = set()
unmapped_portfolios = set()
value_parts = []

for r in data_rows:
    title = r.get("Investment Idea", "").strip()
    if not title:
        continue

    idea_id      = str(uuid.uuid4())
    submitted_by = resolve_email(r.get("Submitted By", ""))
    inv_raw      = r.get("INV Number", "").strip() or None
    stage        = resolve_stage(r.get("Stage", ""))
    objective    = r.get("Objective / Intended Impact", "").strip() or None
    idea_type    = r.get("Idea Type", "").strip() or None

    port_raw     = r.get("Primary Portfolio", "").strip()
    port_id      = resolve_portfolio(port_raw)
    if port_raw and not port_id:
        unmapped_portfolios.add(port_raw)

    bow_raw      = r.get("Primary Body of Work", "").strip()
    bow_id       = resolve_bow(bow_raw)
    if bow_raw and not bow_id:
        unmapped_bows.add(bow_raw)

    add_bows_raw = r.get("Additional BOW(s)", "").strip()
    add_bows     = parse_additional_bows(add_bows_raw)

    partner      = r.get("Potential Partner", "").strip() or None
    est_total    = parse_amount(r.get("Est. Total Data $", ""))
    est_2026     = parse_amount(r.get("Est. Data $ in 2026", ""))
    co_fund      = r.get("Potential Co-funding Details", "").strip() or None
    start_date   = r.get("Desired Start Date", "").strip() or None
    duration     = r.get("Est. Duration", "").strip() or None
    notes        = r.get("Additional Notes", "").strip() or None
    appr_note    = r.get("Approver Comments (Optional)", "").strip() or None

    moved        = (stage == "Moved to Invest")

    v = (
        f"  ({esc(idea_id)}, {esc(title)}, {esc(submitted_by)}, current_timestamp(),\n"
        f"   {esc(stage)}, {esc(idea_type)}, {esc(objective)},\n"
        f"   {esc(port_id)}, {esc(bow_id)}, {esc(add_bows)},\n"
        f"   {esc(partner)}, {est_total}, {est_2026},\n"
        f"   {esc(co_fund)}, {esc(start_date)}, {esc(duration)},\n"
        f"   {esc(notes)}, {esc(appr_note)},\n"
        f"   {esc(inv_raw)}, {'true' if moved else 'false'}, false)"
    )
    value_parts.append(v)

# ── Write SQL ─────────────────────────────────────────────────────────────────

sql = f"""\
-- ============================================================
-- Investment Ideas re-import ({len(value_parts)} records)
-- Source: 2026 USP Data & AI Pipeline Planning List (4).csv
-- Generated by generate_import_v2.py
--
-- Run both statements in a single Databricks SQL session.
-- The DELETE clears non-archived ideas; INSERT adds all {len(value_parts)}.
-- ============================================================

-- Step 1: Clear existing active ideas
DELETE FROM {SCHEMA}.investment_ideas
WHERE COALESCE(archived, false) = false;

-- Step 2: Insert all {len(value_parts)} ideas
INSERT INTO {SCHEMA}.investment_ideas
    (idea_id, title, submitted_by, submitted_at,
     stage, idea_type, objective,
     primary_portfolio, primary_bow, additional_bows,
     potential_partner, est_total_amount, est_2026_amount,
     co_funding_details, desired_start_date, est_duration,
     notes, approver_note,
     inv_number, moved_to_invest, archived)
VALUES
{",\n".join(value_parts)};
"""

with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
    fh.write(sql)

print(f"\nWrote {OUTPUT_PATH}")
print(f"  Rows:  {len(value_parts)}")

if unmapped_bows:
    print(f"\n⚠ Unmapped BOW names (stored as NULL):")
    for b in sorted(unmapped_bows):
        print(f"    {b!r}")

if unmapped_portfolios:
    print(f"\n⚠ Unmapped portfolio names (stored as NULL):")
    for p in sorted(unmapped_portfolios):
        print(f"    {p!r}")
