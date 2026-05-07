-- =============================================================================
-- USP Data & AI Strategy — Schema Migration: Submit Portal v2
-- Adds content_edit_log for audit trail on strategy content edits
-- May 2026
-- Run in: usp_data.usp_strategy (Databricks SQL editor)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. content_edit_log — append-only audit trail for strategy content edits
--
-- Captures every save action on bow_outcomes, bow_indicators, execution_targets,
-- portfolio_outcomes, portfolio_indicators.
--
-- changes:         JSON string — { "field_name": { "old": "...", "new": "..." }, ... }
-- rationale:       Required when any major text field changed (outcome title/text,
--                  indicator text, execution_target text). Null otherwise.
-- revision_reason: Required when any target_YYYY field changed.
--                  Values: corrected_error | updated_data | revised_ambition | scope_change
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.content_edit_log (
  log_id         STRING   NOT NULL,
  entity_type    STRING   NOT NULL,
  entity_id      STRING   NOT NULL,
  bow_id         STRING,
  portfolio_id   STRING,
  changes        STRING   NOT NULL,
  rationale      STRING,
  revision_reason STRING,
  edited_by      STRING   NOT NULL,
  edited_at      TIMESTAMP NOT NULL
)
COMMENT 'Append-only audit log for all edits to strategy content (outcomes, indicators, TOA targets). Never update or delete rows.';


-- =============================================================================
-- VERIFICATION
-- =============================================================================

DESCRIBE TABLE usp_data.usp_strategy.content_edit_log;
