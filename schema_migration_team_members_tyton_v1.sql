-- =============================================================================
-- USP Data & AI Strategy — Data Migration: Add Tyton Partners team members
-- July 2026
--
-- Grants 7 external Tyton Partners collaborators "Team" permission level.
-- display_name includes the "(Tyton Partners)" suffix so their name is
-- clearly marked as external everywhere it's shown (edits, submissions,
-- approvals, comments, activity log) via team_members.display_name.
--
-- portfolio_id left NULL — not tied to one specific portfolio.
-- Safe to re-run: MERGE keyed on email.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================

MERGE INTO usp_data.usp_strategy.team_members AS t
USING (
  SELECT * FROM VALUES
    ('skim@tytonpartners.com',        'Sujin Kim (Tyton Partners)'),
    ('kedzie@tytonpartners.com',      'Kojo Edzie (Tyton Partners)'),
    ('ahenrie@tytonpartners.com',     'Amy Henrie (Tyton Partners)'),
    ('hsisemore@tytonpartners.com',   'Hayden Sisemore (Tyton Partners)'),
    ('skattan@tytonpartners.com',     'Shlomy Kattan (Tyton Partners)'),
    ('gbryant@tytonpartners.com',     'Gates Bryant (Tyton Partners)'),
    ('ppenberthy@tytonpartners.com',  'Mats Penberthy (Tyton Partners)')
  AS t(email, display_name)
) AS s
ON t.email = s.email
WHEN MATCHED THEN UPDATE SET
  t.display_name     = s.display_name,
  t.permission_level  = 'Team',
  t.is_active         = true,
  t.last_updated      = current_timestamp(),
  t.updated_by        = 'migration:team_members_tyton_v1'
WHEN NOT MATCHED THEN INSERT (
  member_id, email, display_name, permission_level, portfolio_id,
  is_active, last_updated, updated_by
) VALUES (
  uuid(), s.email, s.display_name, 'Team', NULL,
  true, current_timestamp(), 'migration:team_members_tyton_v1'
);


-- =============================================================================
-- VERIFICATION — expect 7 rows, one per person, permission_level = Team
-- =============================================================================

SELECT email, display_name, permission_level, is_active
FROM usp_data.usp_strategy.team_members
WHERE email IN (
  'skim@tytonpartners.com', 'kedzie@tytonpartners.com', 'ahenrie@tytonpartners.com',
  'hsisemore@tytonpartners.com', 'skattan@tytonpartners.com', 'gbryant@tytonpartners.com',
  'ppenberthy@tytonpartners.com'
)
ORDER BY email;
