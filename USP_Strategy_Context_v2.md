# USP Data & AI Team — Strategy Context Document
*Last updated: April 2026 | v2 — Source of Truth*
*Aligned with usp_data.usp_strategy Databricks schema*

---

## About This Team

The **USP Data & AI team** at the Bill & Melinda Gates Foundation works at the intersection of data infrastructure, AI, and education philanthropy. The team's strategy runs from 2026–2030 and is organized around five goals, four portfolios, and ten Bodies of Work (BOWs).

**Key context:**
- The team's work supports learner success in K–12 and postsecondary education, with a focus on low-SES learners and high-need contexts
- "Ambition 2045" is the Foundation's long-term north star vision for equitable, AI-enabled learning outcomes
- "USP" refers to the US Programs strategy team within the Foundation
- "EW" refers to Education and Workforce
- "PST" refers to Program Strategy Teams (other teams within the division)
- "INVEST" is the Foundation's internal investment/grants management system (Salesforce-based)
- "BOW" = Body of Work (a major workstream within a portfolio)
- "MLE" = Measurement, Learning, and Evaluation
- "EDP" = Enterprise Data Platform (Databricks-based)
- "Hub" = Data & AI Enablement Hub portfolio

---

## Portfolio–Goal Relationships

| Portfolio | Contributes to Goals | Notes |
|---|---|---|
| AI Infrastructure | Goals 1, 2, 5 | Direct contribution to learner-facing goals |
| System Feedback Loops | Goals 3, 4, 5 | Direct contribution to learner-facing goals |
| Cross-Cutting Supports | None | Internal enabler — supports team execution, not a direct driver of 2030 goals |
| Data & AI Enablement Hub | None | Internal enabler — supports team execution, not a direct driver of 2030 goals |

---

## 2030 Strategy Goals

### Goal 1 — Enable AI Solutions for Learners (g1)
**Target:** 40% of learners reached by solutions embedding portable memory and context
**Metric:** % of learners reached | Current (2026): 12% | Target (2030): 40%
**Contributing portfolios:** AI Infrastructure

### Goal 2 — Build Trusted Evidence in Education (g2)
**Target:** 50% of learners reached by solutions that have adopted evidence-based benchmarks and evaluation technology that improve safety and quality
**Metric:** % of students in K-12 and PS | Current (2026): 15% | Target (2030): 50%
**Contributing portfolios:** AI Infrastructure

### Goal 3 — Data-Informed Decision Making (g3)
**Target:** % of district and PS data decision makers using higher-quality data to improve learning, advising, mobility, and credentials of value
**Metric:** % of district and PS data decision makers | Current (2026): TBD | Target (2030): TBD
**Contributing portfolios:** System Feedback Loops

### Goal 4 — Comprehensive EW Momentum Measurement (g4)
**Target:** % of field leaders have timely, comprehensive data to consistently measure and assess all Amb45 EW Momentum Points
**Metric:** % of field leaders with timely, comprehensive data | Current (2026): TBD | Target (2030): TBD
**Contributing portfolios:** System Feedback Loops

**5 E-W Momentum Points** *(sub-metrics — to be added to database in future iteration)*:
1. Passed Algebra by 9th Grade (current: 42%, target: 85%)
2. Completed Gateway Courses (current: 35%, target: 80%)
3. Enrolled Immediately in PS (current: 28%, target: 75%)
4. Applied Recognized Learning to Credential Pathway (current: 12%, target: 65%)
5. Earned a Credential of Value (current: 22%, target: 72%)

### Goal 5 — Amplify Coordination and Impact (g5)
**Target:** 2–3x ($415–540M) leverage on USP Data investment through key partnerships
**Metric:** Investment leverage multiplier | Current (2026): 1.1x | Target (2030): 3x
**Contributing portfolios:** AI Infrastructure, System Feedback Loops
**Note:** Data for this goal will eventually automatically pull and refresh based on the CRM tool within INVEST.

---

## Portfolio 1: AI Infrastructure (ai-infra)

**Contributes to:** Goals 1, 2, 5

**Description:** This portfolio aims to enable the shared infrastructure, adoption pathways, evidence practices, and alignment needed to advance AI driven personalization and ensure AI-enabled education solutions are built, adopted, and scaled responsibly.

**Problem/Gap:** AI-enabled education solutions are advancing rapidly, but the conditions for responsible and equitable scale are fragmented or underdeveloped. Without intentional intervention, AI adoption risks reinforcing or widening existing inequities as benefits accrue unevenly across contexts.

**Enabling conditions framing:** Progress toward more responsible and effective AI driven personalization requires multiple enabling conditions to move together.

### Portfolio Outcomes

| outcome_id | Short Title | Activity | Outcome |
|---|---|---|---|
| ai-infra-po1 | Frontier Model Efficacy | Build shared technical public goods that are usable and useful | Improved model performance in priority education domains — AI models show measurable improvements in efficacy and reduced harms for tutoring, instruction, advising, and navigation, validated in education-specific contexts for low-SES learners. |
| ai-infra-po2 | Contextualization & Alignment | Embed quality, safety, and evidence into practice | Personalized, portable AI that aligns to learner and institutional context — AI tutors, advisors, and EdTech systems can securely exchange learner data and intent across environments, with context that aligns to the curricula, standards, and tools learners and institutions already rely on. |
| ai-infra-po3 | Safety & Guardrails | Ensure evidence shapes product development and procurement | A market that rewards responsible, safe, and equitable AI development — evidence of product performance and efficacy creates a reinforcing feedback loop informing how AI systems are designed, improved, assessed, and procured, so higher-quality evidence leads to higher-quality products over time. |
| ai-infra-po4 | Cross-Cutting Accelerant | Align actors to unlock scale and leverage | Align actors to unlock scale & leverage — influences all lanes simultaneously. |

### Portfolio Indicators

**ai-infra-po1:** % solutions with qualifying M or C components embedded · Portability range of M + C solutions w/n solution ecosystems · # downloads of public benchmark datasets & eval tech

**ai-infra-po2:** % increase in trust in AI enabled ed solution among consumers + other key stakeholders · % solutions publish performance on key benchmarks and include in marketing messages

**ai-infra-po3:** % increase year-over-year of solution benchmark performance and other advanced evaluation processes (e.g. simulations)

**ai-infra-po4:** Joint commitments of resources, deployments, and adoption of open infrastructure among hyperscalers and solution providers that advance key division priorities

---

### BOW 1.1 — Enhance Context & Personalization (ai-infra-bow1) | INVEST: B06038

**Description:** The goal of the Enhance Context & Personalization body of work is to establish shared, safe, and reusable infrastructure that enables AI-enabled learning systems to retain and apply learner context over time, supporting more adaptive, equitable, and effective learning experiences across priority use cases.

**Outcomes:**
1. **AI Integration with Contextual Data** (ai-infra-bow1-o1) — AI systems can meaningfully align with curricula, standards, competencies, and the instructional technologies learners and educators already rely on through investments in middleware, Model Context Protocols (MCPs), and domain-specific knowledge graphs.
2. **AI Interoperability & Personal Context** (ai-infra-bow1-o2) — Portable learner memory and agent-to-agent (A2A) exchange is enabled so AI tutors, advisors, and EdTech systems can securely share learner data and intent across environments.

*Note: A third outcome is under development (WIP).*

---

### BOW 1.2 — Accelerate AI Evaluation, Evidence, and Guardrails (ai-infra-bow2) | INVEST: B06039

**Description:** The goal of the Accelerate AI Evaluation, Evidence, and Guardrails body of work is to establish open, scalable evaluation infrastructure that enables developers and the field to assess the probable effectiveness and potential harms of AI-centric interventions before they reach learners and identify ways to improve effectiveness while mitigating harms for low-SES learners in high need contexts before and during deployment.

**Outcomes:**
1. **Evaluation Infrastructure Becomes Operational** (ai-infra-bow2-o1) — For the three USP pillars (Instruction & Tutoring, Gateway Math, Personalized Advising), independent, repeatable evaluation of AI systems is embedded into product development, procurement and implementation decisions – with measurable performance baselines and tracked lift over time.
2. **AI Systems Tested in High Need Contexts** (ai-infra-bow2-o2) — AI-enabled instructional and advising tools serving high-poverty contexts are validated in realistic digital twin environments and show measurable improvements in safety, fairness, and efficacy before and during real-world deployment.
3. **A Sustainable, Independent Evaluation Ecosystem Emerges** (ai-infra-bow2-o3) — Education has a functioning, independent, multistakeholder evaluation ecosystem capable of generating reproducible, open, and scalable assessments of AI systems – not dependent solely on philanthropic subsidy.

**Key Decisions:**
- **~Dec 2027** (bow-ai-infra-bow2-d1): Do we double down and institutionalize evaluation infrastructure as core infrastructure for USP? Options: A) Expand as required/default layer across all USP AI investments, B) Make it recommended but optional, C) Wind down if insufficient traction. Strong signals to institutionalize include: measurable lift on priority use cases, evaluation results changing procurement/funding decisions, investment producing insight that could not otherwise be achieved, players beyond immediate circle demanding evaluation.

---

### BOW 1.3 — Mobilize Frontier Labs for Learner Success (ai-infra-bow3) | INVEST: B06040

**Description:** AI market power is rapidly concentrating among a small number of frontier labs. This BoW engages frontier labs as upstream partners to align model development and infrastructure choices toward beneficial deployments that advance learning acceleration, math course completion, personalized advising, and learning mobility in priority contexts.

**Outcomes:**
1. **Frontier Labs Accelerate Priority Deployments** (ai-infra-bow3-o1) — Frontier labs provide capital, resources and expertise to our grantees and institutional partners to accelerate and improve deployments in priority UCs and contexts.
2. **Frontier Labs Adopt Open Interoperable Approaches** (ai-infra-bow3-o2) — Frontier labs adopt open, interoperable approaches that allow AI tools to integrate with institutional systems, exchange context securely, and operate across platforms without reinforcing fragmentation or lock-in.
3. **Model Development Integrates Evidence & Guardrails** (ai-infra-bow3-o3) — Frontier lab model development cycles integrate real-world evidence, representative education datasets, and embedded evaluation and guardrails, driving measurable improvements in efficacy, safety, and equity over successive releases towards our priority UCs and contexts.

---

## Portfolio 2: System Feedback Loops (sfl)

**Contributes to:** Goals 3, 4, 5

**Description:** This portfolio focuses on building and/or strengthening shared public-good data and AI infrastructure that provides timely, actionable insights to districts and postsecondary institutions, supports cross-sector collaboration, and enables rapid-cycle testing of AI solutions.

**Problem/Gap:** EW systems generate increasing amounts of data, yet feedback loops from insight to decision remain fragmented and uneven. Practitioners often lack clarity on what "good" looks like, and traditional assessments and credentials fail to capture changing real-world skills. Siloed data systems and limited AI and data capacity further constrain progress.

### Portfolio Outcomes

| outcome_id | Short Title | Activity | Outcome |
|---|---|---|---|
| sfl-po1 | New & Expanded AI-Ready Data | Increase data availability | New and expanded education and workforce AI-ready data focused on priority questions is accessed and linked across systems. |
| sfl-po2 | Timely & Personalized Feedback Infrastructure | Build and expand data utilities | Infrastructure in place to enable more timely and personalized data feedback loops that inform and strengthen decision-making. |
| sfl-po3 | Actionable Insights via AI Sensemaking | Accelerate sensemaking using digital public good integration | Data & analytics is translated into actionable insights, leveraging AI, that decisionmakers can understand and use — supported by sufficient capacity and tools to act on insights. |
| sfl-po4 | Governance & Standards for Reliable Data Use | Establish shared governance and standards, w/ systems open by default | Data sharing agreements, privacy protections, and norms of use enable repeated, reliable use of data across institutions and over time. |
| sfl-po5 | In-Place Coordination for Learning & Scale | Leverage In-Place coordination to accelerate learning & scale | Regional or state contexts provide the coordination needed to test, refine, and scale feedback loops in ways that align with local decision needs. |

---

### BOW 2.1 — Build and Sustain EDU-Net (sfl-bow1) | INVEST: B06041

**Description:** The goal of the EDU-Net body of work is to establish a trusted, secure, and interoperable network of data enclaves that connects fragmented public cross-sector and private data systems, enabling K–12 district and postsecondary administrators to generate deeper, timely, and actionable insights while accelerating the development and validation of AI-powered solutions that support learner success.

**Outcomes:**
1. **Governance & Technical Infrastructure** (sfl-bow1-o1) — Governance and technical infrastructure enables secure, efficient data sharing and interoperable and accurate analysis across enclaves that is supported by and responsive to Education-to-Workforce ecosystem actors.
2. **E-W Momentum Data Integration** (sfl-bow1-o2) — Edu-Net integrates data across key education-to-workforce momentum points, using public and private sources, enabling more comprehensive and accelerated user insights, especially in lower-resourced districts and institutions.
3. **Equity-Focused Insight Access** (sfl-bow1-o3) — Lower resourced districts and postsecondary institutions can access and act on insights from novel and linked data from EDU-NET supported by enhanced sensemaking and AI-powered and AI-enabled tools.

**Key Decisions:**
- **By end of 2028** (bow-sfl-bow1-d1): What is EDU-Net's distinct role in the evolving data and AI infrastructure ecosystem?

---

### BOW 2.2 — Advance Data & AI Feedback Loops in Place (sfl-bow2) | INVEST: B06042

**Description:** This BOW focuses on strengthening the conditions required for data- and AI-enabled solutions to be adopted, used, and sustained in service of USP program strategy goals. This body of work centers on building regional and statewide system feedback loops, data and AI readiness, and governance capacity so that integrated data translates into timely insight and action for practitioners, institutions, and policymakers. The work is anchored in TX, WA, and CA where USP has place-based strategies.

**Outcomes:** *(WIP — subject to change)*
1. **Timely & Actionable Insights** (sfl-bow2-o1) — State and regional systems in priority contexts (TX, WA, CA) routinely produce timely and actionable insights that intermediaries and local district and higher education leaders use to drive continuous improvement in student pathways.
2. **Human, Technical & Governance Capacity** (sfl-bow2-o2) — Priority states and regions demonstrate increased human, technical, governance, and data infrastructure capacity to responsibly test, evaluate, procure and adopt AI-enabled data solutions aligned to student needs, system goals, and guardrails for safety, privacy and equity.
3. **Policies & Sustained Investment** (sfl-bow2-o3) — Priority states establish the policies, funding strategies, and demonstrated value cases necessary for sustained investment in data and AI capacity, including evidence of improved outcomes, ROI, and clear pathways for ongoing state-led resourcing.
4. **Integrated SIS-LMS-AI Prototypes** (sfl-bow2-o4) — High-readiness contexts within and across priority states implement integrated SIS–LMS–AI system-feedback-loop prototypes to generate early evidence on effectiveness, safety, and feasibility that informs broader focus state and regional adoption.

---

### BOW 2.3 — Launch Competencies & Skills Genome Accelerator (sfl-bow3) | INVEST: B06043

**Description:** Over the next four years, this body of work will integrate key competencies and skills data and public good infrastructure into AI-enabled education solutions, enabling learners, advisors, and institutions to make better-informed decisions in a rapidly changing labor market and unlocking new approaches to advising, assessment, and learner mobility. The CSGA BOW will accomplish this by creating a dynamic, AI-native public competency and skills knowledge graph that connects education and workforce data at the competency and skill level.

**Outcomes:**
1. **Rapidly Updated Skills & Competency Definitions** (sfl-bow3-o1) — Skills and competency definitions and relationships are updated rapidly through AI-enabled processes and applied consistently across interoperable tools, platforms, and institutional use cases.
2. **Field-Owned AI-Native Knowledge Graph** (sfl-bow3-o2) — A co-developed field-owned dynamic, AI-native public knowledge graph is responsive to district and PS administrators' needs, supporting improved student assessment of learning, better college and career advising/navigation.
3. **Integrated Skills & Competency Data Foundation** (sfl-bow3-o3) — CSGA integrates diverse, competency and skills data sources into a shared, AI-ready foundation that reflects evolving skills, competencies, and job demands across learner populations and subgroups.

---

## Portfolio 3: Cross-Cutting Supports (cross-cutting)

**Contributes to:** No 2030 strategy goals directly — internal enabler supporting team execution and strategy effectiveness.

**Description:** The Cross-Cutting Portfolio provides the strategic, operational, and learning infrastructure that enables USP Data & AI to execute its strategy effectively and adapt over time.

### Portfolio Outcomes

| outcome_id | Short Title | Activity | Outcome |
|---|---|---|---|
| cross-cutting-po1 | Cross-Division Alignment | Drive cross-division alignment through coordination with PSTs around shared goals | Coordination and alignment across and between Data and PST priorities enable more integrated and impactful collaboration. |
| cross-cutting-po2 | Data-Driven Insights | Use data and evidence to generate and share actionable insights | Clear signals of progress, impact forecasts, and other evidence consistently inform portfolio and BOW decision-making. |
| cross-cutting-po3 | Team Coordination & Impact | Lead continuous improvement effort to enhance team coordination and impact | Efficient planning and investment processes enable faster decision-making, increased cross-team visibility and connection, and faster paths to alignment and execution. |
| cross-cutting-po4 | Culture & Inclusion | Establish inclusive norm, culture, alignment practices, and onboarding approaches | Team members feel a shared culture of trust, inclusion, and clarity that supports effective collaboration and impact. |

---

### BOW 3.1 — Advance Strategy Learning & Insight (bow1) | INVEST: B04932

**Description:** The Learning & Insight Body of Work brings together measurement, learning, and evaluation (MLE) and Impact Accounting to help the USP Data & AI team by supporting clear goal and target setting, tracking performance relative to expectations, timely learning, and transparent insight-sharing across BOWs, portfolios, and the broader strategy.

**Outcomes:**
1. **Measurement & MLE Routines** (bow1-o1) — Clear measurement priorities and streamlined MLE routines equip the team with visibility into strategic progress, clarity on meaningful signals of impact, and the ability to integrate evidence into planning and decisionmaking.
2. **AI-Enabled Analytics** (bow1-o2) — The team leverages AI-enabled analytics, predictive models, and integrated dashboards to surface early signals, test assumptions, and enable faster learning cycles that inform portfolio and field strategy.
3. **Cross-PST Collaboration** (bow1-o3) — Cross-PST collaboration and a strong bias toward sharing insights and learning with the field deepen Data and AI team alignment, strengthen impact across the division in support of Amb45.

**Key Decisions:**
- **~Dec 2027** (bow-bow1-d1): Do we expand cross-PST learning routines to a formal standing structure?

---

### BOW 3.2 — Enable Business & Strategy Execution (bow2) | INVEST: B06035

**Description:** The Enable Business & Strategy Execution Body of Work provides operational infrastructure and coordination support across the portfolio.

**Outcomes:** To be defined by BOW delegate.

---

### BOW 3.3 — Invest Reserve in Strategic Opportunities (bow3) | INVEST: B06045

**Description:** Reserves flexible funding to pursue emerging strategic opportunities that advance USP Data & AI goals.

**Outcomes:** Not applicable — this BOW is used for investment tracking and flexible funding deployment. No formal outcomes defined.

*Note: This BOW will not surface prominently in the dashboard but investments may be linked to it.*

---

## Portfolio 4: Data & AI Enablement Hub (hub)

**Contributes to:** No 2030 strategy goals directly — internal enabler supporting USP program teams' AI capability and decision-making quality.

**Description:** The Data & AI Enablement Hub is an enabling portfolio that strengthens shared capabilities and conditions across the division, allowing program teams to execute more effectively and at greater scale — accelerating progress toward the Data & AI team's strategy goals and the division's 2045 Ambition. The Hub operates as a shared service and advisory partner for U.S. Program teams, working through three interconnected service lines to ensure teams don't have to build foundational expertise, infrastructure, or learning capacity independently.

### Portfolio Outcomes

| outcome_id | Short Title | Activity | Outcome |
|---|---|---|---|
| hub-po1 | AI Advisory & Network | On-demand advisory, curated SME bench, and repeatable advisory formats | Program teams have access to timely, credible expert guidance — enabling them to pressure-test assumptions, weigh tradeoffs, and make better-informed choices without having to source that expertise independently. |
| hub-po2 | Data Insights Infrastructure | Market Insights, Insights Engine, Impact Accounting Models, shared dashboards | Teams draw on shared analytical tools and frameworks that enable more consistent interpretation of evidence — reducing duplicative analytical build and freeing teams to focus on program-specific judgment. |
| hub-po3 | AI Learning Community | Learning lab series, targeted convenings, small-group discussions, insight circulation | Insights from advisory engagements, pilots, and investments circulate across teams rather than staying siloed — building shared intuition about what is working, what remains uncertain, and where caution is warranted. |
| hub-po4 | Enabling Impact | Measure the Hub's aggregate contribution to USP team decision-making and AI capability | Cross-cutting measure of the Hub's overall enabling impact — reflects the cumulative effect of all three service lines on USP program teams' ability to make better AI-related decisions. Not tied to any single service line outcome. |

---

### BOW 4.1 — Enable Data & AI Capabilities for Division (hub-bow1) | INVEST: B06044

**Description:** The Data & AI Enablement Hub is an enabling portfolio that strengthens shared capabilities and conditions across the division, allowing program teams to execute more effectively and at greater scale. The Hub operates as a shared service and advisory partner for U.S. Program teams, working through three interconnected service lines to ensure teams don't have to build foundational expertise, infrastructure, or learning capacity independently. Each service line delivers distinct value on its own; together, they compound over time as shared infrastructure, expert access, and cross-team learning reinforce each other.

**Outcomes:**
1. **Expert Guidance Access** (hub-bow1-o1) — Program teams have access to timely, credible expert guidance — enabling them to pressure-test assumptions, weigh tradeoffs, and make better-informed choices without having to source that expertise independently.
2. **Shared Analytical Tools & Frameworks** (hub-bow1-o2) — Teams draw on shared analytical tools and frameworks that enable more consistent interpretation of evidence — reducing duplicative analytical build and freeing teams to focus on program-specific judgment rather than foundational capability they shouldn't have to rebuild independently.
3. **Circulating Insights & Shared Intuition** (hub-bow1-o3) — Insights from advisory engagements, pilots, and investments circulate across teams rather than staying siloed — building shared intuition about what is working, what remains uncertain, and where caution is warranted as the AI and education landscape evolves.

---

## Summary: Full Strategy Structure

```
USP Data & AI Strategy (2026–2030)
│
├── Goal 1: Enable AI Solutions (40% learners, portable memory/context)
│   └── AI Infrastructure → BOW 1.1, 1.2, 1.3
│
├── Goal 2: Build Trusted Evidence (50% learners, evidence-based benchmarks)
│   └── AI Infrastructure → BOW 1.1, 1.2, 1.3
│
├── Goal 3: Data-Informed Decision Making (TBD target)
│   └── System Feedback Loops → BOW 2.1, 2.2, 2.3
│
├── Goal 4: EW Momentum Measurement (TBD target)
│   └── System Feedback Loops → BOW 2.1, 2.2, 2.3
│
└── Goal 5: Amplify Coordination (2–3x leverage, $415–540M)
    ├── AI Infrastructure
    └── System Feedback Loops

Cross-Cutting Supports (internal enabler) → BOW 3.1, 3.2, 3.3
Data & AI Enablement Hub (internal enabler) → BOW 4.1
```

---

## Pending Items (as of April 2026)

| Item | Status | Owner |
|---|---|---|
| Goals 3 & 4 — 2030 targets and baselines | TBD | Team |
| BOW 2.2 outcomes — final definition | TBD — WIP, subject to change | BOW delegate |
| BOW 2.2 execution targets | TBD | BOW delegate |
| BOW 3.2 outcomes | TBD | BOW delegate |
| BOW 1.1 — third outcome | TBD | BOW delegate |
| All BOW impact indicators (except hub-bow1, ai-infra-bow2, ai-infra-bow3, sfl-bow3) | TBD | BOW delegates |
| bow_portfolio_outcome_links — BOW to portfolio outcome mapping | Pending — needs BOW delegate input | MLE team + BOW delegates |
| 5 E-W Momentum Points sub-metrics | To be added to database | MLE team |
| AI Infrastructure execution targets (bow1.1, bow1.3) | TBD | BOW delegates |
| SFL-BOW2 and SFL-BOW3 execution targets | TBD | BOW delegates |
| Additional key decisions across all portfolios | TBD | BOW delegates |

---

## Technical Reference
*For use with the Measurement & Insights Hub dashboard and Claude Projects*

**Database:** `usp_data.usp_strategy` (Databricks Delta tables)

**Portfolio IDs:** `cross-cutting` · `ai-infra` · `sfl` · `hub`

**BOW IDs:** `bow1` · `bow2` · `bow3` (cross-cutting) · `ai-infra-bow1` · `ai-infra-bow2` · `ai-infra-bow3` · `sfl-bow1` · `sfl-bow2` · `sfl-bow3` · `hub-bow1`

**ID conventions:**
- Goals: `g1` through `g5`
- Portfolio outcomes: `[portfolio_id]-po[n]` e.g. `ai-infra-po1`
- BOW outcomes: `[bow_id]-o[n]` e.g. `ai-infra-bow2-o1`
- Indicators: `[outcome_id]-i[n]` e.g. `ai-infra-bow2-o1-i1`
- Execution targets: `[outcome_id]-t[n]` e.g. `sfl-bow1-o1-t1`
- Key decisions: `bow-[bow_id]-d[n]` e.g. `bow-ai-infra-bow2-d1`

**INVEST join:** `bows.invest_bow_id = INVEST BoW_ID` (e.g. `B06039`)

**Dashboard:** React single-file app (dashboard.jsx) deployed as Databricks App
- Main dashboard: read-only reporting + Genie chat (full scope)
- Management app: data entry, investment deep dive, decision schema review
- Investment Genie: scoped to INVEST tables + investment_overlays

**Rating lifecycle:**
- Current year: Claude-assessed estimates (labeled as such in dashboard)
- Historical confirmed: entered in INVEST at annual reporting, read from `invest_bow_details`
- Override access: leadership + MLE team only (v1: by norm; future: RBAC)
