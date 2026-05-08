-- =============================================================================
-- USP Data & AI Strategy — Data Migration: Seed missing bow_indicators rows
-- Resolves orphaned bow_indicator_actuals for bow1 and sfl-bow1
--
-- Root cause: bow_indicator_actuals was seeded with indicator_ids like
--   bow1-o1-i1, sfl-bow1-o3-i3, etc. but the bow_indicators parent table
--   was never populated. The LEFT JOIN in /api/indicators/<bow_id> returns
--   no rows, so no indicators or actuals appear in the portal or dashboard.
--
-- Safe to re-run: uses MERGE ON NOT MATCHED so existing rows are left alone.
--
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- PRE-FLIGHT: confirm outcome_ids in bow_outcomes for these BOWs
-- The bow_indicators.outcome_id must match bow_outcomes.outcome_id exactly.
-- Confirmed outcome_ids:
--   bow1:     bow1-o1, bow1-o2, bow1-o3
--   sfl-bow1: sfl-bow1-o1, sfl-bow1-o2, sfl-bow1-o3
-- =============================================================================

-- (Pre-flight already verified — MERGEs below use confirmed outcome_ids)


-- =============================================================================
-- SECTION 1: bow1 — Advance Strategy Learning & Insight
-- Outcome o1: Measurement & MLE Routines    (indicators i1–i3)
-- Outcome o2: AI-Enabled Analytics          (indicators i4–i6)
-- Outcome o3: Cross-PST Collaboration       (indicators i7–i9)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.bow_indicators AS t
USING (
  SELECT 'bow1-o1-i1'  AS indicator_id, 'bow1' AS bow_id, 'bow1-o1' AS outcome_id,
    '% of team reporting high-level of clarity around measurement priorities' AS text,
    'Annual state data survey' AS data_source, NULL AS baseline,
    'annual' AS collection_frequency, NULL AS unit,
    50.0 AS target_2026, 62.0 AS target_2027, 72.0 AS target_2028,
    80.0 AS target_2029, 88.0 AS target_2030
  UNION ALL
  SELECT 'bow1-o1-i2', 'bow1', 'bow1-o1',
    '% MLE plans completed on schedule',
    NULL, NULL, 'annual', NULL,
    45.0, 58.0, 68.0, 76.0, 85.0
  UNION ALL
  SELECT 'bow1-o1-i3', 'bow1', 'bow1-o1',
    '# evaluations launched',
    NULL, NULL, 'annual', NULL,
    40.0, 52.0, 63.0, 72.0, 82.0
  UNION ALL
  SELECT 'bow1-o2-i4', 'bow1', 'bow1-o2',
    '% utilization rate of TBD analytical tools',
    NULL, NULL, 'quarterly', NULL,
    42.0, 55.0, 65.0, 74.0, 83.0
  UNION ALL
  SELECT 'bow1-o2-i5', 'bow1', 'bow1-o2',
    '% team expressing confidence in MLE data strengthening decisionmaking',
    NULL, NULL, 'annual', NULL,
    55.0, 65.0, 74.0, 82.0, 88.0
  UNION ALL
  SELECT 'bow1-o2-i6', 'bow1', 'bow1-o2',
    '# dashboards deployed',
    NULL, NULL, NULL, NULL,
    35.0, 48.0, 60.0, 70.0, 80.0
  UNION ALL
  SELECT 'bow1-o3-i7', 'bow1', 'bow1-o3',
    '# GitHub repo downloads',
    NULL, NULL, NULL, NULL,
    15.0, 30.0, 48.0, 64.0, 78.0
  UNION ALL
  SELECT 'bow1-o3-i8', 'bow1', 'bow1-o3',
    '# learning routines established with PSTs',
    NULL, NULL, NULL, NULL,
    50.0, 60.0, 70.0, 78.0, 86.0
  UNION ALL
  SELECT 'bow1-o3-i9', 'bow1', 'bow1-o3',
    '# cross-PST co-funded evaluations',
    NULL, NULL, NULL, NULL,
    40.0, 52.0, 63.0, 72.0, 82.0
) AS s ON t.indicator_id = s.indicator_id
WHEN NOT MATCHED THEN INSERT (
  indicator_id, bow_id, outcome_id, text, data_source, baseline,
  collection_frequency, unit,
  target_2026, target_2027, target_2028, target_2029, target_2030,
  is_active
) VALUES (
  s.indicator_id, s.bow_id, s.outcome_id, s.text, s.data_source, s.baseline,
  s.collection_frequency, s.unit,
  s.target_2026, s.target_2027, s.target_2028, s.target_2029, s.target_2030,
  true
);


-- =============================================================================
-- SECTION 2: sfl-bow1 — EDU-NET / System Feedback Loops BOW
-- Outcome sfl-bow1-o1: Data Access & Insight Speed     (indicators i1–i3)
-- Outcome sfl-bow1-o2: Partnership & Coverage          (indicators i1–i3)
-- Outcome sfl-bow1-o3: Use & Equity                    (indicators i1–i3)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.bow_indicators AS t
USING (
  SELECT 'sfl-bow1-o1-i1' AS indicator_id, 'sfl-bow1' AS bow_id, 'sfl-bow1-o1' AS outcome_id,
    'Reduction in time to produce key insights (% reduction from baseline)' AS text,
    'EDU-Net pilot assessment' AS data_source, '100' AS baseline,
    'annual' AS collection_frequency, '%' AS unit,
    NULL AS target_2026, 10.0 AS target_2027, 25.0 AS target_2028,
    35.0 AS target_2029, 40.0 AS target_2030
  UNION ALL
  SELECT 'sfl-bow1-o1-i2', 'sfl-bow1', 'sfl-bow1-o1',
    'Number of public/private collaborations or products',
    'EDU-Net partnership tracker', '0', 'annual', NULL,
    2.0, 5.0, 10.0, 16.0, 22.0
  UNION ALL
  SELECT 'sfl-bow1-o1-i3', 'sfl-bow1', 'sfl-bow1-o1',
    'Representation from Stakeholder Groups in EDU-NET (# groups represented)',
    'Advisory Board roster', '0', 'annual', NULL,
    3.0, 6.0, 9.0, 11.0, 12.0
  UNION ALL
  SELECT 'sfl-bow1-o2-i1', 'sfl-bow1', 'sfl-bow1-o2',
    'Number of Public Partnerships (data enclaves + agencies)',
    'EDU-Net partnership log', '0', 'annual', NULL,
    2.0, 5.0, 8.0, 11.0, 14.0
  UNION ALL
  SELECT 'sfl-bow1-o2-i2', 'sfl-bow1', 'sfl-bow1-o2',
    'Number of Private Partnerships (sector data providers)',
    'EDU-Net partnership log', '0', 'annual', NULL,
    0.0, 1.0, 3.0, 5.0, 7.0
  UNION ALL
  SELECT 'sfl-bow1-o2-i3', 'sfl-bow1', 'sfl-bow1-o2',
    'Coverage of data needed for key insights (% of target E-W indicators covered)',
    'Data coverage audit', '0', 'annual', '%',
    15.0, 35.0, 55.0, 70.0, 80.0
  UNION ALL
  SELECT 'sfl-bow1-o3-i1', 'sfl-bow1', 'sfl-bow1-o3',
    'Number of high priority use cases for which insights are derived',
    'EDU-Net use case registry', '0', 'annual', NULL,
    2.0, 4.0, 6.0, 8.0, 10.0
  UNION ALL
  SELECT 'sfl-bow1-o3-i2', 'sfl-bow1', 'sfl-bow1-o3',
    'Number of lower-resourced districts and postsecondary institutions using EDU-NET',
    'User access logs', '0', 'annual', NULL,
    5.0, 15.0, 30.0, 50.0, 75.0
  UNION ALL
  SELECT 'sfl-bow1-o3-i3', 'sfl-bow1', 'sfl-bow1-o3',
    'Number of EDU-NET users using data for action (reported in quarterly reviews)',
    'Quarterly user survey', '0', 'quarterly', NULL,
    8.0, 20.0, 40.0, 65.0, 90.0
) AS s ON t.indicator_id = s.indicator_id
WHEN NOT MATCHED THEN INSERT (
  indicator_id, bow_id, outcome_id, text, data_source, baseline,
  collection_frequency, unit,
  target_2026, target_2027, target_2028, target_2029, target_2030,
  is_active
) VALUES (
  s.indicator_id, s.bow_id, s.outcome_id, s.text, s.data_source, s.baseline,
  s.collection_frequency, s.unit,
  s.target_2026, s.target_2027, s.target_2028, s.target_2029, s.target_2030,
  true
);


-- =============================================================================
-- VERIFICATION — run after the MERGEs above
-- =============================================================================

-- 1. All bow_indicators rows now present for bow1 and sfl-bow1
SELECT indicator_id, bow_id, outcome_id, text
FROM usp_data.usp_strategy.bow_indicators
WHERE bow_id IN ('bow1', 'sfl-bow1')
ORDER BY bow_id, outcome_id, indicator_id;

-- 2. Actuals now join correctly (expect one row per submitted year per indicator)
SELECT
  i.bow_id,
  a.indicator_id,
  i.text,
  a.year,
  a.actual_value
FROM usp_data.usp_strategy.bow_indicator_actuals a
JOIN usp_data.usp_strategy.bow_indicators i ON i.indicator_id = a.indicator_id
WHERE i.bow_id IN ('bow1', 'sfl-bow1')
ORDER BY i.bow_id, a.indicator_id, a.year;

-- 3. Confirm zero remaining orphans across all BOWs
SELECT a.indicator_id, 'ORPHANED' AS status
FROM usp_data.usp_strategy.bow_indicator_actuals a
LEFT JOIN usp_data.usp_strategy.bow_indicators i ON i.indicator_id = a.indicator_id
WHERE i.indicator_id IS NULL;
-- Expected: 0 rows
