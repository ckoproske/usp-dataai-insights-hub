// generate_import_sql.js
// Run: node generate_import_sql.js
// Outputs: import_investment_ideas.sql  (paste into Databricks SQL Editor)

const fs   = require("fs");
const path = require("path");

const CSV_PATH    = path.join(process.env.USERPROFILE, "Downloads",
                              "2026 USP Data & AI Pipeline Planning List.csv");
const OUTPUT_PATH = path.join(__dirname, "import_investment_ideas.sql");
const SCHEMA      = "usp_data.usp_strategy";

const PORTFOLIO_MAP = {
  "AI Infrastructure":        "ai-infra",
  "System Feedback Loops":    "sfl",
  "Data & AI Enablement Hub": "hub",
  "Cross-cutting Supports":   "cross-cutting",
  "Cross-Cutting Supports":   "cross-cutting",
};

const BOW_MAP = {
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
};

const STAGE_MAP = {
  "Brainstorming":    "Brainstorming",
  "More Info Needed": "More Info Needed",
  "Ready for Review": "Ready for Review",
  "OK to Proceed":    "Okay to Proceed",
  "On Hold":          "On Hold",
  "Moved to INVEST":  "Moved to Invest",
};

const IDEA_TYPE_MAP = {
  "Grant":                         "Grant",
  "Contract":                      "Contract",
  "Bucket (multiple investments)": "Bucket (multiple INVs)",
  "Supplement to existing INV":    "Supplement to existing INV",
};

// ── UUID v4 (no deps) ─────────────────────────────────────────────────────────
function uuid4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── CSV parser (handles quoted fields with embedded commas/newlines) ───────────
function parseCSV(text) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')            { inQuotes = false; }
      else                            { field += ch; }
    } else {
      if (ch === '"')                 { inQuotes = true; }
      else if (ch === ',')            { row.push(field); field = ""; }
      else if (ch === '\r' && next === '\n') { row.push(field); rows.push(row); row = []; field = ""; i++; }
      else if (ch === '\n')           { row.push(field); rows.push(row); row = []; field = ""; }
      else                            { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const headers = rows[0];
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (r[i] || "").trim(); });
    return obj;
  });
}

// ── SQL helpers ───────────────────────────────────────────────────────────────
function S(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  return "'" + String(val).replace(/'/g, "''") + "'";
}
function N(val) {
  if (val === null || val === undefined || val === "") return "NULL";
  const n = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(n) ? "NULL" : String(n);
}

// ── Parse row ─────────────────────────────────────────────────────────────────
function parseRow(row) {
  const title        = row["Investment Idea"] || "";
  const submittedBy  = row["Submitted By"] || null;
  const rawStage     = row["Stage"] || "";
  let stage          = STAGE_MAP[rawStage] || rawStage || "Brainstorming";
  const objective    = row["Objective / Intended Impact"] || null;
  const rawType      = row["Idea Type"] || "";
  const ideaType     = IDEA_TYPE_MAP[rawType] || rawType || null;
  const portRaw      = row["Portfolio"] || "";
  const bowRaw       = row["Body of Work"] || "";
  const invNumber    = row["(Admin use) INV Number"] || null;

  const isInvested   = !!(invNumber) || stage === "Moved to Invest";
  if (isInvested) stage = "Moved to Invest";

  return {
    idea_id:           uuid4(),
    title,
    submitted_by:      submittedBy || null,
    stage,
    idea_type:         ideaType,
    objective:         objective || null,
    primary_portfolio: PORTFOLIO_MAP[portRaw] || null,
    primary_bow:       BOW_MAP[bowRaw] || null,
    potential_partner: row["Potential Partner"] || null,
    est_total_amount:  row["Est. Total Data $"] || null,
    est_2026_amount:   row["Est. Data $ in 2026"] || null,
    co_funding_details:row["Potential Co-funding Details"] || null,
    desired_start_date:row["Desired Start Date"] || null,
    est_duration:      row["Est. Duration"] || null,
    notes:             row["Additional Notes"] || null,
    approver_note:     row["Approver Comments (Optional)"] || null,
    inv_number:        invNumber,
    is_invested:       isInvested,
    _bow_unmatched:    !!(bowRaw && !BOW_MAP[bowRaw]),
    _port_unmatched:   !!(portRaw && !PORTFOLIO_MAP[portRaw]),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const raw     = fs.readFileSync(CSV_PATH, "utf-8").replace(/^﻿/, ""); // strip BOM
const csvRows = parseCSV(raw);
const records = csvRows.map(parseRow).filter(r => r.title);

const active   = records.filter(r => !r.is_invested);
const archived = records.filter(r =>  r.is_invested);
const warnBow  = records.filter(r => r._bow_unmatched);
const warnPort = records.filter(r => r._port_unmatched);

const lines = [
  "-- ============================================================",
  `-- Investment Ideas import (${records.length} records: ${active.length} active, ${archived.length} archived)`,
  "-- Source: 2026 USP Data & AI Pipeline Planning List.csv",
  "-- ============================================================",
  "",
];

if (warnBow.length) {
  lines.push(`-- ⚠  ${warnBow.length} rows with unmatched BOW → primary_bow = NULL`);
  warnBow.forEach(r => lines.push(`--    ${r.title.substring(0, 70)}`));
  lines.push("");
}
if (warnPort.length) {
  lines.push(`-- ⚠  ${warnPort.length} rows with unmatched portfolio → primary_portfolio = NULL`);
  warnPort.forEach(r => lines.push(`--    ${r.title.substring(0, 70)}`));
  lines.push("");
}

for (const r of records) {
  if (!r.is_invested) {
    lines.push(
      `INSERT INTO ${SCHEMA}.investment_ideas\n` +
      `    (idea_id, title, submitted_by, submitted_at,\n` +
      `     stage, idea_type, objective,\n` +
      `     primary_portfolio, primary_bow,\n` +
      `     potential_partner, est_total_amount, est_2026_amount,\n` +
      `     co_funding_details, desired_start_date, est_duration,\n` +
      `     notes, approver_note, archived)\n` +
      `VALUES (${S(r.idea_id)}, ${S(r.title)}, ${S(r.submitted_by)}, current_timestamp(),\n` +
      `        ${S(r.stage)}, ${S(r.idea_type)}, ${S(r.objective)},\n` +
      `        ${S(r.primary_portfolio)}, ${S(r.primary_bow)},\n` +
      `        ${S(r.potential_partner)}, ${N(r.est_total_amount)}, ${N(r.est_2026_amount)},\n` +
      `        ${S(r.co_funding_details)}, ${S(r.desired_start_date)}, ${S(r.est_duration)},\n` +
      `        ${S(r.notes)}, ${S(r.approver_note)}, false);`
    );
  } else {
    lines.push(
      `INSERT INTO ${SCHEMA}.investment_ideas\n` +
      `    (idea_id, title, submitted_by, submitted_at,\n` +
      `     stage, idea_type, objective,\n` +
      `     primary_portfolio, primary_bow,\n` +
      `     potential_partner, est_total_amount, est_2026_amount,\n` +
      `     co_funding_details, desired_start_date, est_duration,\n` +
      `     notes, approver_note, inv_number,\n` +
      `     archived, archived_at,\n` +
      `     moved_to_invest, moved_to_invest_at)\n` +
      `VALUES (${S(r.idea_id)}, ${S(r.title)}, ${S(r.submitted_by)}, current_timestamp(),\n` +
      `        ${S(r.stage)}, ${S(r.idea_type)}, ${S(r.objective)},\n` +
      `        ${S(r.primary_portfolio)}, ${S(r.primary_bow)},\n` +
      `        ${S(r.potential_partner)}, ${N(r.est_total_amount)}, ${N(r.est_2026_amount)},\n` +
      `        ${S(r.co_funding_details)}, ${S(r.desired_start_date)}, ${S(r.est_duration)},\n` +
      `        ${S(r.notes)}, ${S(r.approver_note)}, ${S(r.inv_number)},\n` +
      `        true, current_timestamp(),\n` +
      `        true, current_timestamp());`
    );
  }
  lines.push("");
}

fs.writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");

console.log(`✓ Wrote ${records.length} INSERT statements to:`);
console.log(`  ${OUTPUT_PATH}`);
console.log(`\n  Active  : ${active.length}`);
console.log(`  Archived: ${archived.length}`);
if (warnBow.length) {
  console.log(`\n  ⚠  ${warnBow.length} unmatched BOW (primary_bow = NULL):`);
  warnBow.forEach(r => console.log(`     - ${r.title.substring(0, 65)}`));
}
if (warnPort.length) {
  console.log(`\n  ⚠  ${warnPort.length} unmatched portfolio (primary_portfolio = NULL):`);
  warnPort.forEach(r => console.log(`     - ${r.title.substring(0, 65)}`));
}
console.log("\nNext: open import_investment_ideas.sql in Databricks SQL Editor and run it.");
