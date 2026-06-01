/**
 * generate_import_v2.js
 * Reads the SharePoint CSV and produces import_investment_ideas_v2.sql
 * Run: node generate_import_v2.js
 */

const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const CSV_PATH    = String.raw`C:\Users\chelseako\Downloads\2026 USP Data & AI Pipeline Planning List (4).csv`;
const OUTPUT_PATH = path.join(__dirname, "import_investment_ideas_v2.sql");
const SCHEMA      = "usp_data.usp_strategy";

// ── Lookup tables ─────────────────────────────────────────────────────────────

const PORTFOLIO_MAP = {
  "AI Infrastructure":        "ai-infra",
  "System Feedback Loops":    "sfl",
  "Data & AI Enablement Hub": "hub",
  "Cross-cutting Supports":   "cross-cutting",
  "Reserve":                  "reserve",
};

const BOW_MAP = {
  // Current names
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
  // Historic / variant names
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
};

const STAGE_MAP = {
  "OK to Proceed":   "Okay to Proceed",
  "Moved to INVEST": "Moved to Invest",
  "Brainstorming":   "Brainstorming",
  "Ready for Review":"Ready for Review",
  "More Info Needed":"More Info Needed",
  "On Hold":         "On Hold",
  "Moved to Invest": "Moved to Invest",
  "Okay to Proceed": "Okay to Proceed",
};

const EMAIL_MAP = {
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
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s) {
  if (s === null || s === undefined || String(s).trim() === "") return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function parseAmount(s) {
  if (!s || !String(s).trim()) return "NULL";
  const cleaned = String(s).replace(/[$,\s]/g, "").trim();
  if (!cleaned || cleaned === "0") return "NULL";
  const n = parseFloat(cleaned);
  if (isNaN(n)) return "NULL";
  return String(Number.isInteger(n) ? n : n);
}

function resolveEmail(raw) {
  if (!raw || !raw.trim()) return null;
  return EMAIL_MAP[raw.trim().toLowerCase()] || EMAIL_MAP[raw.trim()] || raw.trim();
}

function normStr(s) {
  // Normalize: trim, collapse whitespace, decode HTML entities
  return s.trim()
    .replace(/&amp;/g, "&").replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/\s+/g, " ");
}

function resolveBow(name) {
  if (!name || !name.trim()) return null;
  return BOW_MAP[normStr(name)] || BOW_MAP[name.trim()] || null;
}

function resolvePortfolio(name) {
  if (!name || !name.trim()) return null;
  return PORTFOLIO_MAP[name.trim()] || null;
}

function resolveStage(raw) {
  if (!raw || !raw.trim()) return "Brainstorming";
  return STAGE_MAP[raw.trim()] || raw.trim();
}

function parseAdditionalBows(raw) {
  if (!raw || !raw.trim()) return null;
  try {
    const items = JSON.parse(raw.trim());
    if (Array.isArray(items)) {
      const ids = items.map(i => BOW_MAP[i.trim()]).filter(Boolean);
      return ids.length ? ids.join(";") : null;
    }
  } catch (e) { /* not JSON */ }
  const mapped = BOW_MAP[raw.trim()];
  return mapped || null;
}

// ── CSV parser (handles quoted multi-line fields) ─────────────────────────────

function parseCSV(text) {
  const rows = [];
  let cur = [], field = "", inQuote = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuote = true; i++; continue; }
    if (ch === ',') { cur.push(field); field = ""; i++; continue; }
    if (ch === '\r' && text[i+1] === '\n') {
      cur.push(field); field = ""; rows.push(cur); cur = []; i += 2; continue;
    }
    if (ch === '\n') {
      cur.push(field); field = ""; rows.push(cur); cur = []; i++; continue;
    }
    field += ch; i++;
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw   = fs.readFileSync(CSV_PATH, "utf-8");
const allRows = parseCSV(raw);

// Row 0 = schema XML, Row 1 = headers, Rows 2+ = data
const headers  = allRows[1];
const dataRows = allRows.slice(2).filter(r => r.some(c => c.trim()));

console.log(`Parsed ${dataRows.length} data rows`);

const unmappedBows  = new Set();
const unmappedPorts = new Set();
const valueParts    = [];

for (const row of dataRows) {
  while (row.length < headers.length) row.push("");
  const r = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));

  const title = r["Investment Idea"].trim();
  if (!title) continue;

  const idea_id      = randomUUID();
  const submitted_by = resolveEmail(r["Submitted By"]);
  const inv_raw      = r["INV Number"].trim() || null;
  const stage        = resolveStage(r["Stage"]);
  const objective    = r["Objective / Intended Impact"].trim() || null;
  const idea_type    = r["Idea Type"].trim() || null;

  const port_raw = r["Primary Portfolio"].trim();
  const port_id  = resolvePortfolio(port_raw);
  if (port_raw && !port_id) unmappedPorts.add(port_raw);

  const bow_raw  = r["Primary Body of Work"].trim();
  const bow_id   = resolveBow(bow_raw);
  if (bow_raw && !bow_id) {
    unmappedBows.add(bow_raw);
    console.log(`  ⚠ Row "${title.substring(0,40)}": bow_raw=${JSON.stringify(bow_raw)}`);
  }

  const add_bows = parseAdditionalBows(r["Additional BOW(s)"]);
  const partner  = r["Potential Partner"].trim() || null;
  const est_total= parseAmount(r["Est. Total Data $"]);
  const est_2026 = parseAmount(r["Est. Data $ in 2026"]);
  const co_fund  = r["Potential Co-funding Details"].trim() || null;
  const start_dt = r["Desired Start Date"].trim() || null;
  const duration = r["Est. Duration"].trim() || null;
  const notes    = r["Additional Notes"].trim() || null;
  const appr_note= r["Approver Comments (Optional)"].trim() || null;

  const moved = (stage === "Moved to Invest");

  valueParts.push(
    `  (${esc(idea_id)}, ${esc(title)}, ${esc(submitted_by)}, current_timestamp(),\n` +
    `   ${esc(stage)}, ${esc(idea_type)}, ${esc(objective)},\n` +
    `   ${esc(port_id)}, ${esc(bow_id)}, ${esc(add_bows)},\n` +
    `   ${esc(partner)}, ${est_total}, ${est_2026},\n` +
    `   ${esc(co_fund)}, ${esc(start_dt)}, ${esc(duration)},\n` +
    `   ${esc(notes)}, ${esc(appr_note)},\n` +
    `   ${esc(inv_raw)}, ${moved ? "true" : "false"}, false)`
  );
}

const sql =
`-- ============================================================
-- Investment Ideas re-import (${valueParts.length} records)
-- Source: 2026 USP Data & AI Pipeline Planning List (4).csv
-- Generated by generate_import_v2.js
--
-- Run BOTH statements in a single Databricks SQL session.
-- Step 1 clears non-archived ideas; Step 2 inserts all ${valueParts.length}.
-- ============================================================

-- Step 1: Clear existing active (non-archived) ideas
DELETE FROM ${SCHEMA}.investment_ideas
WHERE COALESCE(archived, false) = false;

-- Step 2: Insert all ${valueParts.length} ideas from SharePoint export
INSERT INTO ${SCHEMA}.investment_ideas
    (idea_id, title, submitted_by, submitted_at,
     stage, idea_type, objective,
     primary_portfolio, primary_bow, additional_bows,
     potential_partner, est_total_amount, est_2026_amount,
     co_funding_details, desired_start_date, est_duration,
     notes, approver_note,
     inv_number, moved_to_invest, archived)
VALUES
${valueParts.join(",\n")};
`;

fs.writeFileSync(OUTPUT_PATH, sql, "utf-8");

console.log(`\nWrote ${OUTPUT_PATH}`);
console.log(`  Rows: ${valueParts.length}`);

if (unmappedBows.size) {
  console.log(`\n⚠ Unmapped BOW names (stored as NULL):`);
  for (const b of [...unmappedBows].sort()) console.log(`    "${b}"`);
}
if (unmappedPorts.size) {
  console.log(`\n⚠ Unmapped portfolio names (stored as NULL):`);
  for (const p of [...unmappedPorts].sort()) console.log(`    "${p}"`);
}
