-- =============================================================================
-- USP Data & AI Strategy — One-time cleanup: dedupe strategy_goals
--
-- schema_migration_strategy_goals_v2.sql's MERGE ran more than once, leaving
-- two fully-identical rows per goal_id (including identical last_updated
-- timestamps, since both were written in the same statement execution) — a
-- MERGE-based dedupe can't tell the rows apart. Instead: materialize one
-- collapsed row per goal_id into a temp table, wipe the real table, and
-- reload from the temp table.
--
-- Safe to re-run: no-op once there's exactly one row per goal_id.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================

CREATE OR REPLACE TABLE usp_data.usp_strategy._strategy_goals_dedup_tmp AS
SELECT
  goal_id,
  first(title)          AS title,
  first(target_text)    AS target_text,
  first(number)         AS number,
  first(metric)         AS metric,
  first(unit)           AS unit,
  first(goal_2030)      AS goal_2030,
  first(current_2026)   AS current_2026,
  first(sort_order)     AS sort_order,
  first(earliest)       AS earliest,
  first(source)         AS source,
  first(update_freq)    AS update_freq,
  first(chart_type)     AS chart_type,
  first(chart_note)     AS chart_note,
  first(goal_note)      AS goal_note,
  first(note)           AS note,
  first(baseline_year)  AS baseline_year,
  first(baseline_total) AS baseline_total,
  first(chart_config)   AS chart_config,
  max(last_updated)     AS last_updated,
  first(updated_by)     AS updated_by
FROM usp_data.usp_strategy.strategy_goals
GROUP BY goal_id;

DELETE FROM usp_data.usp_strategy.strategy_goals;

INSERT INTO usp_data.usp_strategy.strategy_goals
  (goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
   earliest, source, update_freq, chart_type, chart_note, goal_note, note,
   baseline_year, baseline_total, chart_config, last_updated, updated_by)
SELECT goal_id, title, target_text, number, metric, unit, goal_2030, current_2026, sort_order,
       earliest, source, update_freq, chart_type, chart_note, goal_note, note,
       baseline_year, baseline_total, chart_config, last_updated, updated_by
FROM usp_data.usp_strategy._strategy_goals_dedup_tmp;

DROP TABLE usp_data.usp_strategy._strategy_goals_dedup_tmp;


-- =============================================================================
-- VERIFICATION — expect exactly 5 rows, one per goal_id
-- =============================================================================

SELECT goal_id, COUNT(*) AS row_count
FROM usp_data.usp_strategy.strategy_goals
GROUP BY goal_id
ORDER BY goal_id;
