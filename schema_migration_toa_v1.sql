-- =============================================================================
-- USP Data & AI Strategy — Theory of Action DB Migration v1
-- Replaces 4 hardcoded ToA components with DB-driven tables.
-- Content sourced from official portfolio slides (May 2026).
--
-- Tables created:
--   portfolio_toa                 — top-level metadata per portfolio
--   portfolio_toa_lanes           — service lines / improvement domains
--   portfolio_toa_activities      — activity bullets per lane (col 2)
--   portfolio_toa_lane_indicators — leading indicators per lane (col 4)
--
-- Safe to re-run: MERGE ON NOT MATCHED leaves existing rows untouched.
-- Run in: Databricks SQL Editor (usp_data catalog, usp_strategy schema)
-- =============================================================================


-- =============================================================================
-- SECTION 1 — DDL
-- =============================================================================

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.portfolio_toa (
  portfolio_id           STRING NOT NULL,
  col1_label             STRING,
  col2_label             STRING,
  problem_statement      STRING,
  cross_indicators_json  STRING,
  cross_indicators_label STRING,
  amb45_intro_text       STRING,
  amb45_label            STRING,
  amb45_full_text        STRING,
  amb45_buckets_json     STRING,
  is_active              BOOLEAN
) USING DELTA;

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.portfolio_toa_lanes (
  lane_id        STRING NOT NULL,
  portfolio_id   STRING NOT NULL,
  label          STRING NOT NULL,
  icon           STRING,
  color          STRING,
  outcome_text   STRING,
  is_tbd         BOOLEAN,
  is_multiplier  BOOLEAN,
  sort_order     INT,
  is_active      BOOLEAN
) USING DELTA;

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.portfolio_toa_activities (
  activity_id    STRING NOT NULL,
  lane_id        STRING NOT NULL,
  portfolio_id   STRING NOT NULL,
  activity_text  STRING NOT NULL,
  sort_order     INT
) USING DELTA;

CREATE TABLE IF NOT EXISTS usp_data.usp_strategy.portfolio_toa_lane_indicators (
  indicator_id   STRING NOT NULL,
  lane_id        STRING NOT NULL,
  portfolio_id   STRING NOT NULL,
  indicator_text STRING NOT NULL,
  sort_order     INT
) USING DELTA;


-- =============================================================================
-- SECTION 2 — SEED: portfolio_toa
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_toa AS t
USING (
  -- ── Data & AI Enablement Hub ───────────────────────────────────────────────
  SELECT 'hub' AS portfolio_id,
    'Service Lines' AS col1_label, 'Core Activities' AS col2_label,
    NULL AS problem_statement,
    '["% of USP staff (S/PO + D/DDs) reporting Hub support contributed to a significant AI-related decision","Composite NPS across all three service lines"]' AS cross_indicators_json,
    '2030 Impact Goals' AS cross_indicators_label,
    NULL AS amb45_intro_text,
    'Division Enablement' AS amb45_label,
    'The Hub doesn''t directly drive Amb45 outcomes, but creates the conditions for the division to do so. By ensuring program teams have timely expert guidance, shared analytical infrastructure, and access to circulating learning, the Hub raises the quality and pace of AI-related investment across the division — making it possible for each portfolio to pursue the 2045 vision with greater confidence and coherence.' AS amb45_full_text,
    NULL AS amb45_buckets_json,
    true AS is_active

  UNION ALL

  -- ── System Feedback Loops ─────────────────────────────────────────────────
  SELECT 'sfl',
    'Activities', 'Investments & Inputs',
    'EW systems generate increasing amounts of data, yet feedback loops from insight to decision remain fragmented and uneven. Practitioners often lack clarity on what ''good'' looks like, and traditional assessments and credentials fail to capture changing real-world skills. Siloed data systems and limited AI and data capacity further constrain progress. As a result, systems and leaders are not equipped with learner-centered feedback loops that enable continuous improvement at the pace required.',
    '["% district/PS decision makers using higher-quality data to improve learning, advising, mobility & credentials","X% of field leaders have timely, comprehensive data to assess all Amb45 EW Momentum Points"]',
    '2030 Strategy Goals',
    NULL, NULL, NULL,
    '[{"label":"EW Momentum Points","color":"#455878","contribution":"System Feedback Loops builds the data and AI infrastructure needed to track progress across all Amb45 EW Momentum Points at scale.","priorities":[]},{"label":"Instruction","color":"#0b7575","contribution":"By enabling faster, more personalized feedback loops for districts, SFL accelerates learning gains and improves instructional effectiveness for learners furthest from opportunity.","priorities":[{"n":"Priority 1","title":"Full Stack Instruction & Tutoring","t1":"1.6 grade levels/yr","t2":"7.4m + 4.4m students"},{"n":"Priority 2","title":"AI-Enabled Gateway Math","t1":"80% avg pass rates","t2":"355k students / 450 institutions"}]},{"label":"Navigation","color":"#0b5fa5","contribution":"SFL strengthens the PS and WF data infrastructure advisors depend on. CSGA — a dynamic, AI-native knowledge graph — powers personalized advising, credit mobility, and skill-based assessment, enabling tools to better reflect a changing labor market.","priorities":[{"n":"Priority 3","title":"AI-Enabled Personalized Advising","t1":"+5pp college enrollment","t2":"8.6m at LLM scale"},{"n":"Priority 4","title":"AI-Enabled Learning Mobility","t1":"37–45% credit transfer","t2":"1.6m students impacted"}]}]',
    true

  UNION ALL

  -- ── Cross-Cutting ─────────────────────────────────────────────────────────
  SELECT 'cross-cutting',
    'Activities', 'Investments & Inputs',
    NULL,
    '["% of USP Data & AI staff: team systems, processes, and culture enable them to do their best work","% of team: data and evidence consistently inform portfolio and BOW decision-making"]',
    '2030 Impact Goals',
    NULL,
    'Division Effectiveness',
    'By strengthening team alignment, decision-making quality, and operational efficiency, the Cross-Cutting portfolio ensures the division can pursue and sustain progress toward the 2045 Ambition at the pace and with the level of coordination required.',
    NULL,
    true

  UNION ALL

  -- ── AI Infrastructure ─────────────────────────────────────────────────────
  SELECT 'ai-infra',
    'Improvement Domains', 'Investments & Inputs',
    NULL,
    '["Goal 1: 40% of learners reached by solutions embedding portable memory & context","Goal 2: 50% of learners reached by solutions using evidence-based benchmarks improving safety & quality"]',
    '2030 Scale Goals',
    NULL, NULL, NULL,
    '[{"label":"Instruction","color":"#455878","contribution":"AI Infrastructure creates the conditions for effective AI-enabled instruction through portable learner context, ensuring instructional AI tools are safe, evaluated, and aligned to curricula.","priorities":[{"n":"Priority 1","title":"Full Stack Instruction & Tutoring","t1":"1.6 grade levels/yr","t2":""},{"n":"Priority 2","title":"AI-Enabled Gateway Math","t1":"80% avg pass rates","t2":""}]},{"label":"Navigation","color":"#455878","contribution":"AI Infrastructure enables AI-powered navigation tools to access and retain learner context, ensuring personalized guidance with interoperable learner records.","priorities":[{"n":"Priority 3","title":"AI-Enabled Personalized Advising","t1":"+5pp college enrollment","t2":""},{"n":"Priority 4","title":"AI-Enabled Learning Mobility","t1":"37–45% credit transfer","t2":""}]}]',
    true
) AS s ON t.portfolio_id = s.portfolio_id
WHEN NOT MATCHED THEN INSERT (
  portfolio_id, col1_label, col2_label, problem_statement,
  cross_indicators_json, cross_indicators_label,
  amb45_intro_text, amb45_label, amb45_full_text, amb45_buckets_json, is_active
) VALUES (
  s.portfolio_id, s.col1_label, s.col2_label, s.problem_statement,
  s.cross_indicators_json, s.cross_indicators_label,
  s.amb45_intro_text, s.amb45_label, s.amb45_full_text, s.amb45_buckets_json, s.is_active
);


-- =============================================================================
-- SECTION 3 — SEED: portfolio_toa_lanes
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_toa_lanes AS t
USING (
  -- ── hub lanes ──────────────────────────────────────────────────────────────
  SELECT 'hub-advisory' AS lane_id, 'hub' AS portfolio_id,
    'AI Advisory & Network' AS label, '◎' AS icon, '#0b5fa5' AS color,
    'Program teams have access to timely, credible expert guidance — enabling them to pressure-test assumptions, weigh tradeoffs, and make better-informed choices without having to source that expertise independently.' AS outcome_text,
    false AS is_tbd, false AS is_multiplier, 1 AS sort_order, true AS is_active
  UNION ALL
  SELECT 'hub-infra', 'hub', 'Data Insights Infrastructure', '⬡', '#186030',
    'Teams draw on shared analytical tools and frameworks that enable more consistent interpretation of evidence — reducing duplicative analytical build and freeing teams to focus on program-specific judgment.',
    false, false, 2, true
  UNION ALL
  SELECT 'hub-learning', 'hub', 'AI Learning Community', '⟳', '#7a3080',
    'Insights from advisory engagements, pilots, and investments circulate across teams rather than staying siloed — building shared intuition about what is working, what remains uncertain, and where caution is warranted.',
    false, false, 3, true

  -- ── sfl lanes ──────────────────────────────────────────────────────────────
  UNION ALL
  SELECT 'sfl-data-avail', 'sfl', 'Increase Data Availability', '◈', '#0b5fa5',
    'New and expanded education and workforce AI-ready data focused on priority questions is accessed and linked across systems.',
    false, false, 1, true
  UNION ALL
  SELECT 'sfl-data-util', 'sfl', 'Build & Expand Data Utilities', '⬡', '#186030',
    'Infrastructure in place to enable more timely and personalized data feedback loops that inform and strengthen decision-making.',
    false, false, 2, true
  UNION ALL
  SELECT 'sfl-sensemaking', 'sfl', 'Accelerate Sensemaking', '◎', '#7a3080',
    'Data & analytics is translated into actionable insights, leveraging AI, that decisionmakers can understand and use — supported by sufficient capacity and tools.',
    false, false, 3, true
  UNION ALL
  SELECT 'sfl-governance', 'sfl', 'Governance & Standards', '⊕', '#a05000',
    'Data sharing agreements, privacy protections, and norms of use enable repeated, reliable use of data across institutions and over time.',
    false, false, 4, true
  UNION ALL
  SELECT 'sfl-inplace', 'sfl', 'In-Place Coordination', '⟳', '#455878',
    'Regional or state contexts provide the coordination needed to test, refine, and scale feedback loops in ways that align with local decision needs.',
    false, false, 5, true
  UNION ALL
  SELECT 'sfl-ecosystem', 'sfl', 'Strengthen Ecosystem Coordination', '⇄', '#2d6e8e',
    'Shared agreement and alignment across key stakeholders.',
    true, false, 6, true

  -- ── cross-cutting lanes ────────────────────────────────────────────────────
  UNION ALL
  SELECT 'cc-alignment', 'cross-cutting', 'Cross-Division Alignment', '◎', '#0b5fa5',
    'Coordination and alignment across and between Data and PST priorities enable more integrated and impactful collaboration.',
    false, false, 1, true
  UNION ALL
  SELECT 'cc-insights', 'cross-cutting', 'Data-Driven Insights', '⬡', '#7a3080',
    'Clear signals of progress, impact forecasts, and other evidence consistently inform portfolio and BOW decision-making.',
    false, false, 2, true
  UNION ALL
  SELECT 'cc-operations', 'cross-cutting', 'Operations & Efficiency', '⟳', '#186030',
    'Efficient planning and investment processes enable faster decision-making, increased cross-team visibility, and faster paths to alignment and execution.',
    false, false, 3, true
  UNION ALL
  SELECT 'cc-culture', 'cross-cutting', 'Inclusion & Culture', '◈', '#a05000',
    'Team members feel a shared culture of trust, inclusion, and clarity that supports effective collaboration and impact.',
    false, false, 4, true

  -- ── ai-infra lanes ─────────────────────────────────────────────────────────
  UNION ALL
  SELECT 'ai-efficacy', 'ai-infra', 'Efficacy', '◈', '#0b7575',
    'Improved model performance in priority education domains — AI models show measurable improvements in efficacy and reduced harms, validated in education-specific contexts for low-SES learners.',
    false, false, 1, true
  UNION ALL
  SELECT 'ai-context', 'ai-infra', 'Contextualization & Alignment', '⇄', '#4a1a8a',
    'Personalized, portable AI that aligns to learner and institutional context — AI tutors, advisors, and EdTech systems can securely exchange learner data and intent, with context that aligns to curricula and standards.',
    false, false, 2, true
  UNION ALL
  SELECT 'ai-safety', 'ai-infra', 'Safety & Guardrails', '⊕', '#186030',
    'A market that rewards responsible, safe, and equitable AI development — evidence of performance creates a reinforcing loop informing how AI systems are designed, assessed, and procured.',
    false, true, 3, true
) AS s ON t.lane_id = s.lane_id
WHEN NOT MATCHED THEN INSERT (
  lane_id, portfolio_id, label, icon, color, outcome_text,
  is_tbd, is_multiplier, sort_order, is_active
) VALUES (
  s.lane_id, s.portfolio_id, s.label, s.icon, s.color, s.outcome_text,
  s.is_tbd, s.is_multiplier, s.sort_order, s.is_active
);


-- =============================================================================
-- SECTION 4 — SEED: portfolio_toa_activities
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_toa_activities AS t
USING (
  -- hub-advisory
  SELECT 'hub-advisory-a1' AS activity_id, 'hub-advisory' AS lane_id, 'hub' AS portfolio_id,
    'On-demand technical and strategic guidance on AI use cases, data readiness, evaluation approaches, infrastructure tradeoffs, and risk considerations' AS activity_text, 1 AS sort_order
  UNION ALL SELECT 'hub-advisory-a2', 'hub-advisory', 'hub',
    'Curated SME bench spanning research methods, learning sciences, implementation, data/AI infrastructure, privacy, and AI governance', 2
  UNION ALL SELECT 'hub-advisory-a3', 'hub-advisory', 'hub',
    'Repeatable advisory formats: decision pathway reviews, evidence readouts, risk and equity framing sessions', 3
  UNION ALL SELECT 'hub-advisory-a4', 'hub-advisory', 'hub',
    'Defined advisory roles — evidence reviewers, implementation realists, risk/governance and equity lenses', 4

  -- hub-infra
  UNION ALL SELECT 'hub-infra-a1', 'hub-infra', 'hub',
    'Market Insights & Context: cross-division data product integrating evidence signals, market context, and implementation considerations', 1
  UNION ALL SELECT 'hub-infra-a2', 'hub-infra', 'hub',
    'Insights Engine for AI Effectiveness: synthesizes research, market intelligence, and pilot data to surface patterns, risks, and opportunity areas', 2
  UNION ALL SELECT 'hub-infra-a3', 'hub-infra', 'hub',
    'Impact Accounting Models: extracts effect-size evidence to support MLE functions, scenario analysis, and cost-effectiveness estimates', 3
  UNION ALL SELECT 'hub-infra-a4', 'hub-infra', 'hub',
    'Supporting dashboards and reporting infrastructure where reuse is high', 4

  -- hub-learning
  UNION ALL SELECT 'hub-learning-a1', 'hub-learning', 'hub',
    'Regular learning lab series anchored in live program questions, featuring researchers and practitioners', 1
  UNION ALL SELECT 'hub-learning-a2', 'hub-learning', 'hub',
    'Targeted convenings: curated demonstrations bringing together researchers, practitioners, and technologists', 2
  UNION ALL SELECT 'hub-learning-a3', 'hub-learning', 'hub',
    'Small-group discussions and short-format learning groups to pressure-test design choices', 3
  UNION ALL SELECT 'hub-learning-a4', 'hub-learning', 'hub',
    'Circulation of insights from advisory engagements, pilots, and investments across teams', 4

  -- sfl-data-avail
  UNION ALL SELECT 'sfl-data-avail-a1', 'sfl-data-avail', 'sfl',
    'Partnerships with private-sector and federal/state sources for multimodal, wage, and labor market data', 1
  UNION ALL SELECT 'sfl-data-avail-a2', 'sfl-data-avail', 'sfl',
    'Integration of novel data sources into secure research networks (ADRF, SafeInsights)', 2
  UNION ALL SELECT 'sfl-data-avail-a3', 'sfl-data-avail', 'sfl',
    'Learner record data access ensuring subpopulation coverage', 3
  UNION ALL SELECT 'sfl-data-avail-a4', 'sfl-data-avail', 'sfl',
    'Expanded cross-sector data dictionaries and linkage infrastructure', 4

  -- sfl-data-util
  UNION ALL SELECT 'sfl-data-util-a1', 'sfl-data-util', 'sfl',
    'EDU-Net: secure, interoperable network of EW data enclaves modeled after PCORnet', 1
  UNION ALL SELECT 'sfl-data-util-a2', 'sfl-data-util', 'sfl',
    'NLP-based dashboards and AI-driven query tools for custom disaggregation', 2
  UNION ALL SELECT 'sfl-data-util-a3', 'sfl-data-util', 'sfl',
    'Analytics capacity-building tools and CoPs for lower-resourced districts and PS institutions', 3
  UNION ALL SELECT 'sfl-data-util-a4', 'sfl-data-util', 'sfl',
    'Shared data infrastructure enabling benchmarking against Essential Questions', 4

  -- sfl-sensemaking
  UNION ALL SELECT 'sfl-sensemaking-a1', 'sfl-sensemaking', 'sfl',
    'CSGA: dynamic, AI-native knowledge graph linking EW data at competency and skill level', 1
  UNION ALL SELECT 'sfl-sensemaking-a2', 'sfl-sensemaking', 'sfl',
    'AI-powered parsing and embedding tools reducing time to update skill definitions', 2
  UNION ALL SELECT 'sfl-sensemaking-a3', 'sfl-sensemaking', 'sfl',
    'Integration with advising, assessment, and credit mobility platforms', 3
  UNION ALL SELECT 'sfl-sensemaking-a4', 'sfl-sensemaking', 'sfl',
    'Builder communities and open sandboxes for co-developing CSGA-powered tools', 4

  -- sfl-governance
  UNION ALL SELECT 'sfl-governance-a1', 'sfl-governance', 'sfl',
    'Templatized DSAs covering multiple institutions and sectors', 1
  UNION ALL SELECT 'sfl-governance-a2', 'sfl-governance', 'sfl',
    'Privacy-enhancing technology standards enabling expanded data use through secure means', 2
  UNION ALL SELECT 'sfl-governance-a3', 'sfl-governance', 'sfl',
    'Open-by-default norms and interoperability frameworks linking EW and social data systems', 3
  UNION ALL SELECT 'sfl-governance-a4', 'sfl-governance', 'sfl',
    'Field governance model for CSGA and EDU-Net ensuring long-term stewardship', 4

  -- sfl-inplace
  UNION ALL SELECT 'sfl-inplace-a1', 'sfl-inplace', 'sfl',
    'Regional data intermediary hubs and capacity-building for local sensemaking', 1
  UNION ALL SELECT 'sfl-inplace-a2', 'sfl-inplace', 'sfl',
    'AI readiness infrastructure including governance, privacy, and tool adoption frameworks', 2
  UNION ALL SELECT 'sfl-inplace-a3', 'sfl-inplace', 'sfl',
    'Credential and occupation data tools enabling informed student pathway decisions', 3
  UNION ALL SELECT 'sfl-inplace-a4', 'sfl-inplace', 'sfl',
    'Strategic and AI data governance support for state leaders', 4

  -- sfl-ecosystem
  UNION ALL SELECT 'sfl-ecosystem-a1', 'sfl-ecosystem', 'sfl',
    'Shared coordination mechanisms across funders, field leaders, and infrastructure providers — to be developed', 1

  -- cc-alignment
  UNION ALL SELECT 'cc-alignment-a1', 'cc-alignment', 'cross-cutting',
    'Develop and manage processes to enable cross-PST coordination and clarity around shared goals and priorities', 1

  -- cc-insights
  UNION ALL SELECT 'cc-insights-a1', 'cc-insights', 'cross-cutting',
    'MLE dashboards tracking portfolio and BOW progress against strategy goals', 1
  UNION ALL SELECT 'cc-insights-a2', 'cc-insights', 'cross-cutting',
    'Impact forecasting models and scenario analyses to inform investment decisions', 2
  UNION ALL SELECT 'cc-insights-a3', 'cc-insights', 'cross-cutting',
    'Evidence synthesis and targeted analyses surfacing signals across the division', 3
  UNION ALL SELECT 'cc-insights-a4', 'cc-insights', 'cross-cutting',
    'Impact accounting models extracting effect-size evidence for cost-effectiveness estimates', 4

  -- cc-operations
  UNION ALL SELECT 'cc-operations-a1', 'cc-operations', 'cross-cutting',
    'Streamlined investment processes — from idea generation through funding and execution', 1
  UNION ALL SELECT 'cc-operations-a2', 'cc-operations', 'cross-cutting',
    'Planning and portfolio management tools that increase cross-team visibility', 2
  UNION ALL SELECT 'cc-operations-a3', 'cc-operations', 'cross-cutting',
    'Operational norms, meeting cadences, and coordination infrastructure', 3
  UNION ALL SELECT 'cc-operations-a4', 'cc-operations', 'cross-cutting',
    'Onboarding systems and role clarity frameworks for new team members', 4

  -- cc-culture
  UNION ALL SELECT 'cc-culture-a1', 'cc-culture', 'cross-cutting',
    'Establish and strengthen team values and norms', 1
  UNION ALL SELECT 'cc-culture-a2', 'cc-culture', 'cross-cutting',
    'Create opportunity for team reflection to support culture and connection', 2
  UNION ALL SELECT 'cc-culture-a3', 'cc-culture', 'cross-cutting',
    'Promoting inclusion and belonging', 3
  UNION ALL SELECT 'cc-culture-a4', 'cc-culture', 'cross-cutting',
    'Ensure team transitions are smooth and supported', 4

  -- ai-efficacy
  UNION ALL SELECT 'ai-efficacy-a1', 'ai-efficacy', 'ai-infra',
    'Domain + Subject specific benchmark datasets for tutoring, instruction, advising & navigation', 1
  UNION ALL SELECT 'ai-efficacy-a2', 'ai-efficacy', 'ai-infra',
    'Evaluation technologies assessing efficacy, safety & equity for priority populations', 2
  UNION ALL SELECT 'ai-efficacy-a3', 'ai-efficacy', 'ai-infra',
    'Simulated testing environments mirroring under-resourced school contexts', 3
  UNION ALL SELECT 'ai-efficacy-a4', 'ai-efficacy', 'ai-infra',
    'Synthetic learner panels & AI constitutions for pre-market validation', 4

  -- ai-context
  UNION ALL SELECT 'ai-context-a1', 'ai-context', 'ai-infra',
    'Portable learner memory specs enabling AI to retain context across sessions', 1
  UNION ALL SELECT 'ai-context-a2', 'ai-context', 'ai-infra',
    'A2A protocols for seamless exchange of learner data & intent', 2
  UNION ALL SELECT 'ai-context-a3', 'ai-context', 'ai-infra',
    'Middleware & MCPs aligning AI to curricula, standards & existing technologies', 3
  UNION ALL SELECT 'ai-context-a4', 'ai-context', 'ai-infra',
    'CSGA domain knowledge graphs linking competencies, skills & learning pathways', 4

  -- ai-safety
  UNION ALL SELECT 'ai-safety-a1', 'ai-safety', 'ai-infra',
    'Open-source guardrail protocols & standards for safe, ethical learner data use', 1
  UNION ALL SELECT 'ai-safety-a2', 'ai-safety', 'ai-infra',
    'Privacy-preserving governance frameworks embedded into models and platforms', 2
  UNION ALL SELECT 'ai-safety-a3', 'ai-safety', 'ai-infra',
    'Age-appropriate data use protocols & field-facing assets', 3
  UNION ALL SELECT 'ai-safety-a4', 'ai-safety', 'ai-infra',
    'Public benchmark transparency and shared AI in Education knowledge base', 4
) AS s ON t.activity_id = s.activity_id
WHEN NOT MATCHED THEN INSERT (
  activity_id, lane_id, portfolio_id, activity_text, sort_order
) VALUES (
  s.activity_id, s.lane_id, s.portfolio_id, s.activity_text, s.sort_order
);


-- =============================================================================
-- SECTION 5 — SEED: portfolio_toa_lane_indicators
-- =============================================================================

MERGE INTO usp_data.usp_strategy.portfolio_toa_lane_indicators AS t
USING (
  -- hub-advisory
  SELECT 'hub-advisory-i1' AS indicator_id, 'hub-advisory' AS lane_id, 'hub' AS portfolio_id,
    '# inbound advisory requests' AS indicator_text, 1 AS sort_order
  UNION ALL SELECT 'hub-advisory-i2', 'hub-advisory', 'hub', '% of requests fulfilled', 2
  UNION ALL SELECT 'hub-advisory-i3', 'hub-advisory', 'hub', '% of teams with repeat engagement', 3
  UNION ALL SELECT 'hub-advisory-i4', 'hub-advisory', 'hub', '% reporting advisory engagement influenced a decision', 4
  UNION ALL SELECT 'hub-advisory-i5', 'hub-advisory', 'hub', 'NPS for advisory engagements', 5

  -- hub-infra
  UNION ALL SELECT 'hub-infra-i1', 'hub-infra', 'hub', '# unique users across shared tools/products', 1
  UNION ALL SELECT 'hub-infra-i2', 'hub-infra', 'hub', '% rating shared tools as useful or actionable', 2
  UNION ALL SELECT 'hub-infra-i3', 'hub-infra', 'hub', '% reporting tools influenced how they interpreted evidence', 3
  UNION ALL SELECT 'hub-infra-i4', 'hub-infra', 'hub', 'NPS for shared tools and products', 4

  -- hub-learning
  UNION ALL SELECT 'hub-learning-i1', 'hub-learning', 'hub', '% self-reported increase in AI literacy or confidence (among attendees)', 1
  UNION ALL SELECT 'hub-learning-i2', 'hub-learning', 'hub', '% reporting Hub learning changed how they approach AI decisions', 2
  UNION ALL SELECT 'hub-learning-i3', 'hub-learning', 'hub', 'NPS for learning community activities', 3

  -- sfl-data-avail
  UNION ALL SELECT 'sfl-data-avail-i1', 'sfl-data-avail', 'sfl',
    '% districts/states adopting data sources (multimodal, system conditions, wealth, comp/skills)', 1
  UNION ALL SELECT 'sfl-data-avail-i2', 'sfl-data-avail', 'sfl',
    '% districts/states with increased availability to high quality and comprehensive data', 2
  UNION ALL SELECT 'sfl-data-avail-i3', 'sfl-data-avail', 'sfl',
    '% of US learners represented across integrated data sources', 3

  -- sfl-data-util
  UNION ALL SELECT 'sfl-data-util-i1', 'sfl-data-util', 'sfl',
    'X% of platforms enabling custom disaggregation queries', 1
  UNION ALL SELECT 'sfl-data-util-i2', 'sfl-data-util', 'sfl',
    '40% reduction in average time to insight on key Essential Questions', 2
  UNION ALL SELECT 'sfl-data-util-i3', 'sfl-data-util', 'sfl',
    '% systems implementing user-centered, AI-driven data access platforms', 3

  -- sfl-sensemaking
  UNION ALL SELECT 'sfl-sensemaking-i1', 'sfl-sensemaking', 'sfl',
    '% districts/states with increased availability to high quality and comprehensive data', 1
  UNION ALL SELECT 'sfl-sensemaking-i2', 'sfl-sensemaking', 'sfl',
    '% systems implementing user-centered, AI-driven data access platforms', 2
  UNION ALL SELECT 'sfl-sensemaking-i3', 'sfl-sensemaking', 'sfl',
    '40% reduction in average time to insight on key Essential Questions', 3

  -- sfl-governance
  UNION ALL SELECT 'sfl-governance-i1', 'sfl-governance', 'sfl',
    'Increase in templatized DSAs reducing time to data submission', 1
  UNION ALL SELECT 'sfl-governance-i2', 'sfl-governance', 'sfl',
    '% of pilot states/districts with interoperable data systems linking EW + social systems', 2

  -- sfl-inplace
  UNION ALL SELECT 'sfl-inplace-i1', 'sfl-inplace', 'sfl',
    '50% of districts in Pathways/WSI regions with strategic institutional AI adoption', 1
  UNION ALL SELECT 'sfl-inplace-i2', 'sfl-inplace', 'sfl',
    '100% of regional cross-sector data tools hitting thresholds for regular use', 2

  -- sfl-ecosystem: no indicators (TBD lane)

  -- cc-alignment
  UNION ALL SELECT 'cc-alignment-i1', 'cc-alignment', 'cross-cutting',
    '% PSTs reporting strong partnership and clarity on Data & AI shared goals', 1
  UNION ALL SELECT 'cc-alignment-i2', 'cc-alignment', 'cross-cutting',
    '% PST leads: Data & AI delivers on commitments within agreed timeframes', 2
  UNION ALL SELECT 'cc-alignment-i3', 'cc-alignment', 'cross-cutting',
    '% PST leads: Data & AI support meaningfully advanced their PST''s work', 3
  UNION ALL SELECT 'cc-alignment-i4', 'cc-alignment', 'cross-cutting',
    'NPS — likelihood to proactively seek out or recommend Data & AI for high-priority work', 4
  UNION ALL SELECT 'cc-alignment-i5', 'cc-alignment', 'cross-cutting',
    '# co-funded investments with PSTs', 5

  -- cc-insights
  UNION ALL SELECT 'cc-insights-i1', 'cc-insights', 'cross-cutting',
    '% team: MLE data and insights have strengthened decision-making', 1
  UNION ALL SELECT 'cc-insights-i2', 'cc-insights', 'cross-cutting',
    '% team: SPM support meaningfully informed portfolio direction', 2
  UNION ALL SELECT 'cc-insights-i3', 'cc-insights', 'cross-cutting',
    '% team: high clarity on measurement priorities for their portfolio', 3
  UNION ALL SELECT 'cc-insights-i4', 'cc-insights', 'cross-cutting',
    '% utilization of key analytical tools (CRM, Evidence Base, MLE Dashboards)', 4

  -- cc-operations
  UNION ALL SELECT 'cc-operations-i1', 'cc-operations', 'cross-cutting',
    '% team: clarity on how decisions are made and who owns them', 1
  UNION ALL SELECT 'cc-operations-i2', 'cc-operations', 'cross-cutting',
    '% team: internal processes move work forward efficiently', 2
  UNION ALL SELECT 'cc-operations-i3', 'cc-operations', 'cross-cutting',
    '% team: clear understanding of team priorities and how their work contributes', 3
  UNION ALL SELECT 'cc-operations-i4', 'cc-operations', 'cross-cutting',
    'Avg # days to complete an investment (request proposal to active)', 4

  -- cc-culture
  UNION ALL SELECT 'cc-culture-i1', 'cc-culture', 'cross-cutting',
    '% team: when leadership commits, it is followed through and communicated back', 1
  UNION ALL SELECT 'cc-culture-i2', 'cc-culture', 'cross-cutting',
    '% team: feel valued and supported in doing their best work', 2
  UNION ALL SELECT 'cc-culture-i3', 'cc-culture', 'cross-cutting',
    '% team: team operates with mutual trust, openness, and honest dialogue', 3

  -- ai-efficacy
  UNION ALL SELECT 'ai-efficacy-i1', 'ai-efficacy', 'ai-infra',
    '% solutions with qualifying M or C components embedded', 1
  UNION ALL SELECT 'ai-efficacy-i2', 'ai-efficacy', 'ai-infra',
    'Portability range of M + C solutions w/n solution ecosystems', 2
  UNION ALL SELECT 'ai-efficacy-i3', 'ai-efficacy', 'ai-infra',
    '# downloads of public benchmark datasets & eval tech, # evaluating/use, # publishing', 3

  -- ai-context
  UNION ALL SELECT 'ai-context-i1', 'ai-context', 'ai-infra',
    '% increase in trust in AI enabled ed solutions among consumers + other key stakeholders', 1
  UNION ALL SELECT 'ai-context-i2', 'ai-context', 'ai-infra',
    '% solutions publish performance on key benchmarks and include in marketing messages', 2
  UNION ALL SELECT 'ai-context-i3', 'ai-context', 'ai-infra',
    '% increase year-over-year of solution benchmark performance and other advanced evaluation processes', 3

  -- ai-safety
  UNION ALL SELECT 'ai-safety-i1', 'ai-safety', 'ai-infra',
    'Joint commitments of resources, deployments, and adoption of open infrastructure among hyperscalers and solution providers that advance key division priorities', 1
) AS s ON t.indicator_id = s.indicator_id
WHEN NOT MATCHED THEN INSERT (
  indicator_id, lane_id, portfolio_id, indicator_text, sort_order
) VALUES (
  s.indicator_id, s.lane_id, s.portfolio_id, s.indicator_text, s.sort_order
);


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'portfolio_toa' AS tbl, COUNT(*) AS rows FROM usp_data.usp_strategy.portfolio_toa
UNION ALL SELECT 'portfolio_toa_lanes', COUNT(*) FROM usp_data.usp_strategy.portfolio_toa_lanes
UNION ALL SELECT 'portfolio_toa_activities', COUNT(*) FROM usp_data.usp_strategy.portfolio_toa_activities
UNION ALL SELECT 'portfolio_toa_lane_indicators', COUNT(*) FROM usp_data.usp_strategy.portfolio_toa_lane_indicators;
-- Expected: 4 / 16 / 54 / 43

SELECT portfolio_id, COUNT(*) AS lanes
FROM usp_data.usp_strategy.portfolio_toa_lanes
GROUP BY portfolio_id ORDER BY portfolio_id;
-- Expected: ai-infra=3, cross-cutting=4, hub=3, sfl=6
