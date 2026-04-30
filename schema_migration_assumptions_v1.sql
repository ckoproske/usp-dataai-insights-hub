-- =============================================================================
-- USP Data & AI Strategy — Schema Migration v1
-- Assumption schema, decision schema updates, and soft-delete support
-- April 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================

-- =============================================================================
-- SECTION 1: NEW TABLES
-- Note: TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported') is
-- required on every table that uses DEFAULT column values in Databricks Delta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 assumptions
-- Core assumption table. Covers field and impact assumptions only.
-- Execution assumptions are derived from execution_targets + execution_target_status
-- and serve as inputs to impact assumption confidence — they are not stored here.
-- Scoped per portfolio outcome (Tyton schema unit), with optional BOW narrowing.
-- Versioned: when an assumption claim changes, insert a new row with version + 1
-- and updated effective_from rather than updating in place.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumptions (
    assumption_id         STRING    NOT NULL,
    assumption_type       STRING    NOT NULL, -- field | impact
    portfolio_outcome_id  STRING    NOT NULL, -- FK → portfolio_outcomes.outcome_id
    bow_id                STRING,             -- FK → bows.bow_id — nullable, for BOW-scoped assumptions
    assumption_claim      STRING    NOT NULL, -- the if/then causal statement
    decision_gate         STRING,             -- pre-specified review point and decision type
    high_threshold        STRING,             -- criteria for High confidence
    medium_threshold      STRING,             -- criteria for Medium (Watch) confidence
    low_threshold         STRING,             -- criteria for Low confidence
    signal_weights        STRING,             -- JSON — relative weighting of linked indicators/targets
    data_source_notes     STRING,             -- especially for field assumptions using Hub/external sources
    is_active             BOOLEAN   DEFAULT true,
    version               INT       DEFAULT 1,
    effective_from        DATE      DEFAULT current_date(),
    created_by            STRING,
    created_at            TIMESTAMP DEFAULT current_timestamp(),
    last_updated          TIMESTAMP,
    updated_by            STRING
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Field and impact assumptions organized per portfolio outcome. Thresholds live here and drive auto-calculation of confidence ratings in assumption_confidence.';


-- -----------------------------------------------------------------------------
-- 1.2 assumption_indicator_links
-- Many-to-many: impact assumptions → bow_indicators.
-- Defines which indicators provide evidence for each assumption.
-- When a new actual is entered for a linked indicator, triggers re-assessment.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumption_indicator_links (
    link_id        STRING  NOT NULL,
    assumption_id  STRING  NOT NULL, -- FK → assumptions.assumption_id
    indicator_id   STRING  NOT NULL, -- FK → bow_indicators.indicator_id
    signal_role    STRING,           -- primary | secondary
    sort_order     INT
)
USING DELTA
COMMENT 'Links impact assumptions to the bow_indicators that provide evidence for them. Primary signals carry more weight in auto-calculation.';


-- -----------------------------------------------------------------------------
-- 1.3 assumption_target_links
-- Many-to-many: impact assumptions → execution_targets.
-- Execution target completion status is an input to impact assumption confidence:
-- an assumption cannot be rated High if its linked execution targets are incomplete.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumption_target_links (
    link_id        STRING  NOT NULL,
    assumption_id  STRING  NOT NULL, -- FK → assumptions.assumption_id
    target_id      STRING  NOT NULL, -- FK → execution_targets.target_id
    signal_role    STRING,           -- primary | secondary
    sort_order     INT
)
USING DELTA
COMMENT 'Links impact assumptions to the execution_targets whose completion is a precondition for testing the assumption. Untested confidence is auto-set when linked targets are incomplete.';


-- -----------------------------------------------------------------------------
-- 1.4 assumption_rating_criteria
-- Tyton-maintained reference/template table for threshold patterns by assumption type.
-- Provides starting points for new assumption definitions.
-- Operative thresholds live on the assumptions table itself, not here.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumption_rating_criteria (
    criteria_id       STRING    NOT NULL,
    assumption_type   STRING    NOT NULL, -- field | impact
    bow_id            STRING,             -- nullable — global if null, BOW-specific if set
    high_threshold    STRING,
    medium_threshold  STRING,
    low_threshold     STRING,
    data_gap_trigger  STRING,             -- condition that auto-flags Data gap state
    signal_weights    STRING,             -- JSON — default weighting template
    version           INT       DEFAULT 1,
    last_updated      TIMESTAMP,
    updated_by        STRING
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Template/reference table for rating threshold patterns by assumption type. Tyton-maintained. Operative thresholds live on assumptions table.';


-- -----------------------------------------------------------------------------
-- 1.5 decision_assumption_links
-- Connects key_decisions to the assumptions that should inform them.
-- Enables the dashboard to auto-surface decisions when linked assumption
-- confidence deteriorates to or below trigger_threshold.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.decision_assumption_links (
    link_id            STRING  NOT NULL,
    decision_id        STRING  NOT NULL, -- FK → key_decisions.decision_id
    assumption_id      STRING  NOT NULL, -- FK → assumptions.assumption_id
    signal_role        STRING,           -- primary | secondary
    trigger_threshold  STRING,           -- confidence level that auto-flags: High | Medium | Low | Untested | Data gap
    rationale          STRING            -- why this assumption informs this decision
)
USING DELTA
COMMENT 'Connects key_decisions to assumptions. When assumption confidence reaches trigger_threshold, the linked decision is surfaced for review in the dashboard.';


-- -----------------------------------------------------------------------------
-- 1.6 assumption_data_gaps
-- Structured data gap log per assumption.
-- Tyton-maintained. Gaps surfaced in dashboard and shared with MDRC
-- as explicit forecast risk inputs.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumption_data_gaps (
    gap_id          STRING    NOT NULL,
    assumption_id   STRING    NOT NULL, -- FK → assumptions.assumption_id
    gap_description STRING,             -- what data would close this gap
    priority        STRING,             -- H | M | L
    proposed_owner  STRING,
    target_date     DATE,
    status          STRING    DEFAULT 'open', -- open | in_progress | closed
    created_at      TIMESTAMP DEFAULT current_timestamp(),
    created_by      STRING,
    last_updated    TIMESTAMP,
    updated_by      STRING
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Structured data gap log. One row per data gap per assumption. Tyton reviews quarterly. Open gaps are flagged in the dashboard and shared with MDRC as unacknowledged forecast risk.';


-- -----------------------------------------------------------------------------
-- 1.7 assumption_reassessment_log
-- Audit log of every assumption re-assessment.
-- Records what triggered the re-assessment, what changed, and when.
-- Enables alert feed ("these assumptions were re-assessed this week") and
-- full audit trail ("this specific new actual caused confidence to drop").
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.assumption_reassessment_log (
    log_id               STRING     NOT NULL,
    assumption_id        STRING     NOT NULL, -- FK → assumptions.assumption_id
    trigger_type         STRING,              -- new_actual | new_target_status | scheduled | manual
    trigger_entity_type  STRING,              -- bow_indicator | execution_target | field_signal
    trigger_entity_id    STRING,              -- ID of the specific record that triggered re-assessment
    prior_confidence     STRING,              -- confidence before re-assessment
    new_confidence       STRING,              -- confidence after re-assessment
    triggered_at         TIMESTAMP  DEFAULT current_timestamp(),
    triggered_by         STRING               -- system | user email
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Audit trail of assumption re-assessments. Every confidence change is logged here with its trigger. Powers the alert feed and MDRC change history.';


-- -----------------------------------------------------------------------------
-- 1.8 field_signal_sources
-- Defines which external/field sources should inform each field-type assumption.
-- Analogous to assumption_indicator_links for impact assumptions.
-- Signal readings (what a source is currently showing) to be added in a
-- follow-on table once Hub integration is defined.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.field_signal_sources (
    source_id          STRING    NOT NULL,
    assumption_id      STRING    NOT NULL, -- FK → assumptions.assumption_id
    source_type        STRING,             -- market_intelligence | field_note | external_scan | hub_tool
    source_name        STRING,             -- e.g. "Hub Market Intelligence Agent"
    source_description STRING,             -- what to look at and why
    is_active          BOOLEAN   DEFAULT true,
    last_updated       TIMESTAMP,
    updated_by         STRING
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Defines external/field signal sources for field-type assumptions. Source readings table to follow once Hub link is defined.';


-- -----------------------------------------------------------------------------
-- 1.9 team_members
-- Roster of team members with role and portfolio/BOW association.
-- Email is the join key — matched against current_user() from Databricks token
-- at submission time to auto-populate name and role without user input.
-- Also used for decision_maker field on key_decisions and assessed_by on ratings.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.team_members (
    member_id        STRING    NOT NULL,
    email            STRING    NOT NULL, -- Databricks login email — join key
    display_name     STRING    NOT NULL,
    permission_level STRING,             -- MLE | Leadership | Team
    portfolio_id     STRING,             -- FK → portfolios.portfolio_id — primary portfolio association
    is_active        BOOLEAN   DEFAULT true,
    last_updated     TIMESTAMP,
    updated_by       STRING
)
USING DELTA
TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported')
COMMENT 'Team member roster. Email matched against Databricks login token to auto-populate name and permission level on submissions, decisions, and ratings. MLE = full access; Leadership = near-full access; Team = submit only.';


-- =============================================================================
-- SECTION 2: MODIFICATIONS TO EXISTING TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 pending_actuals — add submitted_role
-- Stores the submitter's role at time of submission, looked up from team_members.
-- No DEFAULT needed — will be null for submissions before team_members is populated.
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.pending_actuals
ADD COLUMN submitted_permission STRING
COMMENT 'Permission level at time of submission — MLE | Leadership | Team — looked up from team_members via Databricks login email';


-- -----------------------------------------------------------------------------
-- 2.2 assumption_confidence — add rating_source and evidence_snapshot
-- rating_source: makes provenance explicit on every row alongside human_override boolean.
--   human_override boolean is retained so dashboard can quickly flag AI vs human divergence.
-- evidence_snapshot: JSON record of data points Claude used at assessment time.
--   Required for audit trail and MDRC forecast input documentation.
-- confidence values extended to: High | Medium | Low | Untested | Data gap
-- No DEFAULT values added here so no TBLPROPERTIES change needed.
-- -----------------------------------------------------------------------------
ALTER TABLE usp_data.usp_strategy.assumption_confidence
ADD COLUMN rating_source STRING
COMMENT 'tyton_baseline | ai_generated | human_override — provenance of this assessment row';

ALTER TABLE usp_data.usp_strategy.assumption_confidence
ADD COLUMN evidence_snapshot STRING
COMMENT 'JSON — snapshot of indicator values, target statuses, and criteria version used at assessment time. Required for audit and MDRC coordination.';

ALTER TABLE usp_data.usp_strategy.assumption_confidence
ALTER COLUMN confidence COMMENT 'High | Medium | Low | Untested | Data gap';


-- -----------------------------------------------------------------------------
-- 2.2 key_decisions — drop obsolete columns, add new columns, update level comment
-- Dropping portfolio_outcome_id and bow_outcome_id: decisions are scoped at
-- strategy/portfolio/bow level. Connections to specific outcomes/assumptions
-- flow through decision_assumption_links.
-- Column mapping must be enabled before dropping columns.
-- Column defaults feature must be enabled before adding is_active with DEFAULT.
-- -----------------------------------------------------------------------------

-- Enable column mapping (required for DROP COLUMN in Delta)
ALTER TABLE usp_data.usp_strategy.key_decisions
SET TBLPROPERTIES (
    'delta.columnMapping.mode'           = 'name',
    'delta.minReaderVersion'             = '2',
    'delta.minWriterVersion'             = '5',
    'delta.feature.allowColumnDefaults'  = 'supported'
);

-- Drop obsolete FK columns (no data populated)
ALTER TABLE usp_data.usp_strategy.key_decisions DROP COLUMN portfolio_outcome_id;
ALTER TABLE usp_data.usp_strategy.key_decisions DROP COLUMN bow_outcome_id;

-- Add portfolio_id for portfolio-level decisions
ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN portfolio_id STRING
COMMENT 'FK → portfolios.portfolio_id. Populated when level = portfolio; null otherwise.';

-- Add decision management fields
ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN decision_priority STRING
COMMENT 'H | M | L — urgency and stakes of the decision';

ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN decision_maker STRING
COMMENT 'Role or person accountable for making this decision';

ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN resolution_type STRING
COMMENT 'invest | scale | adapt | stop — the structured outcome category when decision is made';

ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN decision_rationale STRING
COMMENT 'Freeform justification for the decision outcome — recorded when decision is made';

ALTER TABLE usp_data.usp_strategy.key_decisions
ADD COLUMN is_active BOOLEAN;

ALTER TABLE usp_data.usp_strategy.key_decisions
ALTER COLUMN is_active SET DEFAULT true;

-- Update level column comment to reflect simplified values
ALTER TABLE usp_data.usp_strategy.key_decisions
ALTER COLUMN level COMMENT 'Altitude of this decision: strategy | portfolio | bow';


-- -----------------------------------------------------------------------------
-- 2.3 Soft delete support — add is_active to bow_indicators and execution_targets
-- Enable column defaults feature on each table before adding DEFAULT column.
-- -----------------------------------------------------------------------------

ALTER TABLE usp_data.usp_strategy.bow_indicators
SET TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported');

ALTER TABLE usp_data.usp_strategy.bow_indicators
ADD COLUMN is_active BOOLEAN;

ALTER TABLE usp_data.usp_strategy.bow_indicators
ALTER COLUMN is_active SET DEFAULT true;


ALTER TABLE usp_data.usp_strategy.execution_targets
SET TBLPROPERTIES ('delta.feature.allowColumnDefaults' = 'supported');

ALTER TABLE usp_data.usp_strategy.execution_targets
ADD COLUMN is_active BOOLEAN;

ALTER TABLE usp_data.usp_strategy.execution_targets
ALTER COLUMN is_active SET DEFAULT true;


-- =============================================================================
-- SECTION 3: BACKFILL DEFAULTS ON MODIFIED TABLES
-- Sets is_active = true for all existing rows where the column was just added.
-- DEFAULT only applies to new inserts — existing rows come in as NULL.
-- =============================================================================

UPDATE usp_data.usp_strategy.key_decisions
SET is_active = true
WHERE is_active IS NULL;

UPDATE usp_data.usp_strategy.bow_indicators
SET is_active = true
WHERE is_active IS NULL;

UPDATE usp_data.usp_strategy.execution_targets
SET is_active = true
WHERE is_active IS NULL;


-- =============================================================================
-- SECTION 4: VERIFICATION QUERIES
-- Run these after the migration to confirm all changes landed correctly.
-- =============================================================================

-- Confirm all 8 new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'usp_strategy'
  AND table_name IN (
      'assumptions',
      'assumption_indicator_links',
      'assumption_target_links',
      'assumption_rating_criteria',
      'decision_assumption_links',
      'assumption_data_gaps',
      'assumption_reassessment_log',
      'field_signal_sources'
  )
ORDER BY table_name;

-- Confirm assumption_confidence new columns
DESCRIBE TABLE usp_data.usp_strategy.assumption_confidence;

-- Confirm key_decisions changes (portfolio_outcome_id and bow_outcome_id gone,
-- new columns present)
DESCRIBE TABLE usp_data.usp_strategy.key_decisions;

-- Confirm is_active backfill — all three counts should be 0
SELECT
  (SELECT COUNT(*) FROM usp_data.usp_strategy.key_decisions    WHERE is_active IS NULL) AS decisions_null,
  (SELECT COUNT(*) FROM usp_data.usp_strategy.bow_indicators   WHERE is_active IS NULL) AS indicators_null,
  (SELECT COUNT(*) FROM usp_data.usp_strategy.execution_targets WHERE is_active IS NULL) AS targets_null;
