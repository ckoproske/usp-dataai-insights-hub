// ── CDN Shims — replaces import statements (loaded via index.html script tags) ──
const { useState, useEffect, useRef, useCallback } = React;
const _Recharts = window.Recharts || window.recharts || {};
const { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
        Tooltip, ResponsiveContainer, BarChart, Bar, LabelList } = _Recharts;


// ── Design System ─────────────────────────────────────────────────────────────
// Gates Foundation brand theme: warm cream canvas, dark slate, orange accent
const BRAND        = "#303A44";   // dark slate
const ACCENT       = "#F85C02";   // Gates orange
const ACCENT_LIGHT = "#FEF0E6";
const ACCENT_MID   = "#FDDCCA";
const BG           = "#F5F3ED";   // warm cream
const SURFACE      = "#FFFFFF";
const SURFACE_2    = "#F5F3ED";   // alternating row
const BORDER       = "#D7CBB2";
const BORDER_LIGHT = "#D7CBB2";
const TEXT         = "#303A44";
const TEXT_SUB     = "#666666";
const TEXT_MUTED   = "#A49A8C";
const YELLOW       = "#F85C02";
const SIDEBAR_W    = 220;

// Calibri body, Cambria headings — system fonts, no external dependency
const FONT_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }

  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .fade-up { animation: fadeUp 0.22s cubic-bezier(.4,0,.2,1) both; }
  .fade-in { animation: fadeIn 0.18s ease both; }
`;

// Team pill colors — deterministic hash of team name → consistent color from palette
const TEAM_PALETTE = [
  { bg: "#EEF4F8", color: "#1F5F80" },  // blue
  { bg: "#EDF7F5", color: "#337A6C" },  // teal
  { bg: "#FEF5E7", color: "#C07D10" },  // amber
  { bg: "#EDE9FE", color: "#5B21B6" },  // purple
  { bg: "#FDF2EE", color: "#9A3412" },  // rust
  { bg: "#DCFCE7", color: "#14532D" },  // green
  { bg: "#F3E8FF", color: "#6B21A8" },  // violet
  { bg: "#E0F2FE", color: "#075985" },  // sky
  { bg: "#FEE2E2", color: "#991B1B" },  // red
  { bg: "#F3F4F6", color: "#374151" },  // gray
];
function teamColor(name) {
  if (!name) return TEAM_PALETTE[TEAM_PALETTE.length - 1];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return TEAM_PALETTE[h % TEAM_PALETTE.length];
}
// Strip "U.S. Program/" prefix (and anything before it) from INVEST team names
function cleanTeam(name) {
  if (!name) return "";
  const idx = name.indexOf("U.S. Program/");
  return idx !== -1 ? name.slice(idx + "U.S. Program/".length).trim() : name;
}

// Portfolio colors — muted tonal family per GF brand
const PORT_COLORS = {
  "cross-cutting": { color:"#A49A8C", light:"#F5F3ED", label:"Cross Cutting Supports",  dark:"#7A7068" },
  "ai-infra":      { color:"#3086AB", light:"#EBF4F9", label:"AI Infrastructure",        dark:"#1F5F80" },
  "sfl":           { color:"#4EAB9A", light:"#ECF7F5", label:"System Feedback Loops",    dark:"#337A6C" },
  "hub":           { color:"#FBAE40", light:"#FEF5E7", label:"Data & AI Enablement Hub", dark:"#C07D10" },
};

const STATUS = {
  "Exceeds Expectations":        { color:"#2563EB", bg:"#EFF6FF", pill:"#DBEAFE", label:"Exceeds Expectations" },
  "Meets Expectations":          { color:"#059669", bg:"#ECFDF5", pill:"#D1FAE5", label:"Meets Expectations" },
  "Slightly Below Expectations": { color:"#D97706", bg:"#FEF5E7", pill:"#FEF3C7", label:"Slightly Below" },
  "Below Expectations":          { color:"#DC2626", bg:"#FEF2F2", pill:"#FEE2E2", label:"Below Expectations" },
  "No Data":                     { color:"#9CA3AF", bg:"#F9FAFB", pill:"#F3F4F6", label:"Too Early to Tell" },
};
const STATUS_ORDER = ["Exceeds Expectations","Meets Expectations","Slightly Below Expectations","Below Expectations","No Data"];

const COMPLETION = {
  "Not Started": { color:"#9CA3AF", bg:"#F9FAFB", icon:"○", label:"Not Started" },
  "On Track":    { color:"#059669", bg:"#ECFDF5", icon:"◑", label:"On Track" },
  "Delayed":     { color:"#D97706", bg:"#FEF5E7", icon:"⚠", label:"Delayed" },
  "Complete":    { color:"#2563EB", bg:"#EFF6FF", icon:"●", label:"Complete" },
};
const COMPLETION_ORDER = ["Not Started","On Track","Delayed","Complete"];
const COMPLETION_MIGRATE = { "In Progress":"On Track","Blocked":"Delayed","Complete":"Complete","Not Started":"Not Started","On Track":"On Track","Delayed":"Delayed" };

const YEARS        = [2026,2027,2028,2029,2030];
const BUDGET_YEARS = [2026,2027,2028,2029];
const STORAGE_KEY  = "usp-strategy-dashboard-v43";
const STRATEGY_TOTAL = 258;

const PO_SHORT_TITLES_CC  = ["Cross-Division Alignment","Data-Driven Insights","Team Coordination & Impact","Culture & Inclusion"];
const BOW_SHORT_TITLES_CC = ["Measurement & MLE Routines","AI-Enabled Analytics","Cross-PST Collaboration"];

// 2030 Strategy Goals
const STRATEGY_GOALS = [
  { id:"g1", number:1, title:"Enable AI Solutions", color:"#3086AB",
    target:"40% of learners reached by solutions embedding portable memory and context",
    earliest:"Q1 2026 — Annual Update in PR",
    source:"", updateFreq:"Annual",
    metric:"% of students in K-12 and PS", unit:"%", goal2030:40, current2026:12,
    chartType:"bar-grouped",
    chartNote:"% of students in K-12 and PS reached, by solution type. 'All Learners' reflects share of the 40% goal reached. Early directional estimates.",
    baseline:{year:"2025", total:0},
    groupedData:[
      { year:"2028", instruction:65, advising:21, allLearners:28 },
      { year:"2030", instruction:60, advising:23, allLearners:40 },
    ],
    goalNote:"By 2030, 40% of all learners are reached. Within that, 60% via Instruction + Tutoring and 23% via Advising + Navigation. Breakdown estimates show how those solution-type shares further split by capability.",
    rightBreakout:{
      advising:{ pct:23, rows:[
        {label:"Context Only", val:24},
        {label:"Memory Only",  val:14},
        {label:"Both",         val:8},
        {label:"Not Covered",  val:55},
      ]},
      instruction:{ pct:17, rows:[
        {label:"Context Only", val:26},
        {label:"Memory Only",  val:15},
        {label:"Both",         val:9},
        {label:"Not Covered",  val:50},
      ]},
    },
  },
  { id:"g2", number:2, title:"Build Trusted Evidence in Education", color:"#4EAB9A",
    target:"50% of learners reached by solutions that have adopted evidence-based benchmarks and evaluation technology that improve safety and quality",
    earliest:"Q1 2026 — Annual Update in PR",
    source:"", updateFreq:"Annual",
    metric:"% of students in K-12 and PS", unit:"%", goal2030:50, current2026:15,
    chartType:"bar-grouped",
    chartNote:"% of students in K-12 and PS reached, by solution type. 'All Learners' reflects share of the 50% goal reached. Early directional estimates.",
    baseline:{year:"2025", total:0},
    groupedData:[
      { year:"2028",
        instruction:60, advising:27, allLearners:30 },
      { year:"2030",
        instruction:50, advising:30, allLearners:50 },
    ],
    goalNote:"By 2030, 50% of all learners are reached. Within that, 50% via Instruction + Tutoring and 30% via Advising + Navigation. Breakdown estimates show how those solution-type shares further split by capability.",
    rightBreakout:{
      advising:{ pct:30, rows:[
        {label:"Eval Tech + Efficacy",  val:10},
        {label:"Guardrails + Safety",   val:20},
        {label:"Both",                  val:6},
        {label:"Not Covered",           val:64},
      ]},
      instruction:{ pct:20, rows:[
        {label:"Eval Tech + Efficacy",  val:20},
        {label:"Guardrails + Safety",   val:15},
        {label:"Both",                  val:4},
        {label:"Not Covered",           val:61},
      ]},
    },
  },
  { id:"g3", number:3, title:"Data-Informed Decision Making", color:"#A49A8C",
    target:"% of district and PS data decision makers report using better, higher-quality data to support learning and advising",
    earliest:"Q4 2025 — Annual Update in PR",
    metric:"% decision makers", unit:"%", goal2030:70, current2026:28 },
  { id:"g4", number:4, title:"Comprehensive EW Momentum Measurement", color:"#F59E0B",
    target:"% of state and district systems able to measure progress across all 5 E-W Momentum Points for learners",
    earliest:"Q1 2026 — Annual Update in PR",
    metric:"% of systems measuring all 5 points", unit:"%", goal2030:70, current2026:18,
    chartType:"momentum-points",
    chartNote:"Share of state/district systems able to measure each E-W Momentum Point",
    momentumPoints:[
      { label:"Passed Algebra by 9th Grade",              short:"Algebra by 9th",    current:42, target2030:85 },
      { label:"Completed Gateway Courses",                short:"Gateway Courses",   current:35, target2030:80 },
      { label:"Enrolled Immediately in PS",               short:"Immediate PS Enroll", current:28, target2030:75 },
      { label:"Applied Recognized Learning to Credential Pathway", short:"Recognized Learning", current:12, target2030:65 },
      { label:"Earned a Credential of Value",             short:"Credential of Value", current:22, target2030:72 },
      { label:"All 5 Points (Composite)",                 short:"All 5 (Composite)", current:18, target2030:70 },
    ],
  },
  { id:"g5", number:5, title:"Amplify Coordination and Impact", color:"#059669",
    target:"2-3x ($415-540M) leverage on USP Data investment through key partnerships.",
    earliest:"Q4 2025 — Annual Update in PR",
    note:"Data for this goal will eventually automatically pull and refresh based on our new CRM tool within INVEST.",
    metric:"Investment leverage", unit:"x", goal2030:3, current2026:1.1,
    chartType:"stacked-bar-leverage",
    chartNote:"Estimated investment leverage ($M) by partner type across time periods",
    leverageData:[
      {
        period:"2021–2025", label:"Historical",
        philanthropic:30, hyperscalers:15, vcImpact:10, public:20,
      },
      {
        period:"2026–2030\nTarget", label:"Target",
        philanthropic:190, hyperscalers:120, vcImpact:75, public:30,
      },
      {
        period:"2026–2030\nStretch", label:"Stretch",
        philanthropic:250, hyperscalers:170, vcImpact:90, public:30,
      },
    ],
    leverageTotals:{target:"~$415M", stretch:"~$540M"},
  },
];

// ── Placeholder data builders ────────────────────────────────────────────────
function makePlaceholderBow(id, name, color, tagColor, description, numOutcomes) {
  const outcomes = Array.from({length:numOutcomes},(_, i)=>({
    id:`${id}-o${i+1}`, number:i+1,
    shortTitle:`Outcome ${i+1}`,
    title:`[Placeholder] This outcome will describe what the ${name} BOW aims to achieve through its work in outcome area ${i+1}.`,
    notes:"", manualStatus:null,
    executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
    impactIndicators:[
      {id:`${id}-o${i+1}-i1`,text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
      {id:`${id}-o${i+1}-i2`,text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
    ],
  }));
  return { id, name, color, tagColor, description, outcomes, budget:"", delegate:"" };
}

function makePlaceholderPortfolio(id, name, description, outcomes, bows) {
  const portfolioOutcomes = Array.from({length:outcomes},(_, i)=>({
    id:`${id}-po${i+1}`, shortTitle:`Outcome ${i+1}`,
    activity:`[Placeholder] Key activity for outcome ${i+1}`,
    outcome:`[Placeholder] This portfolio outcome describes what success looks like for outcome area ${i+1} of the ${name} portfolio.`,
    manualStatus:null,
    indicators: Array.from({length:2},(_,j)=>({
      id:`${id}-pi${i*2+j+1}`,text:`[Placeholder] Portfolio indicator ${i*2+j+1}`,
      source:"",baseline:"",manualStatus:null,
      targets:{2026:"",2027:"",2028:"",2029:"",2030:""},
      actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},
    })),
  }));
  return {
    id, name, description,
    teamMembers:[],budget:"",budget2026:"",budget2027:"",budget2028:"",budget2029:"",
    portfolioOutcomes,
  };
}

const PLACEHOLDER = {
  pi1:{baseline:45,data:[55,62,71,80,88],target:[60,68,75,82,90]},
  pi2:{baseline:60,data:[70,75,82,86,91],target:[75,80,85,88,92]},
  pi3:{baseline:1, data:[2,3,5,6,8],     target:[3,4,6,7,9]},
  pi4:{baseline:30,data:[40,52,61,70,78],target:[50,60,70,78,85]},
  pi5:{baseline:38,data:[48,57,65,72,80],target:[55,65,72,80,85]},
  pi6:{baseline:35,data:[44,50,58,65,74],target:[50,58,65,72,80]},
  pi7:{baseline:2, data:[5,10,15,22,28], target:[8,14,20,24,30]},
  pi8:{baseline:52,data:[60,65,70,76,82],target:[65,70,75,80,85]},
  pi9:{baseline:44,data:[52,60,67,74,80],target:[60,68,74,80,85]},
  i1:{baseline:32,data:[42,55,67,76,84],target:[50,62,72,80,88]},
  i2:{baseline:28,data:[38,50,60,70,78],target:[45,58,68,76,85]},
  i3:{baseline:20,data:[30,44,56,66,75],target:[40,52,63,72,82]},
  i4:{baseline:25,data:[35,48,59,68,77],target:[42,55,65,74,83]},
  i5:{baseline:40,data:[50,60,70,78,85],target:[55,65,74,82,88]},
  i6:{baseline:18,data:[28,40,52,63,74],target:[35,48,60,70,80]},
  i7:{baseline:5, data:[10,25,40,58,72],target:[15,30,48,64,78]},
  i8:{baseline:35,data:[45,55,64,72,80],target:[50,60,70,78,86]},
  i9:{baseline:24,data:[33,46,58,68,76],target:[40,52,63,72,82]},
};

function getBowEmoji(id) { return ""; }

const BOW_ACRONYM = {
  "bow1": "MLE",           // Advance Strategy Learning & Insight
  // bow2 has no acronym
  "sfl-bow1": "EDU",       // Build and Sustain EDU-Net
  "sfl-bow2": "DAIP",      // Data in Place
  "sfl-bow3": "CSGA",      // Launch Competencies & Skills Genome Accelerator
  "ai-infra-bow1": "ECP",  // Enhance Context & Personalization
  "ai-infra-bow2": "AAE",  // Accelerate AI Evaluation, Evidence, and Guardrails
  "ai-infra-bow3": "MFL",  // Mobilize Frontier Labs for Learner Success
  "hub-bow1": "EDC",       // Enable Data & AI Capabilities for Division
};
function getBowAcronym(id, name) {
  if (BOW_ACRONYM[id]) return BOW_ACRONYM[id];
  return ""; // no acronym defined
}

// ── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  strategyRatings: {},  // goalId -> status
  portfolios: {
    "cross-cutting": {
      portfolio: {
        name:"Cross Cutting Supports",
        description:"The Cross-Cutting Portfolio provides the strategic, operational, and learning infrastructure that enables USP Data & AI to execute its strategy effectively and adapt over time.",
        teamMembers:["Natasha Fedo, DDSPM","Chelsea Koproske, SPO MLE & Strategy","Lilian Tan, Senior Manager","Melanie Winslow, Interim ASO","Emily Strom, PA","Elizabeth Hankins, SPC","Nicole David, PC/PA"],
        budget:"",budget2026:"",budget2027:"",budget2028:"",budget2029:"",
        portfolioOutcomes:[
          {id:"po1",shortTitle:"Cross-Division Alignment",activity:"Drive cross-division alignment through coordination with PSTs around shared goals",outcome:"Coordination and alignment across and between Data and PST priorities enable more integrated and impactful collaboration.",manualStatus:null,indicators:[{id:"pi1",text:"% PSTs reporting strong partnership and clarity on shared goals",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},{id:"pi2",text:"% learning sessions held",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},{id:"pi3",text:"# co-funded investments",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}}]},
          {id:"po2",shortTitle:"Data-Driven Insights",activity:"Use data and evidence to generate and share actionable insights",outcome:"Clear signals of progress, impact forecasts, and other evidence consistently inform portfolio and BOW decision-making.",manualStatus:null,indicators:[{id:"pi4",text:"% utilization of key MLE assets",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},{id:"pi5",text:"% team agree/highly agree that MLE data and insights has strengthened their decisionmaking",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}}]},
          {id:"po3",shortTitle:"Team Coordination & Impact",activity:"Lead continuous improvement effort to enhance team coordination and impact",outcome:"Efficient planning and investment processes enable faster decision-making, increased cross team visibility and connection, and faster paths to alignment and execution.",manualStatus:null,indicators:[{id:"pi6",text:"% team agree/highly agree that they have the time needed to do core work",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},{id:"pi7",text:"Reduction in time spent moving thru investment stages",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}}]},
          {id:"po4",shortTitle:"Culture & Inclusion",activity:"Establish inclusive norm, culture, alignment practices, and onboarding approaches",outcome:"Team members feel a shared culture of trust, inclusion, and clarity that supports effective collaboration and impact.",manualStatus:null,indicators:[{id:"pi8",text:"Disagg. data point for annual employee survey",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},{id:"pi9",text:"% of team members that report we are living into values/norms",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}}]},
        ],
      },
      bows:[
        {id:"bow1",name:"Advance Strategy Learning & Insight",color:"#EBF4F9",tagColor:"#3086AB",
          description:"The Learning & Insight Body of Work brings together measurement, learning, and evaluation (MLE) and Impact Accounting to help USP Data & AI team by supporting clear goal and target setting, tracking performance relative to expectations, timely learning, and transparent insight-sharing across BOWs, portfolios, and the broader strategy. The focus is on building practical systems that leverage an impact accounting approach to track progress toward key field goals, surface early signals, and help the data & AI team understand what is working, what is changing, and where shifts may be needed. This BoW also partners with the Data & AI Enablement Hub to ensure teams have the data and analytic tools needed to drive measurement and support stronger decision-making.\n\nOur work will strengthen the team's ability to generate and act on forward-looking insights about the data and AI ecosystem, clarifying the challenges, opportunities, and drivers of improvement that shape learner outcomes. It will deepen our understanding of where USP Data & AI has a unique role to play, illuminate the levers where philanthropy and other key actors are best positioned to accelerate progress, and highlight the assumptions and early signals that can shape our decisionmaking.",
          outcomes:[
            {id:"o1",number:1,shortTitle:"Measurement & MLE Routines",notes:"",manualStatus:null,title:"Clear measurement priorities and streamlined MLE routines equip the team with visibility into strategic progress, clarity on meaningful signals of impact, and the ability to integrate evidence into planning and decisionmaking.",executionTargets:{2026:[{text:"Establish and socialize measurement framework and reporting routines with team",completion:"On Track"},{text:"Develop MLE plans and results framework for a) strategy, b) all portfolios, and c) all BOWs",completion:"Not Started"},{text:"Launch data collection efforts and associated evaluations",completion:"Not Started"}],2027:[],2028:[],2029:[],2030:[]},impactIndicators:[{id:"i1",text:"% of team reporting high-level of clarity around measurement priorities",source:"",lastUpdated:"Jan 2026",updateFreq:"Annual",baseline:"",targets:{2026:"50",2027:"62",2028:"72",2029:"80",2030:"88"},actuals:{2026:"42",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i2",text:"% MLE plans completed on schedule",source:"",lastUpdated:"Jan 2026",updateFreq:"Annual",baseline:"",targets:{2026:"45",2027:"58",2028:"68",2029:"76",2030:"85"},actuals:{2026:"38",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i3",text:"# evaluations launched",source:"",lastUpdated:"Jan 2026",updateFreq:"Annual",baseline:"",targets:{2026:"40",2027:"52",2028:"63",2029:"72",2030:"82"},actuals:{2026:"30",2027:"",2028:"",2029:"",2030:""},manualStatus:null}]},
            {id:"o2",number:2,shortTitle:"AI-Enabled Analytics",notes:"",manualStatus:null,title:"The team leverages AI-enabled analytics, predictive models, and integrated dashboards to surface early signals, test assumptions, and enable faster learning cycles that inform portfolio and field strategy.",executionTargets:{2026:[{text:"Pilot Amb 45 ROI model with EDP and AI Insights KG integration",completion:"On Track"},{text:"Build Impact Forecasts and other reporting infra for all 2030 Data Goals",completion:"Not Started"},{text:"Develop Dynamic Leadership Reporting Dashboards",completion:"Not Started"}],2027:[],2028:[],2029:[],2030:[]},impactIndicators:[{id:"i4",text:"% utilization rate of TBD analytical tools",source:"",lastUpdated:"Jan 2026",updateFreq:"Quarterly",baseline:"",targets:{2026:"42",2027:"55",2028:"65",2029:"74",2030:"83"},actuals:{2026:"35",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i5",text:"% team expressing confidence in MLE data strengthening decisionmaking",source:"",lastUpdated:"Jan 2026",updateFreq:"Annual",baseline:"",targets:{2026:"55",2027:"65",2028:"74",2029:"82",2030:"88"},actuals:{2026:"50",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i6",text:"# dashboards deployed",source:"",lastUpdated:"",updateFreq:"",baseline:"",targets:{2026:"35",2027:"48",2028:"60",2029:"70",2030:"80"},actuals:{2026:"28",2027:"",2028:"",2029:"",2030:""},manualStatus:null}]},
            {id:"o3",number:3,shortTitle:"Cross-PST Collaboration",notes:"",manualStatus:null,title:"Cross-PST collaboration and a strong bias toward sharing insights and learning with the field deepen Data and AI team alignment, strengthen impact across the division in support of Amb45.",executionTargets:{2026:[{text:"Articulate a clear TOA for how Data and AI team enables each of the Amb 45 pillars",completion:"Not Started"},{text:"At least 3 learning routines established with PSTs",completion:"Not Started"},{text:"At least 2 technical assets uploaded to open GitHub repo",completion:"Complete"}],2027:[],2028:[],2029:[],2030:[]},impactIndicators:[{id:"i7",text:"# GitHub repo downloads",source:"",lastUpdated:"Mar 2026",updateFreq:"Real-time",baseline:"",targets:{2026:"15",2027:"30",2028:"48",2029:"64",2030:"78"},actuals:{2026:"10",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i8",text:"# learning routines established with PSTs",source:"",lastUpdated:"",updateFreq:"",baseline:"",targets:{2026:"50",2027:"60",2028:"70",2029:"78",2030:"86"},actuals:{2026:"45",2027:"",2028:"",2029:"",2030:""},manualStatus:null},{id:"i9",text:"# cross-PST co-funded evaluations",source:"",lastUpdated:"",updateFreq:"",baseline:"",targets:{2026:"40",2027:"52",2028:"63",2029:"72",2030:"82"},actuals:{2026:"33",2027:"",2028:"",2029:"",2030:""},manualStatus:null}]},
          ]},
        {id:"bow2",name:"Enable Business & Strategy Execution",color:"#F5F3ED",tagColor:"#A49A8C",description:"The Enable Business & Strategy Execution Body of Work provides operational infrastructure and coordination support across the portfolio.",outcomes:[]},
      ],
    },
    "ai-infra": {
      portfolio: {
        id:"ai-infra", name:"AI Infrastructure",
        description:"This portfolio aims to enable the shared infrastructure, adoption pathways, evidence practices, and alignment needed to advance AI driven personalization and ensure AI-enabled education solutions are built, adopted, and scaled responsibly.\n\nProblem/Gap: AI-enabled education solutions are advancing rapidly, but the conditions for responsible and equitable scale are fragmented or underdeveloped. Without intentional intervention, AI adoption risks reinforcing or widening existing inequities as benefits accrue unevenly across contexts.",
        teamMembers:[], budget:"", budget2026:"", budget2027:"", budget2028:"", budget2029:"",
        portfolioOutcomes:[
          {
            id:"ai-infra-po1", shortTitle:"Shared Technical Public Goods",
            activity:"Build shared technical public goods that are usable and useful",
            outcome:"Shared AI infrastructure (e.g., M+C, eval tooling, benchmarks) is available, interoperable, and usable in real-world education contexts.",
            manualStatus:null,
            indicators:[
              {id:"ai-infra-pi1",text:"% solutions with qualifying Memory or Context components embedded",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
              {id:"ai-infra-pi2",text:"Portability range of M + C solutions within solution ecosystems",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
              {id:"ai-infra-pi3",text:"# downloads of public benchmark datasets & eval tech; # evaluating/using; # publishing",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"ai-infra-po2", shortTitle:"Quality, Safety & Evidence in Practice",
            activity:"Embed quality, safety, and evidence into practice",
            outcome:"Institutions, districts, and educators are able to evaluate (or distinguish) AI-enabled tools for likely efficacy and safety, increasing their willingness to adopt and creating market incentives for responsible AI development.",
            manualStatus:null,
            indicators:[
              {id:"ai-infra-pi4",text:"% increase in trust in AI-enabled education solutions among consumers and other key stakeholders",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
              {id:"ai-infra-pi5",text:"% solutions that publish performance on key benchmarks and include results in marketing messages",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"ai-infra-po3", shortTitle:"Evidence Shapes Product Development",
            activity:"Ensure evidence shapes product development and procurement",
            outcome:"Evidence of product performance and efficacy creates a reinforcing feedback loop informing how AI systems are designed, improved, assessed, and procured, so higher-quality evidence leads to higher-quality products over time.",
            manualStatus:null,
            indicators:[
              {id:"ai-infra-pi6",text:"% increase year-over-year in solution benchmark performance and use of advanced evaluation processes (e.g. simulations)",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"ai-infra-po4", shortTitle:"Aligned Actors Unlock Scale & Leverage",
            activity:"Align actors to unlock scale and leverage",
            outcome:"Hyperscaler, developer, and funder resources are directed toward beneficial AI deployments that strengthen underlying infrastructure to accelerate solution efficacy and expand reach.",
            manualStatus:null,
            indicators:[
              {id:"ai-infra-pi7",text:"Joint commitments of resources, deployments, and adoption of open infrastructure among hyperscalers and solution providers that advance key division priorities",source:"",baseline:"",manualStatus:null,targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
        ],
      },
      bows:[
        {
          id:"ai-infra-bow1", name:"Enhance Context & Personalization",
          color:"#EBF4F9", tagColor:"#3086AB", budget:"", delegate:"",
          description:"The goal of the Enhance Context & Personalization body of work is to establish shared, safe, and reusable infrastructure that enables AI-enabled learning systems to retain and apply learner context over time, supporting more adaptive, equitable, and effective learning experiences across priority use cases.",
          outcomes:[
            {
              id:"ai-infra-bow1-o1", number:1,
              shortTitle:"AI Integration with Contextual Data",
              title:"AI systems can meaningfully align with curricula, standards, competencies, and the instructional technologies learners and educators already rely on through investments in middleware, Model Context Protocols (MCPs), and domain-specific knowledge graphs.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow1-o1-i1",text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow1-o1-i2",text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"ai-infra-bow1-o2", number:2,
              shortTitle:"AI Interoperability and Personal Context",
              title:"Portable learner memory and agent-to-agent (A2A) exchange is enabled so AI tutors, advisors, and EdTech systems can securely share learner data and intent across environments.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow1-o2-i1",text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow1-o2-i2",text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
        {
          id:"ai-infra-bow2", name:"Accelerate AI Evaluation, Evidence, and Guardrails",
          color:"#F5F3ED", tagColor:"#A49A8C", budget:"", delegate:"",
          description:"The goal of the Accelerate AI Evaluation, Evidence, and Guardrails body of work is to establish open, scalable evaluation infrastructure that enables developers and the field to assess the probable effectiveness and potential harms of AI-centric interventions before they reach learners and identify ways to improve effectiveness while mitigating harms for low-SES learners in high need contexts before and during deployment.",
          decisions:[
            {
              id:"ai-infra-bow2-d1",
              timing:"~Dec 2027 (midpoint)",
              status:"upcoming",
              question:"Do we double down and institutionalize evaluation infrastructure as core infrastructure for USP? After initial build and scaling (years 1 and 2), do we: A) Expand and formalize the infrastructure as a required or default layer across all USP AI investments? B) Make it a recommended but optional element? C) Wind down or redesign if insufficient traction nor lift is demonstrated?",
              signals:"Strong Signals to Institutionalize:\n• Measurable lift on priority use cases where AI systems are meaningfully improving over time on efficacy and harm mitigation metrics, in a way attributable to evaluation feedback loops\n• Evaluation results are changing procurement, funding, product iteration and implementation decisions\n• Investment is producing insight – gains in efficacy and avoidance of harm - that could not otherwise be achieved\n• Players besides our immediate circle are demanding evaluation",
              outcome:"",
            },
            {
              id:"ai-infra-bow2-d2",
              timing:"~Dec 2029 (endpoint)",
              status:"upcoming",
              question:"Do we maintain a philanthropic subsidy for low-SES context? By years 3 and 4, do we: A) Transition out of the evaluation technology field because the market sustains it OR B) Clarify how it must be supported as ongoing public infrastructure",
              signals:"Strong Signals to Transition Out:\n• High percentage of evaluations are paid by institutions / companies, who are repeat customers and renew\n• High-poverty schools / small solution providers are also able to afford evaluation\n• Evaluator network continues to grow, as does the volume of contributed tools, benchmarks and datasets; the platform effect of more partipants are increasing evaluation quality and comparability\n• Evaluation is embedded into major product evaluation stacks",
              outcome:"",
            },
          ],
          outcomes:[
            {
              id:"ai-infra-bow2-o1", number:1,
              shortTitle:"Evaluation Infrastructure Becomes Operational",
              title:"For the three USP pillars (Instruction & Tutoring, Gateway Math, Personalized Advising), independent, repeatable evaluation of AI systems is embedded into product development, procurement and implementation decisions – with measurable performance baselines and tracked lift over time.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[
                  {text:"Deliver first baseline evaluation results on priority use cases by end of Year 1", completion:"Not Started", quarter:null, notes:""},
                ],
                2027:[
                  {text:"Establish quarterly (or model-release-aligned) re-evaluation cadence for priority use cases beginning Year 2", completion:"Not Started", quarter:null, notes:""},
                  {text:"Build structured data export capability enabling integration into Foundation and field-facing artifacts and decision-tools", completion:"Not Started", quarter:null, notes:""},
                ],
                2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow2-o1-i1",text:"Demonstrated measurable improvement (\"lift\") in system performance and/or harm mitigation metrics across successive evaluation cycles",source:"",baseline:"xx",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o1-i2",text:"Evidence that evaluation results influence procurement, adoption, or product iteration decisions (e.g., documented changes tied to evaluation findings)",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o1-i3",text:"Field artifacts / decision-tools actively using structured evaluation data to guide strategy or funding decisions",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"ai-infra-bow2-o2", number:2,
              shortTitle:"AI Systems Tested in High Need Contexts",
              title:"AI-enabled instructional and advising tools serving high-poverty contexts are validated in realistic digital twin environments and show measurable improvements in safety, fairness, and efficacy before and during real-world deployment.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[
                  {text:"Develop high-fidelity digital twin environments and synthetic datasets representing high-poverty educational ecosystems by end of Year 1", completion:"Not Started", quarter:null, notes:""},
                ],
                2027:[
                  {text:"Incorporate digital twin-based stress testing into priority use case evaluations beginning Year 2", completion:"Not Started", quarter:null, notes:""},
                ],
                2028:[
                  {text:"Publish open-access tools and methodologies for simulating and evaluating AI systems in structurally disadvantaged contexts", completion:"Not Started", quarter:null, notes:""},
                ],
                2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow2-o2-i1",text:"Demonstrated reduction in risk indicators or performance disparities in digital twin testing over successive evaluation cycles",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o2-i2",text:"Evidence that product teams modify models or system configurations based on digital twin findings prior to live deployment",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o2-i3",text:"External adoption of digital twin evaluation methodologies by at least two major solution providers or procurement authorities",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"ai-infra-bow2-o3", number:3,
              shortTitle:"A Sustainable, Independent Evaluation Ecosystem Emerges",
              title:"Education has a functioning, independent, multistakeholder evaluation ecosystem capable of generating reproducible, open, and scalable assessments of AI systems – not dependent solely on philanthropic subsidy.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[],
                2027:[
                  {text:"Recruit and train 300+ independent evaluators into the education marketplace by Year 2", completion:"Not Started", quarter:null, notes:""},
                  {text:"Conduct 150+ reproducible evaluations by Year 2", completion:"Not Started", quarter:null, notes:""},
                ],
                2028:[
                  {text:"Conduct 500+ cumulative evaluations by Year 3", completion:"Not Started", quarter:null, notes:""},
                  {text:"Transition to majority fully or partially paid evaluations by Year 3", completion:"Not Started", quarter:null, notes:""},
                ],
                2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow2-o3-i1",text:"Percentage of evaluations funded by institutional or commercial partners, identifying a sustainable price point for cost per evaluation (trend toward sustainability)",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o3-i2",text:"Growth in evaluator participation and tool contributions (benchmarks, datasets, taxonomies)",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow2-o3-i3",text:"At least one major solution builder integrates foundation catalyzed eval tech into its internal evaluation stack",source:"",baseline:"xx",targets:{2026:"NA",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
        {
          id:"ai-infra-bow3", name:"Mobilize Frontier Labs for Learner Success",
          color:"#FEF5E7", tagColor:"#F59E0B", budget:"", delegate:"",
          description:"AI market power is rapidly concentrating among a small number of frontier labs. The technical decisions these actors make about model architecture, the datasets used to train and fine-tune models, contextual data integration, interoperability standards, evaluation methods, and embedded guardrails will shape not only how AI is deployed in education systems but how it is measured, improved, and governed over time.\n\nThis BoW engages frontier labs as upstream partners to align model development and infrastructure choices. The BoW does so by mobilizing frontier lab resources and expertise and directing them toward model and infrastructure improvements and beneficial deployments that advance learning acceleration, math course completion, personalized advising, and learning mobility in priority contexts.\n\nSpecifically, the foundation works with frontier labs to:\n• Advance interoperable, learner-centered infrastructure by supporting model capabilities and open standards (e.g., MCPs, contextual alignment with curricula, best-in-class tutoring standards, and competencies) that enable portable learner memory and coherent AI use across tools and institutions\n• Embed evaluation, evidence, and guardrails into model deployment in priority K–12 and postsecondary contexts",
          outcomes:[
            {
              id:"ai-infra-bow3-o1", number:1,
              shortTitle:"Frontier Labs Accelerate Priority Deployments",
              title:"Frontier labs provide capital, resources and expertise to our grantees and institutional partners to accelerate and improve deployments in priority use cases and contexts.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow3-o1-i1",text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow3-o1-i2",text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"ai-infra-bow3-o2", number:2,
              shortTitle:"Frontier Labs Adopt Open, Interoperable Approaches",
              title:"Frontier labs adopt open, interoperable approaches that allow AI tools to integrate with institutional systems, exchange context securely, and operate across platforms without reinforcing fragmentation or lock-in.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow3-o2-i1",text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow3-o2-i2",text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"ai-infra-bow3-o3", number:3,
              shortTitle:"Model Development Integrates Evidence & Guardrails",
              title:"Frontier lab model development cycles integrate real-world evidence, representative education datasets, and embedded evaluation and guardrails, driving measurable improvements in efficacy, safety, and equity over successive releases towards our priority use cases and contexts.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"ai-infra-bow3-o3-i1",text:"[Placeholder] Indicator 1 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"ai-infra-bow3-o3-i2",text:"[Placeholder] Indicator 2 description",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
      ],
    },
    "sfl": {
      portfolio: {
        id:"sfl", name:"System Feedback Loops",
        description:"This portfolio focuses on building and/or strengthening shared public-good data and AI infrastructure that provides timely, actionable insights to districts and postsecondary institutions, supports cross-sector collaboration, and enables rapid-cycle testing of AI solutions.\n\nProblem/Gap: EW systems generate increasing amounts of data, yet feedback loops from insight to decision remain fragmented and uneven. Practitioners often lack clarity on what \"good\" looks like, and traditional assessments and credentials fail to capture changing real-world skills. Siloed data systems and limited AI and data capacity further constrain progress. As a result, systems and leaders are not equipped with learner-centered feedback loops that enable continuous improvement at the pace required.",
        teamMembers:[], budget:"", budget2026:"", budget2027:"", budget2028:"", budget2029:"",
        portfolioOutcomes:[
          {
            id:"sfl-po1", shortTitle:"New & Expanded AI-Ready Data",
            activity:"Increase data availability",
            outcome:"New and expanded education and workforce AI-ready data focused on priority questions is accessed and linked across systems.",
            manualStatus:null,
            indicators:[
              {id:"sfl-pi1",text:"% of districts/states adopting or piloting data sources related to multimodal, system conditions, wealth, and comp/skills",source:"Annual state data survey",baseline:"8",manualStatus:null,targets:{2026:"15",2027:"25",2028:"38",2029:"48",2030:"60"},actuals:{2026:"12",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi2",text:"% of US learners represented in modern, linked P20W systems",source:"National data systems audit",baseline:"22",manualStatus:null,targets:{2026:"28",2027:"36",2028:"46",2029:"55",2030:"65"},actuals:{2026:"25",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"sfl-po2", shortTitle:"Timely & Personalized Feedback Infrastructure",
            activity:"Build and expand data utilities",
            outcome:"Infrastructure in place to enable more timely and personalized data feedback loops that inform and strengthen decisionmaking.",
            manualStatus:null,
            indicators:[
              {id:"sfl-pi3",text:"% reduction in average time to insight on key Essential Questions for district leaders and postsecondary administrators",source:"EDU-Net platform analytics",baseline:"0",manualStatus:null,targets:{2026:"10",2027:"20",2028:"30",2029:"37",2030:"40"},actuals:{2026:"8",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi4",text:"% systems implementing user-centered, AI-driven data access platforms (e.g., NLP-based dashboards)",source:"Platform adoption tracker",baseline:"5",manualStatus:null,targets:{2026:"12",2027:"22",2028:"34",2029:"44",2030:"55"},actuals:{2026:"9",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi5",text:"% of platforms enabling custom disaggregation queries by subgroup",source:"Platform capability audit",baseline:"10",manualStatus:null,targets:{2026:"20",2027:"32",2028:"45",2029:"56",2030:"68"},actuals:{2026:"16",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"sfl-po3", shortTitle:"Actionable Insights via AI Sensemaking",
            activity:"Accelerate sensemaking using digital public good integration",
            outcome:"Data & analytics is translated in actionable insights, leveraging AI, that decisionmakers can understand and use, supported by sufficient capacity and tools to act on insights.",
            manualStatus:null,
            indicators:[
              {id:"sfl-pi6",text:"# of templatized DSAs covering multiple institutions and sectors (reducing time to data submission)",source:"DSA repository log",baseline:"3",manualStatus:null,targets:{2026:"8",2027:"16",2028:"26",2029:"34",2030:"42"},actuals:{2026:"6",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi7",text:"% of pilot states/districts with interoperable data systems linking EW + social systems",source:"State interoperability survey",baseline:"6",manualStatus:null,targets:{2026:"12",2027:"20",2028:"30",2029:"40",2030:"50"},actuals:{2026:"10",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"sfl-po4", shortTitle:"Governance & Standards for Reliable Data Use",
            activity:"Standardize governance and standards w/ systems open by default",
            outcome:"Data sharing agreements, privacy protections, and norms of use enable repeated, reliable use of data across institutions and over time.",
            manualStatus:null,
            indicators:[
              {id:"sfl-pi8",text:"% of districts in Pathways and WSI regions with strategic institutional adoption of AI-enabled solutions",source:"Pathways/WSI adoption survey",baseline:"5",manualStatus:null,targets:{2026:"12",2027:"22",2028:"34",2029:"44",2030:"50"},actuals:{2026:"9",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi9",text:"% of regional cross-sector data tools in Pathways and WSI regions meeting thresholds for regular use",source:"Tool utilization tracker",baseline:"10",manualStatus:null,targets:{2026:"25",2027:"45",2028:"65",2029:"82",2030:"100"},actuals:{2026:"20",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
          {
            id:"sfl-po5", shortTitle:"In-Place Coordination for Learning & Scale",
            activity:"Leverage In-Place Coordination to Accelerate Learning & Scale",
            outcome:"Regional or state contexts provide the coordination needed to test, refine, and scale feedback loops in ways that align with local decision needs.",
            manualStatus:null,
            indicators:[
              {id:"sfl-pi10",text:"% of district and PS data decision makers reporting use of better, higher-quality data to support learning and advising",source:"Annual decision-maker survey",baseline:"28",manualStatus:null,targets:{2026:"35",2027:"45",2028:"55",2029:"63",2030:"70"},actuals:{2026:"31",2027:"",2028:"",2029:"",2030:""}},
              {id:"sfl-pi11",text:"% of field leaders reporting timely, comprehensive data to measure Amb 45 EW Momentum Points",source:"Field leader survey",baseline:"15",manualStatus:null,targets:{2026:"22",2027:"32",2028:"44",2029:"56",2030:"68"},actuals:{2026:"18",2027:"",2028:"",2029:"",2030:""}},
            ],
          },
        ],
      },
      bows:[
        {
          id:"sfl-bow1", name:"Build and Sustain EDU-Net", color:"#ECF7F5", tagColor:"#4EAB9A", budget:"", delegate:"",
          description:"The goal of the EDU-Net body of work is to establish a trusted, secure, and interoperable network of data enclaves that connects fragmented public cross-sector and private data systems, enabling K\u201312 district and postsecondary administrators to generate deeper, timely, and actionable insights while accelerating the development and validation of AI-powered solutions that support learner success. As a shared public good, this infrastructure is designed to address the most pressing priorities of field actors, align to the Foundation's highest-leverage education and workforce priorities, and improve outcomes for learners who face the greatest barriers to economic mobility.",
          decisions:[
            {
              id:"sfl-bow1-d1",
              timing:"By end of 2028",
              question:"What is EDU-NET\'s distinct role in the evolving data and AI infrastructure ecosystem — and where should it lead, expand, or step back because certain aspects are better supported by other actors?",
              signals:"",
              status:"upcoming",
            },
            {
              id:"sfl-bow1-d2",
              timing:"By end of 2029",
              question:"What is the right long-term home for each component of EDU-NET: philanthropy, market sustainability, or another ecosystem actor?",
              signals:"",
              status:"upcoming",
            },
          ],
          outcomes:[
            {
              id:"sfl-bow1-o1", number:1,
              shortTitle:"Shared Governance & Technical Framework",
              title:"Education and workforce data partners operate within a shared, diverse governance and technical framework that enables secure, efficient data sharing and interoperable analysis across enclaves—producing actionable insights that are responsive to districts and postsecondary institutions.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[
                  {text:"Identify and establish a coordinating entity, including governance/standards approach, and DSAs",completion:"Not Started"},
                  {text:"Identify 1-2 emerging technologies to boost efficiencies of EDU-Net",completion:"Not Started"},
                  {text:"Launch first EDU-Net pilot with at least 2 participating data enclaves and funders",completion:"Not Started"},
                  {text:"Prioritize 1-2 essential questions, informed by stakeholder needs, for deeper use case exploration",completion:"Not Started"},
                ],
                2027:[
                  {text:"Establish a representative Advisory Board (including LEAs, postsecondary institutions, and community organizations) and formalize a change control process to guide decision-making",completion:"Not Started"},
                  {text:"At least 2 emerging technologies are embedded in design to boost efficiencies/enhance interoperability to support priority essential questions and use cases",completion:"Not Started"},
                  {text:"3 new partnerships that serve EDU-NET goals",completion:"Not Started"},
                  {text:"Establish incentives and mechanisms for ongoing public/private partnerships",completion:"Not Started"},
                ],
                2028:[
                  {text:"Use input from at least one Advisory Board meeting to guide the coordinating entity's approach and center field voices in EDU-Net use and access",completion:"Not Started"},
                  {text:"Establish AI Builder Network criteria and onboard at least 3 builders to enhance EDU-Net or test new interventions",completion:"Not Started"},
                  {text:"Publish four quarterly EDU-Net reports showcasing public-private collaborations, demonstrating EDU-Net's value through faster and more comprehensive insights on 1-2 prioritized essential questions/use cases",completion:"Not Started"},
                ],
                2029:[
                  {text:"Advisory Board reviews and provides recommendations on major roadmap, data standard, technological and partnership proposals through a formal change control process",completion:"Not Started"},
                  {text:"The AI Builder Network delivers at least two emerging technologies or products that accelerate time to insight or enhance interoperability",completion:"Not Started"},
                  {text:"Issue four quarterly EDU-Net reports that showcase public-private collaboration and AI Builder efforts that accelerate insights on 2-3 essential questions/priority use cases and respond to participant needs",completion:"Not Started"},
                ],
                2030:[
                  {text:"The Advisory Board actively shapes EDU-Net priorities, with clear evidence that board input informs roadmap, data standards, technological and partnership decisions",completion:"Not Started"},
                  {text:"Launch of EDU-Net with at least 3 partners, launch AI builders community, increased data coverage for 2-3 essential questions for districts and post-secondary institutions",completion:"Not Started"},
                ],
              },
              impactIndicators:[
                {id:"sfl-bow1-o1-i1",text:"Reduction in time to produce key insights (% reduction from baseline)",source:"EDU-Net pilot assessment",baseline:"100",targets:{2026:"",2027:"10",2028:"25",2029:"35",2030:"40"},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o1-i2",text:"Number of public/private collaborations or products",source:"EDU-Net partnership tracker",baseline:"0",targets:{2026:"2",2027:"5",2028:"10",2029:"16",2030:"22"},actuals:{2026:"1",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o1-i3",text:"Representation from Stakeholder Groups in EDU-NET (# groups represented)",source:"Advisory Board roster",baseline:"0",targets:{2026:"3",2027:"6",2028:"9",2029:"11",2030:"12"},actuals:{2026:"2",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow1-o2", number:2,
              shortTitle:"E-W Momentum Data Integration",
              title:"Edu-Net integrates and connects novel public and private-sector wage, outcomes, and contextual data across key education-to-workforce momentum points, enabling insights that help users understand which programmatic opportunities drive meaningful impact, which credentials hold value in evolving labor markets, and how learner skills translate into economic mobility.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[
                  {text:"EDU-Net hosts at least 2 operational data enclaves that integrate relevant outcomes and contextual indicators",completion:"Not Started"},
                ],
                2027:[
                  {text:"EDU-Net hosts at least 3-5 operational data enclaves that integrate relevant outcomes and contextual indicators",completion:"Not Started"},
                  {text:"Incorporate 1-2 private data sources to expand coverage, enhance quality of insights across key education-to-workforce momentum points",completion:"Not Started"},
                ],
                2028:[
                  {text:"EDU-NET hosts 3 new additional public data partners and 2 private data sources to expand coverage, in order to enhance quality of insights across key education-to-workforce momentum points, and derive actionable insights",completion:"Not Started"},
                  {text:"EDU-Net incorporates at least 1 data enclaves developed or supported by other funders",completion:"Not Started"},
                ],
                2029:[
                  {text:"EDU-NET hosts 3 new additional public data partners and 2 private data sources to expand coverage, in order to enhance quality of insights across key education-to-workforce momentum points, and derive actionable insights",completion:"Not Started"},
                  {text:"EDU-Net incorporates at least 2 data enclaves developed or supported by other funders",completion:"Not Started"},
                ],
                2030:[
                  {text:"Data accessible through EDU-Net comprises 80% of relevant outcome and contextual indicators across key education-workforce momentum points for districts and PS administrators",completion:"Not Started"},
                ],
              },
              impactIndicators:[
                {id:"sfl-bow1-o2-i1",text:"Number of Public Partnerships (data enclaves + agencies)",source:"EDU-Net partnership log",baseline:"0",targets:{2026:"2",2027:"5",2028:"8",2029:"11",2030:"14"},actuals:{2026:"1",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o2-i2",text:"Number of Private Partnerships (sector data providers)",source:"EDU-Net partnership log",baseline:"0",targets:{2026:"0",2027:"1",2028:"3",2029:"5",2030:"7"},actuals:{2026:"0",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o2-i3",text:"Coverage of data needed for key insights (% of target E-W indicators covered)",source:"Data coverage audit",baseline:"0",targets:{2026:"15",2027:"35",2028:"55",2029:"70",2030:"80"},actuals:{2026:"12",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow1-o3", number:3,
              shortTitle:"Equity-Focused Insight Access",
              title:"Lower resourced districts and postsecondary institutions can act on insights from high quality data and AI-enabled tools to improve on key E-W momentum points for learners and workers.",
              notes:"", manualStatus:null,
              executionTargets:{
                2026:[
                  {text:"Differentiate advantage of EDU-NET through 2-3 use cases for EDU-Net from lower-resourced districts and postsecondary administrators",completion:"Not Started"},
                  {text:"2-3 sensemaking partners are identified for communicating and enabling user insights for action",completion:"Not Started"},
                ],
                2027:[
                  {text:"2-3 high priority use cases for EDU-Net from lower-resourced districts and postsecondary administrators are piloted in EDU-Net",completion:"Not Started"},
                  {text:"Established complementary insights hubs aligned to key stakeholder groups",completion:"Not Started"},
                  {text:"At least 2 products generated from EDU-NET produce insights on high priority use cases for lower resourced districts and postsecondary administrators",completion:"Not Started"},
                ],
                2028:[
                  {text:"At least one product is produced that results from collaboration between public/private partnerships at least 3-5 examples of EDU-Net users, using data for action",completion:"Not Started"},
                ],
                2029:[
                  {text:"At least three products are produced that results from collaboration between public/private partnerships at least 5-7 examples of EDU-Net users, using data for action",completion:"Not Started"},
                ],
                2030:[
                  {text:"Year over year increase in lower resourced district/postsecondary use of EDU-NET",completion:"Not Started"},
                  {text:"Generated new insights with increased participation from district and PS institutions",completion:"Not Started"},
                ],
              },
              impactIndicators:[
                {id:"sfl-bow1-o3-i1",text:"Number of high priority use cases for which insights are derived",source:"EDU-Net use case registry",baseline:"0",targets:{2026:"2",2027:"4",2028:"6",2029:"8",2030:"10"},actuals:{2026:"1",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o3-i2",text:"Number of lower-resourced districts and postsecondary institutions using EDU-NET",source:"User access logs",baseline:"0",targets:{2026:"5",2027:"15",2028:"30",2029:"50",2030:"75"},actuals:{2026:"3",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow1-o3-i3",text:"Number of EDU-NET users using data for action (reported in quarterly reviews)",source:"Quarterly user survey",baseline:"0",targets:{2026:"8",2027:"20",2028:"40",2029:"65",2030:"90"},actuals:{2026:"5",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
        {
          id:"sfl-bow2", name:"Data in Place", color:"#EBF4F9", tagColor:"#3086AB", budget:"", delegate:"",
          description:"This BOW focuses on strengthening the conditions required for data- and AI-enabled solutions to be adopted, used, and sustained in service of USP program strategy goals. This body of work centers on building regional and statewide system feedback loops, data and AI readiness, and governance capacity so that integrated data translates into timely insight and action for practitioners, institutions, and policymakers.\n\nThe work is anchored in TX, WA, and CA where USP has place-based strategies and where state and regional systems are at critical inflection points. Across these contexts, the BOW advances three core objectives: enable regional system feedback loops by improving access to integrated data and accelerating time from data to insight for priority users; build data and AI readiness in place, including governance, privacy safeguards, interoperability, and human capacity for responsible adoption of AI-enabled tools; and activate implementation conditions that allow USP Data investments and PST-led solutions to be tested, adopted, and scaled in real-world settings.\n\nBy strengthening these conditions in place, this BOW enables near-term program impact while generating durable learning about how state and regional systems can support effective and equitable use of data and AI. By 2030, the goal is for 50% of districts in PW and WSI regions to achieve strategic institutional adoption of AI-enabled solutions, and for 100% of regional cross-sector data tools in those regions to reach thresholds for regular use.",
          outcomes:[
            {
              id:"sfl-bow2-o1", number:1,
              shortTitle:"Timely & Actionable Regional Insights",
              title:"State and regional systems in priority contexts (TX, WA, CA) routinely produce timely and actionable insights that intermediaries and local district and higher education leaders use to drive continuous improvement in student pathways.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow2-o1-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow2-o1-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow2-o2", number:2,
              shortTitle:"AI-Ready Data Infrastructure Capacity",
              title:"Priority states and regions demonstrate increased human, technical, governance, and data infrastructure capacity to responsibly test, evaluate, procure and adopt AI-enabled data solutions aligned to student needs, system goals, and guardrails for safety, privacy and equity.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow2-o2-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow2-o2-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow2-o3", number:3,
              shortTitle:"Sustained State Investment in Data & AI",
              title:"Priority states establish the policies, funding strategies, and demonstrated value cases necessary for sustained investment in data and AI capacity, including evidence of improved outcomes, ROI, and clear pathways for ongoing state-led resourcing.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow2-o3-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow2-o3-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow2-o4", number:4,
              shortTitle:"Integrated SIS-LMS-AI Feedback Prototypes",
              title:"High-readiness contexts within and across priority states implement integrated SIS-LMS-AI system-feedback-loop prototypes to generate early evidence on effectiveness, safety, and feasibility that informs broader focus state and regional adoption.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow2-o4-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow2-o4-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
        {
          id:"sfl-bow3", name:"Launch Competencies & Skills Genome Accelerator", color:"#FEF5E7", tagColor:"#F59E0B", budget:"", delegate:"",
          description:"Over the next four years, this body of work will integrate key competencies and skills data and public good infrastructure into AI-enabled education solutions, enabling learners, advisors, and institutions to make better-informed decisions in a rapidly changing labor market and unlocking new approaches to advising, assessment, and learner mobility. The CSGA BOW will accomplish this by creating a dynamic, AI-native public competency and skills knowledge graph that connects education and workforce data at the competency and skill level. This work will include integration and development of new data assets (e.g., course syllabi, catalogs, curricula, assessments, and transcripts; job postings, job execution measures, and task automation data), creation and deployment of a co-developed comprehensive knowledge graph with key stakeholders, tool development and refinement through demonstration pilots, and scaled use through use case-specific implementation embedded into critical education solutions.\n\nThe foundation's role includes increasing ecosystem coordination, bringing together Frontier Labs, solution providers focused on learning, and skills taxonomy developers to reduce field duplication and accelerate shared public asset dissemination and use.",
          outcomes:[
            {
              id:"sfl-bow3-o1", number:1,
              shortTitle:"Rapidly Updated Skills & Competency Definitions",
              title:"Skills and competency definitions and relationships are updated rapidly through AI-enabled processes and applied consistently across interoperable tools, platforms, and institutional use cases.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow3-o1-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow3-o1-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow3-o2", number:2,
              shortTitle:"Field-Owned AI-Native Knowledge Graph",
              title:"A co-developed field-owned dynamic, AI-native public knowledge graph is responsive to district and PS administrators needs, supporting improved student assessment of learning, better college and career advising/navigation.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow3-o2-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow3-o2-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
            {
              id:"sfl-bow3-o3", number:3,
              shortTitle:"Shared AI-Ready Skills Foundation",
              title:"CSGA integrates diverse competency and skills data sources into a shared, AI-ready foundation that reflects evolving skills, competencies, and job demands across learner populations and subgroups.",
              notes:"", manualStatus:null,
              executionTargets:{2026:[],2027:[],2028:[],2029:[],2030:[]},
              impactIndicators:[
                {id:"sfl-bow3-o3-i1",text:"[Placeholder] Indicator 1",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
                {id:"sfl-bow3-o3-i2",text:"[Placeholder] Indicator 2",source:"",baseline:"",targets:{2026:"",2027:"",2028:"",2029:"",2030:""},actuals:{2026:"",2027:"",2028:"",2029:"",2030:""},manualStatus:null},
              ],
            },
          ],
        },
      ],
    },
    "hub": {
      portfolio: makePlaceholderPortfolio("hub","Data & AI Enablement Hub","The Data & AI Enablement Hub Portfolio ensures that teams across USP have the tools, resources, and capabilities needed to leverage data and AI effectively.",3,[]),
      bows:[
        makePlaceholderBow("hub-bow1","Enable Data & AI Capabilities for Division","#FEF5E7","#F59E0B","[Placeholder] This BOW supports teams in building the skills and knowledge needed to use data and AI tools effectively.",3),
      ],
    },
  },
};

// ── API config ────────────────────────────────────────────────────────────────
// In a Databricks App, requests to /api/* route to api.py automatically.
const API_BASE = "";
 
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}
 
// ── Storage (local backup) ────────────────────────────────────────────────────
async function loadFromStorage() {
  try {
    const r = await window.storage.get(STORAGE_KEY, true);
    if (!r) return null;
    return JSON.parse(r.value);
  } catch { return null; }
}
async function saveToStorage(d) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(d), true); return true; } catch { return false; }
}
 
// ── API health check ──────────────────────────────────────────────────────────
async function isAPIReady() {
  try {
    const h = await apiFetch("/api/health");
    // h.db === "error" means API is up but warehouse is unreachable
    return h.db === "ok" ? "ok" : "db-error";
  } catch { return false; }
}
 
// ── Load from API, merge into DEFAULT_DATA shape ──────────────────────────────
// Returns { data, fromAPI } — fromAPI is true if any tables had real rows.
async function loadFromAPI() {
  const base = JSON.parse(JSON.stringify(DEFAULT_DATA));
  let anyRealData = false;
 
  try {
    // ── Step 1: Core strategy structure ────────────────────────────────────
    const [goals, portfolios, bows, goalActuals, goalRatings] = await Promise.all([
      apiFetch("/api/goals"),
      apiFetch("/api/portfolios"),
      apiFetch("/api/bows"),
      apiFetch("/api/goal-actuals").catch(() => []),
      apiFetch("/api/ratings/goals").catch(() => []),
    ]);
 
    if (goals.length > 0) {
      anyRealData = true;
      base.strategyGoalsMeta = goals;
    }
 
    if (portfolios.length > 0) {
      anyRealData = true;
      portfolios.forEach(p => {
        if (base.portfolios[p.portfolio_id]) {
          base.portfolios[p.portfolio_id].portfolio.description =
            p.description || base.portfolios[p.portfolio_id].portfolio.description;
          base.portfolios[p.portfolio_id].portfolio.name =
            p.title || base.portfolios[p.portfolio_id].portfolio.name;
        }
      });
    }
 
    if (bows.length > 0) {
      anyRealData = true;
      bows.forEach(b => {
        Object.values(base.portfolios).forEach(portData => {
          const bow = portData.bows.find(bow => bow.id === b.bow_id);
          if (bow) {
            if (b.description) bow.description = b.description;
            if (b.title) bow.name = b.title;
            // Store invest_bow_id for INVEST joins
            bow.invest_bow_id = b.invest_bow_id;
          }
        });
      });
    }
 
    // Merge goal actuals into strategyGoalsMeta
    // goal_actuals returns one row per goal per year — build a map
    if (goalActuals.length > 0) {
      anyRealData = true;
      const actualsByGoal = {};
      goalActuals.forEach(a => {
        if (!actualsByGoal[a.goal_id]) actualsByGoal[a.goal_id] = {};
        actualsByGoal[a.goal_id][a.year] = a.actual_value;
      });
      if (base.strategyGoalsMeta) {
        base.strategyGoalsMeta = base.strategyGoalsMeta.map(g => ({
          ...g,
          actuals: actualsByGoal[g.goal_id] || {},
        }));
      }
    }
 
    // Merge goal ratings — Claude estimates labeled as such
    if (goalRatings.length > 0) {
      const ratingsByGoal = {};
      goalRatings.forEach(r => {
        ratingsByGoal[r.goal_id] = {
          rating: r.rating,
          rationale: r.rationale,
          is_estimate: true,
          assessed_by: r.assessed_by,
          assessed_at: r.assessed_at,
          rating_status: "Current year estimate — to be confirmed at annual reporting",
        };
      });
      base.goalRatings = ratingsByGoal;
    }
 
    // ── Step 2: BOW-level data ──────────────────────────────────────────────
    const allBowIds = Object.values(base.portfolios).flatMap(p => p.bows.map(b => b.id));
 
    const [allTargets, allBowOutcomes, allDecisions, allBowRatings] = await Promise.all([
      Promise.all(allBowIds.map(id => apiFetch(`/api/targets/${id}`).catch(() => []))),
      Promise.all(allBowIds.map(id => apiFetch(`/api/bow-outcomes/${id}`).catch(() => []))),
      Promise.all(allBowIds.map(id => apiFetch(`/api/decisions/bow/${id}`).catch(() => []))),
      Promise.all(allBowIds.map(id => apiFetch(`/api/ratings/bow/${id}`).catch(() => ({ current: [], historical: [] })))),
    ]);
 
    allBowIds.forEach((bowId, idx) => {
      const targets    = allTargets[idx];
      const bowOutcomes = allBowOutcomes[idx];
      const decisions  = allDecisions[idx];
      const ratings    = allBowRatings[idx];
 
      if (targets.length > 0 || bowOutcomes.length > 0) anyRealData = true;
 
      Object.values(base.portfolios).forEach(portData => {
        const bow = portData.bows.find(b => b.id === bowId);
        if (!bow) return;
 
        // Merge BOW outcomes from Tier 1 (read-only — title and shortTitle only)
        if (bowOutcomes.length > 0) {
          bowOutcomes.forEach(o => {
            const existing = bow.outcomes.find(ex => ex.id === o.outcome_id);
            if (existing) {
              if (o.title) existing.title = o.title;
              if (o.short_title) existing.shortTitle = o.short_title;
            }
          });
        }
 
        // Merge execution targets + status
        // API now returns targets joined with execution_target_status
        if (targets.length > 0) {
          const grouped = {};
          targets.forEach(t => {
            const key = `${t.outcome_id}|${t.year}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push({
              target_id:  t.target_id,
              text:       t.text,
              completion: t.completion || "Not Started",
              notes:      t.notes || "",
            });
          });
          bow.outcomes.forEach(o => {
            YEARS.forEach(yr => {
              const key = `${o.id}|${yr}`;
              if (grouped[key]) o.executionTargets[yr] = grouped[key];
            });
          });
        }
 
        // Merge key decisions — now includes level field
        if (decisions.length > 0) {
          bow.decisions = decisions.map(d => ({
            id:               d.decision_id,
            level:            d.level,
            timing:           d.timing,
            question:         d.question,           // was decision_text in old API
            signals:          d.signals,
            recorded_outcome: d.recorded_outcome || "",
            status:           d.status || "upcoming",
          }));
        }
 
        // Merge BOW ratings
        // current = Claude estimate (is_estimate: true)
        // historical = confirmed from INVEST
        bow.ratings = {
          current:    (ratings.current    || []).map(r => ({ ...r, is_estimate: true })),
          historical: (ratings.historical || []),
        };
      });
    });
 
    // ── Step 3: Indicators (wide format — one row per indicator) ───────────
    const allIndicators = await Promise.all(
      allBowIds.map(id => apiFetch(`/api/indicators/${id}`).catch(() => []))
    );

    allBowIds.forEach((bowId, idx) => {
      const indicators = allIndicators[idx];
      if (indicators.length === 0) return;
      anyRealData = true;

      Object.values(base.portfolios).forEach(portData => {
        const bow = portData.bows.find(b => b.id === bowId);
        if (!bow) return;

        // Group indicators by outcome_id
        const byOutcome = {};
        indicators.forEach(ind => {
          if (!byOutcome[ind.outcome_id]) byOutcome[ind.outcome_id] = {};
          if (!byOutcome[ind.outcome_id][ind.indicator_id]) {
            // First row for this indicator — set definition fields
            byOutcome[ind.outcome_id][ind.indicator_id] = {
              id:         ind.indicator_id,
              text:       ind.text || "",
              source:     ind.data_source || "",
              baseline:   ind.baseline !== null ? String(ind.baseline) : "",
              // Wide-format targets: target_2026 through target_2030
              targets: {
                2026: ind.target_2026 !== null ? String(ind.target_2026) : "",
                2027: ind.target_2027 !== null ? String(ind.target_2027) : "",
                2028: ind.target_2028 !== null ? String(ind.target_2028) : "",
                2029: ind.target_2029 !== null ? String(ind.target_2029) : "",
                2030: ind.target_2030 !== null ? String(ind.target_2030) : "",
              },
              actuals: {},
              manualStatus: null,
            };
          }
          // Actuals can have multiple rows per indicator (one per year)
          if (ind.year && ind.actual_value !== null && ind.actual_value !== undefined) {
            byOutcome[ind.outcome_id][ind.indicator_id].actuals[ind.year] =
              String(ind.actual_value);
          }
        });

        bow.outcomes.forEach(o => {
          const inds = byOutcome[o.id];
          if (!inds) return;
          o.impactIndicators = Object.values(inds);
        });
      });
    });

    // ── Step 4: Portfolio outcomes + portfolio-level indicators ─────────────
    const allPortIds = Object.keys(base.portfolios);

    const [allPortOutcomes, allPortActuals] = await Promise.all([
      Promise.all(allPortIds.map(id => apiFetch(`/api/portfolio-outcomes/${id}`).catch(() => []))),
      Promise.all(allPortIds.map(id => apiFetch(`/api/portfolio-actuals/${id}`).catch(() => []))),
    ]);

    allPortIds.forEach((portId, idx) => {
      const portOutcomes = allPortOutcomes[idx];
      const portActuals  = allPortActuals[idx];
      if (portOutcomes.length === 0) return;
      anyRealData = true;

      const portData = base.portfolios[portId];
      if (!portData) return;

      // Build portfolio indicators grouped by outcome_id from the actuals join
      // One DB row per (indicator × year) — accumulate actuals across rows
      const indsByOutcome = {};
      portActuals.forEach(a => {
        if (!indsByOutcome[a.outcome_id]) indsByOutcome[a.outcome_id] = {};
        if (!indsByOutcome[a.outcome_id][a.indicator_id]) {
          indsByOutcome[a.outcome_id][a.indicator_id] = {
            id:          a.indicator_id,
            text:        a.text || "",
            source:      a.data_source || "",
            baseline:    a.baseline !== null ? String(a.baseline) : "",
            manualStatus: null,
            targets: {
              2026: a.target_2026 !== null ? String(a.target_2026) : "",
              2027: a.target_2027 !== null ? String(a.target_2027) : "",
              2028: a.target_2028 !== null ? String(a.target_2028) : "",
              2029: a.target_2029 !== null ? String(a.target_2029) : "",
              2030: a.target_2030 !== null ? String(a.target_2030) : "",
            },
            actuals: {},
          };
        }
        if (a.year && a.actual_value !== null && a.actual_value !== undefined) {
          indsByOutcome[a.outcome_id][a.indicator_id].actuals[a.year] = String(a.actual_value);
        }
      });

      // Merge portfolio outcomes — preserve manualStatus from existing DEFAULT_DATA
      portData.portfolio.portfolioOutcomes = portOutcomes.map(po => {
        const existing = portData.portfolio.portfolioOutcomes.find(e => e.id === po.outcome_id);
        const indicators = indsByOutcome[po.outcome_id]
          ? Object.values(indsByOutcome[po.outcome_id])
          : (existing ? existing.indicators : []);
        return {
          id:          po.outcome_id,
          shortTitle:  po.short_title  || (existing ? existing.shortTitle : ""),
          activity:    po.activity     || (existing ? existing.activity   : ""),
          // DB column may be outcome_text or outcome depending on schema
          outcome:     po.outcome_text || po.outcome || (existing ? existing.outcome : ""),
          manualStatus: existing ? existing.manualStatus : null,
          indicators,
        };
      });
    });

  } catch (err) {
    console.warn("API load failed, using placeholder data:", err);
    return { data: null, fromAPI: false };
  }
 
  return { data: base, fromAPI: anyRealData };
}
 
 
// ── Write Tier 2 changes back to API ─────────────────────────────────────────
async function syncToAPI(portId, bowId, changeType, payload) {
  try {
    switch (changeType) {
 
      case "execution_target":
        // Writes to execution_target_status — NOT execution_targets (read-only)
        await apiFetch(`/api/targets/${payload.target_id}/status`, {
          method: "POST",
          body: JSON.stringify({
            year:       payload.year,
            completion: payload.completion,
            notes:      payload.notes,
            updated_by: payload.updated_by || "dashboard",
          }),
        });
        break;
 
      case "overlay":
        // Investment overlay — writes to investment_overlays via investment_id
        await apiFetch(`/api/investments/${payload.investment_id}/overlay`, {
          method: "POST",
          body: JSON.stringify({
            internal_notes: payload.notes,
            updated_by:     payload.updated_by || "dashboard",
          }),
        });
        break;
 
      case "key_decision":
        // Updates signals, recorded_outcome, status only
        await apiFetch(`/api/decisions/${payload.decision_id}/update`, {
          method: "POST",
          body: JSON.stringify({
            signals:          payload.signals,
            recorded_outcome: payload.recorded_outcome,
            status:           payload.status,
            updated_by:       payload.updated_by || "dashboard",
          }),
        });
        break;
 
      // bow_fields is removed — bow_outcomes is Tier 1 read-only.
      // Outcome title/shortTitle changes must go through the Excel seed process.
 
    }
  } catch (err) { console.warn(`syncToAPI(${changeType}) failed:`, err); }
}
 
 
// ── Load investments for a BOW (called by BowInvestmentsView) ────────────────
// Returns investments in a shape compatible with the existing investment table UI.
// INVEST columns are PascalCase — mapped here to camelCase for UI consistency.
async function loadBowInvestments(bowId) {
  try {
    const rows = await apiFetch(`/api/investments/bow/${bowId}`);
    return rows.map(inv => ({
      id:             inv.Investment_ID,
      grantee:        inv.Grantee_Vendor      || "",
      initiative:     inv.Investment_Name      || "",
      amount:         inv.Investment_Amount    != null ? String(inv.Investment_Amount) : "",
      approvedAmount: inv.Approved_Investment_Amount != null ? String(inv.Approved_Investment_Amount) : "",
      paidAmount:     inv.Paid_Amount          != null ? String(inv.Paid_Amount) : "",
      outstanding:    inv.Outstanding_Balance  != null ? String(inv.Outstanding_Balance) : "",
      stage:          inv.Workflow_Step        || "",
      status:         inv.Status               || "",
      type:           inv.Type                 || "",
      owner:          inv.Investment_Owner     || "",
      coordinator:    inv.Investment_Coordinator || "",
      startDate:      inv.Start_Date           || "",
      endDate:        inv.End_Date             || "",
      strategicFit:   inv.Strategic_Fit        || "",
      projectOverview: inv.Project_Overview    || "",
      managingTeam:   cleanTeam(inv.Managing_Team   || ""),
      supportingTeam: cleanTeam(inv.Supporting_Team || ""),
      // Internal overlay fields
      internal_notes: inv.internal_notes       || "",
      overlay_id:     inv.overlay_id           || null,
    }));
  } catch (err) {
    console.warn(`loadBowInvestments(${bowId}) failed:`, err);
    return [];
  }
}
 
// ── Load budget summary for a portfolio (called by PortfolioInvestmentsRollup) ──
async function loadPortfolioBudgetSummary(portfolioId) {
  try {
    return await apiFetch(`/api/investments/budget-summary/${portfolioId}`);
  } catch (err) {
    console.warn(`loadPortfolioBudgetSummary(${portfolioId}) failed:`, err);
    return [];
  }
}
 
// ── Load all investments (called by All Investments page) ────────────────────
async function loadAllInvestments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.portfolio_id) params.append("portfolio_id", filters.portfolio_id);
  if (filters.status)       params.append("status", filters.status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  try {
    const rows = await apiFetch(`/api/investments/all${qs}`);
    return rows.map(inv => ({
      id:             inv.Investment_ID,
      grantee:        inv.Grantee_Vendor        || "",
      initiative:     inv.Investment_Name        || "",
      amount:         inv.Investment_Amount      != null ? String(inv.Investment_Amount) : "",
      approvedAmount: inv.Approved_Investment_Amount != null ? String(inv.Approved_Investment_Amount) : "",
      paidAmount:     inv.Paid_Amount            != null ? String(inv.Paid_Amount) : "",
      outstanding:    inv.Outstanding_Balance    != null ? String(inv.Outstanding_Balance) : "",
      stage:          inv.Workflow_Step          || "",
      status:         inv.Status                 || "",
      type:           inv.Type                   || "",
      owner:          inv.Investment_Owner       || "",
      bow_id:         inv.bow_id                 || "",
      bow_title:      inv.bow_title              || "",
      portfolio_id:   inv.portfolio_id           || "",
      managingTeam:   cleanTeam(inv.Managing_Team   || ""),
      supportingTeam: cleanTeam(inv.Supporting_Team || ""),
      internal_notes: inv.internal_notes         || "",
      overlay_id:     inv.overlay_id             || null,
    }));
  } catch (err) {
    console.warn("loadAllInvestments failed:", err);
    return [];
  }
}

// ── Data helpers ─────────────────────────────────────────────────────────────
function migrateCompletion(val) {
  return COMPLETION[val] ? val : (COMPLETION_MIGRATE[val] || "Not Started");
}
function getIndData(ind) {
  const ph = PLACEHOLDER[ind.id];
  const baseline = (ind.baseline!==""&&ind.baseline!==undefined&&ind.baseline!==null) ? Number(ind.baseline) : (ph?ph.baseline:null);
  const actuals = YEARS.map((yr,j)=>{ const v=ind.actuals&&ind.actuals[yr]!==undefined?ind.actuals[yr]:""; return (v!==""&&v!==null)?Number(v):(ph?ph.data[j]:null); });
  const targets = YEARS.map((yr,j)=>{ const v=ind.targets&&ind.targets[yr]!==undefined?ind.targets[yr]:""; return (v!==""&&v!==null)?Number(v):(ph?ph.target[j]:null); });
  return { baseline, actuals, targets };
}
function autoSuggestStatus(ind) {
  const { actuals, targets } = getIndData(ind);
  const lastActual = actuals.filter(v=>v!==null).slice(-1)[0];
  const lastTarget = targets.filter(v=>v!==null).slice(-1)[0];
  if (lastActual===null||lastActual===undefined||!lastTarget) return "No Data";
  const r = lastActual/lastTarget;
  if (r>1.0) return "Exceeds Expectations";
  if (r>=0.9) return "Meets Expectations";
  if (r>=0.7) return "Slightly Below Expectations";
  return "Below Expectations";
}
function outcomeRollupStatus(indicators) {
  const s = indicators.map(i=>i.manualStatus||autoSuggestStatus(i));
  if (s.every(x=>x==="No Data")) return "No Data";
  if (s.some(x=>x==="Below Expectations")) return "Below Expectations";
  if (s.some(x=>x==="Slightly Below Expectations")) return "Slightly Below Expectations";
  if (s.every(x=>x==="Exceeds Expectations")) return "Exceeds Expectations";
  return "Meets Expectations";
}
const CURRENT_YEAR = 2026;

function execAutoStatus(outcome, year) {
  const yr = year || CURRENT_YEAR;
  const allT = (outcome.executionTargets[yr]||[]).map(t=>typeof t==="string"?{completion:"Not Started"}:{...t,completion:migrateCompletion(t.completion)});
  if (!allT.length) return null;
  const completed = allT.filter(t=>t.completion==="Complete").length;
  const total = allT.length;
  const pct = Math.round((completed/total)*100);
  if (pct>=90) return {pct,completed,total,year:yr,...STATUS["Meets Expectations"]};
  if (pct>=60) return {pct,completed,total,year:yr,...STATUS["Slightly Below Expectations"]};
  return {pct,completed,total,year:yr,...STATUS["Below Expectations"]};
}
function impactAutoStatus(outcome) {
  const s = outcome.impactIndicators.map(i=>autoSuggestStatus(i));
  if (s.every(x=>x==="No Data")) return null;
  const rollup = outcomeRollupStatus(outcome.impactIndicators);
  return { label:rollup, ...STATUS[rollup] };
}


// ── UI Primitives ─────────────────────────────────────────────────────────────
function Chip({ label, color, bg }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:bg,color,borderRadius:6,padding:"2px 10px",fontSize:14,fontWeight:700,border:"1px solid "+color+"33",whiteSpace:"nowrap"}}>{label}</span>;
}
function StatusBadge({ status, autoSuggested }) {
  const s = STATUS[status]||STATUS["No Data"];
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:5}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:s.color,display:"inline-block",flexShrink:0}}/>
      <Chip label={(s.label||status)+(autoSuggested?" ✦":"")} color={s.color} bg={s.pill}/>
    </div>
  );
}
function OutcomeRatingCycler({ value, onChange }) {
  const current = value||"No Data";
  const rs = STATUS[current]||STATUS["No Data"];
  const [pos,setPos] = useState(null); const ref = React.useRef();
  const open = e => { e.stopPropagation(); const r=ref.current.getBoundingClientRect(); setPos({top:r.bottom+6,left:r.left}); };
  const close = () => setPos(null);
  React.useEffect(()=>{ if(pos){const h=()=>close(); window.addEventListener("click",h); return()=>window.removeEventListener("click",h);} },[pos]);
  return (
    <div ref={ref} style={{display:"inline-block"}}>
      <div onClick={pos?close:open} style={{display:"inline-flex",alignItems:"center",gap:6,background:rs.pill,border:"1px solid "+rs.color+"55",borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:14,fontWeight:700,color:rs.color}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:rs.color,display:"inline-block"}}/>
        {current==="No Data"?"Set Rating":rs.label}
        <span style={{fontSize:10,opacity:0.6}}>▾</span>
      </div>
      {pos&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:SURFACE,border:"1px solid "+BORDER,borderRadius:10,boxShadow:"0 8px 30px rgba(10,37,64,0.12)",padding:8,minWidth:220}}>
          <div style={{fontSize:13,color:TEXT_SUB,padding:"2px 8px 8px",borderBottom:"1px solid "+BORDER,marginBottom:6,fontWeight:600}}>Overall Rating — Manual</div>
          {STATUS_ORDER.filter(s=>s!=="No Data").map(s=>(
            <div key={s} onClick={()=>{onChange(s);close();}} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,cursor:"pointer",background:current===s?STATUS[s].pill:"transparent",marginBottom:2}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:STATUS[s].color,flexShrink:0}}/>
              <span style={{fontSize:14,fontWeight:current===s?700:400,color:STATUS[s].color}}>{STATUS[s].label}</span>
            </div>
          ))}
          <div onClick={()=>{onChange(null);close();}} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,cursor:"pointer",borderTop:"1px solid "+BORDER,marginTop:4}}>
            <span style={{fontSize:14,color:TEXT_SUB}}>Clear rating</span>
          </div>
        </div>
      )}
    </div>
  );
}
function CompletionCycler({ value, onChange }) {
  const current = value||"Not Started", c = COMPLETION[current]||COMPLETION["Not Started"];
  const [pos,setPos] = useState(null); const ref = React.useRef();
  const open = e => { e.stopPropagation(); const r=ref.current.getBoundingClientRect(); setPos({top:r.bottom+4,left:r.left}); };
  const close = () => setPos(null);
  React.useEffect(()=>{ if(pos){const h=()=>close(); window.addEventListener("click",h); return()=>window.removeEventListener("click",h);} },[pos]);
  return (
    <div ref={ref} style={{display:"inline-block"}}>
      <span onClick={pos?close:open} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,background:c.bg,border:"1px solid "+c.color+"44",borderRadius:6,padding:"3px 10px",fontSize:14,fontWeight:700,color:c.color,whiteSpace:"nowrap"}}>
        {c.icon} {c.label}
      </span>
      {pos&&(
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:9999,background:SURFACE,border:"1px solid "+BORDER,borderRadius:10,boxShadow:"0 8px 30px rgba(10,37,64,0.12)",padding:8,minWidth:155}}>
          {COMPLETION_ORDER.map(s=>(
            <div key={s} onClick={()=>{onChange(s);close();}} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,cursor:"pointer",background:current===s?COMPLETION[s].bg:"transparent",marginBottom:2}}>
              <span style={{fontSize:15,color:COMPLETION[s].color}}>{COMPLETION[s].icon}</span>
              <span style={{fontSize:14,fontWeight:current===s?700:400,color:COMPLETION[s].color}}>{COMPLETION[s].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function EditableCell({ value, onChange, multiline, placeholder }) {
  const [editing,setEditing] = useState(false), [draft,setDraft] = useState(value);
  const commit = () => { setEditing(false); onChange(draft); };
  if (editing) {
    const p = {value:draft,onChange:e=>setDraft(e.target.value),onBlur:commit,autoFocus:true,style:{width:"100%",border:"1px solid "+ACCENT,borderRadius:6,padding:"5px 8px",fontSize:15,fontFamily:"inherit",minHeight:multiline?52:"auto",resize:multiline?"vertical":"none",outline:"none"}};
    return multiline ? <textarea {...p}/> : <input {...p} onKeyDown={e=>e.key==="Enter"&&commit()}/>;
  }
  return <div onClick={()=>{setDraft(value);setEditing(true);}} title="Click to edit" style={{cursor:"text",minHeight:20,padding:"2px 4px",borderRadius:4,fontSize:15,color:value?TEXT:TEXT_SUB+"88",whiteSpace:"pre-wrap"}}>{value||(placeholder||"—")}</div>;
}

// ── OrgChart ─────────────────────────────────────────────────────────────────
function OrgNode({ name, role, highlight, children, compact }) {
  const initials = name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const avatarSize = compact?22:34, nameFz=compact?10:12, roleFz=compact?9:10;
  const pad=compact?"6px 8px":"10px 14px", minW=compact?90:150, maxW=compact?120:180;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
      <div style={{border:"1.5px solid "+(highlight?ACCENT:BORDER),borderRadius:8,padding:pad,background:highlight?ACCENT_LIGHT:SURFACE,minWidth:minW,maxWidth:maxW,textAlign:"center",boxShadow:"0 1px 4px rgba(10,37,64,0.07)"}}>
        <div style={{width:avatarSize,height:avatarSize,borderRadius:"50%",background:highlight?ACCENT:BRAND,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:compact?8:12,fontWeight:700,margin:"0 auto "+(compact?"4px":"8px")}}>{initials}</div>
        <div style={{fontSize:nameFz,fontWeight:700,color:TEXT,lineHeight:1.3}}>{name}</div>
        {role&&<div style={{fontSize:roleFz,color:TEXT_SUB,marginTop:2,lineHeight:1.3}}>{role}</div>}
      </div>
      {children&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}><div style={{width:1.5,height:compact?10:20,background:BORDER}}/>{children}</div>)}
    </div>
  );
}
function OrgChart({ compact }) {
  const vline = compact?10:16;
  return (
    <div style={{overflowX:"auto",paddingBottom:4}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:compact?220:600}}>
        <OrgNode name="Natasha Fedo" role="DDSPM" compact={compact}/>
        <div style={{width:1.5,height:vline,background:BORDER}}/>
        <div style={{background:"#EC4899",color:"#fff",borderRadius:5,padding:compact?"3px 12px":"5px 24px",fontSize:compact?9:11,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase"}}>Cross-cutting Supports</div>
        <div style={{width:1.5,height:vline,background:BORDER}}/>
        <div style={{display:"flex",alignItems:"flex-start",position:"relative",width:"100%",justifyContent:"center"}}>
          <div style={{position:"absolute",top:0,left:"calc(16.67%)",right:"calc(16.67%)",height:1.5,background:BORDER,zIndex:0}}/>
          {[{name:"Chelsea Koproske",role:"Senior Officer, MLE & Strategy"},{name:"Melanie Winslow",role:"Interim ASO"},{name:"Lilian Tan",role:"Senior Manager",hasChildren:true}].map((person,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
              <div style={{width:1.5,height:vline,background:BORDER}}/>
              <OrgNode name={person.name} role={person.role} compact={compact}>
                {person.hasChildren&&(
                  <div style={{display:"flex",alignItems:"flex-start",position:"relative",width:"100%",justifyContent:"center"}}>
                    <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1.5,background:BORDER,zIndex:0}}/>
                    {[{name:"Emily Strom",role:"PA"},{name:"Elizabeth Hankins",role:"SPC"},{name:"Nicole David",role:"PC/PA"}].map((child,j)=>(
                      <div key={j} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
                        <div style={{width:1.5,height:vline,background:BORDER}}/>
                        <OrgNode name={child.name} role={child.role} compact={compact}/>
                      </div>
                    ))}
                  </div>
                )}
              </OrgNode>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SFLOrgChart({ compact }) {
  const vline = compact?10:16;
  const SFL_COLOR = "#06B6D4";
  const members = [
    {name:"OPEN SPO", role:"CSGA"},
    {name:"Brianna Moore-Trieu", role:"SPO, EDU-Net"},
    {name:"Julia Bloom-Weltman", role:"SPO, Data in Place"},
    {name:"Jeremy Kelley", role:"PO"},
    {name:"Megan Coolidge", role:"PO, Data Partnerships"},
  ];
  return (
    <div style={{overflowX:"auto",paddingBottom:4}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:compact?200:400}}>
        <OrgNode name="Nicole Ifill" role="DD" compact={compact}/>
        <div style={{width:1.5,height:vline,background:BORDER}}/>
        <div style={{background:SFL_COLOR,color:"#fff",borderRadius:5,padding:compact?"3px 12px":"5px 24px",fontSize:compact?9:11,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase"}}>System Feedback Loops</div>
        <div style={{width:1.5,height:vline,background:BORDER}}/>
        <div style={{display:"flex",alignItems:"flex-start",position:"relative",width:"100%",justifyContent:"center"}}>
          <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1.5,background:BORDER,zIndex:0}}/>
          {members.map((m,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
              <div style={{width:1.5,height:vline,background:BORDER}}/>
              <OrgNode name={m.name} role={m.role} compact={compact}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── DataMeta ──────────────────────────────────────────────────────────────────
function DataMeta({ source, lastUpdated, updateFreq, style }) {
  const isUrl = source && (source.startsWith("http://") || source.startsWith("https://"));
  const hasAny = source || lastUpdated || updateFreq;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",fontSize:11,color:TEXT_SUB,...style}}>
      {/* Source */}
      {source ? (
        isUrl ? (
          <a href={source} target="_blank" rel="noopener noreferrer"
            style={{display:"inline-flex",alignItems:"center",gap:3,color:ACCENT,textDecoration:"none",
              fontWeight:600,borderBottom:"1px solid "+ACCENT+"55",lineHeight:1.2,
              transition:"border-color .15s"}}
            onMouseOver={e=>e.currentTarget.style.borderBottomColor=ACCENT}
            onMouseOut={e=>e.currentTarget.style.borderBottomColor=ACCENT+"55"}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{flexShrink:0}}>
              <path d="M1 9L9 1M9 1H3M9 1V7" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {source.replace(/^https?:\/\/(www\.)?/,"").replace(/\/.*$/,"")}
          </a>
        ) : (
          <span style={{color:TEXT_SUB}}>{source}</span>
        )
      ) : (
        <span style={{color:TEXT_SUB,opacity:0.4}}>No source</span>
      )}
      {/* Divider + last updated */}
      {lastUpdated && <><span style={{opacity:0.25}}>·</span><span style={{opacity:0.65}}>Updated {lastUpdated}</span></>}
      {/* Divider + frequency */}
      {updateFreq && <><span style={{opacity:0.25}}>·</span><span style={{opacity:0.65}}>{updateFreq}</span></>}
    </div>
  );
}

// ── IndicatorTile ─────────────────────────────────────────────────────────────
function IndicatorTile({ ind, iIdx, activeYear }) {
  const { baseline:baselineVal, actuals:actualVals, targets:targetVals } = getIndData(ind);
  const sc = STATUS[ind.manualStatus||autoSuggestStatus(ind)];
  const lineData = YEARS.map((yr,j)=>({year:String(yr),Actual:actualVals[j],Target:targetVals[j]}));
  const yrIdx = YEARS.indexOf(activeYear);
  return (
    <div style={{flexShrink:0,width:ind._fluid?"100%":380,border:"1px solid "+BORDER,borderLeft:"3px solid "+sc.color,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(10,37,64,0.05)",background:SURFACE}}>
      <div style={{padding:"14px 16px",background:SURFACE,borderBottom:"1px solid "+BORDER}}>
        <div style={{marginBottom:6}}>
          <div style={{fontSize:14,fontWeight:700,color:TEXT,lineHeight:1.5}}>{ind.text}</div>
        </div>
        <DataMeta source={ind.source} lastUpdated={ind.lastUpdated} updateFreq={ind.updateFreq}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid "+BORDER}}>
        <div style={{padding:"10px 12px",borderRight:"1px solid "+BORDER,textAlign:"center"}}>
          <div style={{fontSize:12,color:TEXT_SUB,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>Baseline</div>
          <div style={{fontSize:19,fontWeight:800,color:"#94A3B8"}}>{baselineVal!==null?baselineVal:"—"}</div>
        </div>
        <div style={{padding:"10px 12px",borderRight:"1px solid "+BORDER,textAlign:"center",background:sc.bg}}>
          <div style={{fontSize:12,color:TEXT_SUB,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{activeYear} Target</div>
          <div style={{fontSize:19,fontWeight:800,color:sc.color}}>{targetVals[yrIdx]!==null?targetVals[yrIdx]:"—"}</div>
        </div>
        <div style={{padding:"10px 12px",textAlign:"center",background:sc.bg}}>
          <div style={{fontSize:12,color:TEXT_SUB,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{activeYear} Actual</div>
          <div style={{fontSize:19,fontWeight:800,color:sc.color}}>{actualVals[yrIdx]!==null?actualVals[yrIdx]:"—"}</div>
        </div>
      </div>
      <div style={{padding:"10px 10px 8px"}}>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={[{year:"Base",Actual:baselineVal,Target:null},...lineData]} margin={{top:4,right:4,bottom:0,left:-22}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
            <XAxis dataKey="year" tick={({x,y,payload})=>{
              const isHL=payload.value!=="Base"&&Number(payload.value)===activeYear;
              return <text x={x} y={y+10} textAnchor="middle" fontSize={isHL?10:8} fontWeight={isHL?800:400} fill={isHL?ACCENT:TEXT_SUB}>{payload.value==="Base"?"B":payload.value.slice(2)}</text>;
            }}/>
            <YAxis tick={{fontSize:9,fill:TEXT_SUB}}/>
            <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:"1px solid "+BORDER}}/>
            <Line type="monotone" dataKey="Actual" stroke={sc.color} strokeWidth={2} connectNulls
              data={[{year:"Base",Actual:baselineVal,Target:null},...lineData.map((d,j)=>({...d,Actual:YEARS[j]<=activeYear?d.Actual:null}))]}
              dot={(props)=>{
                const isBase=props.payload.year==="Base";
                const isHL=!isBase&&Number(props.payload.year)===activeYear;
                if(!isBase&&Number(props.payload.year)>activeYear) return <circle key={props.index} r={0} cx={0} cy={0}/>;
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={isBase?4:isHL?5:2} fill={isBase?"#94A3B8":isHL?sc.color:"#fff"} stroke={isBase?"#94A3B8":sc.color} strokeWidth={1.5}/>;
              }}/>
            <Line type="monotone" dataKey="Target" stroke={BORDER} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:2}}>
          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:TEXT_SUB}}><span style={{width:12,height:2,background:sc.color,display:"inline-block",borderRadius:1}}/> Actual</span>
          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:TEXT_SUB}}><span style={{width:12,height:2,background:BORDER,display:"inline-block",borderRadius:1}}/> Target</span>
          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:TEXT_SUB}}><span style={{width:6,height:6,borderRadius:"50%",background:"#94A3B8",display:"inline-block"}}/> Baseline</span>
        </div>
      </div>
    </div>
  );
}


// ── BowOutcomePanel ───────────────────────────────────────────────────────────
function BowOutcomePanel({ outcome, onUpdate }) {
  const [activeYear,setActiveYear] = useState(2026);
  const [editingInd,setEditingInd] = useState(null);
  const manualRs = outcome.manualStatus&&STATUS[outcome.manualStatus] ? STATUS[outcome.manualStatus] : null;
  const updInd = (iIdx,f,v) => onUpdate({...outcome,impactIndicators:outcome.impactIndicators.map((ind,i)=>i!==iIdx?ind:{...ind,[f]:v})});
  const targets = (outcome.executionTargets[activeYear]||[]).map(t=>typeof t==="string"?{text:t,completion:"Not Started"}:{...t,completion:migrateCompletion(t.completion)});
  const updExec = (tIdx,f,v) => { const arr=targets.map((t,i)=>i!==tIdx?t:{...t,[f]:v}); onUpdate({...outcome,executionTargets:{...outcome.executionTargets,[activeYear]:arr}}); };
  const addExec = () => onUpdate({...outcome,executionTargets:{...outcome.executionTargets,[activeYear]:[...targets,{text:"",completion:"Not Started"}]}});

  // Detect placeholder content — true when DB hasn't populated this section yet
  const isPlaceholderTarget = t => t.text && t.text.startsWith("[Placeholder]");
  const isPlaceholderInd    = i => i.text && i.text.startsWith("[Placeholder]");
  const targetsArePlaceholder = targets.length > 0 && targets.every(isPlaceholderTarget);
  const visibleInds = outcome.impactIndicators.filter(i => i.text);
  const indsArePlaceholder    = visibleInds.length > 0 && visibleInds.every(isPlaceholderInd);

  const NotYetLoaded = ({label}) => (
    <div style={{padding:"18px 16px",display:"flex",alignItems:"center",gap:10,borderRadius:8,border:"1px dashed "+BORDER,background:BG}}>
      <span style={{fontSize:16,opacity:0.4}}>⏳</span>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:TEXT_MUTED,marginBottom:1}}>Data not yet loaded</div>
        <div style={{fontSize:11,color:TEXT_MUTED}}>{label} for this outcome haven't been entered into the database yet.</div>
      </div>
    </div>
  );

  return (
    <div style={{background:SURFACE,borderRadius:"0 0 12px 12px",border:"1px solid "+BORDER,borderTop:"none"}}>
      {/* Side-by-side: Execution (left) + Impact Indicators (right) */}
      <div style={{display:"flex",alignItems:"flex-start",minHeight:0}}>

        {/* Left — Execution */}
        <div style={{flex:"0 0 360px",borderRight:"1px solid "+BORDER,padding:"18px 20px"}}>
          {/* Year selector */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginRight:2}}>Year</span>
            {YEARS.map(yr=>{
              const items=(outcome.executionTargets[yr]||[]).map(t=>typeof t==="string"?{completion:"Not Started"}:t);
              const dot=items.length>0?(items.every(t=>migrateCompletion(t.completion)==="Complete")?"#059669":YELLOW):null;
              return <button key={yr} onClick={()=>setActiveYear(yr)} style={{padding:"3px 12px",fontSize:13,fontWeight:700,borderRadius:16,cursor:"pointer",border:"none",background:activeYear===yr?ACCENT:BORDER+"88",color:activeYear===yr?"#fff":TEXT_SUB,position:"relative",transition:"all .15s"}}>
                {yr}{dot&&<span style={{position:"absolute",top:0,right:0,width:7,height:7,borderRadius:"50%",background:dot,border:"2px solid #fff"}}/>}
              </button>;
            })}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.8,marginBottom:10}}>Execution Targets — {activeYear}</div>
          {targetsArePlaceholder ? (
            <NotYetLoaded label="Execution targets"/>
          ) : (
            <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:10,overflow:"hidden"}}>
              {targets.length===0&&<div style={{padding:"14px 16px",color:TEXT_SUB,fontSize:13}}>No targets for {activeYear} yet.</div>}
              {targets.map((t,i)=>{
                const c=COMPLETION[t.completion]||COMPLETION["Not Started"];
                const isDone=t.completion==="Complete";
                return (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",borderBottom:i<targets.length-1?"1px solid "+BORDER:"none",background:isDone?"#F0FDF6":SURFACE,transition:"background .2s"}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:TEXT_SUB,flexShrink:0,marginTop:5,display:"inline-block"}}/>
                    <div style={{flex:1,paddingTop:1,textDecoration:isDone?"line-through":"none",opacity:isDone?0.45:1,transition:"all .2s",fontSize:13}}>
                      <EditableCell value={t.text} onChange={v=>updExec(i,"text",v)} multiline placeholder="Enter execution target"/>
                    </div>
                    <CompletionCycler value={t.completion} onChange={v=>updExec(i,"completion",v)}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — Impact Indicators */}
        <div style={{flex:1,minWidth:0,padding:"18px 20px"}}>
          <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.8,marginBottom:14}}>Impact Indicators</div>
          {indsArePlaceholder ? (
            <NotYetLoaded label="Impact indicators"/>
          ) : (
            <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
              {visibleInds.map((ind,i)=>(
                <IndicatorTile key={ind.id} ind={ind} iIdx={i} activeYear={activeYear}
                  editingInd={editingInd} setEditingInd={setEditingInd}
                  onChangeManualStatus={v=>updInd(outcome.impactIndicators.indexOf(ind),"manualStatus",v)}
                  onChangeBaseline={v=>updInd(outcome.impactIndicators.indexOf(ind),"baseline",v)}
                  onChangeTargets={v=>updInd(outcome.impactIndicators.indexOf(ind),"targets",v)}
                  onChangeActuals={v=>updInd(outcome.impactIndicators.indexOf(ind),"actuals",v)}
                  onChangeSource={v=>updInd(outcome.impactIndicators.indexOf(ind),"source",v)}/>
              ))}
              {visibleInds.length===0&&(
                <div style={{fontSize:13,color:TEXT_MUTED,fontStyle:"italic",paddingTop:4}}>No indicators defined yet.</div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}


// ── AIAnalysisPanel ───────────────────────────────────────────────────────────
function AIAnalysisButton({ onClick, isOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        onClick={onClick}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:8,border:"1.5px solid "+(isOpen?ACCENT:BORDER),background:isOpen?ACCENT_LIGHT:hovered?BG:SURFACE,cursor:"pointer",fontSize:14,fontWeight:700,color:isOpen?ACCENT:TEXT_SUB,transition:"all .15s",boxShadow:isOpen?"0 2px 8px rgba(45,191,173,0.15)":"none"}}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="#F59E0B" opacity="0.9"/>
          <circle cx="13" cy="3" r="1.2" fill="#F59E0B" opacity="0.7"/>
          <circle cx="3" cy="12" r="0.9" fill="#F59E0B" opacity="0.6"/>
        </svg>
        AI Analysis
      </button>
      {hovered&&!isOpen&&(
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:30,background:BRAND,borderRadius:8,padding:"10px 14px",width:240,pointerEvents:"none",boxShadow:"0 4px 16px rgba(10,37,64,0.18)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>AI Progress Analysis</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",lineHeight:1.55}}>Generates a summary of current progress and trend interpretation based on this data. Powered by Claude.</div>
        </div>
      )}
    </div>
  );
}

function AIAnalysisPanel({ context, onClose, portColor }) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const pc = portColor || { color: ACCENT };

  React.useEffect(() => {
    setLoading(true); setAnalysis(null); setError(null);
    const prompt = `You are an analytical assistant helping a strategy team at a philanthropic foundation understand progress on their portfolio.

Analyze the following dashboard data and provide:
1. A concise overall progress summary (2-3 sentences)
2. Key trends you observe across outcomes and indicators (3-5 bullet points)
3. Areas where data signals positive momentum
4. Areas where data signals slower progress or gaps

Important: Do NOT make recommendations or prescribe actions. Focus only on summarizing what the data shows and interpreting trends. Be specific and grounded in the numbers provided. Use plain language — no jargon.

Dashboard Data:
${context}`;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role:"user", content: prompt }]
      })
    })
    .then(r=>r.json())
    .then(d=>{
      const text = d.content?.find(b=>b.type==="text")?.text;
      if (text) setAnalysis(text);
      else setError("No analysis returned.");
    })
    .catch(()=>setError("Unable to connect to AI service."))
    .finally(()=>setLoading(false));
  }, [context]);

  return (
    <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:12,overflow:"hidden",boxShadow:"0 4px 24px rgba(10,37,64,0.10)"}}>
      {/* Header */}
      <div style={{background:BRAND,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="#F59E0B" opacity="0.95"/>
            <circle cx="13" cy="3" r="1.2" fill="#F59E0B" opacity="0.7"/>
            <circle cx="3" cy="12" r="0.9" fill="#F59E0B" opacity="0.6"/>
          </svg>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>AI Progress Analysis</span>
          <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.6)",background:"rgba(255,255,255,0.15)",borderRadius:4,padding:"2px 7px"}}>Powered by Claude</span>
        </div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"#fff",cursor:"pointer",padding:"3px 10px",fontSize:14,fontWeight:700}}>✕</button>
      </div>
      {/* Content */}
      <div style={{padding:"18px 20px"}}>
        {loading&&(
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
            <div style={{width:18,height:18,border:"2px solid "+ACCENT_MID,borderTopColor:ACCENT,borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
            <span style={{fontSize:14,color:TEXT_SUB}}>Analyzing progress data…</span>
          </div>
        )}
        {error&&<div style={{fontSize:14,color:"#DC2626",padding:"8px 0"}}>{error}</div>}
        {analysis&&(
          <div style={{fontSize:14,color:TEXT,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{analysis}</div>
        )}
      </div>
      <div style={{padding:"10px 20px",borderTop:"1px solid "+BORDER,background:BG,fontSize:12,color:TEXT_SUB}}>
        Analysis is generated from current dashboard data and may not reflect real-time updates.
      </div>
    </div>
  );
}


// ── PortfolioOutcomesView ─────────────────────────────────────────────────────
function PortfolioOutcomesView({ portId, portfolio, bows, portColor, onChange, initialIdx, portShortTitles, onNavigateToStrategy }) {
  const [activeIdx, setActiveIdx] = useState(initialIdx ?? 0);
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
  const SHORT_TITLES = portShortTitles || PO_SHORT_TITLES_CC;
  const po = portfolio.portfolioOutcomes[activeIdx] || portfolio.portfolioOutcomes[0];

  // BOW progress for all BOWs
  const bowProgress = (bows||[]).map(b => {
    const exec = execAutoStatus({
      impactIndicators:[],
      executionTargets: Object.fromEntries(YEARS.map(y=>[y, b.outcomes.flatMap(o=>(o.executionTargets[y]||[]))]))
    }, CURRENT_YEAR);
    const impact = impactAutoStatus({impactIndicators: b.outcomes.flatMap(o=>(o.impactIndicators||[]))});
    return { id:b.id, name:b.name, exec, impact, outcomes:b.outcomes };
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* ── Outcome tiles ── */}
      <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
        {portfolio.portfolioOutcomes.map((p,i)=>{
          const isActive = i===activeIdx;
          const pImpact = impactAutoStatus({impactIndicators:p.indicators});
          return (
            <div key={p.id} onClick={()=>setActiveIdx(i)}
              style={{flex:"1 1 240px",minWidth:200,borderRadius:12,overflow:"hidden",
                border:"1.5px solid "+(isActive?pc.color:BORDER),
                background:isActive?pc.color+"08":SURFACE,
                cursor:"pointer",transition:"all .15s",
                boxShadow:isActive?"0 4px 16px rgba(0,0,0,0.08)":"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{height:3,background:isActive?pc.color:pc.color+"44",flexShrink:0}}/>
              <div style={{padding:"16px 18px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:isActive?pc.color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5}}>Outcome {i+1}</span>
                  <span style={{fontSize:12,color:isActive?pc.color:TEXT_MUTED,fontWeight:600}}>{isActive?"▴":"▾"}</span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:TEXT,lineHeight:1.4,marginBottom:6}}>{SHORT_TITLES[i]||p.shortTitle}</div>
                <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.55}}>{p.outcome}</div>
              </div>
              <div style={{padding:"9px 18px 11px",borderTop:"1px solid "+(isActive?pc.color+"33":BORDER),background:isActive?pc.color+"06":"#FAFBFC",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Impact</span>
                {pImpact
                  ? <><span style={{width:7,height:7,borderRadius:"50%",background:pImpact.color,display:"inline-block"}}/><span style={{fontSize:12,fontWeight:700,color:pImpact.color}}>{pImpact.label.replace(" Expectations","")}</span></>
                  : <span style={{fontSize:12,color:TEXT_MUTED}}>No data</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Expanded detail ── */}
      {po && (
        <div style={{border:"1.5px solid "+pc.color+"44",borderRadius:12,overflow:"hidden",background:SURFACE,boxShadow:"0 2px 12px rgba(10,37,64,0.07)"}}>
          <div style={{display:"flex",alignItems:"flex-start"}}>

            {/* Left — Impact Indicators */}
            <div style={{flex:"0 0 58%",borderRight:"1px solid "+BORDER,padding:"20px 22px"}}>
              <div style={{marginBottom:16}}>
                <span style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.8}}>Impact Indicators</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                {po.indicators.map((ind,iIdx)=>{
                  if(!ind.text) return null;
                  return <IndicatorTile key={ind.id} ind={ind} iIdx={iIdx} activeYear={CURRENT_YEAR}/>;
                })}
                {po.indicators.filter(ind=>ind.text).length===0&&(
                  <div style={{fontSize:13,color:TEXT_MUTED,fontStyle:"italic"}}>No indicators defined.</div>
                )}
              </div>
            </div>

            {/* Right — Goals + BOW Outcomes + BOW Progress */}
            <div style={{flex:1,minWidth:0,padding:"20px 22px",display:"flex",flexDirection:"column",gap:22}}>

              {/* 2030 Goals */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.8,marginBottom:12}}>2030 Goals</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(PORT_GOAL_MAP[portId]||[]).map(gNum=>{
                    const g = STRATEGY_GOALS.find(x=>x.number===gNum);
                    if(!g) return null;
                    return (
                      <div key={g.id}
                        onClick={()=>onNavigateToStrategy&&onNavigateToStrategy(g.number)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,
                          border:"1px solid "+g.color+"44",background:g.color+"08",
                          cursor:onNavigateToStrategy?"pointer":"default",transition:"box-shadow .15s"}}
                        onMouseEnter={e=>{if(onNavigateToStrategy)e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)";}}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                        <span style={{width:24,height:24,borderRadius:"50%",background:g.color,color:"#fff",fontSize:11,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{g.number}</span>
                        <span style={{fontSize:13,fontWeight:600,color:TEXT,lineHeight:1.3,flex:1}}>{g.title}</span>
                        {onNavigateToStrategy&&<span style={{fontSize:11,color:TEXT_MUTED,flexShrink:0}}>↗</span>}
                      </div>
                    );
                  })}
                  {!(PORT_GOAL_MAP[portId]||[]).length&&<span style={{fontSize:13,color:TEXT_MUTED,fontStyle:"italic"}}>No goals mapped.</span>}
                </div>
              </div>

              {/* Contributing BOW Outcomes — per-outcome progress */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.8,marginBottom:12}}>Contributing BOW Outcomes</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {(()=>{
                    // Cap total contributing outcomes at 4 across all BOWs
                    const MAX = 4;
                    let remaining = MAX;
                    return bowProgress.map(b=>{
                      const visible = b.outcomes.filter(o=>o.title||o.shortTitle);
                      if(!visible.length||remaining<=0) return null;
                      const slice = visible.slice(0,remaining);
                      remaining -= slice.length;
                      return {...b, outcomes:slice};
                    }).filter(Boolean);
                  })().map(b=>{
                    const visible = b.outcomes;
                    if(!visible.length) return null;
                    return (
                      <div key={b.id} style={{borderRadius:10,border:"1px solid "+BORDER,borderLeft:"3px solid "+pc.color,overflow:"hidden",background:SURFACE}}>
                        {/* BOW name header */}
                        <div style={{padding:"8px 14px",background:pc.color+"07",borderBottom:"1px solid "+BORDER}}>
                          <div style={{fontSize:11,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1.2}}>{b.name}</div>
                        </div>
                        {/* Outcome rows with per-outcome stats */}
                        <div style={{display:"flex",flexDirection:"column"}}>
                          {visible.map((o,oi)=>{
                            const oExec = execAutoStatus(o, CURRENT_YEAR);
                            const oImpact = impactAutoStatus({impactIndicators: o.impactIndicators||[]});
                            const isLast = oi===visible.length-1;
                            return (
                              <div key={o.id||oi} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderBottom:isLast?"none":"1px solid "+BORDER}}>
                                <span style={{width:18,height:18,borderRadius:"50%",background:pc.color+"15",border:"1px solid "+pc.color+"33",fontSize:9,fontWeight:700,color:pc.color,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{oi+1}</span>
                                <div style={{flex:1,fontSize:12,color:TEXT,lineHeight:1.55}}>{o.title||o.shortTitle}</div>
                                <div style={{display:"flex",gap:12,flexShrink:0,alignItems:"center",paddingTop:1}}>
                                  <div style={{textAlign:"right"}}>
                                    <div style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>Exec</div>
                                    {oExec
                                      ? <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{width:5,height:5,borderRadius:"50%",background:oExec.color,display:"inline-block"}}/><span style={{fontSize:11,fontWeight:700,color:oExec.color}}>{oExec.completed}/{oExec.total}</span></div>
                                      : <span style={{fontSize:11,color:TEXT_MUTED}}>—</span>}
                                  </div>
                                  <div style={{textAlign:"right"}}>
                                    <div style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>Impact</div>
                                    {oImpact
                                      ? <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{width:5,height:5,borderRadius:"50%",background:oImpact.color,display:"inline-block"}}/><span style={{fontSize:11,fontWeight:700,color:oImpact.color}}>{oImpact.label.replace(" Expectations","")}</span></div>
                                      : <span style={{fontSize:11,color:TEXT_MUTED}}>—</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ── PortfolioOutcomePanel ──────────────────────────────────────────────────────
function PortfolioOutcomePanel({ po, poIdx, onChange, portShortTitles }) {
  const [editingInd,setEditingInd] = useState(null);
  const manualRs = po.manualStatus&&STATUS[po.manualStatus] ? STATUS[po.manualStatus] : null;
  const impactStatus = impactAutoStatus({impactIndicators:po.indicators});
  const currentYear = 2026;
  const SHORT_TITLES = portShortTitles||PO_SHORT_TITLES_CC;
  return (
    <div style={{background:SURFACE,borderRadius:"0 0 12px 12px",border:"1px solid "+BORDER,borderTop:"none"}}>
      <div style={{background:SURFACE,borderBottom:"1px solid "+BORDER,padding:"20px 24px",borderLeft:"4px solid "+(manualRs?manualRs.color:BORDER)}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:TEXT_SUB,marginBottom:6}}>Portfolio Outcome {poIdx+1}</div>
            <div style={{fontSize:17,fontWeight:700,lineHeight:1.5,color:TEXT,letterSpacing:-0.2,marginBottom:6}}>{po.outcome}</div>
            <div style={{fontSize:14,color:TEXT_SUB}}>{"→ "+po.activity}</div>
          </div>
        </div>
      </div>
      <div style={{padding:"10px 20px",borderBottom:"1px solid "+BORDER,background:SURFACE_2,display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.5,marginRight:4}}>Impact</div>
        {impactStatus?<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:impactStatus.color,display:"inline-block"}}/><span style={{fontSize:14,fontWeight:700,color:impactStatus.color}}>{impactStatus.label}</span></div>:<span style={{fontSize:14,color:TEXT_SUB}}>No data</span>}
      </div>
      <div style={{padding:"20px 24px"}}>
        <div style={{fontSize:14,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:14}}>Impact Indicators</div>
        <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:8,scrollSnapType:"x mandatory"}}>
          {po.indicators.map((ind,iIdx)=>{
            if(!ind.text) return null;
            return <IndicatorTile key={ind.id} ind={ind} iIdx={iIdx} activeYear={currentYear}
              editingInd={editingInd} setEditingInd={setEditingInd}
              onChangeManualStatus={v=>onChange(iIdx,"manualStatus",v)}
              onChangeBaseline={v=>onChange(iIdx,"baseline",v)}
              onChangeTargets={v=>onChange(iIdx,"targets",v)}
              onChangeActuals={v=>onChange(iIdx,"actuals",v)}
              onChangeSource={v=>onChange(iIdx,"source",v)}/>;
          })}
        </div>
        <div style={{fontSize:14,color:TEXT_SUB,marginTop:6,textAlign:"right"}}>scroll to see all indicators</div>
      </div>
    </div>
  );
}


// ── BowRatingsPopover ─────────────────────────────────────────────────────────
function BowRatingsPopover({ bow, onUpdate }) {
  const [show, setShow]               = useState(false);
  const [showRationale, setShowRationale] = useState(null); // "impact" | "execution" | null
  const ref = React.useRef();
 
  const RATING_YEARS = [2026, 2027, 2028, 2029, 2030];
 
  // bow.ratings is populated by loadFromAPI:
  // { current: [{ year, impact_rating, impact_rationale, execution_rating,
  //               execution_rationale, is_estimate, assessed_at }],
  //   historical: [{ impact_rating, impact_rationale, execution_rating,
  //                  execution_rationale, is_estimate: false }] }
  const currentRatings    = (bow.ratings?.current    || []);
  const historicalRatings = (bow.ratings?.historical || []);
 
  // Build a map: year → { impact, execution, source, rationale }
  const ratingMap = {};
 
  historicalRatings.forEach(r => {
    // historical rows don't have year from v_bow_details — mark as confirmed
    // If year is available use it, otherwise tag as "confirmed"
    const yr = r.year || "confirmed";
    ratingMap[yr] = {
      impact:              r.impact_rating,
      impactRationale:     r.Impact_Performance_Rating_Rationale || r.impact_rationale || "",
      execution:           r.execution_rating,
      executionRationale:  r.Execution_Performance_Rating_Rationale || r.execution_rationale || "",
      isEstimate:          false,
      source:              "INVEST",
    };
  });
 
  currentRatings.forEach(r => {
    ratingMap[r.year] = {
      impact:             r.impact_rating,
      impactRationale:    r.impact_rationale || "",
      execution:          r.execution_rating,
      executionRationale: r.execution_rationale || "",
      isEstimate:         true,
      assessedAt:         r.assessed_at,
      source:             "Claude estimate",
    };
  });
 
  React.useEffect(() => {
    if (!show) return;
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [show]);
 
  const RatingCell = ({ value, rationale, isEstimate, source }) => {
    const rs = value ? STATUS[value] : null;
    return (
      <td style={{ textAlign: "center", padding: "8px 6px", verticalAlign: "middle" }}>
        {value ? (
          <div style={{ display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 7,
              border: "1.5px solid " + (rs?.color || BORDER) + "88",
              background: rs?.pill || BG, color: rs?.color || TEXT_SUB,
              fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
              {rs?.label || value}
            </span>
            {isEstimate !== undefined && (
              <span style={{ fontSize: 9, fontWeight: 600,
                color: isEstimate ? "#D97706" : "#059669",
                background: isEstimate ? "#FEF5E7" : "#ECFDF5",
                borderRadius: 3, padding: "1px 5px",
                border: "1px solid " + (isEstimate ? "#FDE68A" : "#A7F3D0") }}>
                {isEstimate ? "Estimate" : "Confirmed"}
              </span>
            )}
            {rationale && (
              <div style={{ fontSize: 10, color: TEXT_MUTED, maxWidth: 120,
                textAlign: "center", lineHeight: 1.4, marginTop: 2 }}>
                {rationale.length > 60 ? rationale.slice(0, 60) + "…" : rationale}
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>—</span>
        )}
      </td>
    );
  };
 
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 13px", fontSize: 14, fontWeight: 700, borderRadius: 7,
          border: "1px solid " + BORDER, background: SURFACE,
          color: TEXT_SUB, cursor: "pointer", whiteSpace: "nowrap" }}>
        BOW Ratings
      </button>
 
      {show && (
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{ position: "absolute", top: "calc(100% + 8px)", left: 0,
            zIndex: 9999, background: SURFACE, border: "1px solid " + BORDER,
            borderRadius: 12, boxShadow: "0 8px 30px rgba(10,37,64,0.13)",
            padding: "16px 18px", minWidth: 480 }}>
 
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
              {bow.name} — Ratings by Year
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.5,
              textAlign: "right", maxWidth: 200 }}>
              Current year: Claude estimate<br />
              Historical: confirmed in INVEST
            </div>
          </div>
 
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid " + BORDER }}>
                <th style={{ textAlign: "left", padding: "4px 8px 10px",
                  color: TEXT_SUB, fontWeight: 600, fontSize: 13, width: 90 }} />
                {RATING_YEARS.map(yr => (
                  <th key={yr} style={{ textAlign: "center", padding: "4px 8px 10px",
                    color: TEXT_SUB, fontWeight: 600, fontSize: 12 }}>
                    {yr}
                    {ratingMap[yr]?.isEstimate && (
                      <div style={{ fontSize: 9, color: "#D97706",
                        fontWeight: 500, marginTop: 1 }}>estimate</div>
                    )}
                    {ratingMap[yr] && !ratingMap[yr].isEstimate && (
                      <div style={{ fontSize: 9, color: "#059669",
                        fontWeight: 500, marginTop: 1 }}>confirmed</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["impact", "execution"].map((type, ri) => (
                <tr key={type}
                  style={{ borderBottom: ri === 0 ? "1px solid " + BORDER : "none" }}>
                  <td style={{ padding: "10px 8px", color: TEXT_SUB, fontWeight: 600,
                    fontSize: 13, textTransform: "capitalize",
                    whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    {type}
                  </td>
                  {RATING_YEARS.map(yr => {
                    const r = ratingMap[yr];
                    const value     = r ? (type === "impact" ? r.impact : r.execution) : null;
                    const rationale = r ? (type === "impact" ? r.impactRationale : r.executionRationale) : "";
                    return (
                      <RatingCell
                        key={yr}
                        value={value}
                        rationale={rationale}
                        isEstimate={r?.isEstimate}
                        source={r?.source}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
 
          <div style={{ marginTop: 10, fontSize: 12, color: TEXT_MUTED,
            borderTop: "1px solid " + BORDER, paddingTop: 8,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              Estimates generated by Claude · Confirmed ratings entered in INVEST at annual reporting
            </span>
            <span style={{ fontSize: 11, color: "#D97706", fontWeight: 600 }}>
              Overrides: leadership + MLE only
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GanttChart & YearlyPlanView ───────────────────────────────────────────────
function GanttChart({ targets, onMoveToQuarter, todoItems, onUpdateTodos }) {
  const QUARTERS = ["Q1","Q2","Q3","Q4"];
  const QC = {"Q1":"#60A5FA","Q2":"#34D399","Q3":"#F59E0B","Q4":"#A78BFA"};
  const byQ = QUARTERS.map(q=>targets.filter(t=>t.quarter===q));
  const unassigned = targets.filter(t=>!t.quarter);
  const [dragOver, setDragOver] = React.useState(null);
  const [draggingId, setDraggingId] = React.useState(null);
  const [newTodo, setNewTodo] = React.useState({Q1:"",Q2:"",Q3:"",Q4:""});

  const handleDragStart = (e,t) => {
    setDraggingId(t.text);
    e.dataTransfer.setData("text/plain", t.text);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDrop = (e,quarter) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    onMoveToQuarter && onMoveToQuarter(text, quarter);
    setDragOver(null); setDraggingId(null);
  };
  const addTodo = (q) => {
    const txt = newTodo[q].trim();
    if (!txt) return;
    const updated = {...todoItems, [q]:[...(todoItems[q]||[]), {text:txt, done:false}]};
    onUpdateTodos(updated);
    setNewTodo(prev=>({...prev,[q]:""}));
  };
  const toggleTodo = (q, i) => {
    const updated = {...todoItems, [q]:(todoItems[q]||[]).map((t,ti)=>ti===i?{...t,done:!t.done}:t)};
    onUpdateTodos(updated);
  };
  const removeTodo = (q, i) => {
    const updated = {...todoItems, [q]:(todoItems[q]||[]).filter((_,ti)=>ti!==i)};
    onUpdateTodos(updated);
  };

  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,minWidth:500}}>
        {QUARTERS.map((q,qi)=>(
          <div key={q} style={{borderRadius:10,border:"2px solid "+(dragOver===q?QC[q]:BORDER),overflow:"hidden",transition:"border-color .15s",background:dragOver===q?QC[q]+"08":SURFACE}}
            onDragOver={e=>{e.preventDefault();setDragOver(q);}}
            onDragLeave={()=>setDragOver(null)}
            onDrop={e=>handleDrop(e,q)}>
            {/* Quarter header */}
            <div style={{background:QC[q]+"22",padding:"8px 12px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid "+QC[q]+"33"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:QC[q],display:"inline-block"}}/>
              <span style={{fontSize:14,fontWeight:800,color:QC[q]}}>{q}</span>
              <span style={{fontSize:12,color:TEXT_SUB,marginLeft:"auto"}}>{byQ[qi].length} target{byQ[qi].length!==1?"s":""}</span>
            </div>

            {/* Execution targets */}
            <div style={{padding:"8px",minHeight:40}}>
              {byQ[qi].length===0&&<div style={{fontSize:13,color:TEXT_SUB,padding:"4px 4px",opacity:dragOver===q?0.4:0.6}}>{dragOver===q?"Drop here":"No targets yet"}</div>}
              {byQ[qi].map((t,i)=>{
                const isDone=t.completion==="Complete";
                return (
                  <div key={i} draggable onDragStart={e=>handleDragStart(e,t)}
                    style={{display:"flex",alignItems:"flex-start",gap:6,padding:"6px 8px",marginBottom:4,borderRadius:6,background:isDone?"#F0FDF6":"#F7F8FA",border:"1px solid "+(isDone?"#BBF7D0":BORDER),cursor:"grab",opacity:draggingId===t.text?0.4:1}}>
                    <span style={{fontSize:11,color:TEXT_SUB,marginTop:2,flexShrink:0}}>⠿</span>
                    <span style={{fontSize:13,color:TEXT,lineHeight:1.4,flex:1}}>{t.text||"Untitled target"}</span>
                    {isDone&&<span style={{fontSize:11,color:COMPLETION["Complete"].color,flexShrink:0}}>✓</span>}
                  </div>
                );
              })}
            </div>

            {/* Divider between targets and todos */}
            <div style={{borderTop:"1px dashed #D1D5DB",margin:"0 8px",paddingTop:8,marginBottom:0}}/>

            {/* To-do list */}
            <div style={{padding:"0 8px 8px"}}>
              <div style={{fontSize:11,fontWeight:700,color:QC[q],textTransform:"uppercase",letterSpacing:0.8,marginBottom:6,marginTop:6}}>Action Items & Key Dates</div>
              {(todoItems[q]||[]).map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 2px",borderBottom:i<(todoItems[q]||[]).length-1?"1px solid "+BORDER:"none"}}>
                  <div onClick={()=>toggleTodo(q,i)}
                    style={{width:14,height:14,borderRadius:3,border:"1.5px solid "+(item.done?QC[q]:BORDER),background:item.done?QC[q]:"transparent",flexShrink:0,marginTop:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    {item.done&&<span style={{fontSize:10,color:"#fff",lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{fontSize:13,color:item.done?TEXT_SUB:TEXT,flex:1,lineHeight:1.4,textDecoration:item.done?"line-through":"none",opacity:item.done?0.55:1}}>{item.text}</span>
                  <button onClick={()=>removeTodo(q,i)} style={{background:"none",border:"none",cursor:"pointer",color:TEXT_SUB,fontSize:13,padding:"0 2px",opacity:0.4,lineHeight:1,flexShrink:0}}>×</button>
                </div>
              ))}
              {/* Add todo input */}
              <div style={{display:"flex",gap:4,marginTop:8}}>
                <input
                  value={newTodo[q]}
                  onChange={e=>setNewTodo(prev=>({...prev,[q]:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&addTodo(q)}
                  placeholder="Add item…"
                  style={{flex:1,border:"1px solid "+BORDER,borderRadius:6,padding:"4px 8px",fontSize:13,fontFamily:"inherit",outline:"none",color:TEXT,background:"#FAFBFC",minWidth:0}}/>
                <button onClick={()=>addTodo(q)}
                  style={{background:QC[q]+"22",border:"1px solid "+QC[q]+"44",borderRadius:6,cursor:"pointer",color:QC[q],fontWeight:700,fontSize:15,padding:"2px 8px",lineHeight:1,flexShrink:0}}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unscheduled */}
      {unassigned.length>0&&(
        <div style={{marginTop:12,borderRadius:8,border:"1px dashed "+BORDER,padding:"10px 14px",background:SURFACE_2}}>
          <div style={{fontSize:13,fontWeight:700,color:TEXT_SUB,marginBottom:8}}>Unscheduled — drag into a quarter</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {unassigned.map((t,i)=>(
              <div key={i} draggable onDragStart={e=>handleDragStart(e,t)}
                style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 10px",background:SURFACE,border:"1px solid "+BORDER,borderRadius:7,cursor:"grab",fontSize:14,color:TEXT,opacity:draggingId===t.text?0.4:1}}>
                <span style={{fontSize:11,color:TEXT_SUB}}>⠿</span>
                {t.text||"Untitled"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function YearlyPlanView({ bow, onUpdate }) {
  const [planYear, setPlanYear] = useState(2026);
  const QUARTERS = ["Q1","Q2","Q3","Q4"];

  const updExec = (oIdx,tIdx,f,v) => {
    const o=bow.outcomes[oIdx];
    const raw=(o.executionTargets[planYear]||[]).map(t=>typeof t==="string"?{text:t,completion:"Not Started",quarter:null,notes:""}:{...t,completion:migrateCompletion(t.completion),quarter:t.quarter||null,notes:t.notes||""});
    onUpdate(oIdx,{...o,executionTargets:{...o.executionTargets,[planYear]:raw.map((t,i)=>i!==tIdx?t:{...t,[f]:v})}});
  };
  const updNotes = (oIdx,v) => { const o=bow.outcomes[oIdx]; onUpdate(oIdx,{...o,notes:v}); };
  const updTodos = (oIdx,todos) => { const o=bow.outcomes[oIdx]; onUpdate(oIdx,{...o,planningTodos:{...(o.planningTodos||{}),[planYear]:todos}}); };

  if(!bow.outcomes.length) return <div style={{color:TEXT_SUB,fontSize:15,textAlign:"center",padding:40}}>No outcomes defined yet.</div>;

  const allT = bow.outcomes.flatMap(o=>(o.executionTargets[planYear]||[]).map(t=>typeof t==="string"?{completion:"Not Started"}:{...t,completion:migrateCompletion(t.completion)}));
  const byStatus = COMPLETION_ORDER.map(s=>({s,n:allT.filter(t=>t.completion===s).length})).filter(d=>d.n>0);

  return (
    <div>
      {/* Year selector + summary */}
      <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:12,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Planning Year</div>
          <div style={{display:"flex",gap:6}}>
            {YEARS.map(yr=>{
              const items=bow.outcomes.flatMap(o=>(o.executionTargets[yr]||[]));
              const hasData=items.length>0, allDone=hasData&&items.every(t=>(typeof t==="object"?migrateCompletion(t.completion):null)==="Complete");
              return <button key={yr} onClick={()=>setPlanYear(yr)} style={{padding:"5px 16px",fontSize:15,fontWeight:700,borderRadius:20,cursor:"pointer",border:"none",background:planYear===yr?ACCENT:BORDER+"88",color:planYear===yr?"#fff":TEXT_SUB,position:"relative",transition:"all .15s"}}>
                {yr}{(allDone||hasData)&&<span style={{position:"absolute",top:0,right:0,width:8,height:8,borderRadius:"50%",background:allDone?"#059669":YELLOW,border:"2px solid #fff"}}/>}
              </button>;
            })}
          </div>
        </div>
        {allT.length>0&&(
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:15,color:TEXT_SUB,fontWeight:600}}>{planYear}:</span>
            {byStatus.map(({s,n})=><span key={s} style={{fontSize:14,fontWeight:700,color:COMPLETION[s].color,background:COMPLETION[s].bg,border:"1px solid "+COMPLETION[s].color+"33",borderRadius:6,padding:"2px 10px"}}>{COMPLETION[s].icon} {n} {COMPLETION[s].label}</span>)}
          </div>
        )}
      </div>

      {bow.outcomes.map((o,oIdx)=>{
        const rollup=outcomeRollupStatus(o.impactIndicators), rs=STATUS[rollup];
        const raw=(o.executionTargets[planYear]||[]).map(t=>typeof t==="string"?{text:t,completion:"Not Started",quarter:null,notes:""}:{...t,completion:migrateCompletion(t.completion),quarter:t.quarter||null,notes:t.notes||""});
        const pct=raw.length?Math.round((raw.filter(t=>t.completion==="Complete").length/raw.length)*100):null;
        const todos = (o.planningTodos||{})[planYear] || {Q1:[],Q2:[],Q3:[],Q4:[]};
        return (
          <div key={o.id} style={{border:"1px solid "+BORDER,borderRadius:12,marginBottom:14,overflow:"hidden"}}>
            <div style={{background:SURFACE,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,borderBottom:"1px solid "+BORDER,borderLeft:"4px solid "+rs.color}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:TEXT_SUB,marginBottom:3}}>Outcome {o.number}</div>
                {o.title&&o.title.startsWith("[Placeholder]")
                  ? <div style={{fontSize:14,color:TEXT_MUTED,fontStyle:"italic"}}>Outcome description not yet loaded from database</div>
                  : <div style={{fontSize:15,fontWeight:700,lineHeight:1.4,color:TEXT}}>{o.title}</div>
                }
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                <Chip label={rs.label} color={rs.color} bg={rs.pill}/>
                {pct!==null&&<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:80,height:3,background:BORDER,borderRadius:3,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:rs.color,borderRadius:3}}/></div><span style={{fontSize:14,color:TEXT_SUB}}>{pct}%</span></div>}
              </div>
            </div>
            <div style={{padding:"16px 20px",background:SURFACE}}>
              <div style={{fontSize:14,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>Execution Targets — {planYear}</div>
              <GanttChart
                targets={raw}
                onMoveToQuarter={(text,quarter)=>{
                  const tIdx=raw.findIndex(t=>t.text===text);
                  if(tIdx>=0) updExec(oIdx,tIdx,"quarter",quarter);
                }}
                todoItems={todos}
                onUpdateTodos={updated=>updTodos(oIdx,updated)}/>
              <div style={{background:"#FFFDF5",borderRadius:8,padding:"14px 16px",border:"1px solid "+BORDER,marginTop:16}}>
                <div style={{fontSize:14,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Notes & Next Steps</div>
                <textarea value={o.notes||""} onChange={e=>updNotes(oIdx,e.target.value)} placeholder="Add notes, reflections, or next steps…"
                  style={{width:"100%",minHeight:100,border:"1px solid "+BORDER,borderRadius:7,padding:"10px 14px",fontSize:15,fontFamily:"inherit",color:TEXT,background:"#FFFDF5",resize:"vertical",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── OutcomeReportRow ──────────────────────────────────────────────────────────
function OutcomeReportRow({ o, targets, indicators, reportYear, pc }) {
  const [open, setOpen] = React.useState(false);
  const [execNarrative, setExecNarrative] = React.useState((o.reportNarratives||{}).execution||"");
  const [impactNarrative, setImpactNarrative] = React.useState((o.reportNarratives||{}).impact||"");

  const oRs = o.manualStatus&&STATUS[o.manualStatus] ? STATUS[o.manualStatus] : null;
  const statusIcon = c => c==="Complete"?"✓":c==="On Track"?"→":c==="Delayed"?"⚠":"○";
  const statusColor = c => c==="Complete"?COMPLETION["Complete"].color:c==="On Track"?COMPLETION["On Track"].color:c==="Delayed"?COMPLETION["Delayed"].color:"#94A3B8";

  // Rating scale positions (for visual alignment)
  const SCALE = ["Below Expectations","Approaching Expectations","Meets Expectations","Exceeds Expectations"];

  return (
    <div style={{borderRadius:10,border:"1px solid "+(open?pc.color:BORDER),overflow:"hidden",transition:"border-color .15s",boxShadow:open?"0 2px 12px rgba(10,37,64,0.08)":"0 1px 4px rgba(10,37,64,0.04)"}}>

      {/* ── Collapsed header / tab ─────────────────────────────────────────── */}
      <button onClick={()=>setOpen(v=>!v)}
        style={{width:"100%",padding:"0",border:"none",background:"none",cursor:"pointer",textAlign:"left",display:"block"}}>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"stretch",minHeight:60,background:open?"#FAFBFC":SURFACE}}>

          {/* Outcome number */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:52,background:open?pc.color:pc.color+"22",padding:"0 14px",flexShrink:0}}>
            <span style={{fontSize:14,fontWeight:800,color:open?"#fff":pc.color}}>{o.number}</span>
          </div>

          {/* Outcome title + rating on scale */}
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",justifyContent:"center",gap:6,borderLeft:"1px solid "+BORDER,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:TEXT,lineHeight:1.3}}>{o.shortTitle||o.title}</div>
            {/* Rating scale bar */}
            <div style={{display:"flex",alignItems:"center",gap:0}}>
              {SCALE.map((s,i)=>{
                const rs = STATUS[s];
                const isActive = o.manualStatus===s;
                return (
                  <div key={s} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{width:"100%",height:4,background:isActive?rs.color:BORDER,borderRadius:i===0?"3px 0 0 3px":i===SCALE.length-1?"0 3px 3px 0":"0",transition:"background .2s"}}/>
                    <div style={{fontSize:9,color:isActive?rs.color:BORDER,fontWeight:isActive?700:400,textAlign:"center",lineHeight:1.2,whiteSpace:"nowrap"}}>{s.replace(" Expectations","")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rating badge + chevron */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 16px",borderLeft:"1px solid "+BORDER,flexShrink:0}}>
            {oRs ? (
              <span style={{display:"inline-flex",alignItems:"center",gap:4,background:oRs.pill,border:"1px solid "+oRs.color+"44",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,color:oRs.color,whiteSpace:"nowrap"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:oRs.color,display:"inline-block"}}/>
                {oRs.label}
              </span>
            ) : (
              <span style={{fontSize:12,color:TEXT_SUB,whiteSpace:"nowrap"}}>Not rated</span>
            )}
            <span style={{fontSize:13,color:TEXT_SUB,opacity:0.5,flexShrink:0}}>{open?"▲":"▼"}</span>
          </div>
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────────────── */}
      {open&&(
        <div style={{borderTop:"1px solid "+BORDER}}>

          {/* Impact Indicators */}
          <div style={{padding:"18px 20px",borderBottom:"1px solid "+BORDER}}>
            <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:14}}>Impact Indicators</div>
            {indicators.length===0 ? (
              <div style={{fontSize:13,color:TEXT_SUB,opacity:0.6}}>No indicators defined</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14,marginBottom:14}}>
                {indicators.map((ind,ii)=>{
                  const {actuals,targets:tgts} = getIndData(ind);
                  const sc = STATUS[ind.manualStatus||autoSuggestStatus(ind)];
                  const yrIdx = YEARS.indexOf(reportYear);
                  const currentActual = actuals[yrIdx];
                  const currentTarget = tgts[yrIdx];
                  const hasData = actuals.some(v=>v!==null)||tgts.some(v=>v!==null);
                  const lineData = YEARS.map((yr,j)=>({year:String(yr).slice(2),Actual:actuals[j],Target:tgts[j]}));
                  return (
                    <div key={ind.id} style={{background:SURFACE,borderRadius:8,border:"1px solid "+BORDER,overflow:"hidden"}}>
                      <div style={{height:3,background:sc.color}}/>
                      <div style={{padding:"12px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:600,color:TEXT,lineHeight:1.4,flex:1}}>{ind.text}</div>
                          <span style={{display:"inline-flex",alignItems:"center",gap:3,background:sc.pill,borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700,color:sc.color,flexShrink:0}}><span style={{width:4,height:4,borderRadius:"50%",background:sc.color,display:"inline-block"}}/>{sc.label}</span>
                        </div>
                        <div style={{display:"flex",gap:12,marginBottom:10}}>
                          <div>
                            <div style={{fontSize:9,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.4,marginBottom:1}}>{reportYear} Actual</div>
                            <div style={{fontSize:20,fontWeight:800,color:currentActual!==null?sc.color:TEXT_SUB}}>{currentActual!==null?currentActual:"—"}</div>
                          </div>
                          <div style={{borderLeft:"1px solid "+BORDER,paddingLeft:12}}>
                            <div style={{fontSize:9,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.4,marginBottom:1}}>{reportYear} Target</div>
                            <div style={{fontSize:20,fontWeight:800,color:TEXT_SUB,opacity:0.5}}>{currentTarget!==null?currentTarget:"—"}</div>
                          </div>
                          {ind.baseline&&<div style={{borderLeft:"1px solid "+BORDER,paddingLeft:12}}>
                            <div style={{fontSize:9,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.4,marginBottom:1}}>Baseline</div>
                            <div style={{fontSize:20,fontWeight:800,color:TEXT_SUB,opacity:0.3}}>{ind.baseline}</div>
                          </div>}
                        </div>
                        {hasData ? (
                          <ResponsiveContainer width="100%" height={65}>
                            <LineChart data={lineData} margin={{top:2,right:4,bottom:0,left:-24}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
                              <XAxis dataKey="year" tick={{fontSize:8,fill:TEXT_SUB}}/>
                              <YAxis tick={{fontSize:8,fill:TEXT_SUB}}/>
                              <Tooltip contentStyle={{fontSize:10,borderRadius:6,border:"1px solid "+BORDER}} formatter={(v)=>v!==null?v:"—"}/>
                              <Line type="monotone" dataKey="Actual" stroke={sc.color} strokeWidth={2} dot={{r:2,fill:sc.color,strokeWidth:1,stroke:"#fff"}} connectNulls/>
                              <Line type="monotone" dataKey="Target" stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls/>
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",background:BG,borderRadius:5}}>
                            <span style={{fontSize:11,color:TEXT_SUB}}>No data yet</span>
                          </div>
                        )}
                        <DataMeta source={ind.source} lastUpdated={ind.lastUpdated} updateFreq={ind.updateFreq} style={{marginTop:4}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.6,marginBottom:5}}>Impact Narrative</div>
              <textarea value={impactNarrative} onChange={e=>setImpactNarrative(e.target.value)}
                placeholder="Describe what the indicator data shows about progress. What signals of impact are emerging?"
                style={{width:"100%",minHeight:72,border:"1px solid "+BORDER,borderRadius:7,padding:"8px 12px",fontSize:12,fontFamily:"inherit",color:TEXT,background:"#F0FDFA",resize:"vertical",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>

          {/* Execution Targets */}
          <div style={{padding:"18px 20px",background:SURFACE_2}}>
            <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>{reportYear} Execution Targets</div>
            {targets.length===0 ? (
              <div style={{fontSize:12,color:TEXT_SUB,opacity:0.6}}>No targets defined for {reportYear}</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {targets.map((t,ti)=>{
                  const icon = statusIcon(t.completion);
                  const color = statusColor(t.completion);
                  return (
                    <div key={ti} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",borderRadius:7,background:t.completion==="Complete"?"#F0FDF4":t.completion==="Delayed"?"#FEF2F2":SURFACE,border:"1px solid "+(t.completion==="Complete"?"#BBF7D0":t.completion==="Delayed"?"#FCA5A5":BORDER)}}>
                      <span style={{fontSize:12,color,fontWeight:700,flexShrink:0,marginTop:1,width:14,textAlign:"center"}}>{icon}</span>
                      <span style={{fontSize:12,color:TEXT,lineHeight:1.5,flex:1}}>{t.text}</span>
                      {t.quarter&&<span style={{fontSize:10,fontWeight:700,color:TEXT_SUB,background:"#fff",borderRadius:4,padding:"1px 5px",flexShrink:0,border:"1px solid "+BORDER}}>{t.quarter}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.6,marginBottom:5}}>Execution Narrative</div>
              <textarea value={execNarrative} onChange={e=>setExecNarrative(e.target.value)}
                placeholder="Summarize execution progress and key activities this year…"
                style={{width:"100%",minHeight:72,border:"1px solid "+BORDER,borderRadius:7,padding:"8px 12px",fontSize:12,fontFamily:"inherit",color:TEXT,background:"#FFFDF5",resize:"vertical",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── BowReportingView ──────────────────────────────────────────────────────────
function BowReportingView({ bow, portColor }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
  const [reportYear, setReportYear] = useState(2026);

  const yearRatings = bow.yearRatings || {};
  const execRs = yearRatings[reportYear]?.execution ? STATUS[yearRatings[reportYear].execution] : null;
  const impactRs = yearRatings[reportYear]?.impact ? STATUS[yearRatings[reportYear].impact] : null;

  const hasAnyIndData = bow.outcomes.some(o=>
    o.impactIndicators.some(ind=>{
      const {actuals,targets}=getIndData(ind);
      return actuals.some(v=>v!==null)||targets.some(v=>v!==null);
    })
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── Notice banner ── */}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,background:"#FEF5E7",border:"1px solid #FDE68A",borderRadius:10,padding:"12px 16px"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:2}}>Reporting View — In Development</div>
          <div style={{fontSize:13,color:"#92400E",lineHeight:1.55,opacity:0.85}}>
            This view will continue to be refined based on expectations and timing of leadership share outs and/or Portfolio Reviews.
          </div>
        </div>
      </div>

      {/* ── Report Header ── */}
      <div style={{background:BRAND,borderRadius:12,padding:"22px 28px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:24}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,opacity:0.5,marginBottom:8}}>Body of Work Report</div>
          <div style={{fontSize:21,fontWeight:800,letterSpacing:-0.3,marginBottom:6}}>{bow.name}</div>
          {bow.description&&<div style={{fontSize:13,opacity:0.65,lineHeight:1.65,maxWidth:600}}>{bow.description.split("\n\n")[0].slice(0,220)}{bow.description.length>220?"…":""}</div>}
        </div>
        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,opacity:0.5,marginBottom:2}}>Reporting Year</div>
          <div style={{display:"flex",gap:5}}>
            {YEARS.map(yr=>(
              <button key={yr} onClick={()=>setReportYear(yr)}
                style={{padding:"5px 13px",fontSize:13,fontWeight:700,borderRadius:20,cursor:"pointer",border:"1.5px solid "+(reportYear===yr?"#fff":"rgba(255,255,255,0.2)"),background:reportYear===yr?"#fff":"transparent",color:reportYear===yr?BRAND:"rgba(255,255,255,0.7)",transition:"all .15s"}}>
                {yr}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            {[{label:"Execution",rs:execRs},{label:"Impact",rs:impactRs}].map(({label,rs})=>(
              <div key={label} style={{textAlign:"center"}}>
                <div style={{fontSize:10,opacity:0.5,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
                {rs ? <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.12)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,color:"#fff"}}><span style={{width:6,height:6,borderRadius:"50%",background:rs.color,display:"inline-block"}}/>{rs.label}</span>
                  : <span style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>Not rated</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Year-Over-Year Rating Trend ── */}
      {YEARS.some(yr=>yearRatings[yr]?.execution||yearRatings[yr]?.impact)&&(
        <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"18px 22px"}}>
          <div style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:14}}>Year-Over-Year Rating Trend</div>
          <div style={{display:"flex",gap:0}}>
            {YEARS.map((yr,yi)=>{
              const er = yearRatings[yr]?.execution ? STATUS[yearRatings[yr].execution] : null;
              const ir = yearRatings[yr]?.impact    ? STATUS[yearRatings[yr].impact]    : null;
              const isCurrent = yr===reportYear;
              return (
                <div key={yr} style={{flex:1,borderLeft:yi>0?"1px solid "+BORDER:"none",padding:"0 16px",opacity:yr>reportYear?0.3:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:isCurrent?pc.color:TEXT_SUB,marginBottom:10,textAlign:"center"}}>
                    {yr}{isCurrent&&<span style={{marginLeft:4,fontSize:9,fontWeight:700,background:pc.color,color:"#fff",borderRadius:3,padding:"1px 5px"}}>NOW</span>}
                  </div>
                  {[{label:"Exec",rs:er},{label:"Impact",rs:ir}].map(({label,rs})=>(
                    <div key={label} style={{marginBottom:6}}>
                      <div style={{fontSize:9,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{label}</div>
                      {rs ? <span style={{display:"inline-flex",alignItems:"center",gap:3,background:rs.pill,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:rs.color}}><span style={{width:4,height:4,borderRadius:"50%",background:rs.color,display:"inline-block"}}/>{rs.label}</span>
                        : <span style={{fontSize:10,color:TEXT_SUB,opacity:0.4}}>—</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Outcome Panels ── */}
      <div>
        <div style={{fontSize:14,fontWeight:700,color:TEXT,marginBottom:4}}>Outcomes</div>
        <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.6,marginBottom:14}}>Click an outcome to expand impact indicators and execution targets for {reportYear}.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {bow.outcomes.map((o,oi)=>{
            const indicators = o.impactIndicators.filter(ind=>ind.text);
            const targets = (o.executionTargets[reportYear]||[]).map(t=>typeof t==="string"?{text:t,completion:"Not Started"}:{...t,completion:migrateCompletion(t.completion)});
            return <OutcomeReportRow key={o.id} o={o} targets={targets} indicators={indicators} reportYear={reportYear} pc={pc}/>;
          })}
        </div>
      </div>

    </div>
  );
}


// ── GoalProgressCard ──────────────────────────────────────────────────────────
function GoalProgressCard({ g, isPending, cardIdx }) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.round((g.current2026/g.goal2030)*100);
  return (
    <div
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{borderRadius:10,border:"1px solid "+BORDER,overflow:"visible",boxShadow:hovered?"0 4px 16px rgba(10,37,64,0.12)":"0 1px 4px rgba(10,37,64,0.06)",position:"relative",transition:"box-shadow .15s",background:SURFACE}}>
      <div style={{padding:"10px 12px"}}>
        <div style={{marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:TEXT,lineHeight:1.3}}>{g.title}</span>
        </div>
        <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.5,marginBottom:10}}>{g.target}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
          <span style={{fontSize:12,color:TEXT_SUB}}>{g.metric}</span>
          <span style={{fontSize:15,fontWeight:800,color:BRAND}}>{g.goal2030}{g.unit}</span>
        </div>
        <div style={{height:8,background:BORDER,borderRadius:4,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:BRAND,borderRadius:4,transition:"width .4s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:11,color:TEXT_SUB}}>0</span>
          <span style={{fontSize:11,color:TEXT_SUB,fontWeight:600}}>2030 target</span>
        </div>
        {isPending&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,color:YELLOW,fontWeight:600,marginTop:4}}>
            Portfolio targets pending
          </div>
        )}
      </div>
      {hovered&&(
        <div style={{position:"absolute",...(cardIdx===0?{top:"calc(100% + 8px)"}:{bottom:"calc(100% + 8px)"}),left:0,right:0,background:BRAND,borderRadius:10,padding:"12px 14px",boxShadow:"0 8px 24px rgba(10,37,64,0.18)",zIndex:20,pointerEvents:"none"}}>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:0.6,marginBottom:6}}>{g.title} — 2026 Progress</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:2}}>Current (2026)</div>
              <div style={{fontSize:21,fontWeight:800,color:"#fff"}}>{g.current2026}{g.unit}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:2}}>2030 Target</div>
              <div style={{fontSize:21,fontWeight:800,color:"rgba(255,255,255,0.7)"}}>{g.goal2030}{g.unit}</div>
            </div>
          </div>
          <div style={{height:6,background:"rgba(255,255,255,0.15)",borderRadius:3,overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:"#fff",borderRadius:3}}/>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:4,textAlign:"center"}}>{pct}% of 2030 target · Baseline: {g.earliest}</div>
        </div>
      )}
    </div>
  );
}

// ── BowDecisionsView ──────────────────────────────────────────────────────────
// ── BowInvestmentsView ────────────────────────────────────────────────────────
const INVEST_STATUS_OPTS = [
  { id:"",           label:"No Status",     color:"#94A3B8", bg:"#F8FAFC" },
  { id:"active",     label:"Active",        color:"#059669", bg:"#ECFDF5" },
  { id:"monitoring", label:"Monitoring",    color:"#D97706", bg:"#FEF5E7" },
  { id:"at-risk",    label:"At Risk",       color:"#DC2626", bg:"#FEF2F2" },
  { id:"complete",   label:"Complete",      color:"#1D4ED8", bg:"#EFF6FF" },
  { id:"paused",     label:"Paused",        color:"#3086AB", bg:"#EBF4F9" },
];

const PLACEHOLDER_INVESTMENTS = {};

function BowInvestmentsView({ bow, portColor, onUpdate }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
 
  // ── State ──────────────────────────────────────────────────────────────────
  const [investments, setInvestments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [editingId, setEditingId]       = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy]             = useState("grantee");
  const [search, setSearch]             = useState("");
  const [savingId, setSavingId]         = useState(null);
 
  // ── Load investments from INVEST on mount / bow change ────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadBowInvestments(bow.id).then(rows => {
      if (!cancelled) {
        setInvestments(rows);
        setLoading(false);
      }
    }).catch(err => {
      if (!cancelled) {
        setError("Could not load investment data.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [bow.id]);
 
  // ── Save internal notes overlay ────────────────────────────────────────────
  const saveNotes = async (invId, notes) => {
    setSavingId(invId);
    try {
      await apiFetch(`/api/investments/${invId}/overlay`, {
        method: "POST",
        body: JSON.stringify({ internal_notes: notes, updated_by: "dashboard" }),
      });
      setInvestments(prev => prev.map(inv =>
        inv.id === invId ? { ...inv, internal_notes: notes } : inv
      ));
    } catch (err) {
      console.warn("Failed to save overlay:", err);
    } finally {
      setSavingId(null);
    }
  };
 
  // ── Derived values ─────────────────────────────────────────────────────────
  const fmtM = (n) => {
    const num = parseFloat(n) || 0;
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000)    return `$${(num/1000).toFixed(0)}K`;
    return `$${num}`;
  };
 
  const toNum = (v) => parseFloat(String(v || "0").replace(/[^0-9.]/g, "")) || 0;
 
  const filtered = investments
    .filter(inv => !filterStatus || inv.status === filterStatus)
    .filter(inv => !search || [inv.grantee, inv.initiative, inv.internal_notes || ""]
      .some(s => s.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "amount") return toNum(b.amount) - toNum(a.amount);
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      return (a[sortBy] || "").localeCompare(b[sortBy] || "");
    });
 
  const totalAmt   = investments.reduce((s, inv) => s + toNum(inv.amount), 0);
  const totalOutst = investments.reduce((s, inv) => s + toNum(inv.outstanding), 0);
 
  // Budget bar buckets — derived from INVEST Status field
  const INVEST_STATUSES = [
    { key: "Active",      label: "Active",      color: "#10B981" },
    { key: "In Process",  label: "In Process",  color: "#60A5FA" },
    { key: "Closed",      label: "Closed",      color: "#9CA3AF" },
    { key: "Cancelled",   label: "Cancelled",   color: "#F87171" },
  ];
  const bucketAmts = INVEST_STATUSES.map(b => ({
    ...b,
    amt: investments
      .filter(inv => inv.status === b.key)
      .reduce((s, inv) => s + toNum(inv.amount), 0),
  }));
 
  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 200, gap: 12, color: TEXT_SUB, fontSize: 14 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${pc.color}`,
        borderTopColor: "transparent", borderRadius: "50%",
        animation: "spin 0.7s linear infinite" }} />
      Loading investments from INVEST…
    </div>
  );
 
  if (error) return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
      padding: "20px 24px", color: "#B91C1C", fontSize: 14 }}>
      {error}
    </div>
  );
 
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 
      {/* Header */}
      <div style={{ background: BRAND, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", display: "flex",
          justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>
              Investment Portfolio
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff",
              letterSpacing: -0.3, marginBottom: 4 }}>
              {bow.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)",
              lineHeight: 1.5, maxWidth: 560 }}>
              Investment data sourced live from INVEST. Internal notes are stored
              in this dashboard only — no separate spreadsheets needed.
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Investments
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                {investments.length}
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.12)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Total Value
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                {fmtM(totalAmt)}
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.12)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Outstanding
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#F85C02", lineHeight: 1 }}>
                {fmtM(totalOutst)}
              </div>
            </div>
          </div>
        </div>
 
        {/* Budget bar by INVEST status */}
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase", letterSpacing: 1.2 }}>
              Portfolio by Investment Status
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              {fmtM(totalAmt)} total
            </div>
          </div>
          {totalAmt > 0 ? (
            <div style={{ height: 10, borderRadius: 5, overflow: "hidden",
              display: "flex", background: "rgba(255,255,255,0.1)" }}>
              {bucketAmts.map(b => b.amt > 0 && (
                <div key={b.key}
                  title={`${b.label}: ${fmtM(b.amt)}`}
                  style={{ width: (b.amt / totalAmt * 100) + "%", background: b.color,
                    transition: "width .4s", flexShrink: 0 }} />
              ))}
            </div>
          ) : (
            <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.1)" }} />
          )}
          <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
            {bucketAmts.map(b => (
              <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color,
                  flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700,
                  color: b.amt > 0 ? "#fff" : "rgba(255,255,255,0.3)" }}>
                  {b.amt > 0 ? fmtM(b.amt) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* Source notice */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EFF6FF",
        borderRadius: 8, border: "1px solid #BFDBFE", padding: "10px 16px" }}>
        <div style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.5 }}>
          <strong>INVEST is the source of truth</strong> for grantee, amount, status, and dates.
          Fields marked <span style={{ background: "#DBEAFE", borderRadius: 3,
            padding: "1px 5px", fontWeight: 700 }}>Internal</span> are stored only in this dashboard.
        </div>
      </div>
 
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search grantee, initiative, notes…"
            style={{ width: "100%", border: "1px solid " + BORDER, borderRadius: 8,
              padding: "7px 12px 7px 32px", fontSize: 13, fontFamily: "inherit",
              outline: "none", color: TEXT, boxSizing: "border-box", background: SURFACE }} />
          <span style={{ position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", fontSize: 13, opacity: 0.4 }}>&#x2315;</span>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "7px 10px",
            fontSize: 13, fontFamily: "inherit", outline: "none", color: TEXT,
            background: SURFACE, cursor: "pointer" }}>
          <option value="">All Statuses</option>
          {INVEST_STATUSES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "7px 10px",
            fontSize: 13, fontFamily: "inherit", outline: "none", color: TEXT,
            background: SURFACE, cursor: "pointer" }}>
          <option value="grantee">Sort: Grantee A–Z</option>
          <option value="amount">Sort: Amount ↓</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>
 
      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ background: SURFACE, border: "1px solid " + BORDER,
          borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>💼</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
            {investments.length === 0
              ? "No investments linked in INVEST"
              : "No results match your filters"}
          </div>
          <div style={{ fontSize: 13, color: TEXT_SUB }}>
            {investments.length === 0
              ? "Investments will appear here once they are linked to this BOW in INVEST."
              : "Try adjusting your search or status filter."}
          </div>
        </div>
      ) : (
        <div style={{ background: SURFACE, borderRadius: 12, border: "1px solid " + BORDER,
          overflow: "hidden", boxShadow: "0 1px 6px rgba(10,37,64,0.05)" }}>
 
          {/* Column headers */}
          <div style={{ display: "grid",
            gridTemplateColumns: "2fr 2.5fr 110px 180px 130px 110px 2fr",
            background: "#F8FAFC", borderBottom: "2px solid " + BORDER }}>
            {["Grantee", "Investment Title", "Amount", "Teams", "Outstanding", "Status", "Notes"].map((h, i) => (
              <div key={i} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700,
                color: TEXT_SUB, textTransform: "uppercase", letterSpacing: 0.6,
                borderRight: i < 6 ? "1px solid " + BORDER : "none" }}>
                {h}
              </div>
            ))}
          </div>
 
          {filtered.map((inv, idx) => {
            const isEditing = editingId === inv.id;
            const isSaving  = savingId === inv.id;
            const rowBg     = idx % 2 === 0 ? SURFACE : "#FAFBFC";
            const statusColor = inv.status === "Active" ? "#10B981"
              : inv.status === "In Process" ? "#60A5FA"
              : inv.status === "Closed"     ? "#9CA3AF"
              : inv.status === "Cancelled"  ? "#F87171"
              : TEXT_SUB;
 
            return (
              <div key={inv.id}
                style={{ borderBottom: idx < filtered.length - 1 ? "1px solid " + BORDER : "none" }}>
 
                <div style={{ display: "grid",
                  gridTemplateColumns: "2fr 2.5fr 110px 180px 130px 110px 2fr",
                  background: isEditing ? "#F0F7FF" : rowBg, transition: "background .15s" }}>
 
                  {/* Grantee */}
                  <div style={{ padding: "13px 14px", borderRight: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                      {inv.grantee || "—"}
                    </div>
                    {inv.owner && (
                      <div style={{ fontSize: 11, color: TEXT_SUB, marginTop: 3 }}>
                        👤 {inv.owner}
                      </div>
                    )}
                  </div>
 
                  {/* Initiative */}
                  <div style={{ padding: "13px 14px", borderRight: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.4 }}>
                      {inv.initiative}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SUB, marginTop: 2 }}>{inv.type}</div>
                    {inv.stage && (
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                        {inv.stage}
                      </div>
                    )}
                  </div>
 
                  {/* Amount */}
                  <div style={{ padding: "13px 14px", borderRight: "1px solid " + BORDER,
                    display: "flex", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                      {inv.amount ? fmtM(toNum(inv.amount)) : "—"}
                    </div>
                  </div>

                  {/* Teams */}
                  <div style={{ padding: "10px 14px", borderRight: "1px solid " + BORDER,
                    display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                    {inv.managingTeam && (() => { const c = teamColor(inv.managingTeam); return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 20, background: c.bg, color: c.color,
                        whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                        {inv.managingTeam}
                      </span>
                    ); })()}
                    {inv.supportingTeam && (() => { const c = teamColor(inv.supportingTeam); return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 20, background: c.bg, color: c.color,
                        whiteSpace: "nowrap", alignSelf: "flex-start", opacity: 0.8 }}>
                        {inv.supportingTeam}
                      </span>
                    ); })()}
                    {!inv.managingTeam && !inv.supportingTeam && (
                      <span style={{ fontSize: 12, color: TEXT_MUTED }}>—</span>
                    )}
                  </div>

                  {/* Outstanding */}
                  <div style={{ padding: "13px 14px", borderRight: "1px solid " + BORDER,
                    display: "flex", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#D97706" }}>
                      {inv.outstanding ? fmtM(toNum(inv.outstanding)) : "—"}
                    </div>
                  </div>
 
                  {/* Status — from INVEST, read-only */}
                  <div style={{ padding: "10px 14px", borderRight: "1px solid " + BORDER,
                    display: "flex", alignItems: "center" }}>
                    {inv.status ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor,
                        background: statusColor + "15", borderRadius: 5,
                        padding: "3px 8px", border: "1px solid " + statusColor + "30" }}>
                        {inv.status}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: TEXT_MUTED }}>—</span>
                    )}
                  </div>
 
                  {/* Notes — inline, always visible, click ✎ to edit */}
                  <div style={{ padding: "10px 14px", display: "flex",
                    flexDirection: "column", gap: 6 }}>
                    {isEditing ? (
                      <>
                        <InvestmentNotesEditor
                          value={inv.internal_notes || ""}
                          onSave={notes => saveNotes(inv.id, notes)}
                          isSaving={isSaving}
                        />
                        <button onClick={() => setEditingId(null)}
                          style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", borderRadius: 5, padding: "3px 8px",
                            border: "1px solid " + pc.color, background: pc.color,
                            color: "#fff", whiteSpace: "nowrap" }}>
                          Done
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5,
                          color: inv.internal_notes ? TEXT : TEXT_MUTED,
                          fontStyle: inv.internal_notes ? "normal" : "italic" }}>
                          {inv.internal_notes || "Add note…"}
                        </div>
                        <button onClick={() => setEditingId(inv.id)}
                          style={{ fontSize: 11, cursor: "pointer", flexShrink: 0,
                            border: "1px solid " + BORDER, borderRadius: 5,
                            padding: "2px 7px", background: BG, color: TEXT_SUB }}>
                          ✎
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* INVEST metadata panel — shown while editing notes */}
                {isEditing && (
                  <div style={{ background: "#F0F7FF", borderTop: "1px solid #BFDBFE",
                    padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: "10px 28px" }}>
                    {[
                      ["Investment Owner", inv.owner],
                      ["Coordinator",      inv.coordinator],
                      ["Start Date",       inv.startDate],
                      ["End Date",         inv.endDate],
                      ["Workflow Step",    inv.stage],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_SUB,
                          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 13, color: TEXT }}>{val}</div>
                      </div>
                    ))}
                    {inv.strategicFit && (
                      <div style={{ width: "100%" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_SUB,
                          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                          Strategic Fit
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
                          {inv.strategicFit}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
 
// ── Investment notes editor — save on blur ────────────────────────────────────
// Small sub-component to handle the notes textarea with save-on-blur pattern.
function InvestmentNotesEditor({ value, onSave, isSaving }) {
  const [draft, setDraft] = useState(value);
 
  useEffect(() => { setDraft(value); }, [value]);
 
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        placeholder="Operational notes, context, or updates not captured in INVEST…"
        style={{ width: "100%", minHeight: 90, border: "1px solid #BFDBFE",
          borderRadius: 7, padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
          color: TEXT, background: SURFACE, resize: "vertical",
          lineHeight: 1.65, boxSizing: "border-box", outline: "none" }}
      />
      {isSaving && (
        <div style={{ position: "absolute", bottom: 8, right: 10,
          fontSize: 11, color: "#60A5FA" }}>
          Saving…
        </div>
      )}
    </div>
  );
}
 function DecisionEvidenceAssessment({ decision, bow, portColor }) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const pc = portColor || { color: ACCENT };

  const generate = () => {
    if (open && assessment) { setOpen(false); return; }
    setOpen(true);
    if (assessment) return; // already generated
    setLoading(true); setError(null);

    const prompt = `You are an analytical assistant supporting a philanthropic strategy team at the Gates Foundation. 
    
A key decision is coming up for a Body of Work called "${bow.name}". Here is the decision context:

Decision: ${decision.question}
Timing: ${decision.timing}
Status: ${decision.status}
Signals & Evidence recorded so far: ${decision.signals || "None recorded yet"}

Body of Work description: ${bow.description?.slice(0, 400) || "Not provided"}

Outcomes and indicators:
${bow.outcomes.map(o => `- ${o.shortTitle}: ${o.title?.slice(0,150)}`).join("\n")}

Based on this context, provide a brief evidence assessment structured as:
1. What the available evidence suggests (2-3 sentences)
2. Key signals to watch before this decision (2-3 bullet points)
3. Evidence gaps that could strengthen the decision (2-3 bullet points)

Be specific, grounded, and direct. Do not recommend what decision to make — only assess the state of evidence.`;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })
    .then(r => r.json())
    .then(d => {
      const text = d.content?.find(b => b.type === "text")?.text;
      if (text) setAssessment(text);
      else setError("No assessment returned.");
    })
    .catch(() => setError("Unable to connect to AI service."))
    .finally(() => setLoading(false));
  };

  return (
    <div style={{borderTop:"1px solid "+BORDER}}>
      {/* Trigger button */}
      <div style={{padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",background:SURFACE_2}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="#F59E0B" opacity="0.9"/>
            <circle cx="13" cy="3" r="1.2" fill="#F59E0B" opacity="0.7"/>
          </svg>
          <span style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.6}}>AI Evidence Assessment</span>
          <span style={{fontSize:10,fontWeight:700,color:YELLOW,background:"rgba(245,158,11,0.12)",borderRadius:4,padding:"1px 6px",border:"1px solid rgba(245,158,11,0.3)"}}>Powered by Claude</span>
        </div>
        <button onClick={generate}
          style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:7,
            border:"1px solid "+(open?pc.color:BORDER),
            background:open?pc.color+"11":SURFACE,
            color:open?pc.color:TEXT_SUB,
            fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
          {loading ? "Generating…" : open ? "✕ Close" : "Generate Assessment"}
        </button>
      </div>

      {/* Assessment panel */}
      {open && (
        <div style={{padding:"16px 22px 20px",background:SURFACE,animation:"fadeSlideIn .18s ease"}}>
          {loading && (
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
              <div style={{width:16,height:16,border:"2px solid "+ACCENT_MID,borderTopColor:ACCENT,borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
              <span style={{fontSize:13,color:TEXT_SUB}}>Assessing available evidence…</span>
            </div>
          )}
          {error && <div style={{fontSize:13,color:"#DC2626"}}>{error}</div>}
          {assessment && (
            <div style={{fontSize:13,color:TEXT,lineHeight:1.75,whiteSpace:"pre-wrap"}}>
              {assessment}
            </div>
          )}
          {assessment && (
            <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+BORDER,fontSize:11,color:TEXT_SUB,opacity:0.65}}>
              Assessment is generated from current decision context and BOW data. Refresh for an updated analysis as evidence evolves.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BowDecisionsView({ bow, portColor, onUpdate }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
  const decisions = bow.decisions || [];

  const STATUS_OPTS = [
    { id:"upcoming",  label:"Upcoming",    color:"#6B7A8D", bg:"#F1F5F9" },
    { id:"active",    label:"Active",      color:"#D97706", bg:"#FEF5E7" },
    { id:"made",      label:"Decision Made", color:"#059669", bg:"#ECFDF5" },
  ];

  const updateDecision = (dId, field, value) => {
    onUpdate({...bow, decisions: decisions.map(d=>d.id===dId ? {...d,[field]:value} : d)});
  };

  if (decisions.length === 0) {
    return (
      <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:12,padding:"48px",textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>🔑</div>
        <div style={{fontSize:16,fontWeight:700,color:TEXT,marginBottom:6}}>No Key Decisions defined</div>
        <div style={{fontSize:14,color:TEXT_SUB}}>Key decisions will appear here when added to this BOW.</div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"18px 22px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Key Decisions</div>
          <div style={{fontSize:17,fontWeight:700,color:TEXT,marginBottom:6}}>{bow.name}</div>
          <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.6,maxWidth:700}}>At key points over the life of this BOW, what decisions will need to be made — and what signals or evidence will inform those calls?</div>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#FEF5E7",borderRadius:8,padding:"6px 14px",border:"1px solid #FDE68A",flexShrink:0}}>
          <span style={{fontSize:14}}>🔑</span>
          <span style={{fontSize:13,fontWeight:700,color:"#92400E"}}>{decisions.length} decision{decisions.length!==1?"s":""}</span>
        </div>
      </div>

      {/* Decision cards */}
      {decisions.map((d,i)=>{
        const st = STATUS_OPTS.find(s=>s.id===d.status) || STATUS_OPTS[0];
        return (
          <div key={d.id} style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,overflow:"hidden",boxShadow:"0 1px 6px rgba(10,37,64,0.05)"}}>
            {/* Card header */}
            <div style={{padding:"16px 22px",borderBottom:"1px solid "+BORDER,borderLeft:"4px solid "+pc.color,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8}}>Decision {i+1}</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"#EFF6FF",borderRadius:5,padding:"2px 8px",border:"1px solid #BFDBFE",fontSize:12,fontWeight:700,color:"#1D4ED8"}}>
                    ⏱ {d.timing}
                  </span>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:TEXT,lineHeight:1.5}}>{d.question}</div>
              </div>
              {/* Status selector */}
              <div style={{flexShrink:0}}>
                <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6,textAlign:"right"}}>Status</div>
                <div style={{display:"flex",gap:4}}>
                  {STATUS_OPTS.map(s=>(
                    <button key={s.id} onClick={()=>updateDecision(d.id,"status",s.id)}
                      style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid "+(d.status===s.id?s.color:BORDER),background:d.status===s.id?s.bg:SURFACE,color:d.status===s.id?s.color:TEXT_SUB,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Signals & Evidence */}
            <div style={{padding:"18px 22px"}}>
              <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>
                Signals & Evidence that will inform this decision
              </div>
              <textarea
                value={d.signals||""}
                onChange={e=>updateDecision(d.id,"signals",e.target.value)}
                placeholder="What data, findings, or milestones will tell us what we need to know to make this call? Add signals as they emerge…"
                style={{width:"100%",minHeight:100,border:"1px solid "+BORDER,borderRadius:8,padding:"12px 14px",fontSize:14,fontFamily:"inherit",color:TEXT,background:BG,resize:"vertical",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}
              />
            </div>

            {/* Decision outcome — shown when status is "made" */}
            {d.status==="made"&&(
              <div style={{padding:"0 22px 18px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>
                  ✓ Decision Outcome
                </div>
                <textarea
                  value={d.outcome||""}
                  onChange={e=>updateDecision(d.id,"outcome",e.target.value)}
                  placeholder="Record the decision that was made and the key rationale…"
                  style={{width:"100%",minHeight:80,border:"1px solid #BBF7D0",borderRadius:8,padding:"12px 14px",fontSize:14,fontFamily:"inherit",color:TEXT,background:"#F0FDF4",resize:"vertical",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}
                />
              </div>
            )}

            {/* AI Evidence Assessment */}
            <DecisionEvidenceAssessment decision={d} bow={bow} portColor={pc}/>
          </div>
        );
      })}
    </div>
  );
}


// ── ActivitiesSidebar ─────────────────────────────────────────────────────────
function ActivitiesSidebar({ activities, portColor }) {
  const [open, setOpen] = useState(false);
  const pc = portColor || { color: ACCENT };
  return (
    <div style={{borderRight:"1px solid "+BORDER,background:"#FAFBFC",display:"flex",flexDirection:"column",transition:"width .2s",width:open?240:72,overflow:"hidden",flexShrink:0,cursor:"pointer"}}
      onClick={()=>setOpen(v=>!v)}>
      <div style={{padding:"12px 8px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderBottom:"1px solid "+BORDER,background:"#F3F4F6"}}>
        <span style={{fontSize:10,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>Activities</span>
        <span style={{fontSize:11,color:pc.color}}>{open?"‹":"›"}</span>
      </div>
      {!open&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 0"}}>
          {activities.map((_,i)=>(
            <span key={i} style={{width:10,height:10,background:pc.color+"44",borderRadius:"50%",border:"1px solid "+pc.color+"66",display:"inline-block"}}/>
          ))}
        </div>
      )}
      {open&&(
        <div style={{padding:"14px 16px"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {activities.map((a,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{background:pc.color,color:"#fff",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0,marginTop:2}}>{i+1}</span>
                <span style={{fontSize:13,color:TEXT_SUB,lineHeight:1.45,fontWeight:500}}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── GoalsSidebar ──────────────────────────────────────────────────────────────
function GoalsSidebar({ goals, portId, portColor }) {
  const [open, setOpen] = useState(false);
  const pc = portColor || { color: ACCENT };
  return (
    <div style={{borderLeft:"1px solid "+BORDER,background:SURFACE,display:"flex",flexDirection:"column",transition:"width .2s",width:open?260:72,overflow:"hidden",flexShrink:0,cursor:"pointer"}}
      onClick={()=>setOpen(v=>!v)}>
      <div style={{padding:"12px 8px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderBottom:"1px solid "+BORDER,background:"#F3F4F6"}}>
        <span style={{fontSize:10,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap"}}>2030 Goals</span>
        <span style={{fontSize:11,color:pc.color}}>{open?"›":"‹"}</span>
      </div>
      {!open&&(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 0"}}>
          {goals.map((_,i)=>(
            <span key={i} style={{width:10,height:10,background:BRAND+"22",borderRadius:"50%",border:"1px solid "+BRAND+"44",display:"inline-block"}}/>
          ))}
          {goals.length===0&&<span style={{width:10,height:10,background:BORDER,borderRadius:"50%",display:"inline-block"}}/>}
        </div>
      )}
      {open&&(
        <div style={{padding:"18px 16px",minWidth:244}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:14}}>2030 Strategy Goals</div>
          {goals.length===0 ? (
            <div style={{fontSize:12,color:TEXT_SUB}}>No direct linkage</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {goals.map(gNum=>{
                const g=STRATEGY_GOALS.find(sg=>sg.number===gNum);
                if(!g) return null;
                const isPending=(GOAL_TARGETS_PENDING[portId]||[]).includes(gNum);
                return <GoalProgressCard key={gNum} g={g} isPending={isPending}/>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── PortfolioGoalsStrip ───────────────────────────────────────────────────────
function PortfolioGoalsStrip({ goals, portId, portColor, ratings, onUpdateRatings, goalRatings, onNavigateToGoal }) {
  const [hovered, setHovered] = useState(null);
  const pc = portColor || { color: ACCENT };
  const isPending = (GOAL_TARGETS_PENDING[portId]||[]);

  if (!goals.length) return null;

  const goalData = goals.map(n => STRATEGY_GOALS.find(g => g.number === n)).filter(Boolean);

  return (
    <div style={{borderBottom:"1px solid "+BORDER}}>
      {/* Intro bridge */}
      <div style={{padding:"18px 24px 0",background:SURFACE}}>
        <div style={{borderTop:"1px solid "+BORDER,paddingTop:18,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:3,height:32,borderRadius:2,background:pc.color,flexShrink:0}}/>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>2030 Strategy Goals</div>
            <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.5}}>
              This portfolio contributes toward a subset of our 2030 Data & AI Strategy Goals. Click any goal to explore the full detail.
            </div>
          </div>
        </div>
      </div>

      {/* Goal cards */}
      <div style={{padding:"16px 24px 20px",background:SURFACE}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${goalData.length}, 1fr)`,gap:12}}>
          {goalData.map((g, i) => {
            const pct = Math.round((g.current2026 / g.goal2030) * 100);
            const pending = isPending.includes(g.number);
            const isHov = hovered === g.number;

            return (
              <div key={g.id} style={{position:"relative"}}
                onMouseEnter={()=>setHovered(g.number)}
                onMouseLeave={()=>setHovered(null)}>
                <div
                  onClick={()=>onNavigateToGoal&&onNavigateToGoal(g.number)}
                  style={{
                    borderRadius:10,
                    border:"1.5px solid "+(isHov ? g.color+"88" : BORDER),
                    background: isHov ? g.color+"06" : BG,
                    padding:"14px 16px",
                    transition:"all .2s",
                    boxShadow: isHov ? "0 2px 10px rgba(10,37,64,0.07)" : "none",
                    cursor:onNavigateToGoal?"pointer":"default",
                  }}>
                  {/* Goal number badge + title */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.5,flex:1}}>
                      {g.title}
                    </span>
                    {onNavigateToGoal&&<span style={{fontSize:11,color:TEXT_MUTED,opacity:0.6,flexShrink:0}}>↗</span>}
                  </div>
                  {/* Full target text — always visible */}
                  <div style={{fontSize:13,fontWeight:600,color:isHov?TEXT:TEXT_SUB,lineHeight:1.45,marginBottom:10,transition:"color .2s"}}>
                    {g.target}
                  </div>

                  {/* Progress bar — always visible, fills on hover or expand */}
                  <div style={{marginBottom:6}}>
                    <div style={{height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                      <div style={{
                        width: pct+"%",
                        height:"100%",
                        background:`linear-gradient(90deg, ${g.color}88, ${g.color})`,
                        borderRadius:3,
                        transition:"width .6s cubic-bezier(.4,0,.2,1)",
                      }}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                      <span style={{fontSize:10,color:TEXT_SUB}}>0</span>
                      <span style={{fontSize:10,fontWeight:700,color:isHov?g.color:TEXT_SUB,transition:"color .2s"}}>
                        {g.goal2030}{g.unit} goal
                      </span>
                    </div>
                  </div>

                  {/* Current + % — always visible */}
                  <div style={{paddingTop:8,borderTop:"1px solid "+g.color+"22",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                    <div>
                      <div style={{fontSize:10,color:TEXT_SUB,marginBottom:1}}>Current (2026)</div>
                      <div style={{fontSize:20,fontWeight:900,color:g.color,lineHeight:1,letterSpacing:-0.5}}>{g.current2026}{g.unit}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:TEXT_SUB,marginBottom:1}}>{pct}% of target</div>
                      {pending && <div style={{fontSize:10,color:YELLOW,fontWeight:600}}>Targets pending</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ── PortfolioInvestmentsRollup ────────────────────────────────────────────────
function PortfolioInvestmentsRollup({ bows, portColor, portId, onUpdateBows }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
 
  // ── State ──────────────────────────────────────────────────────────────────
  const [investments, setInvestments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedBow, setSelectedBow]   = useState("all");
  const [editingId, setEditingId]       = useState(null);
  const [savingId, setSavingId]         = useState(null);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy]             = useState("grantee");
 
  // ── Load investments on mount / portId change ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAllInvestments({ portfolio_id: portId }).then(rows => {
      if (!cancelled) {
        setInvestments(rows);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setError("Could not load investment data.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [portId]);
 
  // ── Save internal notes overlay ───────────────────────────────────────────
  const saveNotes = async (invId, notes) => {
    setSavingId(invId);
    try {
      await apiFetch(`/api/investments/${invId}/overlay`, {
        method: "POST",
        body: JSON.stringify({ internal_notes: notes, updated_by: "dashboard" }),
      });
      setInvestments(prev => prev.map(inv =>
        inv.id === invId ? { ...inv, internal_notes: notes } : inv
      ));
    } catch (err) {
      console.warn("Failed to save overlay:", err);
    } finally {
      setSavingId(null);
    }
  };
 
  // ── Derived values ─────────────────────────────────────────────────────────
  const fmtM = (n) => {
    const num = parseFloat(n) || 0;
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000)    return `$${(num/1000).toFixed(0)}K`;
    return `$${num}`;
  };
  const toNum = (v) => parseFloat(String(v || "0").replace(/[^0-9.]/g, "")) || 0;
 
  const bowOptions = [{ id: "all", name: "All BOWs" }, ...bows.map(b => ({ id: b.id, name: b.name }))];
 
  const filtered = investments
    .filter(inv => selectedBow === "all" || inv.bow_id === selectedBow)
    .filter(inv => !filterStatus || inv.status === filterStatus)
    .filter(inv => !search || [inv.grantee || "", inv.initiative || "", inv.internal_notes || ""]
      .some(s => s.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "amount") return toNum(b.amount) - toNum(a.amount);
      return (a[sortBy] || "").localeCompare(b[sortBy] || "");
    });
 
  const totalAmt  = filtered.reduce((s, inv) => s + toNum(inv.amount), 0);

  const INVEST_STATUSES = [
    { key: "Active",     label: "Active",     color: "#10B981" },
    { key: "In Process", label: "In Process", color: "#60A5FA" },
    { key: "Closed",     label: "Closed",     color: "#9CA3AF" },
    { key: "Cancelled",  label: "Cancelled",  color: "#F87171" },
  ];
  const bucketAmts = INVEST_STATUSES.map(b => ({
    ...b,
    amt: filtered.filter(inv => inv.status === b.key).reduce((s, inv) => s + toNum(inv.amount), 0),
  }));
 
  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 200, gap: 12, color: TEXT_SUB, fontSize: 14 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${pc.color}`,
        borderTopColor: "transparent", borderRadius: "50%",
        animation: "spin 0.7s linear infinite" }} />
      Loading investments from INVEST…
    </div>
  );
 
  if (error) return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA",
      borderRadius: 10, padding: "20px 24px", color: "#B91C1C", fontSize: 14 }}>
      {error}
    </div>
  );
 
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 
      {/* Header */}
      <div style={{ background: BRAND, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", display: "flex",
          justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
              Portfolio Investments
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              {PORT_COLORS[portId]?.label}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              All investments across {bows.length} Bodies of Work
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Investments
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                {filtered.length}
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Total Value
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                {fmtM(totalAmt)}
              </div>
            </div>
          </div>
        </div>

        {/* Budget bar by INVEST status */}
        <div style={{ padding: "0 24px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase", letterSpacing: 1.2 }}>
              By Investment Status
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
              {fmtM(totalAmt)}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, overflow: "hidden",
            display: "flex", background: "rgba(255,255,255,0.1)" }}>
            {totalAmt > 0 && bucketAmts.map(b => b.amt > 0 && (
              <div key={b.key}
                style={{ width: (b.amt / totalAmt * 100) + "%",
                  background: b.color, flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            {bucketAmts.map(b => (
              <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2,
                  background: b.color, display: "inline-block" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{b.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700,
                  color: b.amt > 0 ? "#fff" : "rgba(255,255,255,0.25)" }}>
                  {fmtM(b.amt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* BOW filter pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {bowOptions.map(b => (
            <button key={b.id} onClick={() => setSelectedBow(b.id)}
              style={{ padding: "5px 12px", borderRadius: 16,
                border: "1.5px solid " + (selectedBow === b.id ? pc.color : BORDER),
                background: selectedBow === b.id ? pc.color + "12" : SURFACE,
                color: selectedBow === b.id ? pc.color : TEXT_MUTED,
                fontSize: 12, fontWeight: selectedBow === b.id ? 600 : 400,
                cursor: "pointer" }}>
              {b.name}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", minWidth: 180 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ width: "100%", border: "1px solid " + BORDER, borderRadius: 8,
              padding: "6px 10px 6px 28px", fontSize: 12, fontFamily: "inherit",
              outline: "none", color: TEXT, boxSizing: "border-box" }} />
          <span style={{ position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>&#x2315;</span>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 10px",
            fontSize: 12, fontFamily: "inherit", outline: "none", color: TEXT,
            background: SURFACE, cursor: "pointer" }}>
          <option value="">All Statuses</option>
          {INVEST_STATUSES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "6px 10px",
            fontSize: 12, fontFamily: "inherit", outline: "none", color: TEXT,
            background: SURFACE, cursor: "pointer" }}>
          <option value="grantee">Sort: Grantee</option>
          <option value="amount">Sort: Amount</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>
 
      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ background: SURFACE, border: "1px solid " + BORDER,
          borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>💼</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 5 }}>
            {investments.length === 0
              ? "No investments linked in INVEST"
              : "No results match your filters"}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            {investments.length === 0
              ? "Investments will appear here once they are linked to BOWs in INVEST."
              : "Try adjusting your search or filters."}
          </div>
        </div>
      ) : (
        <div style={{ background: SURFACE, borderRadius: 12,
          border: "1px solid " + BORDER, overflow: "hidden" }}>
 
          {/* Column headers */}
          <div style={{ display: "grid",
            gridTemplateColumns: "130px 2fr 2fr 90px 180px 110px 2fr",
            background: SURFACE_2, borderBottom: "2px solid " + BORDER }}>
            {["BOW", "Grantee", "Investment Title", "Amount", "Teams", "Status", "Notes"].map((h, i) => (
              <div key={i} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700,
                color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.8,
                borderRight: i < 6 ? "1px solid " + BORDER : "none" }}>
                {h}
              </div>
            ))}
          </div>
 
          {filtered.map((inv, idx) => {
            const isEditing  = editingId === inv.id;
            const isSaving   = savingId === inv.id;
            const rowBg      = idx % 2 === 0 ? SURFACE : SURFACE_2;
            const bow        = bows.find(b => b.id === inv.bow_id);
            const statusColor = inv.status === "Active"     ? "#10B981"
              : inv.status === "In Process" ? "#60A5FA"
              : inv.status === "Closed"     ? "#9CA3AF"
              : inv.status === "Cancelled"  ? "#F87171"
              : TEXT_MUTED;
 
            return (
              <div key={inv.id}
                style={{ borderBottom: idx < filtered.length - 1 ? "1px solid " + BORDER : "none" }}>
                <div style={{ display: "grid",
                  gridTemplateColumns: "130px 2fr 2fr 90px 180px 110px 2fr",
                  background: isEditing ? "#F0F7FF" : rowBg }}>
 
                  {/* BOW */}
                  <div style={{ padding: "11px 12px", borderRight: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: pc.color,
                      lineHeight: 1.3 }}>
                      {bow?.name || inv.bow_title || "—"}
                    </div>
                  </div>
 
                  {/* Grantee */}
                  <div style={{ padding: "11px 12px", borderRight: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>
                      {inv.grantee || "—"}
                    </div>
                    {inv.owner && (
                      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 1 }}>
                        👤 {inv.owner}
                      </div>
                    )}
                  </div>
 
                  {/* Initiative */}
                  <div style={{ padding: "11px 12px", borderRight: "1px solid " + BORDER }}>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.35 }}>
                      {inv.initiative || "—"}
                    </div>
                    {inv.type && (
                      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                        {inv.type}
                      </div>
                    )}
                  </div>
 
                  {/* Amount */}
                  <div style={{ padding: "11px 12px", borderRight: "1px solid " + BORDER,
                    display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>
                      {inv.amount ? fmtM(toNum(inv.amount)) : "—"}
                    </span>
                  </div>

                  {/* Teams */}
                  <div style={{ padding: "9px 12px", borderRight: "1px solid " + BORDER,
                    display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                    {inv.managingTeam && (() => { const c = teamColor(inv.managingTeam); return (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px",
                        borderRadius: 20, background: c.bg, color: c.color,
                        whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                        {inv.managingTeam}
                      </span>
                    ); })()}
                    {inv.supportingTeam && (() => { const c = teamColor(inv.supportingTeam); return (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px",
                        borderRadius: 20, background: c.bg, color: c.color,
                        whiteSpace: "nowrap", alignSelf: "flex-start", opacity: 0.8 }}>
                        {inv.supportingTeam}
                      </span>
                    ); })()}
                    {!inv.managingTeam && !inv.supportingTeam && (
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                    )}
                  </div>

                  {/* Status — from INVEST, read-only */}
                  <div style={{ padding: "8px 12px", borderRight: "1px solid " + BORDER,
                    display: "flex", alignItems: "center" }}>
                    {inv.status ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor,
                        background: statusColor + "15", borderRadius: 5,
                        padding: "2px 7px", border: "1px solid " + statusColor + "30" }}>
                        {inv.status}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                    )}
                  </div>
 
                  {/* Notes — inline, always visible, click ✎ to edit */}
                  <div style={{ padding: "8px 12px", display: "flex",
                    flexDirection: "column", gap: 5 }}>
                    {isEditing ? (
                      <>
                        <PortfolioNotesEditor
                          value={inv.internal_notes || ""}
                          onSave={notes => saveNotes(inv.id, notes)}
                          isSaving={isSaving}
                        />
                        <button onClick={() => setEditingId(null)}
                          style={{ alignSelf: "flex-start", fontSize: 10, fontWeight: 700,
                            cursor: "pointer", borderRadius: 5, padding: "2px 7px",
                            border: "1px solid " + pc.color, background: pc.color,
                            color: "#fff", whiteSpace: "nowrap" }}>
                          Done
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <div style={{ flex: 1, fontSize: 11, lineHeight: 1.5,
                          color: inv.internal_notes ? TEXT : TEXT_MUTED,
                          fontStyle: inv.internal_notes ? "normal" : "italic" }}>
                          {inv.internal_notes || "Add note…"}
                        </div>
                        <button onClick={() => setEditingId(inv.id)}
                          style={{ fontSize: 10, cursor: "pointer", flexShrink: 0,
                            border: "1px solid " + BORDER, borderRadius: 4,
                            padding: "2px 6px", background: BG, color: TEXT_MUTED }}>
                          ✎
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* INVEST metadata panel — shown while editing notes */}
                {isEditing && (
                  <div style={{ background: "#F0F7FF", borderTop: "1px solid #BFDBFE",
                    padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
                    {[
                      ["Investment Owner", inv.owner],
                      ["Workflow Step",    inv.stage],
                      ["Start Date",       inv.startDate],
                      ["End Date",         inv.endDate],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED,
                          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 12, color: TEXT }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
// Small notes editor sub-component — save on blur
function PortfolioNotesEditor({ value, onSave, isSaving }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        placeholder="Operational notes not in INVEST…"
        style={{ width: "100%", minHeight: 72, border: "1px solid #BFDBFE",
          borderRadius: 7, padding: "7px 10px", fontSize: 12, fontFamily: "inherit",
          color: TEXT, background: SURFACE, resize: "vertical",
          lineHeight: 1.6, boxSizing: "border-box", outline: "none" }}
      />
      {isSaving && (
        <div style={{ position: "absolute", bottom: 6, right: 8,
          fontSize: 10, color: "#60A5FA" }}>Saving…</div>
      )}
    </div>
  );
}

// ── PortfolioPartnersView ─────────────────────────────────────────────────────
function PortfolioPartnersView({ portId, portColor }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:12,padding:"40px 48px",textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:12,background:pc.color+"15",border:"1px solid "+pc.color+"33",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16}}>🤝</div>
        <div style={{fontSize:16,fontWeight:700,color:TEXT,marginBottom:8}}>Partners</div>
        <div style={{fontSize:13,color:TEXT_MUTED,lineHeight:1.65,maxWidth:480,margin:"0 auto"}}>
          Partner tracking for this portfolio is coming soon. This view will show key partners, their roles, engagement status, and how their contributions connect to portfolio outcomes.
        </div>
      </div>
    </div>
  );
}

// ── Theory of Action — Shared Design Tokens & Components ─────────────────────
const C = {
  bg:"#ffffff", white:"#ffffff", off:"#f5f7fb",
  navy:"#17243d", navyMid:"#223050",
  teal:"#0b7575", tealMid:"#0d9898", tealLt:"#3dbaba", tealPale:"#e2f3f3", tealBd:"#9acece",
  gold:"#a05000", goldMid:"#cc7000", goldLt:"#e89020", goldPale:"#fdf0dc", goldBd:"#e0b050",
  slate:"#455878", slateMid:"#607898", slatePale:"#e8edf5", slateBd:"#b8c8de",
  text:"#17243d", textMid:"#364870", textSub:"#556088", textDim:"#8898b8",
  bd:"#cdd8ec", bdMid:"#b8c8de",
  lane1:"#0b5fa5", lane1Pale:"#e6f1fb", lane1Bd:"#85b7eb", lane1Hdr:"#063870",
  lane2:"#186030", lane2Pale:"#e2f2e8", lane2Bd:"#80b898", lane2Hdr:"#0d3a1c",
  lane3:"#7a3080", lane3Pale:"#f0e6f5", lane3Bd:"#c490d0", lane3Hdr:"#4a1a50",
  s1:"#0b5fa5", s1Pale:"#e6f1fb", s2:"#186030", s2Pale:"#e2f2e8",
  s3:"#7a3080", s3Pale:"#f0e6f5", s4:"#a05000", s4Pale:"#fdf0dc",
  s5:"#455878", s5Pale:"#e8edf5", s6:"#2d6e8e", s6Pale:"#e4f2f8",
  c1:"#0b5fa5", c1Pale:"#e6f1fb", c2:"#7a3080", c2Pale:"#f0e6f5",
  c3:"#186030", c3Pale:"#e2f2e8", c4:"#a05000", c4Pale:"#fdf0dc",
};
const CI = {
  ...C,
  lane1:"#0b7575", lane1Pale:"#e2f3f3", lane1Bd:"#9acece", lane1Hdr:"#083d3d",
  lane2:"#4a1a8a", lane2Pale:"#ede8f8", lane2Bd:"#b8a0e0", lane2Hdr:"#2d0f5a",
  lane3:"#186030", lane3Pale:"#e2f2e8", lane3Bd:"#80b898", lane3Hdr:"#0d3a1c",
  green:"#186030", greenPale:"#e8f5ee", greenBorder:"#6ab88a",
  offwhite:"#f5f7fb",
  p1:"#157060", p1p:"#dff2ec",
  p2:"#4a1a8a", p2p:"#ede8f8",
  p3:"#482070", p3p:"#ecdff5",
  p4:"#683010", p4p:"#f5ece0",
};

function StageHead({ num, label, sub, color }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:color||C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:C.white, boxShadow:`0 2px 6px ${color||C.navy}40` }}>{num}</div>
      <div style={{ fontSize:11, fontWeight:800, color:color||C.navy, letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"center", lineHeight:1.2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:C.textDim, fontStyle:"italic", textAlign:"center" }}>{sub}</div>}
    </div>
  );
}

function Connector() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", paddingTop:40, gap:2 }}>
      <div style={{ flex:"0 0 32px", width:2, background:`linear-gradient(to bottom, ${C.bd}, ${C.gold})`, borderRadius:1 }} />
      <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r="14" fill={`${C.gold}25`} stroke={C.gold} strokeWidth="2"/>
        <path d="M10 13 L15 18 L20 13" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <div style={{ fontSize:8, fontWeight:800, color:C.goldMid, letterSpacing:"0.12em", textTransform:"uppercase", writingMode:"vertical-rl", transform:"rotate(180deg)", paddingBottom:4 }}>drives</div>
    </div>
  );
}

function ImpactPanel({ num, children }) {
  return (
    <div style={{ background:`${C.gold}05`, border:`1.5px solid ${C.gold}40`, borderTop:`3px solid ${C.gold}`, borderRadius:10, overflow:"hidden", boxShadow:`0 2px 10px ${C.gold}15` }}>
      <div style={{ background:`${C.gold}0a`, borderBottom:`1px solid ${C.gold}25`, padding:"7px 14px", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:20, height:20, borderRadius:"50%", background:C.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:C.white, flexShrink:0 }}>{num}</div>
        <div style={{ fontSize:11, fontWeight:800, color:C.goldMid, letterSpacing:"0.06em", textTransform:"uppercase" }}>2030 Impact Goals</div>
      </div>
      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:12 }}>{children}</div>
    </div>
  );
}

function CrossCuttingCards({ items }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:800, color:C.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Cross-Cutting Indicators</div>
      <div style={{ fontSize:10, color:C.textDim, fontStyle:"italic", marginBottom:8 }}>Compounding effect across all activity areas</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {items.map((ind, i) => (
          <div key={i} style={{ background:C.off, border:`1px solid ${C.goldBd}60`, borderLeft:`3px solid ${C.gold}`, borderRadius:"0 7px 7px 0", padding:"8px 12px" }}>
            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.55 }}>{ind}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BidirectionalDivider() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:1, background:C.bd }} />
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none" style={{ flexShrink:0 }}>
        <line x1="2" y1="7" x2="26" y2="7" stroke={C.textDim} strokeWidth="1.2" strokeLinecap="round"/>
        <polyline points="7,3 2,7 7,11" stroke={C.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <polyline points="21,3 26,7 21,11" stroke={C.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      <div style={{ flex:1, height:1, background:C.bd }} />
    </div>
  );
}

function ToaPortfolioHeader({ title, description, problem, bows, accentColor }) {
  const accent = accentColor || C.teal;
  return (
    <div style={{ padding:"16px 18px 0" }}>
      <div style={{ background:C.slatePale, border:`1px solid ${C.slateBd}`, borderLeft:`4px solid ${accent}`, borderRadius:8, padding:"12px 16px", marginBottom:10, display:"flex", gap:0, alignItems:"stretch" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:5 }}>{title}</div>
          <div style={{ fontSize:12, color:C.textMid, lineHeight:1.65 }}>{description}</div>
          {problem && (
            <>
              <div style={{ height:1, background:C.slateBd, margin:"10px 0" }} />
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                <div style={{ flexShrink:0, background:C.navy, color:C.white, fontSize:9, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 8px", borderRadius:4, marginTop:1 }}>Problem / Gap</div>
                <div style={{ fontSize:12, color:C.textSub, lineHeight:1.65, fontStyle:"italic" }}>{problem}</div>
              </div>
            </>
          )}
        </div>
        {bows && bows.length > 0 && (
          <>
            <div style={{ width:1, background:C.slateBd, margin:"0 16px", flexShrink:0 }} />
            <div style={{ flexShrink:0, display:"flex", flexDirection:"column", justifyContent:"center", gap:5, minWidth:140 }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.textDim, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>Bodies of Work</div>
              {bows.map(b => (
                <div key={b.label} style={{ display:"flex", alignItems:"center", gap:6, background:C.white, border:`1px solid ${b.color}35`, borderLeft:`3px solid ${b.color}`, borderRadius:"0 5px 5px 0", padding:"4px 10px" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:b.color }}>{b.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ marginBottom:8 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.navy, letterSpacing:"-0.02em", lineHeight:1.1 }}>Theory of Action</h2>
        <div style={{ width:40, height:3, background:accent, borderRadius:2, marginTop:5 }} />
      </div>
    </div>
  );
}

// ── D&A Hub TOA ───────────────────────────────────────────────────────────────
const DAH_LANES = [
  { id:"advisory", label:"AI Advisory & Network", icon:"◎", color:C.lane1, pale:C.lane1Pale, bd:C.lane1Bd,
    activities:["On-demand technical and strategic guidance on AI use cases, data readiness, evaluation approaches, infrastructure tradeoffs, and risk considerations","Curated SME bench spanning research methods, learning sciences, implementation, data/AI infrastructure, privacy, and AI governance","Repeatable advisory formats: decision pathway reviews, evidence readouts, risk and equity framing sessions","Defined advisory roles — evidence reviewers, implementation realists, risk/governance and equity lenses"],
    outcome:{ title:"Program teams have access to timely, credible expert guidance", body:"Enabling them to pressure-test assumptions, weigh tradeoffs, and make better-informed choices without having to source that expertise independently." },
    indicators:["# inbound advisory requests","% of requests fulfilled","% of teams with repeat engagement","% reporting advisory influenced a decision","NPS for advisory engagements"] },
  { id:"infra", label:"Data Insights Infrastructure", icon:"⬡", color:C.lane2, pale:C.lane2Pale, bd:C.lane2Bd,
    activities:["Market Insights & Context: cross-division data product integrating evidence signals, market context, and implementation considerations","Insights Engine for AI Effectiveness: synthesizes research, market intelligence, and pilot data to surface patterns, risks, and opportunity areas","Impact Accounting Models: extracts effect-size evidence to support MLE functions, scenario analysis, and cost-effectiveness estimates","Supporting dashboards and reporting infrastructure where reuse is high"],
    outcome:{ title:"Teams draw on shared analytical tools and frameworks that enable more consistent interpretation of evidence", body:"Reducing duplicative analytical build and freeing teams to focus on program-specific judgment rather than foundational capability they shouldn't have to rebuild independently." },
    indicators:["# unique users across shared tools/products","% rating shared tools as useful or actionable","% reporting tools influenced how they interpreted evidence","NPS for shared tools and products"] },
  { id:"learning", label:"AI Learning Community", icon:"⟳", color:C.lane3, pale:C.lane3Pale, bd:C.lane3Bd,
    activities:["Regular learning lab series: ongoing talks anchored in live program questions, featuring researchers and practitioners sharing evidence and frontier developments","Targeted convenings: curated demonstrations bringing together researchers, practitioners, and technologists to explore emerging approaches","Small-group discussions and short-format learning groups: facilitated sessions to pressure-test design choices and recalibrate strategy","Circulation of insights from advisory engagements, pilots, and investments across teams"],
    outcome:{ title:"Insights from advisory engagements, pilots, and investments circulate across teams rather than staying siloed", body:"Building shared intuition about what is working, what remains uncertain, and where caution is warranted as the AI and education landscape evolves." },
    indicators:["% of USP staff participating in Hub learning annually","% self-reported increase in AI literacy or confidence","% reporting Hub learning changed how they approach AI decisions","NPS for learning community activities"] },
];
const DAH_CROSS = ["% of USP staff (S/PO + D/DDs) reporting Hub support contributed to a significant AI-related decision","Composite NPS across all three service lines"];

function DAHToa() {
  const [activeLane, setActiveLane] = useState(null);
  const [expandedIndicators, setExpandedIndicators] = useState({});
  const toggle = id => setActiveLane(p => p === id ? null : id);
  const toggleInd = (id, e) => { e.stopPropagation(); setExpandedIndicators(p => ({ ...p, [id]: !p[id] })); };
  const laneGridCols = "130px 0.8fr 1fr";
  return (
    <div style={{ background:C.bg, color:C.text }}>
      <div style={{ padding:"0 18px 18px" }}>
        <div style={{ marginBottom:6 }}>
          <div style={{ display:"grid", gridTemplateColumns:`${laneGridCols} 36px 420px`, gap:6, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label="Service Lines" sub="How does the Hub operate?" color={C.slate} />
            <StageHead num="2" label="Core Activities" sub="What does each line do?" color={C.teal} />
            <StageHead num="3" label="Outcomes & Indicators" sub="What changes as a result?" color={C.teal} />
            <div />
            <StageHead num="4" label="2030 Impact Goals" sub="What does this make possible?" color={C.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`${laneGridCols} 36px 420px`, gap:6, alignItems:"center", marginBottom:6 }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${C.slate}60, ${C.teal})`, borderRadius:2 }} />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:C.teal }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.teal}/></svg></div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.teal}, ${C.slate})` }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.slate}/></svg></div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ flex:"0 0 20px", width:2, background:`linear-gradient(to bottom, ${C.bd}, ${C.gold})`, borderRadius:1 }} />
              <svg width="18" height="18" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" fill={`${C.gold}25`} stroke={C.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.slate}, ${C.gold})`, borderRadius:2 }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.gold}/></svg></div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 36px 420px", gap:0, alignItems:"start" }}>
          <div style={{ borderRight:`2px solid ${C.bd}`, paddingRight:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:laneGridCols, gap:4, alignItems:"stretch" }}>
              {DAH_LANES.map((lane, li) => {
                const isActive = activeLane === lane.id;
                const isDimmed = activeLane && !isActive;
                return (
                  <div key={lane.id} style={{ display:"contents" }}>
                    <div onClick={() => toggle(lane.id)} style={{ borderRadius:8, background:isActive?lane.pale:`${lane.color}10`, border:`1px solid ${isActive?lane.color:`${lane.color}35`}`, borderLeft:`4px solid ${lane.color}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:4, justifyContent:"center", cursor:"pointer", opacity:isDimmed?0.4:1, transition:"all 0.15s", boxShadow:isActive?`0 2px 16px ${lane.color}30`:"0 1px 3px rgba(0,0,0,0.08)", gridRow:li+1 }}>
                      <div style={{ fontSize:18, color:lane.color, lineHeight:1 }}>{lane.icon}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:lane.color, lineHeight:1.3 }}>{lane.label}</div>
                      <div style={{ fontSize:9, color:`${lane.color}99`, fontStyle:"italic" }}>Click to highlight</div>
                    </div>
                    <div style={{ borderRadius:8, background:`${lane.color}04`, border:`1.5px solid ${isActive?lane.color:C.bd}`, padding:"9px 10px", opacity:isDimmed?0.4:1, transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", gridRow:li+1 }}>
                      <div style={{ fontSize:11, fontWeight:800, color:lane.color, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>Core Activities</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {lane.activities.map((act, i) => (
                          <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                            <div style={{ width:4, height:4, borderRadius:"50%", background:lane.color, marginTop:6, flexShrink:0, opacity:0.7 }} />
                            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{act}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ gridRow:li+1, display:"flex", gap:0, opacity:isDimmed?0.4:1, transition:"all 0.15s" }}>
                      <div onClick={() => toggle(lane.id)} style={{ flex:1, borderRadius:expandedIndicators[lane.id]?"8px 0 0 8px":8, background:isActive?lane.pale:`${C.teal}06`, border:`1.5px solid ${isActive?lane.color:`${C.teal}30`}`, borderRight:expandedIndicators[lane.id]?`1.5px solid ${lane.color}30`:undefined, padding:"9px 12px", cursor:"pointer", transition:"all 0.15s", display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginBottom:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:18, height:18, borderRadius:"50%", background:lane.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.white, flexShrink:0 }}>{li+1}</div>
                            <div style={{ fontSize:11, fontWeight:800, color:lane.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {li+1}</div>
                          </div>
                          <button onClick={(e) => toggleInd(lane.id, e)} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, background:"none", border:`1px solid ${lane.color}40`, borderRadius:5, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:lane.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Leading Indicators</div>
                            <div style={{ background:`${lane.color}15`, borderRadius:8, padding:"1px 5px", fontSize:10, fontWeight:700, color:lane.color }}>{lane.indicators.length}</div>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:expandedIndicators[lane.id]?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={lane.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.5, paddingRight:210 }}>{lane.outcome.title} — {lane.outcome.body}</div>
                      </div>
                      {expandedIndicators[lane.id] && (
                        <div style={{ width:220, flexShrink:0, borderRadius:"0 8px 8px 0", background:`${lane.color}07`, border:`1.5px solid ${lane.color}40`, borderLeft:"none", padding:"9px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:lane.color, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Leading Indicators</div>
                          {lane.indicators.map((ind, i) => (
                            <div key={i} style={{ display:"flex", gap:5, alignItems:"flex-start", paddingBottom:4, borderBottom:i<lane.indicators.length-1?`1px solid ${lane.color}15`:"none" }}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background:lane.color, marginTop:5, flexShrink:0, opacity:0.6 }} />
                              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.45 }}>{ind}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeLane && <div style={{ textAlign:"center", marginTop:6 }}><button onClick={() => setActiveLane(null)} style={{ background:"none", border:`1px solid ${C.bd}`, borderRadius:5, padding:"4px 14px", fontSize:12, color:C.textDim, cursor:"pointer" }}>Clear filter ✕</button></div>}
          </div>
          <Connector />
          <ImpactPanel num="4">
            <CrossCuttingCards items={DAH_CROSS} />
            <div style={{ height:1, background:C.bd }} />
            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6, fontStyle:"italic" }}>The Data & AI Enablement Hub accelerates progress toward the Data & AI team's strategy goals and the division's 2045 Ambition — allowing program teams to execute more effectively and at greater scale.</div>
            <BidirectionalDivider />
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
                <div style={{ width:3, borderRadius:2, background:C.goldMid, alignSelf:"stretch", minHeight:24, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:C.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Enabled</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.navy, lineHeight:1.2 }}>Ambition 2045</div>
                </div>
              </div>
              <div style={{ background:`${C.teal}06`, border:`1px solid ${C.tealBd}`, borderLeft:`3px solid ${C.teal}`, borderRadius:"0 7px 7px 0", padding:"10px 12px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:C.teal, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Division Enablement</div>
                <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>The Hub doesn't directly drive Amb45 outcomes, but creates the conditions for the division to do so. By ensuring program teams have timely expert guidance, shared analytical infrastructure, and access to circulating learning, the Hub raises the quality and pace of AI-related investment across the division — making it possible for each portfolio to pursue the 2045 vision with greater confidence and coherence.</div>
              </div>
            </div>
          </ImpactPanel>
        </div>
      </div>
    </div>
  );
}

// ── SFL TOA ───────────────────────────────────────────────────────────────────
const SFL_ACTIVITIES = [
  { id:"data-avail", label:"Increase data availability", icon:"◈", color:C.s1, pale:C.s1Pale,
    outcome:"New and expanded education and workforce AI-ready data focused on priority questions is accessed and linked across systems",
    indicators:["% of districts/states adopting or piloting data sources related to multimodal, system conditions, wealth, and comp/skills","% of districts/states with increased availability to high quality and comprehensive data","% of US learners represented across integrated private, federal, state, and other data sources"] },
  { id:"data-util", label:"Build and expand data utilities", icon:"⬡", color:C.s2, pale:C.s2Pale,
    outcome:"Infrastructure in place to enable more timely and personalized data feedback loops that inform and strengthen decision-making",
    indicators:["X% of platforms enabling custom disaggregation queries","40% reduction in average time to insight on key Essential Questions","% systems implementing user-centered, AI-driven data access platforms (e.g., NLP-based dashboards)"] },
  { id:"sensemaking", label:"Accelerate sensemaking using digital public good integration", icon:"◎", color:C.s3, pale:C.s3Pale,
    outcome:"Data & analytics is translated into actionable insights, leveraging AI, that decisionmakers can understand and use — supported by sufficient capacity and tools to act on insights",
    indicators:["% of districts/states with increased availability to high quality and comprehensive data","% systems implementing user-centered, AI-driven data access platforms","40% reduction in average time to insight on key Essential Questions"] },
  { id:"governance", label:"Establish shared governance and standards, w/ systems open by default", icon:"⊕", color:C.s4, pale:C.s4Pale,
    outcome:"Data sharing agreements, privacy protections, and norms of use enable repeated, reliable use of data across institutions and over time",
    indicators:["Increase in templatized DSAs that cover multiple institutions and sectors, reducing time to data submission","% of pilot states/districts with interoperable data systems linking EW + social systems"] },
  { id:"inplace", label:"Leverage In-Place coordination to accelerate learning & scale", icon:"⟳", color:C.s5, pale:C.s5Pale,
    outcome:"Regional or state contexts provide the coordination needed to test, refine, and scale feedback loops in ways that align with local decision needs",
    indicators:["50% of districts in Pathways and WSI regions have strategic institutional adoption of AI-enabled solutions","100% of regional cross-sector data tools in Pathways and WSI regions hit thresholds for regular use"] },
  { id:"ecosystem", label:"Strengthen ecosystem coordination", icon:"⇄", color:C.s6, pale:C.s6Pale, isTbd:true,
    outcome:"Shared agreement and alignment across key stakeholders", indicators:[] },
];
const SFL_CROSS = ["% of district and PS data decision makers using higher-quality data to improve learning, advising, mobility, and credentials of value","X% of field leaders have timely, comprehensive data to consistently measure and assess all Amb45 EW Momentum Points"];
const SFL_PROBLEM = "EW systems generate increasing amounts of data, yet feedback loops from insight to decision remain fragmented and uneven. Practitioners often lack clarity on what 'good' looks like, and traditional assessments and credentials fail to capture changing real-world skills. Siloed data systems and limited AI and data capacity further constrain progress. As a result, systems and leaders are not equipped with learner-centered feedback loops that enable continuous improvement at the pace required.";
const SFL_BOWS = [{ label:"Build and Sustain EDU-Net", color:"#e07070" },{ label:"Advance Data & AI Feedback Loops in Place", color:"#70a8e0" },{ label:"Launch Competencies & Skills Genome Accelerator", color:"#70c090" }];

function SFLToa() {
  const [expandedIndicators, setExpandedIndicators] = useState({});
  const toggleInd = (id, e) => { e.stopPropagation(); setExpandedIndicators(p => ({ ...p, [id]: !p[id] })); };
  const gridCols = "180px 1fr";
  const [hoveredBuckets, setHoveredBuckets] = useState({});
  const [expandedBuckets, setExpandedBuckets] = useState({});
  const SFL_BUCKETS = [
    { label:"EW Momentum Points", color:C.slate, pale:C.slatePale, contribution:"System Feedback Loops builds the data and AI infrastructure needed to track progress across all Amb45 EW Momentum Points — giving field leaders timely, comprehensive data to measure and assess outcomes at scale.",
      priorities:[
        { n:"All Momentum Points", title:"Field leaders have timely, comprehensive data", t1:"X% with access", t2:"Across all EW Momentum Points" },
      ]},
    { label:"Instruction", color:C.teal, pale:C.tealPale, contribution:"By enabling faster, more personalized feedback loops for districts, SFL accelerates the division's ability to drive learning gains and improve instructional effectiveness for learners furthest from opportunity.",
      priorities:[
        { n:"Priority 1", title:"Full Stack Instruction & Tutoring", t1:"1.6 grade levels/yr", t2:"7.4m + 4.4m students" },
        { n:"Priority 2", title:"AI-Enabled Gateway Math", t1:"80% avg pass rates", t2:"355k students / 450 institutions" },
      ]},
    { label:"Navigation", color:C.s1, pale:C.s1Pale, contribution:"SFL strengthens the PS and WF data infrastructure that advisors and learners depend on to make informed decisions. A central mechanism is CSGA — a dynamic, AI-native public knowledge graph that links real-time education and workforce data at the competency and skill level, powering personalized advising, credit mobility, career coaching, and skill-based assessment. By reducing the time to update skill definitions using AI, CSGA enables tools and advisors to better reflect a changing labor market in ways that static taxonomies cannot.",
      priorities:[
        { n:"Priority 3", title:"AI-Enabled Personalized Advising", t1:"+5pp college enrollment", t2:"8.6m at LLM scale" },
        { n:"Priority 4", title:"AI-Enabled Learning Mobility", t1:"37–45% credit transfer", t2:"1.6m students impacted" },
      ]},
  ];
  return (
    <div style={{ background:C.bg, color:C.text }}>
      <div style={{ padding:"0 18px 18px" }}>
        <div style={{ marginBottom:6 }}>
          <div style={{ display:"grid", gridTemplateColumns:`${gridCols} 36px 420px`, gap:6, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label="Activities" sub="What are we doing?" color={C.slate} />
            <StageHead num="2" label="Portfolio Outcomes" sub="What changes as a result?" color={C.teal} />
            <div />
            <StageHead num="3" label="2030 Impact Goals" sub="What does this make possible?" color={C.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`${gridCols} 36px 420px`, gap:6, alignItems:"center", marginBottom:4 }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${C.slate}60, ${C.teal})`, borderRadius:2 }} />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.teal}, ${C.slate})` }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.slate}/></svg></div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ flex:"0 0 20px", width:2, background:`linear-gradient(to bottom, ${C.bd}, ${C.gold})`, borderRadius:1 }} />
              <svg width="18" height="18" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" fill={`${C.gold}25`} stroke={C.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.slate}, ${C.gold})`, borderRadius:2 }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.gold}/></svg></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`${gridCols} 36px 420px`, gap:6, marginBottom:6 }}>
            <div />
            <div style={{ padding:"2px 4px" }}><div style={{ fontSize:12, fontWeight:700, color:C.textSub, lineHeight:1.5, fontStyle:"italic" }}>Progress toward faster and more effective system feedback loops requires multiple enabling conditions to move together — accelerating progress toward the division's 2045 Ambition.</div></div>
            <div /><div />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 36px 420px", gap:0, alignItems:"start" }}>
          <div style={{ borderRight:`2px solid ${C.bd}`, paddingRight:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {SFL_ACTIVITIES.map((act, ai) => (
                <div key={act.id} style={{ display:"grid", gridTemplateColumns:gridCols, gap:4 }}>
                  <div style={{ borderRadius:8, background:`${act.color}10`, border:`1px solid ${act.color}35`, borderLeft:`4px solid ${act.color}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:4, justifyContent:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize:16, color:act.color, lineHeight:1 }}>{act.icon}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:act.color, lineHeight:1.3 }}>{act.label}</div>
                    {act.isTbd && <div style={{ fontSize:9, background:`${act.color}20`, border:`1px solid ${act.color}40`, borderRadius:3, padding:"1px 6px", color:act.color, fontWeight:700, width:"fit-content" }}>TBD</div>}
                  </div>
                  <div style={{ display:"flex", gap:0, minWidth:0 }}>
                    <div style={{ flex:1, borderRadius:expandedIndicators[act.id]?"8px 0 0 8px":8, background:`${C.teal}06`, border:`1.5px solid ${C.teal}30`, borderRight:expandedIndicators[act.id]?`1.5px solid ${act.color}30`:undefined, padding:"9px 12px", display:"flex", flexDirection:"column", gap:6, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:18, height:18, borderRadius:"50%", background:act.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.white, flexShrink:0 }}>{ai+1}</div>
                          <div style={{ fontSize:11, fontWeight:800, color:act.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {ai+1}</div>
                        </div>
                        <button onClick={(e) => toggleInd(act.id, e)} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, background:"none", border:`1px solid ${act.color}40`, borderRadius:5, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                          <div style={{ fontSize:10, fontWeight:800, color:act.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Leading Indicators</div>
                          {act.indicators.length > 0 && <div style={{ background:`${act.color}15`, borderRadius:8, padding:"1px 5px", fontSize:10, fontWeight:700, color:act.color }}>{act.indicators.length}</div>}
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:expandedIndicators[act.id]?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={act.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.5, paddingRight:expandedIndicators[act.id]?0:160 }}>{act.outcome}</div>
                    </div>
                    {expandedIndicators[act.id] && (
                      <div style={{ width:240, flexShrink:0, borderRadius:"0 8px 8px 0", background:`${act.color}08`, border:`1.5px solid ${act.color}40`, borderLeft:"none", padding:"9px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                        <div style={{ fontSize:10, fontWeight:800, color:act.color, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Leading Indicators</div>
                        {act.indicators.length > 0 ? act.indicators.map((ind, i) => (
                          <div key={i} style={{ display:"flex", gap:5, alignItems:"flex-start", paddingBottom:4, borderBottom:i<act.indicators.length-1?`1px solid ${act.color}15`:"none" }}>
                            <div style={{ width:4, height:4, borderRadius:"50%", background:act.color, marginTop:5, flexShrink:0, opacity:0.6 }} />
                            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.45 }}>{ind}</div>
                          </div>
                        )) : <div style={{ fontSize:11, color:C.textDim, fontStyle:"italic" }}>Indicators to be developed</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Connector />
          <ImpactPanel num="3">
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:5 }}>
                <div style={{ width:3, borderRadius:2, background:C.gold, alignSelf:"stretch", minHeight:24, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:C.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Achieved</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.navy, lineHeight:1.2 }}>2030 Strategy Goals</div>
                </div>
              </div>
              <div style={{ fontSize:10, color:C.textDim, fontStyle:"italic", marginBottom:8 }}>Conditions we want to see across the system</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {SFL_CROSS.map((ind, i) => <div key={i} style={{ background:C.off, border:`1px solid ${C.goldBd}60`, borderLeft:`3px solid ${C.gold}`, borderRadius:"0 7px 7px 0", padding:"8px 12px" }}><div style={{ fontSize:12, color:C.textMid, lineHeight:1.55 }}>{ind}</div></div>)}
              </div>
            </div>
            <BidirectionalDivider />
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
                <div style={{ width:3, borderRadius:2, background:C.goldMid, alignSelf:"stretch", minHeight:24, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:C.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Enabled</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.navy, lineHeight:1.2 }}>Ambition 2045</div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {SFL_BUCKETS.map((bucket, bi) => {
                  const isOpen = expandedBuckets[bi];
                  return (
                    <div key={bi}>
                      <button onClick={() => setExpandedBuckets(p => ({...p,[bi]:!p[bi]}))} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:3 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:bucket.color, letterSpacing:"0.06em", textTransform:"uppercase", background:bucket.pale, padding:"4px 10px", borderLeft:`3px solid ${bucket.color}`, borderRadius:"0 4px 4px 0" }}>{bucket.label}</div>
                        <div style={{ flex:1, height:1, background:C.bd }} />
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}>
                          <path d="M3 5 L7 9 L11 5" stroke={bucket.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div style={{ background:`${bucket.color}04`, border:`1px solid ${bucket.color}20`, borderLeft:`3px solid ${bucket.color}`, borderRadius:"0 6px 6px 0", padding:"8px 10px", display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ fontSize:8, fontWeight:800, color:bucket.color, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>SFL Contribution</div>
                          <div style={{ fontSize:11, color:C.textMid, lineHeight:1.6, marginBottom:4 }}>{bucket.contribution}</div>
                          <div style={{ height:1, background:C.bd }} />
                          {bucket.priorities.map(p => (
                            <div key={p.n}>
                              <div style={{ fontSize:10, fontWeight:800, color:C.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{p.n}</div>
                              <div style={{ fontSize:12, fontWeight:700, color:C.navy, lineHeight:1.3, marginBottom:2 }}>{p.title}</div>
                              <div style={{ fontSize:11, color:C.textMid, lineHeight:1.5 }}>{p.t1} · {p.t2}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ImpactPanel>
        </div>
      </div>
    </div>
  );
}

// ── Cross-Cutting TOA ─────────────────────────────────────────────────────────
const CC_ACTIVITIES = [
  { id:"alignment", label:"Drive cross-division alignment through coordination with PSTs around shared goals", icon:"◎", color:C.c1, pale:C.c1Pale,
    inputs:["Develop and manage processes to enable cross-PST coordination and clarity around shared goals and priorities"],
    outcomeArea:"Cross-Division Alignment", outcome:"Coordination and alignment across and between Data and PST priorities enable more integrated and impactful collaboration.",
    indicators:[{text:"% PSTs reporting strong partnership and clarity on Data & AI shared goals",num:1},{text:"% of PST leads who report that cross-cutting support is responsive to their needs",num:2},{text:"# of PST members who attended at least 1 USP Data learning session",num:3},{text:"# co-funded investments with PSTs",num:4},{text:"# large-scale, cross-PST collaborative touchpoints",num:5}] },
  { id:"insights", label:"Use data and evidence to generate and share actionable insights", icon:"⬡", color:C.c2, pale:C.c2Pale,
    inputs:["MLE dashboards tracking portfolio and BOW progress against strategy goals","Impact forecasting models and scenario analyses to inform investment decisions","Evidence synthesis and targeted analyses surfacing signals across the division","Impact accounting models extracting effect-size evidence for cost-effectiveness estimates"],
    outcomeArea:"Data-Driven Insights", outcome:"Clear signals of progress, impact forecasts, and other evidence consistently inform portfolio and BOW decision-making.",
    indicators:[{text:"% team who agree/strongly agree that MLE data and insights have strengthened their decision-making",num:6},{text:"% of team reporting high level of clarity around measurement priorities for their portfolio",num:7},{text:"% utilization rate of key analytical tools (CRM, Evidence Base, MLE Dashboards, etc.)",num:8}] },
  { id:"operations", label:"Lead continuous improvement effort to enhance team coordination and impact", icon:"⟳", color:C.c3, pale:C.c3Pale,
    inputs:["Streamlined investment processes — from idea generation through funding and execution","Planning and portfolio management tools that increase cross-team visibility","Operational norms, meeting cadences, and coordination infrastructure","Onboarding systems and role clarity frameworks for new team members"],
    outcomeArea:"Operations & Efficiency", outcome:"Efficient planning and investment processes enable faster decision-making, increased cross-team visibility and connection, and faster paths to alignment and execution.",
    indicators:[{text:"Average # of days to complete an investment (from idea to funded investment)",num:9},{text:"% of team members who feel empowered (agree-strongly agree) to get the work done for which they are responsible",num:10},{text:"% of team members who agree/strongly agree that processes for their work are efficient and appropriate for driving towards impact",num:11},{text:"% of team members who agree/strongly agree that their colleagues generally avoid complexity when it's not productive",num:12}] },
  { id:"culture", label:"Establish inclusive norm, culture, alignment practices, and onboarding approaches", icon:"◈", color:C.c4, pale:C.c4Pale,
    inputs:["Team values and norms development and ongoing reinforcement practices","Inclusion and belonging initiatives, psychological safety frameworks","Leadership modeling and manager development resources","Culture assessment cycles and structured feedback loops"],
    outcomeArea:"Inclusion & Culture", outcome:"Team members feel a shared culture of trust, inclusion, and clarity that supports effective collaboration and impact.",
    indicators:[{text:"% of team members who report we are living into our team's values/norms",num:13},{text:"% of team members comfortable sharing opinions that differ from others' views",num:14},{text:"% of team members who feel their work team leader fosters a welcoming environment",num:15},{text:"% of team members who feel a sense of trust and belonging on our team",num:16}] },
];
const CC_CROSS = ["% of USP Data & AI staff who agree/strongly agree that team systems, processes, and culture enable them to do their best work","% of team who agree/strongly agree that data and evidence consistently inform portfolio and BOW decision-making"];
const CC_BOWS = [{ label:"Advance Strategy Learning & Insight", color:"#2060a0" },{ label:"Enable Business & Strategy Execution", color:"#e07070" },{ label:"Invest Reserve in Strategic Opportunities", color:"#7a3080" }];

function CCToa() {
  const [expandedIndicators, setExpandedIndicators] = useState({});
  const toggleInd = (id, e) => { e.stopPropagation(); setExpandedIndicators(p => ({ ...p, [id]: !p[id] })); };
  const gridCols = "180px 0.85fr 1fr";
  return (
    <div style={{ background:C.bg, color:C.text }}>
      <div style={{ padding:"0 18px 18px" }}>
        <div style={{ marginBottom:6 }}>
          <div style={{ display:"grid", gridTemplateColumns:`${gridCols} 36px 420px`, gap:6, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label="Activities" sub="What are we doing?" color={C.slate} />
            <StageHead num="2" label="Investments & Inputs" sub="What are we funding and building?" color={C.teal} />
            <StageHead num="3" label="Portfolio Outcomes" sub="What changes as a result?" color={C.teal} />
            <div />
            <StageHead num="4" label="2030 Impact Goals" sub="What does this make possible?" color={C.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`${gridCols} 36px 420px`, gap:6, alignItems:"center", marginBottom:6 }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${C.slate}60, ${C.teal})`, borderRadius:2 }} />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:C.teal }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.teal}/></svg></div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.teal}, ${C.slate})` }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.slate}/></svg></div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ flex:"0 0 20px", width:2, background:`linear-gradient(to bottom, ${C.bd}, ${C.gold})`, borderRadius:1 }} />
              <svg width="18" height="18" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" fill={`${C.gold}25`} stroke={C.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.slate}, ${C.gold})`, borderRadius:2 }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.gold}/></svg></div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 36px 420px", gap:0, alignItems:"start" }}>
          <div style={{ borderRight:`2px solid ${C.bd}`, paddingRight:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {CC_ACTIVITIES.map((act, ai) => (
                <div key={act.id} style={{ display:"grid", gridTemplateColumns:gridCols, gap:4 }}>
                  <div style={{ borderRadius:8, background:`${act.color}10`, border:`1px solid ${act.color}35`, borderLeft:`4px solid ${act.color}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:4, justifyContent:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize:16, color:act.color, lineHeight:1 }}>{act.icon}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:act.color, lineHeight:1.3 }}>{act.label}</div>
                  </div>
                  <div style={{ borderRadius:8, background:`${C.teal}04`, border:`1.5px solid ${C.bd}`, padding:"9px 10px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:act.color, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>Investments & Inputs</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {act.inputs.map((inp, i) => (
                        <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                          <div style={{ width:4, height:4, borderRadius:"50%", background:act.color, marginTop:6, flexShrink:0, opacity:0.7 }} />
                          <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{inp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:0, minWidth:0 }}>
                    <div style={{ flex:1, borderRadius:expandedIndicators[act.id]?"8px 0 0 8px":8, background:`${C.teal}06`, border:`1.5px solid ${C.teal}30`, borderRight:expandedIndicators[act.id]?`1.5px solid ${act.color}30`:undefined, padding:"9px 12px", display:"flex", flexDirection:"column", gap:6, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:18, height:18, borderRadius:"50%", background:act.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.white, flexShrink:0 }}>{ai+1}</div>
                          <div style={{ fontSize:11, fontWeight:800, color:act.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {ai+1}</div>
                        </div>
                        <button onClick={(e) => toggleInd(act.id, e)} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, background:"none", border:`1px solid ${act.color}40`, borderRadius:5, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                          <div style={{ fontSize:10, fontWeight:800, color:act.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Leading Indicators</div>
                          <div style={{ background:`${act.color}15`, borderRadius:8, padding:"1px 5px", fontSize:10, fontWeight:700, color:act.color }}>{act.indicators.length}</div>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:expandedIndicators[act.id]?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={act.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.5, paddingRight:expandedIndicators[act.id]?0:160 }}>{act.outcome}</div>
                    </div>
                    {expandedIndicators[act.id] && (
                      <div style={{ width:260, flexShrink:0, borderRadius:"0 8px 8px 0", background:`${act.color}08`, border:`1.5px solid ${act.color}40`, borderLeft:"none", padding:"9px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:act.color, letterSpacing:"0.08em", textTransform:"uppercase" }}>Leading Indicators</div>
                          <div style={{ background:`${act.color}15`, border:`1px solid ${act.color}30`, borderRadius:4, padding:"1px 6px", fontSize:9, fontWeight:700, color:act.color, fontStyle:"italic" }}>Draft</div>
                        </div>
                        {act.indicators.map((ind, i) => (
                          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", paddingBottom:5, borderBottom:i<act.indicators.length-1?`1px solid ${act.color}15`:"none" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:`${act.color}80`, minWidth:18, flexShrink:0, paddingTop:2 }}>{ind.num}</div>
                            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.45 }}>{ind.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Connector />
          <ImpactPanel num="4">
            <div style={{ height:1, background:C.bd }} />
            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6, fontStyle:"italic" }}>The Cross-Cutting Portfolio strengthens the team's ability to execute its strategy effectively and adapt over time — accelerating progress toward the Data & AI team's goals and the division's 2045 Ambition.</div>
            <BidirectionalDivider />
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
                <div style={{ width:3, borderRadius:2, background:C.goldMid, alignSelf:"stretch", minHeight:24, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:C.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Enabled</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.navy, lineHeight:1.2 }}>Ambition 2045</div>
                </div>
              </div>
              <div style={{ background:`${C.slate}06`, border:`1px solid ${C.slateBd}`, borderLeft:`3px solid ${C.slate}`, borderRadius:"0 7px 7px 0", padding:"10px 12px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:C.slate, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Division Effectiveness</div>
                <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>By strengthening team alignment, decision-making quality, and operational efficiency, the Cross-Cutting portfolio ensures the division can pursue and sustain progress toward the 2045 Ambition at the pace and with the level of coordination required.</div>
              </div>
            </div>
          </ImpactPanel>
        </div>
      </div>
    </div>
  );
}

// ── AI Infrastructure TOA ─────────────────────────────────────────────────────
const AI_LANES = [
  { id:"model", label:"Frontier Model Efficacy", icon:"◈", color:CI.lane1, pale:CI.lane1Pale, bd:CI.lane1Bd, hdr:CI.lane1Hdr,
    inputs:[{ title:"Datasets, Benchmarks & Evaluation Tech", items:["Domain + Subject specific benchmark datasets for tutoring, instruction, advising & navigation","Evaluation technologies assessing efficacy, safety & equity for priority populations","Simulated testing environments mirroring under-resourced school contexts","Synthetic learner panels & AI constitutions for pre-market validation"] }],
    outcome:{ title:"Improved model performance in priority education domains", body:"AI models show measurable improvements in efficacy and reduced harms for tutoring, instruction, advising, and navigation — validated in education-specific contexts for low-SES learners." },
    goalsImpact:true },
  { id:"connect", label:"Contextualization & Alignment", icon:"⇄", color:CI.lane2, pale:CI.lane2Pale, bd:CI.lane2Bd, hdr:CI.lane2Hdr,
    inputs:[{ title:"Portable Memory, A2A & Context Protocols", items:["Portable learner memory specs enabling AI to retain context across sessions","Agent-to-agent (A2A) protocols for seamless exchange of learner data & intent","Model Context Protocols (MCPs) ensuring personalization is portable across tools"] },{ title:"Middleware, MCPs & Curricular Knowledge Graphs", items:["Middleware & MCPs ensuring AI aligns to curricula, standards & existing technologies","Domain knowledge graphs (CSGA) linking competencies, skills & learning pathways","Standards integration (1EdTech, EdFi, IEEE) for interoperability across institutions"] }],
    outcome:{ title:"Personalized, portable AI that aligns to learner and institutional context", body:"AI tutors, advisors, and EdTech systems can securely exchange learner data and intent across environments — with context that aligns to the curricula, standards, and tools learners and institutions already rely on." },
    goalsImpact:true },
  { id:"eco", label:"Safety & Guardrails", icon:"⊕", color:CI.lane3, pale:CI.lane3Pale, bd:CI.lane3Bd, hdr:CI.lane3Hdr, isMultiplier:true,
    inputs:[{ title:"Standards, Protocols & Privacy Guardrails", items:["Open-source guardrail protocols & standards for safe, ethical learner data use","Privacy-preserving governance frameworks embedded into models and platforms","Age-appropriate data use protocols & field-facing assets","Public benchmark transparency and shared AI in Education knowledge base"] }],
    outcome:{ title:"A market that rewards responsible, safe, and equitable AI development", body:"Evidence of product performance and efficacy creates a reinforcing feedback loop informing how AI systems are designed, improved, assessed, and procured, so higher-quality evidence leads to higher-quality products over time as developers compete on safety and efficacy." },
    goalsImpact:false },
];
const AI_GOALS = [
  { id:"G1", label:"Goal 1", title:"Enable AI Solutions", metric:"40% of learners reached by solutions embedding portable memory & context", laneIds:["model","connect","eco"] },
  { id:"G2", label:"Goal 2", title:"Build Trusted Evidence", metric:"50% of learners reached by solutions using evidence-based benchmarks improving safety & quality", laneIds:["model","connect","eco"] },
];
const AI_PILLARS = [
  { n:"1", title:"Full Stack Instruction & Tutoring", color:CI.p1, pale:CI.p1p, t1:"1.6 grade levels/yr", t2:"7.4m + 4.4m students", contribution:"AI Infrastructure creates the foundational conditions for effective AI-enabled instruction — enabling personalized, persistent learning experiences through portable learner context, and ensuring instructional AI tools are safe, evaluated, and aligned to the curricula and standards learners rely on." },
  { n:"2", title:"AI-Enabled Gateway Math", color:CI.p2, pale:CI.p2p, t1:"80% avg pass rates", t2:"355k students / 450 institutions", contribution:"AI Infrastructure creates the foundational conditions for effective AI-enabled instruction — enabling personalized, persistent learning experiences through portable learner context, and ensuring instructional AI tools are safe, evaluated, and aligned to the curricula and standards learners rely on." },
  { n:"3", title:"AI-Enabled Personalized Advising", color:CI.p3, pale:CI.p3p, t1:"+5pp college enrollment", t2:"8.6m at LLM scale", contribution:"AI Infrastructure enables AI-powered navigation tools to access and retain learner context across institutions, ensuring advisors and AI systems can provide trustworthy, personalized guidance — and that learner records and credentials are interoperable, enabling seamless mobility across pathways." },
  { n:"4", title:"AI-Enabled Learning Mobility", color:CI.p4, pale:CI.p4p, t1:"37–45% credit transfer", t2:"1.6m students impacted", contribution:"AI Infrastructure enables AI-powered navigation tools to access and retain learner context across institutions, ensuring advisors and AI systems can provide trustworthy, personalized guidance — and that learner records and credentials are interoperable, enabling seamless mobility across pathways." },
];

function AIAmb45Panel({ hoveredPriority, setHoveredPriority, activeLane }) {
  const [expandedBucket, setExpandedBucket] = useState(null);
  const filteredGoals = activeLane ? AI_GOALS.filter(g => g.laneIds.includes(activeLane)) : AI_GOALS;
  const buckets = [{ label:"Instruction", pillars:[AI_PILLARS[0],AI_PILLARS[1]] },{ label:"Navigation", pillars:[AI_PILLARS[2],AI_PILLARS[3]] }];
  return (
    <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:5 }}>
          <div style={{ width:3, borderRadius:2, background:CI.gold, alignSelf:"stretch", minHeight:28, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:CI.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Impact Achieved</div>
            <div style={{ fontSize:13, fontWeight:800, color:CI.navy, lineHeight:1.2 }}>2030 Scale Goals</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filteredGoals.map(g => (
            <div key={g.id}>
              <div style={{ fontSize:10, fontWeight:800, color:CI.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{g.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:CI.navy, lineHeight:1.3, marginBottom:2 }}>{g.title}</div>
              <div style={{ fontSize:11, color:CI.textMid, lineHeight:1.5 }}>{g.metric}</div>
            </div>
          ))}
        </div>
      </div>
      <BidirectionalDivider />
      <div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
          <div style={{ width:3, borderRadius:2, background:CI.goldMid, alignSelf:"stretch", minHeight:28, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:CI.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Impact Enabled</div>
            <div style={{ fontSize:13, fontWeight:800, color:CI.navy, lineHeight:1.2 }}>Ambition 2045</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {buckets.map(bucket => {
            const isOpen = expandedBucket === bucket.label;
            return (
              <div key={bucket.label}>
                <button onClick={() => setExpandedBucket(isOpen ? null : bucket.label)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:3 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:CI.slate, letterSpacing:"0.06em", textTransform:"uppercase", background:CI.slatePale, padding:"4px 10px", borderLeft:`3px solid ${CI.slate}`, borderRadius:"0 4px 4px 0" }}>{bucket.label}</div>
                  <div style={{ flex:1, height:1, background:CI.bd }} />
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}>
                    <path d="M3 5 L7 9 L11 5" stroke={CI.slate} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {isOpen && (
                  <div style={{ background:`${CI.teal}04`, border:`1px solid ${CI.teal}20`, borderLeft:`3px solid ${CI.teal}`, borderRadius:"0 6px 6px 0", padding:"8px 10px", display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:8, fontWeight:800, color:CI.teal, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>AI Infrastructure Contribution</div>
                    <div style={{ fontSize:11, color:CI.textMid, lineHeight:1.6, marginBottom:4 }}>{bucket.pillars[0].contribution}</div>
                    <div style={{ height:1, background:CI.bd }} />
                    {bucket.pillars.map(p => (
                      <div key={p.n}>
                        <div style={{ fontSize:10, fontWeight:800, color:CI.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>Priority {p.n}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:CI.navy, lineHeight:1.3, marginBottom:2 }}>{p.title}</div>
                        <div style={{ fontSize:11, color:CI.textMid, lineHeight:1.5 }}>{p.t1} · {p.t2}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AIInfraToa() {
  const [activeLane, setActiveLane] = useState(null);
  const [hoveredPriority, setHoveredPriority] = useState(null);
  const toggle = id => setActiveLane(p => p === id ? null : id);
  const laneGridCols = "150px 0.75fr 78px 0.65fr";
  const lane1 = AI_LANES[0], lane2 = AI_LANES[1], lane3 = AI_LANES[2];
  const isActive1 = activeLane === lane1.id, isActive2 = activeLane === lane2.id, isActive3 = activeLane === lane3.id;
  const mergedLayers = [
    { label:"Pre-training", sub:"foundation" },
    { label:"Post-training", sub:"quality signals" },
    { label:"Domain Fine-tuning", sub:"specialization" },
    { label:"Inference Context", sub:"real-time" },
  ];
  const swimData = [
    { color:CI.lane1, pale:CI.lane1Pale, bd:CI.lane1Bd, active:[false,true,true,true], notes:[null,"Benchmarks → RLHF quality signals for accuracy, equity & trust","Curated datasets specialize models for tutoring, math & advising","Evaluation benchmarks drive procurement & field adoption decisions"], isEco:false },
    { color:CI.lane2, pale:CI.lane2Pale, bd:CI.lane2Bd, active:[false,false,true,true], notes:[null,null,"CSGA knowledge graph aligns AI to curricula, standards & competency frameworks","Portable memory & A2A protocols enable persistent personalization at inference"], isEco:false },
    { color:CI.lane3, pale:CI.lane3Pale, bd:CI.lane3Bd, active:[false,true,true,true], notes:[null,"Responsible AI & RLHF guardrails embed safety into base model weights","Safety & bias properties baked into domain-specialized models","Age-appropriate protocols & privacy governance operationalize responsible AI"], isEco:true },
  ];
  const activeSi = activeLane === lane1.id ? 0 : activeLane === lane2.id ? 1 : activeLane === lane3.id ? 2 : null;
  return (
    <div style={{ background:CI.bg, color:CI.text }}>
      <div style={{ padding:"0 18px 14px" }}>
        <div style={{ marginBottom:5 }}>
          <div style={{ display:"grid", gridTemplateColumns:`${laneGridCols} 40px 360px`, gap:5, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label="Improvement Domains" sub="What are we trying to improve?" color={CI.slate} />
            <StageHead num="2" label="Investments & Inputs" sub="What are we funding and building?" color={CI.teal} />
            <div style={{ textAlign:"center", paddingBottom:4 }}><div style={{ fontSize:8, fontWeight:800, letterSpacing:"0.12em", color:CI.teal, textTransform:"uppercase", lineHeight:1.3 }}>Cross-Cutting Accelerant</div></div>
            <StageHead num="3" label="Enabling Outcomes" sub="What changes as a result?" color={CI.teal} />
            <div />
            <StageHead num="4" label="Impact Achieved & Enabled" sub="What does this make possible?" color={CI.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`${laneGridCols} 40px 360px`, gap:5, alignItems:"center" }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${CI.slate}60, ${CI.teal})`, borderRadius:2 }} />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:CI.teal }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={CI.teal}/></svg></div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, borderTop:`2px dashed ${CI.teal}50` }} /></div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${CI.teal}, ${CI.slate})` }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={CI.slate}/></svg></div>
            <div />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${CI.slate}, ${CI.gold})`, borderRadius:2 }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={CI.gold}/></svg></div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 40px 360px", gap:0, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4, borderRight:`2px solid ${CI.bd}`, paddingRight:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:laneGridCols, gap:3, alignItems:"stretch" }}>
              {[lane1,lane2,lane3].map((lane, li) => {
                const isAct = [isActive1,isActive2,isActive3][li];
                return (
                  <div key={lane.id} style={{ display:"contents" }}>
                    <div onClick={() => toggle(lane.id)} style={{ borderRadius:8, background:isAct?lane.pale:`${lane.color}10`, border:`2px solid ${isAct?lane.color:`${lane.color}30`}`, borderLeft:`4px solid ${lane.color}`, padding:"8px 10px", display:"flex", flexDirection:"column", gap:3, justifyContent:"center", cursor:"pointer", boxShadow:isAct?`0 2px 16px ${lane.color}25`:"0 1px 3px rgba(0,0,0,0.08)", gridRow:li+1 }}>
                      <div style={{ fontSize:15, color:lane.color }}>{lane.icon}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:CI.navy, lineHeight:1.3 }}>{lane.label}</div>
                      {lane.isMultiplier && <div style={{ background:`${lane.color}30`, border:`1px solid ${lane.color}60`, borderRadius:4, padding:"2px 6px", fontSize:9, color:lane.color, fontWeight:800, textAlign:"center", letterSpacing:"0.08em", textTransform:"uppercase" }}>× Multiplier</div>}
                    </div>
                    <div style={{ borderRadius:8, background:`${CI.teal}04`, border:`1.5px solid ${isAct?lane.color:CI.bd}`, padding:"8px 10px", gridRow:li+1, boxShadow:"0 1px 3px rgba(0,0,0,0.07)" }}>
                      {lane.inputs.map((inp,ii) => (
                        <div key={ii} style={{ marginBottom:ii<lane.inputs.length-1?8:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:lane.color, marginBottom:3 }}>{inp.title}</div>
                          {inp.items.map((item,i) => <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start", marginBottom:4 }}><div style={{ width:5, height:5, borderRadius:"50%", background:lane.color, marginTop:5, flexShrink:0, opacity:0.7 }} /><div style={{ fontSize:11, color:CI.textMid, lineHeight:1.45 }}>{item}</div></div>)}
                        </div>
                      ))}
                    </div>
                    <div onClick={() => toggle(lane.id)} style={{ borderRadius:8, background:isAct?lane.pale:`${CI.teal}06`, border:`1.5px solid ${isAct?lane.color:`${CI.teal}30`}`, padding:"8px 10px 8px 14px", display:"flex", flexDirection:"column", justifyContent:"center", cursor:"pointer", gridRow:li+1, gridColumn:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        <div style={{ width:18, height:18, borderRadius:"50%", background:lane.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:CI.white, flexShrink:0 }}>{li+1}</div>
                        <div style={{ fontSize:10, fontWeight:800, color:lane.color, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {li+1}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:CI.navy, lineHeight:1.2, marginBottom:1 }}>{lane.outcome.title}</div>
                      <div style={{ fontSize:12, color:CI.textMid, lineHeight:1.5 }}>{lane.outcome.body}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ gridColumn:3, gridRow:"1 / 4", background:`${CI.teal}08`, border:`1.5px solid ${CI.tealBd}`, borderTop:`3px solid ${CI.teal}`, borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"14px 12px", gap:10, textAlign:"center" }}>
                <div style={{ fontSize:11, fontWeight:800, color:CI.navy, lineHeight:1.35 }}>Align actors to unlock scale & leverage</div>
                <div style={{ fontSize:9, color:CI.textDim, fontStyle:"italic", lineHeight:1.5 }}>Influences all lanes simultaneously</div>
              </div>
            </div>
            {activeLane && <div style={{ textAlign:"center" }}><button onClick={() => setActiveLane(null)} style={{ background:"none", border:`1px solid ${CI.bd}`, borderRadius:5, padding:"4px 14px", fontSize:12, color:CI.textDim, cursor:"pointer" }}>Clear filter ✕</button></div>}
            <div style={{ marginTop:4 }}>
              <div style={{ background:`${CI.teal}12`, border:`1.5px solid ${CI.teal}50`, borderBottom:"none", borderRadius:"8px 8px 0 0", padding:"4px 10px", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:CI.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:CI.white, flexShrink:0 }}>3</div>
                <div style={{ fontSize:10, fontWeight:800, color:CI.teal }}>Enabling Outcomes</div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}><path d="M7 2 L7 11 M3 8 L7 12 L11 8" stroke={CI.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ fontSize:10, fontWeight:700, color:CI.teal }}>Where do these outcomes drive improvements in the AI development pipeline?</div>
                <div style={{ flex:1 }} />
                <div style={{ fontSize:9, color:`${CI.teal}90`, fontStyle:"italic" }}>Deep dive ↓</div>
              </div>
              <div style={{ background:`${CI.teal}03`, border:`1.5px solid ${CI.teal}50`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:"8px 12px", boxShadow:"0 2px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5, paddingBottom:4, borderBottom:`1px solid ${CI.bd}` }}>
                  <div style={{ fontSize:10, color:CI.textDim }}>Upstream → Closest to Learner</div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{color:CI.lane1,label:"Frontier Model Efficacy"},{color:CI.lane2,label:"Contextualization"},{color:CI.lane3,label:"Safety & Guardrails"}].map(l => (
                      <div key={l.label} style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }} /><span style={{ fontSize:11, color:l.color, fontWeight:700 }}>{l.label}</span></div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4, marginBottom:4 }}>
                  {mergedLayers.map((sl, i) => (
                    <div key={i} style={{ textAlign:"center", padding:"2px 2px 3px", borderBottom:`1px solid ${CI.bd}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:i===3?CI.teal:CI.navy, lineHeight:1.2 }}>{sl.label}</div>
                      <div style={{ fontSize:11, color:CI.textDim, fontStyle:"italic" }}>{sl.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
                  {[0,1,2,3].map(gi => (
                    <div key={gi}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginBottom:3, padding:"2px 0" }}>
                        {swimData.map((sw, si) => {
                          const isActive = sw.active[gi];
                          const isDimmed = activeSi !== null && si !== activeSi;
                          const isBright = activeSi === si && isActive;
                          return (
                            <div key={si} style={{ opacity:isDimmed?0.2:1, transition:"opacity 0.18s" }}>
                              {sw.isEco
                                ? <div style={{ width:isBright?12:8, height:isBright?12:8, borderRadius:"50%", border:`2px dashed ${sw.color}${isActive?"ff":"40"}`, background:isBright?`${sw.color}30`:"transparent", transition:"all 0.18s" }} />
                                : <div style={{ width:isBright?15:isActive?11:6, height:isBright?15:isActive?11:6, borderRadius:"50%", background:isActive?sw.color:CI.white, border:`2px solid ${isActive?sw.color:`${sw.color}30`}`, boxShadow:isBright?`0 0 0 5px ${sw.color}40`:isActive?`0 0 0 2px ${sw.color}20`:"none", transition:"all 0.18s" }} />
                              }
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                        {swimData.map((sw, si) => {
                          const note = sw.notes[gi];
                          if (!note) return null;
                          const isDimmed = activeSi !== null && si !== activeSi;
                          return (
                            <div key={si} style={{ opacity:isDimmed?0.2:1, transition:"opacity 0.18s", background:sw.pale, border:`1px solid ${sw.bd}`, borderTop:`2px solid ${sw.color}`, borderRadius:"0 0 4px 4px", padding:"2px 4px" }}>
                              <div style={{ fontSize:11, color:sw.color, lineHeight:1.5 }}>{note}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", paddingTop:36, gap:2 }}>
            <div style={{ flex:"0 0 32px", width:2, background:`linear-gradient(to bottom, ${CI.bd}, ${CI.gold})`, borderRadius:1 }} />
            <svg width="24" height="24" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="14" fill={`${CI.gold}25`} stroke={CI.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={CI.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            <div style={{ fontSize:8, fontWeight:800, color:CI.goldMid, letterSpacing:"0.12em", textTransform:"uppercase", writingMode:"vertical-rl", transform:"rotate(180deg)", paddingBottom:4 }}>drives</div>
          </div>
          <div style={{ background:`${CI.gold}05`, border:`1.5px solid ${CI.gold}40`, borderTop:`3px solid ${CI.gold}`, borderRadius:10, overflow:"hidden", boxShadow:`0 2px 10px ${CI.gold}15` }}>
            <div style={{ background:`${CI.gold}0a`, borderBottom:`1px solid ${CI.gold}25`, padding:"6px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:CI.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:CI.white, flexShrink:0 }}>4</div>
              <div style={{ fontSize:11, fontWeight:800, color:CI.goldMid, letterSpacing:"0.06em", textTransform:"uppercase" }}>Impact Achieved & Enabled</div>
            </div>
            <AIAmb45Panel hoveredPriority={hoveredPriority} setHoveredPriority={setHoveredPriority} activeLane={activeLane} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Portfolio Overview — By the Numbers ──────────────────────────────────────
function PortfolioByTheNumbers({ portId, portColor }) {
  const pc = portColor || { color: ACCENT };
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const toNum = v => parseFloat(String(v||"0").replace(/[^0-9.]/g,""))||0;
    loadAllInvestments({ portfolio_id: portId }).then(rows => {
      if (cancelled) return;
      const total = rows.reduce((s, inv) => s + toNum(inv.amount), 0);
      setStats({ count: rows.length, totalBudget: total });
    }).catch(() => {
      if (!cancelled) setStats({ count: 0, totalBudget: 0 });
    });
    return () => { cancelled = true; };
  }, [portId]);

  const fmtM = n => {
    if (!n) return "—";
    if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${Math.round(n/1000)}K`;
    return `$${n}`;
  };

  const loading = stats === null;
  const STATS = [
    { label:"Active Investments",    value: loading ? "…" : String(stats.count||"0"),  sub:"grants & contracts" },
    { label:"% Co-funded",          value: "—",                                        sub:"with other teams" },
    { label:"Total Budget",         value: loading ? "…" : fmtM(stats.totalBudget),   sub:"committed investment" },
    { label:"Partners",             value: "—",                                        sub:"key external relationships" },
  ];

  return (
    <div style={{
      borderRadius:14,overflow:"hidden",
      border:"1px solid "+BORDER,
      background:`linear-gradient(135deg,${pc.color}12 0%,${SURFACE} 60%)`,
      boxShadow:"0 1px 8px rgba(0,0,0,0.05)",
    }}>
      <div style={{height:3,background:`linear-gradient(90deg,${pc.color},${pc.color}66)`}}/>
      <div style={{padding:"24px 32px"}}>
        <div style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:2.5,marginBottom:20,opacity:0.85}}>By the Numbers</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0}}>
          {STATS.map((stat,i) => (
            <div key={i} style={{
              padding:"4px 28px 4px"+(i===0?"0":""),
              borderLeft:i===0?"none":"1px solid "+BORDER,
            }}>
              <div style={{
                fontSize:44,fontWeight:800,
                color:stat.value==="—"||stat.value==="…"?BORDER:pc.color,
                letterSpacing:-2,lineHeight:1,marginBottom:8,
              }}>{stat.value}</div>
              <div style={{fontSize:13,fontWeight:700,color:TEXT,marginBottom:3}}>{stat.label}</div>
              <div style={{fontSize:11,color:TEXT_MUTED,lineHeight:1.4}}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PortfolioDashboard (per-portfolio full view) ───────────────────────────────
function PortfolioDashboard({ portId, portData, portColor, onUpdatePortfolio, onUpdateBows, onNavigateToOutcome, onNavigateToBow, onNavigateToStrategy, strategyRatings, onUpdateStrategyRatings }) {
  const { portfolio, bows } = portData;
  const pc = PORT_COLORS[portId] || PORT_COLORS["cross-cutting"];
  const [activeTab,setActiveTab] = useState("portfolio-overview");
  const [activeBow,setActiveBow] = useState(bows[0]?.id||null);
  const [bowTab,setBowTab] = useState(null);
  const [bowView,setBowView] = useState('progress'); // 'progress' | 'planning' | 'reporting'
  const [activeBowOutcomeIdx,setActiveBowOutcomeIdx] = useState(-1);
  const [activePortfolioOutcomeIdx,setActivePortfolioOutcomeIdx] = useState(0);
  const [showTeam,setShowTeam] = useState(false);
  const [hoveredBow,setHoveredBow] = useState(null);
  const [progressYear,setProgressYear] = useState(CURRENT_YEAR);
  const [expandedOutcomePanel,setExpandedOutcomePanel] = useState(null); // {idx, panel} | null

  const currentBow = bows.find(b=>b.id===activeBow);
  const inMeasurement = activeTab!=="portfolio-overview"&&activeTab!=="investments"&&activeTab!=="partners"&&activeTab!=="theory-of-action"&&activeTab!=="decision-insights";

  const updateBowOutcome = (bowId,outcomeId,updated) => onUpdateBows(bows.map(b=>b.id!==bowId?b:{...b,outcomes:b.outcomes.map(o=>o.id!==outcomeId?o:updated)}));
  const updateBowOutcomeByIdx = (bowId,oIdx,updated) => onUpdateBows(bows.map(b=>b.id!==bowId?b:{...b,outcomes:b.outcomes.map((o,i)=>i!==oIdx?o:updated)}));

  const isCrossC = portId==="cross-cutting";
  const isSFL = portId==="sfl";
  const hasTeam = isCrossC || isSFL;
  const SHORT_TITLES = isCrossC ? PO_SHORT_TITLES_CC : portfolio.portfolioOutcomes.map((po,i)=>po.shortTitle||("Outcome "+(i+1)));
  const BOW_TITLES = isCrossC ? BOW_SHORT_TITLES_CC : [];

  const BOW_COLORS_MAP = [
    {tagColor:pc.color,color:SURFACE},
    {tagColor:pc.color,color:SURFACE},
    {tagColor:pc.color,color:SURFACE},
  ];

  const ACTIVITIES_CC = [
    {text:"Drive cross-division alignment through coordination with PSTs around shared goals"},
    {text:"Use data and evidence to generate and share actionable insights"},
    {text:"Lead continuous improvement effort to enhance team coordination and impact"},
    {text:"Establish inclusive norm, culture, alignment practices, and onboarding approaches"},
  ];

  const OUTCOMES_FOR_PANEL = portfolio.portfolioOutcomes.map((po,i)=>({
    id:po.id, shortTitle:SHORT_TITLES[i]||po.shortTitle, outcome:po.outcome, manualStatus:po.manualStatus, activity:po.activity,
  }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {/* Persistent portfolio banner — always visible */}
      <div style={{background:SURFACE,borderBottom:"1px solid "+BORDER}}>
        <div style={{height:4,background:`linear-gradient(90deg, ${pc.color}, ${pc.color}88)`}}/>
        <div style={{padding:"20px 28px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:28}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",color:pc.color,marginBottom:8,opacity:0.9}}>Portfolio</div>
            <div style={{fontSize:24,color:TEXT,marginBottom:10,fontWeight:400,letterSpacing:-0.3}}>{portfolio.name||pc.label}</div>
            <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.7,maxWidth:680}}>{portfolio.description}</div>
          </div>
          <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"stretch",gap:10,minWidth:260}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Bodies of Work</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {bows.map((bow,i)=>{
                  const bc = BOW_COLORS_MAP[i]||BOW_COLORS_MAP[0];
                  return (
                    <div key={bow.id} onClick={()=>{setActiveTab("bow");setActiveBow(bow.id);setBowTab(null);setBowView("progress");setActiveBowOutcomeIdx(-1);}}
                      onMouseEnter={()=>setHoveredBow(i)} onMouseLeave={()=>setHoveredBow(null)}
                      style={{position:"relative",display:"flex",alignItems:"center",gap:8,borderRadius:8,padding:"10px 14px",background:SURFACE,border:"1px solid "+bc.tagColor+"44",borderLeft:"3px solid "+bc.tagColor,cursor:"pointer",minHeight:52,boxSizing:"border-box",transition:"box-shadow .15s",boxShadow:hoveredBow===i?"0 2px 10px rgba(0,0,0,0.08)":"none"}}>
                      <span style={{fontSize:13,fontWeight:700,color:TEXT,flex:1,lineHeight:1.3}}>{bow.name}</span>
                      <span style={{fontSize:13,fontWeight:600,color:bc.tagColor,flexShrink:0}}>→</span>
                      {hoveredBow===i&&bow.description&&(
                        <div style={{position:"absolute",bottom:"calc(100% + 6px)",right:0,width:280,background:SURFACE,border:"1px solid "+bc.tagColor+"55",borderRadius:8,padding:"10px 12px",boxShadow:"0 4px 16px rgba(10,37,64,0.12)",zIndex:10,pointerEvents:"none"}}>
                          <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.5}}>{bow.description.split('\n\n')[0].slice(0,160)}{bow.description.length>160?"…":""}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {hasTeam&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                <button onClick={()=>setShowTeam(v=>!v)}
                  style={{display:"inline-flex",alignItems:"center",gap:6,background:showTeam?pc.color:SURFACE,color:showTeam?"#fff":TEXT_SUB,border:"1px solid "+(showTeam?pc.color:BORDER),borderRadius:8,padding:"7px 14px",fontSize:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  <span style={{fontSize:14}}>{showTeam?"✕":"👥"}</span>
                  {showTeam?"Close":"Team Structure"}
                </button>
                {showTeam&&(
                  <div style={{background:SURFACE,borderRadius:10,border:"1px solid "+BORDER,padding:"14px 16px",boxShadow:"0 4px 20px rgba(10,37,64,0.1)",minWidth:260}}>
                    <div style={{fontSize:12,fontWeight:700,color:ACCENT,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10}}>Team Structure</div>
                    {isCrossC ? <OrgChart compact/> : <SFLOrgChart compact/>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Portfolio sub-tabs */}
      <div style={{background:SURFACE,borderBottom:"1px solid "+BORDER,display:"flex",gap:0,paddingLeft:4}}>
        {[{id:"portfolio-overview",label:"Overview"},{id:"theory-of-action",label:"Theory of Action"},{id:"measurement",label:"Measurement & Reporting"},{id:"investments",label:"Investments"},{id:"partners",label:"Partners"},{id:"decision-insights",label:"Decision Insights & Forecasts"}].map(tab=>{
          const active = tab.id==="portfolio-overview"?activeTab==="portfolio-overview"
            :tab.id==="investments"?activeTab==="investments"
            :tab.id==="partners"?activeTab==="partners"
            :tab.id==="theory-of-action"?activeTab==="theory-of-action"
            :tab.id==="decision-insights"?activeTab==="decision-insights"
            :inMeasurement;
          if(tab.id==="decision-insights") {
            return (
              <button key={tab.id} onClick={()=>setActiveTab("decision-insights")}
                style={{padding:"8px 14px",fontWeight:600,fontSize:12,cursor:"pointer",letterSpacing:0.2,
                  border:"1.5px solid "+(active?pc.color:ACCENT+"66"),borderRadius:7,
                  background:active?pc.color+"18":ACCENT+"08",
                  color:active?pc.color:ACCENT,
                  display:"flex",alignItems:"center",gap:5,
                  alignSelf:"center",marginLeft:8,
                  transition:"all .15s"}}>
                {tab.label}
                <span style={{fontSize:11,opacity:0.8}}>↗</span>
              </button>
            );
          }
          return <button key={tab.id}
            onClick={()=>{
              if(tab.id==="portfolio-overview") setActiveTab("portfolio-overview");
              else if(tab.id==="investments") setActiveTab("investments");
              else if(tab.id==="partners") setActiveTab("partners");
              else if(tab.id==="theory-of-action") setActiveTab("theory-of-action");
              else if(!inMeasurement) setActiveTab("portfolio-progress");
            }}
            style={{padding:"14px 20px",fontWeight:500,fontSize:13,border:"none",background:"none",cursor:"pointer",
              borderBottom:active?"2px solid "+pc.color:"2px solid transparent",
              color:active?pc.color:TEXT_MUTED,marginBottom:-1,transition:"color .15s",letterSpacing:0.1}}>
            {tab.label}
          </button>;
        })}
      </div>
      {inMeasurement&&(
        <div style={{background:SURFACE_2,borderBottom:"1px solid "+BORDER,paddingLeft:20,display:"flex",alignItems:"stretch"}}>
          <div style={{display:"flex",flexDirection:"column",marginRight:8}}>
            <div style={{fontSize:10,fontWeight:600,color:pc.color,textTransform:"uppercase",letterSpacing:1.5,padding:"5px 16px 0",opacity:0.7}}>Portfolio</div>
            <button onClick={()=>setActiveTab("portfolio-progress")}
              style={{padding:"6px 16px 8px",fontWeight:500,fontSize:13,border:"none",background:"none",cursor:"pointer",
                borderBottom:activeTab==="portfolio-progress"?"2px solid "+pc.color:"2px solid transparent",
                color:activeTab==="portfolio-progress"?pc.color:TEXT_MUTED,marginBottom:-1,whiteSpace:"nowrap"}}>
              Portfolio Progress
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 8px"}}>
            <div style={{width:1,height:28,background:BORDER}}/>
            <div style={{fontSize:10,color:TEXT_MUTED,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,lineHeight:1.3,textAlign:"center"}}>Bodies<br/>of Work</div>
            <svg width="10" height="20" viewBox="0 0 10 20"><polyline points="2,4 8,10 2,16" fill="none" stroke={BORDER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            {bows.map(b=>{
              const active=activeTab==="bow"&&activeBow===b.id;
              return <div key={b.id} style={{display:"flex",flexDirection:"column"}}>
                <div style={{height:14}}/>
                <button onClick={()=>{setActiveTab("bow");setActiveBow(b.id);setBowView("progress");setActiveBowOutcomeIdx(-1);}}
                  style={{padding:"6px 16px 8px",fontWeight:active?600:400,fontSize:13,cursor:"pointer",
                    background:"transparent",border:"none",
                    borderBottom:active?"2px solid "+pc.color:"2px solid transparent",
                    color:active?pc.color:TEXT_MUTED,marginBottom:-1,whiteSpace:"nowrap",transition:"color .15s"}}>
                  {b.name}
                </button>
              </div>;
            })}
          </div>
        </div>
      )}
      <div style={{padding:"28px 32px"}}>
        {activeTab==="portfolio-overview"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>

            {/* By the Numbers — prominent strip */}
            <PortfolioByTheNumbers portId={portId} portColor={pc}/>

            {/* Two-column: outcomes left, goals right */}
            <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>

              {/* Portfolio Outcomes — left */}
              <div style={{flex:1,minWidth:0,background:SURFACE,borderRadius:14,border:"1px solid "+BORDER,padding:"22px 28px",boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:18}}>Portfolio Outcomes</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                  {OUTCOMES_FOR_PANEL.map((o,i)=>(
                    <div key={o.id} style={{
                      flex:"1 1 260px",minWidth:220,maxWidth:"100%",
                      borderRadius:12,overflow:"hidden",
                      border:"1px solid "+BORDER,
                      display:"flex",flexDirection:"column",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                      background:SURFACE,
                    }}>
                      <div style={{height:4,background:`linear-gradient(90deg,${pc.color},${pc.color}88)`,flexShrink:0}}/>
                      <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:10,flex:1}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                          <span style={{
                            flexShrink:0,width:24,height:24,borderRadius:"50%",
                            background:pc.color+"18",border:"1.5px solid "+pc.color+"55",
                            fontSize:11,fontWeight:700,color:pc.color,
                            display:"inline-flex",alignItems:"center",justifyContent:"center",
                            marginTop:1,
                          }}>{i+1}</span>
                          <div style={{fontSize:14,fontWeight:700,color:TEXT,lineHeight:1.4}}>{o.shortTitle}</div>
                        </div>
                        <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.65,paddingLeft:34}}>{o.outcome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2030 Strategy Goals — right */}
              <div style={{flexShrink:0,width:260,background:SURFACE,borderRadius:14,border:"1px solid "+BORDER,padding:"22px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>2030 Strategy Goals</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(PORT_GOAL_MAP[portId]||[]).map(gNum=>{
                    const g = STRATEGY_GOALS.find(x=>x.number===gNum);
                    if(!g) return null;
                    return (
                      <div key={g.id}
                        onClick={()=>onNavigateToStrategy&&onNavigateToStrategy(g.number)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,
                          border:"1px solid "+g.color+"44",background:g.color+"08",
                          cursor:onNavigateToStrategy?"pointer":"default",transition:"box-shadow .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)";}}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                        <span style={{width:24,height:24,borderRadius:"50%",background:g.color,color:"#fff",fontSize:11,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{g.number}</span>
                        <span style={{fontSize:13,fontWeight:600,color:TEXT,lineHeight:1.3,flex:1}}>{g.title}</span>
                        {onNavigateToStrategy&&<span style={{fontSize:11,color:TEXT_MUTED,flexShrink:0}}>↗</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}
        {activeTab==="portfolio-progress"&&(
          <PortfolioOutcomesView portId={portId} portfolio={portfolio} bows={bows} portColor={pc} onChange={p=>onUpdatePortfolio(p)} initialIdx={activePortfolioOutcomeIdx} portShortTitles={SHORT_TITLES} onNavigateToStrategy={onNavigateToStrategy}/>
        )}
        {activeTab==="investments"&&(
          <PortfolioInvestmentsRollup bows={bows} portColor={pc} portId={portId} onUpdateBows={onUpdateBows}/>
        )}
        {activeTab==="partners"&&(
          <PortfolioPartnersView portId={portId} portColor={pc}/>
        )}
        {activeTab==="decision-insights"&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:360}}>
            <div style={{textAlign:"center",maxWidth:480}}>
              <div style={{width:56,height:56,borderRadius:16,background:pc.color+"15",border:"1.5px solid "+pc.color+"33",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:26}}>
                ✦
              </div>
              <div style={{fontSize:20,fontWeight:700,color:TEXT,marginBottom:10}}>Decision Insights & Forecasts</div>
              <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.7,marginBottom:24}}>
                This view will connect directly to the portfolio dashboard within our AI-enabled forecasting and analysis tool, surfacing predictive insights, scenario models, and decision-support signals for this portfolio.
              </div>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 18px",borderRadius:20,background:pc.color+"12",border:"1px solid "+pc.color+"33"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:pc.color,display:"inline-block",animation:"pulse 2s ease-in-out infinite"}}/>
                <span style={{fontSize:12,fontWeight:600,color:pc.color}}>Coming Soon</span>
              </div>
            </div>
          </div>
        )}
        {activeTab==="theory-of-action"&&(
          <div style={{margin:"0 -32px",overflowX:"auto"}}>
            {portId==="ai-infra"&&<AIInfraToa/>}
            {portId==="sfl"&&<SFLToa/>}
            {portId==="hub"&&<DAHToa/>}
            {portId==="cross-cutting"&&<CCToa/>}
          </div>
        )}
        {activeTab==="bow"&&currentBow&&(
          <div>
            <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:12,padding:22,marginBottom:22,boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
              {/* BOW name row */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,fontWeight:700,color:TEXT}}>{currentBow.name}</span>
                  <span style={{fontSize:11,fontWeight:600,color:TEXT_MUTED,background:BG,borderRadius:5,padding:"2px 7px",border:"1px solid "+BORDER}}>Body of Work</span>
                </div>
                <span style={{background:"#FEF5E7",color:"#92400E",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700,border:"1px solid #FDE68A"}}>WIP</span>
                <div style={{marginLeft:"auto"}}>
                  <BowRatingsPopover bow={currentBow} onUpdate={updated=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:updated))}/>
                </div>
              </div>

              {/* Description — full width */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Description</div>
                <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.7}}>
                  {currentBow.description.split('\n\n').map((para,i)=><p key={i} style={{margin:i===0?"0 0 10px 0":"0"}}>{para}</p>)}
                </div>
              </div>

              {/* Budget + Delegate — compact inline row */}
              <div style={{display:"flex",gap:20,paddingTop:14,borderTop:"1px solid "+BORDER}}>
                {/* Budget */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Budget</span>
                  {currentBow.editingBudget
                    ? <input value={currentBow.budget||""} onChange={e=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:{...b,budget:e.target.value}))} placeholder="e.g. $2,000,000" autoFocus style={{border:"1px solid "+pc.color,borderRadius:5,padding:"3px 8px",fontSize:12,fontFamily:"inherit",outline:"none",color:TEXT,width:140}}/>
                    : <span style={{fontSize:13,fontWeight:600,color:currentBow.budget?pc.color:TEXT_MUTED,fontStyle:currentBow.budget?"normal":"italic"}}>{currentBow.budget||"Not set"}</span>
                  }
                  <button onClick={()=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:{...b,editingBudget:!b.editingBudget}))}
                    style={{fontSize:11,cursor:"pointer",borderRadius:5,padding:"2px 8px",border:"1px solid "+BORDER,background:"transparent",color:TEXT_MUTED}}>
                    {currentBow.editingBudget?"Done":"Edit"}
                  </button>
                </div>
                <div style={{width:1,background:BORDER}}/>
                {/* Delegate */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Delegate</span>
                  {currentBow.editingDelegate
                    ? <input value={currentBow.delegate||""} onChange={e=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:{...b,delegate:e.target.value}))} placeholder="Name and role" autoFocus style={{border:"1px solid "+pc.color,borderRadius:5,padding:"3px 8px",fontSize:12,fontFamily:"inherit",outline:"none",color:TEXT,width:160}}/>
                    : <span style={{fontSize:13,fontWeight:600,color:currentBow.delegate?TEXT:TEXT_MUTED,fontStyle:currentBow.delegate?"normal":"italic"}}>{currentBow.delegate||"Not assigned"}</span>
                  }
                  <button onClick={()=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:{...b,editingDelegate:!b.editingDelegate}))}
                    style={{fontSize:11,cursor:"pointer",borderRadius:5,padding:"2px 8px",border:"1px solid "+BORDER,background:"transparent",color:TEXT_MUTED}}>
                    {currentBow.editingDelegate?"Done":"Edit"}
                  </button>
                </div>
              </div>
            </div>
            {/* View toggle */}
            <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid "+BORDER}}>
              {[["progress","Progress"],["reporting","Reporting"],...(currentBow.decisions?.length>0?[["decisions","Decisions"]]:[])].map(([v,label])=>(
                <button key={v} onClick={()=>setBowView(v)}
                  style={{padding:"10px 18px",fontSize:13,fontWeight:bowView===v?600:400,border:"none",background:"none",cursor:"pointer",
                    borderBottom:bowView===v?"2px solid "+pc.color:"2px solid transparent",
                    color:bowView===v?pc.color:TEXT_MUTED,marginBottom:-1,transition:"color .15s",letterSpacing:0.1}}>
                  {label}
                </button>
              ))}
            </div>
            {bowView==="progress"&&(
              <div>
                {currentBow.outcomes.length>0&&(
                  <div>
                    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:0}}>
                      {currentBow.outcomes.map((o,i)=>{
                        const active=i===activeBowOutcomeIdx;
                        const manualRs=o.manualStatus&&STATUS[o.manualStatus]?STATUS[o.manualStatus]:null;
                        const exec=execAutoStatus(o,progressYear); const impact=impactAutoStatus(o);
                        return (
                          <div key={o.id} onClick={()=>setActiveBowOutcomeIdx(active?-1:i)}
                            style={{flex:1,minWidth:220,border:"1.5px solid "+(active?pc.color:manualRs?manualRs.color+"55":BORDER),borderRadius:12,overflow:"hidden",background:active?pc.light:manualRs?manualRs.bg:SURFACE,cursor:"pointer",transition:"all .15s",boxShadow:active?"0 4px 16px rgba(0,0,0,0.1)":"0 2px 8px rgba(10,37,64,0.06)"}}>
                            <div style={{padding:"16px 18px 12px"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                <span style={{fontSize:14,fontWeight:700,color:active?pc.color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8}}>Outcome {o.number}</span>
                                <span style={{fontSize:15,color:active?pc.color:TEXT_SUB,fontWeight:600}}>{active?"▴":"▾"}</span>
                              </div>
                              <div style={{fontSize:15,fontWeight:700,color:TEXT,lineHeight:1.35,marginBottom:6}}>{BOW_TITLES[i]||o.shortTitle||"Outcome "+(i+1)}</div>
                              <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.6,marginBottom:12}}>{o.title}</div>
                            </div>
                            <div style={{padding:"10px 18px 12px",borderTop:"1px solid "+(manualRs?manualRs.color+"22":BORDER),background:manualRs?manualRs.pill+"88":"#FAFBFC",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>Execution {progressYear}</div>
                                {exec?<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:exec.color,display:"inline-block"}}/><span style={{fontSize:14,fontWeight:700,color:exec.color}}>{exec.completed}/{exec.total}</span></div>:<span style={{fontSize:13,color:TEXT_SUB}}>No targets</span>}
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>Impact</div>
                                {impact?<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:impact.color,display:"inline-block"}}/><span style={{fontSize:14,fontWeight:700,color:impact.color}}>{impact.label.replace(" Expectations","")}</span></div>:<span style={{fontSize:13,color:TEXT_SUB}}>—</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {activeBowOutcomeIdx>=0&&activeBowOutcomeIdx<currentBow.outcomes.length&&(
                      <div style={{marginTop:16,border:"1.5px solid "+BORDER,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(10,37,64,0.08)"}}>
                        <BowOutcomePanel outcome={currentBow.outcomes[activeBowOutcomeIdx]} onUpdate={u=>updateBowOutcome(activeBow,currentBow.outcomes[activeBowOutcomeIdx].id,u)}/>
                      </div>
                    )}
                  </div>
                )}
                {currentBow.outcomes.length===0&&<div style={{color:TEXT_SUB,fontSize:15,textAlign:"center",padding:48}}>No outcomes defined yet.</div>}
              </div>
            )}
            {bowView==="reporting"&&<BowReportingView bow={currentBow} portColor={pc}/>}
            {bowView==="decisions"&&currentBow.decisions?.length>0&&<BowDecisionsView bow={currentBow} portColor={pc}
              onUpdate={updated=>onUpdateBows(bows.map(b=>b.id!==activeBow?b:{...updated}))}/>}
          </div>
        )}
      </div>
    </div>
  );
}


// ── GoalExplorer ──────────────────────────────────────────────────────────────
const GOAL_PORT_MAP = {
  1: ["ai-infra"],
  2: ["ai-infra"],
  3: ["sfl"],
  4: ["sfl"],
  5: ["cross-cutting"],
};
const PORT_GOAL_MAP = {
  "ai-infra":       [1, 2, 5],
  "sfl":            [3, 4, 5],
  "cross-cutting":  [5],
  "hub":            [5],
};
// Goals where portfolio-specific targets are still pending
const GOAL_TARGETS_PENDING = {
  "sfl": [5],
};

function GoalExplorer({ strategyRatings }) {
  const [hovered, setHovered] = useState(null); // {type:"goal"|"port", id}

  const isGoalLit = (gNum) => {
    if (!hovered) return false;
    if (hovered.type === "goal") return hovered.id === gNum;
    if (hovered.type === "port") return (PORT_GOAL_MAP[hovered.id]||[]).includes(gNum);
    return false;
  };
  const isPortLit = (portId) => {
    if (!hovered) return false;
    if (hovered.type === "port") return hovered.id === portId;
    if (hovered.type === "goal") return (GOAL_PORT_MAP[hovered.id]||[]).includes(portId);
    return false;
  };
  const isAnyHovered = !!hovered;

  const PORTS = [
    {id:"ai-infra",       label:"AI Infrastructure",          color:"#3086AB", light:"#EBF4F9"},
    {id:"sfl",            label:"System Feedback Loops",       color:"#4EAB9A", light:"#ECF7F5"},
    {id:"cross-cutting",  label:"Cross Cutting Supports",      color:"#A49A8C", light:"#F5F3ED"},
    {id:"hub",            label:"Data & AI Enablement Hub",    color:"#FBAE40", light:"#FEF5E7", note:"Enables all"},
  ];

  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,marginBottom:14}}>Portfolio → Goal Linkages</div>
      <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"22px 24px",boxShadow:"0 2px 8px rgba(10,37,64,0.06)",display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:0,alignItems:"center"}}>

        {/* Goals — left */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {STRATEGY_GOALS.map(g => {
            const lit = isGoalLit(g.number);
            const dim = isAnyHovered && !lit;
            const rs = strategyRatings[g.id] && STATUS[strategyRatings[g.id]] ? STATUS[strategyRatings[g.id]] : null;
            return (
              <div key={g.id}
                onMouseEnter={()=>setHovered({type:"goal",id:g.number})}
                onMouseLeave={()=>setHovered(null)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px solid "+(lit?(GOAL_PORT_MAP[g.number]||[]).length>0?PORT_COLORS[(GOAL_PORT_MAP[g.number]||[])[0]]?.color||ACCENT:ACCENT:BORDER),background:lit?"#F7F8FA":SURFACE,cursor:"default",transition:"all .15s",opacity:dim?0.35:1,boxShadow:lit?"0 2px 10px rgba(10,37,64,0.08)":"none"}}>
                <span style={{width:24,height:24,borderRadius:"50%",background:lit?(GOAL_PORT_MAP[g.number]||[]).length>0?PORT_COLORS[(GOAL_PORT_MAP[g.number]||[])[0]]?.color||ACCENT:ACCENT:BORDER,color:lit?"#fff":TEXT_SUB,fontSize:12,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>{g.number}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:lit?TEXT:TEXT_SUB,lineHeight:1.3,transition:"color .15s"}}>{g.title}</div>
                </div>
                {rs&&<span style={{width:8,height:8,borderRadius:"50%",background:rs.color,flexShrink:0,display:"inline-block"}}/>}
              </div>
            );
          })}
        </div>

        {/* Center label */}
        <div style={{padding:"0 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          <div style={{width:1,flex:1,background:BORDER,minHeight:20}}/>
          <span style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.8,whiteSpace:"nowrap",transform:"rotate(0deg)"}}>drives</span>
          <div style={{width:1,flex:1,background:BORDER,minHeight:20}}/>
        </div>

        {/* Portfolios — right */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {PORTS.map(p => {
            const lit = isPortLit(p.id);
            const dim = isAnyHovered && !lit;
            return (
              <div key={p.id}
                onMouseEnter={()=>setHovered({type:"port",id:p.id})}
                onMouseLeave={()=>setHovered(null)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1.5px solid "+(lit?p.color:BORDER),background:lit?p.light:SURFACE,cursor:"default",transition:"all .15s",opacity:dim?0.35:1,boxShadow:lit?"0 2px 10px rgba(10,37,64,0.08)":"none"}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:p.color,flexShrink:0,display:"inline-block",transition:"transform .15s",transform:lit?"scale(1.3)":"scale(1)"}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:lit?p.color:TEXT_SUB,lineHeight:1.3,transition:"color .15s"}}>{p.label}</div>
                  {p.note&&<div style={{fontSize:12,color:TEXT_SUB,marginTop:1}}>{p.note}</div>}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ── ScenarioModelingButton ────────────────────────────────────────────────────
function ScenarioModelingButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:8,border:"2px dashed "+BORDER,background:SURFACE,cursor:"default",fontSize:14,fontWeight:700,color:TEXT_SUB,transition:"opacity .15s",opacity:hovered?1:0.7}}>
        <span style={{fontSize:15}}>🔮</span>
        Future Scenario Modeling
        <span style={{fontSize:11,fontWeight:700,color:YELLOW,background:"rgba(245,158,11,0.15)",borderRadius:4,padding:"2px 7px",border:"1px solid rgba(245,158,11,0.3)",textTransform:"uppercase",letterSpacing:0.5}}>Coming Soon</span>
      </button>
      {hovered&&(
        <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,zIndex:20,background:BRAND,borderRadius:10,padding:"14px 16px",boxShadow:"0 8px 24px rgba(10,37,64,0.18)",width:320,pointerEvents:"none"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:6}}>Future Scenario Modeling Tool</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>Explore how different portfolio investments and field conditions might shape progress toward this goal. Model optimistic, baseline, and risk scenarios to inform strategic planning and resource allocation.</div>
          <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.4)"}}>This tool is under development and will be available in a future release.</div>
        </div>
      )}
    </div>
  );
}

// ── CoLeverageButton ─────────────────────────────────────────────────────────
function CoLeverageButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:8,border:"2px dashed "+BORDER,background:SURFACE,cursor:"default",fontSize:14,fontWeight:700,color:TEXT_SUB,transition:"opacity .15s",opacity:hovered?1:0.7}}>
        <span style={{fontSize:15}}>🔗</span>
        USP Co-Leverage Tracking
        <span style={{fontSize:11,fontWeight:700,color:YELLOW,background:"rgba(245,158,11,0.15)",borderRadius:4,padding:"2px 7px",border:"1px solid rgba(245,158,11,0.3)",textTransform:"uppercase",letterSpacing:0.5}}>Coming Soon</span>
      </button>
      {hovered&&(
        <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,zIndex:20,background:BRAND,borderRadius:10,padding:"14px 16px",boxShadow:"0 8px 24px rgba(10,37,64,0.18)",width:340,pointerEvents:"none"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:6}}>USP Co-Leverage Tracking</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>Track co-investment and leverage across USP portfolio partners — hyperscalers, philanthropic organizations, VC and impact investors, and public funders — to monitor progress toward the 2–3x leverage goal.</div>
          <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.4)"}}>This tool is under development and will be available in a future release.</div>
        </div>
      )}
    </div>
  );
}

// ── MomentumHeatmap ───────────────────────────────────────────────────────────
// Placeholder state-level coverage data per momentum point (0–100)
const STATE_COVERAGE = {
  // [algebra, gateway, psEnroll, recognized, credential]
  AL:{n:"AL",v:[55,40,30,15,25]}, AK:{n:"AK",v:[30,25,18,8,12]},
  AZ:{n:"AZ",v:[60,48,42,22,35]}, AR:{n:"AR",v:[45,35,28,12,20]},
  CA:{n:"CA",v:[72,65,58,38,50]}, CO:{n:"CO",v:[68,60,54,32,45]},
  CT:{n:"CT",v:[75,70,62,42,55]}, DE:{n:"DE",v:[65,58,50,28,42]},
  FL:{n:"FL",v:[62,52,45,25,38]}, GA:{n:"GA",v:[58,48,40,20,32]},
  HI:{n:"HI",v:[50,42,36,18,28]}, ID:{n:"ID",v:[48,38,32,14,22]},
  IL:{n:"IL",v:[70,62,55,35,48]}, IN:{n:"IN",v:[60,52,44,24,36]},
  IA:{n:"IA",v:[65,55,48,28,40]}, KS:{n:"KS",v:[58,48,42,22,34]},
  KY:{n:"KY",v:[50,42,35,16,26]}, LA:{n:"LA",v:[48,38,30,12,20]},
  ME:{n:"ME",v:[62,52,46,26,38]}, MD:{n:"MD",v:[72,65,58,38,52]},
  MA:{n:"MA",v:[78,72,65,45,60]}, MI:{n:"MI",v:[65,55,48,28,40]},
  MN:{n:"MN",v:[70,62,56,36,50]}, MS:{n:"MS",v:[42,32,25,10,16]},
  MO:{n:"MO",v:[58,48,42,22,34]}, MT:{n:"MT",v:[45,36,30,12,20]},
  NE:{n:"NE",v:[62,52,46,26,38]}, NV:{n:"NV",v:[55,45,38,18,30]},
  NH:{n:"NH",v:[68,60,54,34,46]}, NJ:{n:"NJ",v:[75,68,62,42,55]},
  NM:{n:"NM",v:[48,38,30,12,20]}, NY:{n:"NY",v:[74,67,60,40,54]},
  NC:{n:"NC",v:[62,52,45,25,38]}, ND:{n:"ND",v:[55,45,38,18,28]},
  OH:{n:"OH",v:[65,55,48,28,40]}, OK:{n:"OK",v:[52,42,35,15,25]},
  OR:{n:"OR",v:[65,56,50,30,42]}, PA:{n:"PA",v:[68,60,54,34,46]},
  RI:{n:"RI",v:[70,62,55,35,48]}, SC:{n:"SC",v:[55,45,38,18,30]},
  SD:{n:"SD",v:[52,42,36,16,26]}, TN:{n:"TN",v:[55,45,38,18,30]},
  TX:{n:"TX",v:[65,55,48,28,40]}, UT:{n:"UT",v:[60,50,44,24,36]},
  VT:{n:"VT",v:[68,60,54,34,46]}, VA:{n:"VA",v:[70,62,56,36,50]},
  WA:{n:"WA",v:[70,62,56,36,50]}, WV:{n:"WV",v:[45,35,28,10,18]},
  WI:{n:"WI",v:[65,55,48,28,40]}, WY:{n:"WY",v:[48,38,32,14,22]},
  DC:{n:"DC",v:[78,72,65,45,60]},
};

// Simple Albers-like projected state centroids for a schematic tile map
// Using a cartogram-style grid layout (col, row) for clarity
const STATE_GRID = {
  AK:{c:0,r:7}, ME:{c:11,r:0}, VT:{c:10,r:0}, NH:{c:11,r:1},
  WA:{c:1,r:0}, MT:{c:2,r:0}, ND:{c:3,r:0}, MN:{c:4,r:0}, IL:{c:5,r:1}, WI:{c:6,r:0}, MI:{c:7,r:0}, NY:{c:9,r:1}, MA:{c:11,r:2}, RI:{c:11,r:3},
  OR:{c:1,r:1}, ID:{c:2,r:1}, SD:{c:3,r:1}, IA:{c:5,r:2}, IN:{c:6,r:2}, OH:{c:7,r:1}, PA:{c:8,r:1}, NJ:{c:9,r:2}, CT:{c:10,r:2}, DE:{c:9,r:3},
  CA:{c:1,r:2}, NV:{c:2,r:2}, WY:{c:3,r:2}, NE:{c:4,r:2}, MO:{c:5,r:3}, KY:{c:6,r:3}, WV:{c:7,r:2}, VA:{c:8,r:2}, MD:{c:9,r:2},
  AZ:{c:2,r:4}, UT:{c:2,r:3}, CO:{c:3,r:3}, KS:{c:4,r:3}, AR:{c:5,r:4}, TN:{c:6,r:4}, NC:{c:7,r:3}, SC:{c:8,r:3},
  NM:{c:2,r:5}, OK:{c:4,r:4}, MS:{c:5,r:5}, AL:{c:6,r:5}, GA:{c:7,r:4},
  TX:{c:4,r:5}, LA:{c:5,r:6}, FL:{c:7,r:6},
  HI:{c:2,r:7},
  DC:{c:9,r:3}, VT:{c:10,r:1},
};

function coverageColor(val) {
  // Amber scale: low = light cream, high = deep amber
  if (val === undefined || val === null) return "#F1F5F9";
  if (val >= 70) return "#B45309";
  if (val >= 55) return "#D97706";
  if (val >= 40) return "#F59E0B";
  if (val >= 25) return "#FCD34D";
  return "#FEF3C7";
}

function MomentumHeatmap({ points }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tooltip, setTooltip] = useState(null);
  const CELL = 38, GAP = 2;
  const COLS = 12, ROWS = 8;
  const W = COLS * (CELL + GAP), H = ROWS * (CELL + GAP);

  const states = Object.entries(STATE_GRID);

  return (
    <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"20px 24px",boxShadow:"0 1px 6px rgba(10,37,64,0.06)"}}>
      {/* Header + indicator selector */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>State Coverage Heatmap</div>
          <div style={{fontSize:12,color:TEXT_SUB}}>% of state/district systems able to measure this E-W Momentum Point — Placeholder data</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {points.map((pt,i)=>(
            <button key={i} onClick={()=>setActiveIdx(i)}
              style={{padding:"5px 12px",fontSize:12,fontWeight:700,borderRadius:20,border:"none",cursor:"pointer",
                background:activeIdx===i?"#F59E0B":BG,
                color:activeIdx===i?"#fff":TEXT_SUB,
                boxShadow:activeIdx===i?"0 2px 6px rgba(245,158,11,0.35)":"none",
                transition:"all .15s"}}>
              {i+1}. {pt.short}
            </button>
          ))}
        </div>
      </div>

      {/* Map + legend row */}
      <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
        {/* SVG tile map */}
        <div style={{position:"relative",flexShrink:0}}>
          <svg width={W} height={H} style={{display:"block"}}>
            {states.map(([abbr, pos])=>{
              const sd = STATE_COVERAGE[abbr];
              if (!sd) return null;
              const val = sd.v[activeIdx];
              const x = pos.c * (CELL + GAP);
              const y = pos.r * (CELL + GAP);
              const fill = coverageColor(val);
              return (
                <g key={abbr}
                  onMouseEnter={e=>setTooltip({abbr,val,x:e.clientX,y:e.clientY})}
                  onMouseLeave={()=>setTooltip(null)}
                  style={{cursor:"default"}}>
                  <rect x={x} y={y} width={CELL} height={CELL} rx={4} fill={fill} stroke="#fff" strokeWidth={1.5}/>
                  <text x={x+CELL/2} y={y+CELL/2-4} textAnchor="middle" dominantBaseline="middle"
                    style={{fontSize:"8px",fontWeight:700,fill: val>=40?"#78350F":"#92400E",pointerEvents:"none",userSelect:"none"}}>
                    {abbr}
                  </text>
                  <text x={x+CELL/2} y={y+CELL/2+7} textAnchor="middle" dominantBaseline="middle"
                    style={{fontSize:"9px",fontWeight:800,fill: val>=40?"#78350F":"#B45309",pointerEvents:"none",userSelect:"none"}}>
                    {val}%
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Tooltip */}
          {tooltip && (
            <div style={{position:"fixed",top:tooltip.y-48,left:tooltip.x+10,background:BRAND,color:"#fff",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,pointerEvents:"none",zIndex:9999,boxShadow:"0 4px 16px rgba(10,37,64,0.2)",whiteSpace:"nowrap"}}>
              {tooltip.abbr} — {tooltip.val}% coverage
              <div style={{fontSize:10,fontWeight:400,opacity:0.7,marginTop:2}}>{points[activeIdx]?.label}</div>
            </div>
          )}
        </div>

        {/* Color legend + national stats */}
        <div style={{display:"flex",flexDirection:"column",gap:14,minWidth:160}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Coverage Level</div>
            {[
              {range:"70–100%", color:"#B45309", label:"Strong"},
              {range:"55–69%",  color:"#D97706", label:"Developing"},
              {range:"40–54%",  color:"#F59E0B", label:"Emerging"},
              {range:"25–39%",  color:"#FCD34D", label:"Limited"},
              {range:"0–24%",   color:"#FEF3C7", label:"Minimal"},
            ].map(l=>(
              <div key={l.range} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{width:14,height:14,borderRadius:3,background:l.color,flexShrink:0,border:"1px solid rgba(0,0,0,0.08)"}}/>
                <span style={{fontSize:11,color:TEXT_SUB}}><strong>{l.range}</strong> — {l.label}</span>
              </div>
            ))}
          </div>

          {/* National summary for active indicator */}
          <div style={{background:"#FEF5E7",borderRadius:8,border:"1px solid #FDE68A",padding:"12px 14px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>National Avg.</div>
            <div style={{fontSize:22,fontWeight:800,color:"#B45309"}}>
              {Math.round(Object.values(STATE_COVERAGE).reduce((s,d)=>s+(d.v[activeIdx]||0),0)/Object.keys(STATE_COVERAGE).length)}%
            </div>
            <div style={{fontSize:11,color:"#92400E",marginTop:3,lineHeight:1.4}}>{points[activeIdx]?.label}</div>
          </div>

          <div style={{fontSize:10,color:TEXT_SUB,lineHeight:1.5}}>
            ⚠ Placeholder data only. Not for distribution.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GoalDetailChart ───────────────────────────────────────────────────────────
function GoalDetailChart({ g }) {
  const pct = Math.round((g.current2026 / g.goal2030) * 100);

  // ── Goals 1 & 2: line chart Y-o-Y left + interactive breakout right ──────────
  if (g.chartType === "bar-grouped") {
    const C_INSTRUCTION = "#0A2540";
    const C_ADVISING    = "#3086AB";
    const [expanded, setExpanded] = useState(null);

    const allRows = [
      { year: g.baseline.year, instruction: 0, advising: 0, allLearners: g.baseline.total, isBaseline: true },
      ...g.groupedData,
    ];

    // Latest data point for right panel
    const latest = g.groupedData[g.groupedData.length - 1];
    const segments = [
      { key:"instruction", label:"Instruction + Tutoring", val:latest.instruction, color:C_INSTRUCTION },
      { key:"advising",    label:"Advising + Navigation",  val:latest.advising,    color:C_ADVISING },
    ];

    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2}}>Progress Toward 2030 Target</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

          {/* LEFT — recharts line chart */}
          <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"20px 20px 14px",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
            <div style={{fontSize:12,fontWeight:700,color:TEXT,marginBottom:2}}>All Learners Reached</div>
            <div style={{fontSize:11,color:TEXT_SUB,marginBottom:14}}>% of students in K-12 and PS</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={allRows} margin={{top:8,right:20,bottom:0,left:-16}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
                <XAxis dataKey="year" tick={{fontSize:10,fill:TEXT_SUB}} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fontSize:10,fill:TEXT_SUB}} tickLine={false} tickFormatter={v=>v+"%"}/>
                <Tooltip
                  contentStyle={{fontSize:11,borderRadius:8,border:"1px solid "+BORDER,boxShadow:"0 4px 12px rgba(10,37,64,0.1)"}}
                  formatter={(v,n)=>[v!==null?v+"%":"—",n]}/>
                {/* Target reference line */}
                <Line type="monotone" dataKey="allLearners" name="All Learners" stroke={BRAND} strokeWidth={2.5}
                  dot={(props)=>{
                    const {cx,cy,payload} = props;
                    if (payload.allLearners===null) return <circle r={0}/>;
                    return <circle cx={cx} cy={cy} r={4} fill={BRAND} stroke="#fff" strokeWidth={2}/>;
                  }}
                  connectNulls={false}/>
                {/* Instruction line */}
                <Line type="monotone" dataKey="instruction" name="Instruction + Tutoring" stroke={C_INSTRUCTION} strokeWidth={1.5}
                  strokeDasharray="5 3" opacity={0.5}
                  dot={(props)=>{
                    const {cx,cy,payload}=props;
                    return payload.instruction!==null
                      ? <circle cx={cx} cy={cy} r={3} fill={C_INSTRUCTION} stroke="#fff" strokeWidth={1.5} opacity={0.6}/>
                      : <circle r={0}/>;
                  }} connectNulls={false}/>
                {/* Advising line */}
                <Line type="monotone" dataKey="advising" name="Advising + Navigation" stroke={C_ADVISING} strokeWidth={1.5}
                  strokeDasharray="5 3" opacity={0.5}
                  dot={(props)=>{
                    const {cx,cy,payload}=props;
                    return payload.advising!==null
                      ? <circle cx={cx} cy={cy} r={3} fill={C_ADVISING} stroke="#fff" strokeWidth={1.5} opacity={0.6}/>
                      : <circle r={0}/>;
                  }} connectNulls={false}/>
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
              {[
                {c:BRAND,l:"All Learners",solid:true},
                {c:C_INSTRUCTION,l:"Instruction + Tutoring",solid:false},
                {c:C_ADVISING,l:"Advising + Navigation",solid:false},
              ].map(x=>(
                <div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <svg width={18} height={8}>
                    <line x1={0} y1={4} x2={18} y2={4} stroke={x.c} strokeWidth={x.solid?2.5:1.5}
                      strokeDasharray={x.solid?"none":"5 3"} opacity={x.solid?1:0.6}/>
                  </svg>
                  <span style={{fontSize:10,color:TEXT_SUB}}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — 2030 breakout, interactive */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"20px 20px",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
              <div style={{fontSize:12,fontWeight:700,color:TEXT,marginBottom:2}}>2030 Breakdown by Solution Type</div>
              <div style={{fontSize:11,color:TEXT_SUB,marginBottom:16}}>Click a segment to explore the breakout</div>

              {/* Big total */}
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                <span style={{fontSize:40,fontWeight:900,color:BRAND,lineHeight:1,letterSpacing:-1}}>{latest.allLearners}%</span>
                <span style={{fontSize:12,color:TEXT_SUB,lineHeight:1.4}}>of all learners<br/>reached by 2030</span>
              </div>
              {g.goalNote && (
                <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.55,marginBottom:16,padding:"10px 12px",background:BG,borderRadius:8,border:"1px solid "+BORDER}}>
                  {g.goalNote}
                </div>
              )}

              {/* Stacked horizontal bar */}
              <div style={{height:18,borderRadius:5,overflow:"hidden",display:"flex",border:"1px solid "+BORDER,marginBottom:12}}>
                {segments.map(s=>(
                  <div key={s.key} onClick={()=>setExpanded(e=>e===s.key?null:s.key)}
                    style={{width:s.val+"%",background:s.color,cursor:"pointer",
                      opacity:expanded&&expanded!==s.key?0.25:1,transition:"all .25s",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {s.val>10&&<span style={{fontSize:9,fontWeight:800,color:"#fff",pointerEvents:"none"}}>{s.val}%</span>}
                  </div>
                ))}
                <div style={{flex:1,background:"#F1F5F9"}}/>
              </div>

              {/* Segment pills */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {segments.map(s=>{
                  const isExp = expanded===s.key;
                  return (
                    <button key={s.key} onClick={()=>setExpanded(e=>e===s.key?null:s.key)}
                      style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,
                        border:"1.5px solid "+(isExp?s.color:BORDER),
                        background:isExp?s.color+"11":BG,
                        cursor:"pointer",transition:"all .15s"}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
                      <span style={{fontSize:12,fontWeight:600,color:isExp?s.color:TEXT_SUB}}>{s.label}</span>
                      <span style={{fontSize:13,fontWeight:800,color:isExp?s.color:TEXT}}>{s.val}%</span>
                      <span style={{fontSize:10,color:isExp?s.color:TEXT_SUB,opacity:0.6}}>{isExp?"▴":"▾"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expandable breakout */}
            {expanded && g.rightBreakout?.[expanded] && (()=>{
              const breakout = g.rightBreakout[expanded];
              const seg = segments.find(s=>s.key===expanded);
              const covered = breakout.rows.filter(r=>r.label!=="Not Covered");
              const notCovered = breakout.rows.find(r=>r.label==="Not Covered");
              return (
                <div style={{borderRadius:12,border:"1.5px solid "+seg.color+"44",background:SURFACE,
                  padding:"16px 18px",animation:"fadeSlideIn .18s ease",
                  boxShadow:"0 2px 10px rgba(10,37,64,0.07)"}}>
                  <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:seg.color}}>
                      Of the {seg.val}% via {seg.label}:
                    </div>
                    <button onClick={()=>setExpanded(null)}
                      style={{background:"none",border:"1px solid "+BORDER,borderRadius:5,cursor:"pointer",padding:"2px 8px",fontSize:12,color:TEXT_SUB}}>✕</button>
                  </div>
                  <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      {covered.map((row,i)=>(
                        <div key={i} style={{marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:12,color:TEXT}}>{row.label}</span>
                            <span style={{fontSize:12,fontWeight:800,color:seg.color}}>{row.val}%</span>
                          </div>
                          <div style={{height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:row.val+"%",height:"100%",background:seg.color,
                              opacity:1-i*0.18,borderRadius:3,transition:"width .4s"}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    {notCovered&&(
                      <div style={{width:110,flexShrink:0,background:BG,borderRadius:8,border:"1px solid "+BORDER,
                        padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:TEXT_SUB,marginBottom:4,fontWeight:600}}>Not Covered</div>
                        <div style={{fontSize:28,fontWeight:900,color:TEXT_SUB,lineHeight:1}}>{notCovered.val}%</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{fontSize:11,color:TEXT_SUB,opacity:0.75}}>
          ⚠ Early directional estimates based on simplified assumptions.
        </div>
      </div>
    );
  }

  // ── Goal 5: stacked bar leverage chart ───────────────────────────────────────
  if (g.chartType === "stacked-bar-leverage") {
    const LEVER_COLORS = {
      philanthropic: "#0A2540",
      hyperscalers:  "#3086AB",
      vcImpact:      "#F59E0B",
      public:        "#94A3B8",
    };
    const LEVER_LABELS = {
      philanthropic: "Philanthropic Orgs.",
      hyperscalers:  "Hyperscalers",
      vcImpact:      "VC + Impact Investors",
      public:        "Public",
    };
    const keys = ["philanthropic","hyperscalers","vcImpact","public"];
    const maxTotal = Math.max(...g.leverageData.map(d => keys.reduce((s,k)=>s+(d[k]||0),0)));

    return (
      <div>
        <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Progress Toward 2030 Target</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>

          {/* Stacked bar chart */}
          <div style={{background:BG,borderRadius:10,border:"1px solid "+BORDER,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:TEXT_SUB,marginBottom:14,lineHeight:1.5}}>{g.chartNote}</div>
            <div style={{display:"flex",gap:16,alignItems:"flex-end",height:150,position:"relative"}}>
              {/* Y-axis */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",height:"100%",marginRight:4,flexShrink:0}}>
                {["$600M","$400M","$200M","$0"].map(v=>(
                  <span key={v} style={{fontSize:9,color:TEXT_SUB,textAlign:"right"}}>{v}</span>
                ))}
              </div>
              {/* Grid lines */}
              <div style={{position:"absolute",left:36,right:0,top:0,bottom:0,pointerEvents:"none"}}>
                {[0,0.33,0.67,1].map((f,i)=>(
                  <div key={i} style={{position:"absolute",left:0,right:0,bottom:f*100+"%",borderTop:"1px solid #E8ECF0"}}/>
                ))}
              </div>
              {/* Bars */}
              {g.leverageData.map((d,di)=>{
                const total = keys.reduce((s,k)=>s+(d[k]||0),0);
                const heightPct = total / 600; // scale to $600M max
                return (
                  <div key={di} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end"}}>
                    {/* Total label */}
                    <div style={{fontSize:10,fontWeight:800,color:TEXT,marginBottom:4}}>${total}M</div>
                    {/* Stacked segments */}
                    <div style={{width:"70%",height:(heightPct*100)+"%",display:"flex",flexDirection:"column-reverse",borderRadius:"3px 3px 0 0",overflow:"hidden",minHeight:4}}>
                      {keys.map((k,ki)=>{
                        const segH = ((d[k]||0)/total)*100;
                        return (
                          <div key={k} style={{width:"100%",height:segH+"%",background:LEVER_COLORS[k],flexShrink:0,minHeight:d[k]>0?3:0}}/>
                        );
                      })}
                    </div>
                    {/* X label */}
                    <div style={{fontSize:10,color:TEXT_SUB,marginTop:5,textAlign:"center",whiteSpace:"pre-line",lineHeight:1.3}}>{d.period}</div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
              {keys.map(k=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:10,height:10,borderRadius:2,background:LEVER_COLORS[k],flexShrink:0}}/>
                  <span style={{fontSize:10,color:TEXT_SUB}}>{LEVER_LABELS[k]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{padding:"14px 16px",background:BG,borderRadius:10,border:"1px solid "+BORDER}}>
              <div style={{fontSize:12,color:TEXT_SUB,marginBottom:4}}>Baseline (2021–2025)</div>
              <div style={{fontSize:22,fontWeight:800,color:TEXT_SUB}}>~$75M</div>
              <div style={{fontSize:11,color:TEXT_SUB,marginTop:2}}>Historical leverage across partner types</div>
            </div>
            <div style={{padding:"14px 16px",background:"#ECFDF5",borderRadius:10,border:"1px solid #6EE7B7"}}>
              <div style={{fontSize:12,color:"#065F46",marginBottom:4,fontWeight:700}}>2026–2030 Target</div>
              <div style={{fontSize:22,fontWeight:800,color:"#059669"}}>{g.leverageTotals.target}</div>
              <div style={{fontSize:11,color:"#059669",marginTop:2}}>2–3x leverage on USP investment</div>
            </div>
            <div style={{padding:"14px 16px",background:"#F0FDF4",borderRadius:10,border:"1px dashed #6EE7B7"}}>
              <div style={{fontSize:12,color:"#065F46",marginBottom:4,fontWeight:700}}>2026–2030 Stretch</div>
              <div style={{fontSize:22,fontWeight:800,color:"#059669"}}>{g.leverageTotals.stretch}</div>
              <div style={{fontSize:11,color:"#065F46",marginTop:2,opacity:0.7}}>Optimistic scenario with Hyperscaler uptake</div>
            </div>
            <ScenarioModelingButton/>
            <CoLeverageButton/>
          </div>
        </div>
      </div>
    );
  }

  // ── Goal 4: E-W Momentum Points horizontal bar chart + US heatmap ────────────
  if (g.chartType === "momentum-points") {
    const AMBER = "#F59E0B";
    const AMBER_LIGHT = "#FEF5E7";
    const AMBER_MID = "#FDE68A";
    const points = g.momentumPoints.filter(p => p.short !== "All 5 (Composite)");
    const composite = g.momentumPoints.find(p => p.short === "All 5 (Composite)");
    return (
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2}}>Progress Toward 2030 Target</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>

          {/* Horizontal bar chart */}
          <div style={{background:BG,borderRadius:10,border:"1px solid "+BORDER,padding:"16px 18px"}}>
            <div style={{fontSize:11,color:TEXT_SUB,marginBottom:14,lineHeight:1.5}}>{g.chartNote}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {points.map((pt, i) => (
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:600,color:TEXT,lineHeight:1.35}}>{pt.label}</span>
                    <span style={{fontSize:11,fontWeight:700,color:AMBER,flexShrink:0,marginLeft:8}}>{pt.current}%</span>
                  </div>
                  <div style={{position:"relative",height:10,background:BORDER,borderRadius:5,overflow:"hidden"}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:pt.target2030+"%",background:AMBER_MID,borderRadius:5}}/>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:pt.current+"%",background:AMBER,borderRadius:5,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:2}}>
                    <span style={{fontSize:10,color:TEXT_SUB}}>Target: {pt.target2030}%</span>
                  </div>
                </div>
              ))}
              {composite && (
                <div style={{marginTop:6,paddingTop:10,borderTop:"1px dashed "+BORDER}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:800,color:TEXT}}>All 5 Points (Composite)</span>
                    <span style={{fontSize:12,fontWeight:800,color:BRAND,flexShrink:0,marginLeft:8}}>{composite.current}%</span>
                  </div>
                  <div style={{position:"relative",height:12,background:BORDER,borderRadius:6,overflow:"hidden"}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:composite.target2030+"%",background:AMBER_MID,borderRadius:6}}/>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:composite.current+"%",background:BRAND,borderRadius:6,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                    <span style={{fontSize:10,color:TEXT_SUB}}>Current (2026)</span>
                    <span style={{fontSize:10,color:TEXT_SUB}}>2030 Target: {composite.target2030}%</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:14,marginTop:14,paddingTop:12,borderTop:"1px solid "+BORDER}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:12,height:8,borderRadius:2,background:AMBER,flexShrink:0}}/>
                <span style={{fontSize:10,color:TEXT_SUB}}>Current (2026)</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:12,height:8,borderRadius:2,background:AMBER_MID,flexShrink:0}}/>
                <span style={{fontSize:10,color:TEXT_SUB}}>2030 Target</span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{padding:"14px 16px",background:AMBER_LIGHT,borderRadius:10,border:"1px solid "+AMBER_MID}}>
              <div style={{fontSize:11,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>5 E-W Momentum Points</div>
              {points.map((pt,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:i<points.length-1?6:0}}>
                  <span style={{width:16,height:16,borderRadius:"50%",background:AMBER,color:"#fff",fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#78350F",lineHeight:1.4}}>{pt.label}</span>
                </div>
              ))}
            </div>
            {composite && (
              <div style={{padding:"14px 16px",background:BG,borderRadius:10,border:"1px solid "+BORDER}}>
                <div style={{fontSize:12,color:TEXT_SUB,marginBottom:4}}>Systems Measuring All 5 (2026)</div>
                <div style={{fontSize:26,fontWeight:800,color:BRAND}}>{composite.current}%</div>
                <div style={{marginTop:8,height:5,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:(composite.current/composite.target2030*100)+"%",height:"100%",background:AMBER,borderRadius:3}}/>
                </div>
                <div style={{fontSize:11,color:TEXT_SUB,marginTop:3}}>{Math.round(composite.current/composite.target2030*100)}% toward {composite.target2030}% goal</div>
              </div>
            )}
            <ScenarioModelingButton/>
          </div>
        </div>

        {/* US Heatmap */}
        <MomentumHeatmap points={g.momentumPoints.filter(p=>p.short!=="All 5 (Composite)")}/>
      </div>
    );
  }

  // ── Default: simple line chart (Goal 3) ──────────────────────────────────────
  const yearData = [
    {year:"Base", value:0, target:null},
    {year:"2026", value:g.current2026, target:null},
    {year:"2027", value:null, target:null},
    {year:"2028", value:null, target:null},
    {year:"2029", value:null, target:null},
    {year:"2030", value:null, target:g.goal2030},
  ];
  return (
    <div>
      <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Progress Toward 2030 Target</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"center"}}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={yearData} margin={{top:8,right:16,bottom:0,left:-10}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
            <XAxis dataKey="year" tick={{fontSize:10,fill:TEXT_SUB}}/>
            <YAxis tick={{fontSize:10,fill:TEXT_SUB}}/>
            <Tooltip contentStyle={{fontSize:11,borderRadius:8,border:"1px solid "+BORDER}}
              formatter={(v,n)=>[v!==null?v+g.unit:"—",n]}/>
            <Line type="monotone" dataKey="value" name="Actual" stroke={BRAND} strokeWidth={2.5}
              dot={(props)=>props.payload.value!==null?<circle cx={props.cx} cy={props.cy} r={4} fill={BRAND} stroke="#fff" strokeWidth={1.5}/>:<circle r={0}/>}
              connectNulls={false}/>
            <Line type="monotone" dataKey="target" name="2030 Target" stroke={BORDER} strokeWidth={2}
              strokeDasharray="6 4"
              dot={(props)=>props.payload.target!==null?<circle cx={props.cx} cy={props.cy} r={5} fill={BRAND+"44"} stroke={BRAND} strokeWidth={1.5}/>:<circle r={0}/>}
              connectNulls={false}/>
          </LineChart>
        </ResponsiveContainer>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{padding:"14px 16px",background:BG,borderRadius:10,border:"1px solid "+BORDER}}>
            <div style={{fontSize:12,color:TEXT_SUB,marginBottom:4}}>Current ({g.earliest.split("—")[0].trim()})</div>
            <div style={{fontSize:26,fontWeight:800,color:BRAND}}>{g.current2026}{g.unit}</div>
          </div>
          <div style={{padding:"14px 16px",background:BG,borderRadius:10,border:"1px solid "+BORDER}}>
            <div style={{fontSize:12,color:TEXT_SUB,marginBottom:4}}>2030 Target</div>
            <div style={{fontSize:26,fontWeight:800,color:TEXT}}>{g.goal2030}{g.unit}</div>
            <div style={{marginTop:8,height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:BRAND,borderRadius:3}}/>
            </div>
            <div style={{fontSize:11,color:TEXT_SUB,marginTop:3}}>{pct}% of target</div>
          </div>
          <ScenarioModelingButton/>
        </div>
      </div>
    </div>
  );
}
function GoalRatingDisplay({ goalId, goalRatings }) {
  const r = (goalRatings || {})[goalId];
  const rs = r?.rating ? STATUS[r.rating] : null;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED,
        textTransform: "uppercase", letterSpacing: 1 }}>
        Rating
      </div>
      {rs ? (
        <>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 8,
            border: "1.5px solid " + rs.color + "88",
            background: rs.pill, color: rs.color,
            fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
            {rs.label}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#D97706",
            background: "#FEF5E7", borderRadius: 3, padding: "1px 6px",
            border: "1px solid #FDE68A" }}>
            Current year estimate
          </span>
          {r.rationale && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, maxWidth: 200,
              textAlign: "right", lineHeight: 1.5, marginTop: 2 }}>
              {r.rationale.length > 80
                ? r.rationale.slice(0, 80) + "…"
                : r.rationale}
            </div>
          )}
        </>
      ) : (
        <span style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic" }}>
          No estimate yet
        </span>
      )}
      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
        Claude-assessed · confirmed at annual reporting
      </div>
    </div>
  );
}
// ── GoalTabExplorer ───────────────────────────────────────────────────────────
function GoalTabExplorer({ ratings, onUpdateRatings, initialGoal, goalRatings }) {
  const [activeGoal, setActiveGoal] = useState(initialGoal || 1);
  const [showAI, setShowAI] = useState(false);

  // Sync when initialGoal prop changes (e.g. navigating from portfolio page)
  useEffect(() => { if (initialGoal) setActiveGoal(initialGoal); }, [initialGoal]);

  const g = STRATEGY_GOALS.find(sg=>sg.number===activeGoal);
  const rs = ratings[g.id]&&STATUS[ratings[g.id]] ? STATUS[ratings[g.id]] : null;

  // Reset AI panel when switching goals
  React.useEffect(()=>{ setShowAI(false); }, [activeGoal]);

  // Which portfolios contribute
  const contributingPorts = Object.entries(PORT_GOAL_MAP)
    .filter(([,goals])=>goals.includes(activeGoal))
    .map(([id])=>id);

  return (
    <div style={{display:"flex",gap:0,background:SURFACE,borderRadius:14,border:"1px solid "+BORDER,boxShadow:"0 1px 8px rgba(0,0,0,0.05)",overflow:"hidden"}}>

      {/* Left tabs — only shown on Strategy Overview (no initialGoal) */}
      {!initialGoal && (
        <div style={{width:196,flexShrink:0,borderRight:"1px solid "+BORDER,background:SURFACE_2}}>
          {STRATEGY_GOALS.map(sg=>{
            const isActive = sg.number===activeGoal;
            const goalColor = sg.color || BRAND;
            return (
              <button key={sg.id} onClick={()=>setActiveGoal(sg.number)}
                style={{width:"100%",padding:"13px 16px",border:"none",
                  background:isActive?SURFACE:"transparent",
                  cursor:"pointer",textAlign:"left",
                  borderBottom:"1px solid "+BORDER,
                  borderLeft:isActive?"3px solid "+goalColor:"3px solid transparent",
                  transition:"all .15s",display:"flex",alignItems:"flex-start",gap:9}}>
                <span style={{fontSize:10,fontWeight:700,color:isActive?goalColor:TEXT_MUTED,minWidth:14,marginTop:2,letterSpacing:0.5}}>{sg.number}</span>
                <span style={{fontSize:12,fontWeight:isActive?600:400,color:isActive?TEXT:TEXT_MUTED,lineHeight:1.4}}>{sg.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right detail panel — split: main content | Ambition 2045 sidebar */}
      <div style={{flex:1,display:"flex",minWidth:0}}>

        {/* Main content */}
        <div style={{flex:1,padding:"28px 32px",display:"flex",flexDirection:"column",gap:20,minWidth:0}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div>
            <div style={{fontSize:10,fontWeight:600,color:g.color||TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
              Goal {g.number} · {g.title}
            </div>
            <div style={{fontSize:21,color:TEXT,lineHeight:1.45,maxWidth:600,marginBottom:8,fontWeight:400}}>{g.target}</div>
            <DataMeta source={g.source} lastUpdated={g.earliest?.split("—")[0]?.trim()} updateFreq={g.updateFreq||"Annual"}/>
            {g.note && (
              <div style={{display:"flex",alignItems:"flex-start",gap:7,marginTop:8,padding:"8px 12px",background:"#EFF6FF",borderRadius:7,border:"1px solid #BFDBFE",maxWidth:600}}>
                <span style={{fontSize:12,color:"#1D4ED8",lineHeight:1.55}}>{g.note}</span>
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10,flexShrink:0}}>
           <GoalRatingDisplay goalId={g.id} goalRatings={goalRatings} />
          </div>
        </div>

        {/* Goal-specific chart */}
        <GoalDetailChart g={g} />

        {/* Contributing portfolios — show all 4, light up contributors */}
        <div>
          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Contributing Portfolios</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.entries(PORT_COLORS).map(([portId,pc])=>{
              const contributes = contributingPorts.includes(portId);
              return (
                <div key={portId} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",background:contributes?SURFACE:BG,borderRadius:8,border:"1.5px solid "+(contributes?pc.color:BORDER),borderLeft:"4px solid "+(contributes?pc.color:BORDER),opacity:contributes?1:0.4,transition:"all .15s"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:contributes?pc.color:TEXT_SUB,display:"inline-block"}}/>
                  <span style={{fontSize:14,fontWeight:contributes?700:400,color:contributes?TEXT:TEXT_SUB}}>{pc.label}</span>
                  {contributes&&<span style={{fontSize:11,color:pc.color,fontWeight:700}}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        </div>

        {/* Ambition 2045 — vertical RH sidebar */}
        <div style={{width:220,flexShrink:0,borderLeft:"1px solid "+BORDER,background:"#FEF5E7",padding:"22px 18px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:16}}>⭐</span>
              <div style={{fontSize:13,fontWeight:700,color:"#92400E",lineHeight:1.3}}>Contribution to Ambition 2045</div>
            </div>
            <span style={{fontSize:10,fontWeight:700,color:YELLOW,background:"rgba(245,158,11,0.15)",borderRadius:4,padding:"2px 8px",border:"1px solid "+YELLOW+"44",textTransform:"uppercase",letterSpacing:0.5}}>Coming Soon</span>
          </div>
          <div style={{fontSize:13,color:"#92400E",opacity:0.7,lineHeight:1.65}}>This section will describe how progress on this goal connects to the broader Ambition 2045 vision of equitable, AI-enabled learning outcomes for all learners.</div>
          <div style={{marginTop:"auto",paddingTop:16,borderTop:"1px solid #FDE68A"}}>
            <div style={{fontSize:11,color:"#92400E",opacity:0.5,lineHeight:1.5}}>Ambition 2045 linkages will be defined as part of the strategy refresh.</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── StrategyMap ───────────────────────────────────────────────────────────────
function StrategyMap({ data, onNavigateToPortfolio }) {
  const [hoveredGoal, setHoveredGoal] = useState(null);
  const [hoveredPort, setHoveredPort] = useState(null);
  const [hoveredBow,  setHoveredBow]  = useState(null);
  const [selectedPort, setSelectedPort] = useState(null);
  const [selectedBow,  setSelectedBow]  = useState(null);
  const detailRef = React.useRef(null);

  const PORTS = [
    { id:"ai-infra",      ...PORT_COLORS["ai-infra"],      goals:[1,2,5] },
    { id:"sfl",           ...PORT_COLORS["sfl"],           goals:[3,4,5] },
    { id:"cross-cutting", ...PORT_COLORS["cross-cutting"], goals:[5]     },
    { id:"hub",           ...PORT_COLORS["hub"],           goals:[5]     },
  ];

  const portBows  = (portId) => data.portfolios[portId]?.bows || [];
  const portData  = (portId) => data.portfolios[portId]?.portfolio || {};
  const goalLit   = (gNum)   => hoveredGoal === gNum || (hoveredPort && PORT_GOAL_MAP[hoveredPort]?.includes(gNum));
  const goalDim   = (gNum)   => hoveredPort && !PORT_GOAL_MAP[hoveredPort]?.includes(gNum);
  const portLit   = (portId) => hoveredPort === portId || (hoveredGoal && PORT_GOAL_MAP[portId]?.includes(hoveredGoal));
  const portDim   = (portId) => hoveredGoal && !PORT_GOAL_MAP[portId]?.includes(hoveredGoal);

  const handlePortClick = (portId) => {
    setSelectedBow(null);
    setSelectedPort(prev => {
      const next = prev === portId ? null : portId;
      if (next) setTimeout(()=>detailRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
      return next;
    });
  };
  const handleBowClick = (portId, bowId, e) => {
    e.stopPropagation();
    setSelectedPort(null);
    setSelectedBow(prev => {
      const next = prev?.bowId === bowId ? null : { portId, bowId };
      if (next) setTimeout(()=>detailRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
      return next;
    });
  };

  // Resolved detail
  const detailPort = selectedPort ? PORTS.find(p => p.id === selectedPort) : null;
  const detailPortData = selectedPort ? portData(selectedPort) : null;
  const detailBow  = selectedBow  ? portBows(selectedBow.portId).find(b => b.id === selectedBow.bowId) : null;
  const detailBowPort = selectedBow ? PORTS.find(p => p.id === selectedBow.portId) : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>

      {/* Legend */}
      <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24,padding:"11px 16px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
        <span style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,flexShrink:0}}>How to read</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:24,height:1.5,background:BORDER,borderRadius:1,borderTop:"1px dashed "+TEXT_MUTED}}/>
          <span style={{fontSize:12,color:TEXT_MUTED}}>Contributes toward</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:24,height:2,background:ACCENT,borderRadius:1}}/>
          <span style={{fontSize:12,color:TEXT_MUTED}}>Highlighted connection</span>
        </div>
        <span style={{fontSize:12,color:TEXT_MUTED,marginLeft:"auto"}}>Hover to highlight connections · Click a portfolio or BOW for detail ↓</span>
      </div>

      {/* Three-column map */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 24px 1.3fr 24px 1.2fr",gap:0,alignItems:"start"}}>

        {/* ── Goals ── */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:TEXT_MUTED,marginBottom:12,paddingLeft:2}}>2030 Goals</div>
          {STRATEGY_GOALS.map(g => {
            const lit = goalLit(g.number);
            const dim = goalDim(g.number);
            return (
              <div key={g.id}
                onMouseEnter={()=>setHoveredGoal(g.number)}
                onMouseLeave={()=>setHoveredGoal(null)}
                style={{marginBottom:8,borderRadius:10,
                  border:"1.5px solid "+(lit?g.color:BORDER),
                  background:lit?g.color+"0D":SURFACE,
                  padding:"12px 14px",transition:"all .18s",opacity:dim?0.2:1,
                  boxShadow:lit?"0 2px 10px rgba(0,0,0,0.06)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:10,fontWeight:700,color:lit?g.color:TEXT_MUTED,letterSpacing:1}}>G{g.number}</span>
                  <span style={{fontSize:12,fontWeight:600,color:TEXT,lineHeight:1.3,flex:1}}>{g.title}</span>
                </div>
                <div style={{fontSize:11,color:TEXT_MUTED,lineHeight:1.5}}>{g.target}</div>
              </div>
            );
          })}
        </div>

        {/* Connector: Goals → Portfolios */}
        <ConnectorColumn
          leftItems={STRATEGY_GOALS} rightItems={PORTS}
          getLeftId={g=>g.number} getRightId={p=>p.id}
          isConnected={(g,p)=>(PORT_GOAL_MAP[p.id]||[]).includes(g.number)}
          highlightLeft={hoveredGoal} highlightRight={hoveredPort}
          getLeftColor={()=>ACCENT} getRightColor={p=>p.color}
          leftCount={STRATEGY_GOALS.length} rightCount={PORTS.length}
        />

        {/* ── Portfolios ── */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:TEXT_MUTED,marginBottom:12,paddingLeft:2}}>Portfolios</div>
          {PORTS.map(p => {
            const lit = portLit(p.id);
            const dim = portDim(p.id);
            const bows = portBows(p.id);
            const isSelected = selectedPort === p.id;
            return (
              <div key={p.id} style={{marginBottom:8,transition:"opacity .18s",opacity:dim?0.25:1}}>
                <div
                  onMouseEnter={()=>setHoveredPort(p.id)}
                  onMouseLeave={()=>setHoveredPort(null)}
                  onClick={()=>handlePortClick(p.id)}
                  style={{borderRadius:10,
                    border:"1.5px solid "+(isSelected?p.color:lit?BORDER:BORDER),
                    background:isSelected?p.color+"0D":lit?SURFACE_2:SURFACE,
                    padding:"12px 14px",cursor:"pointer",transition:"all .18s",
                    boxShadow:isSelected?"0 3px 14px rgba(0,0,0,0.08)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:600,color:isSelected?p.color:TEXT,flex:1}}>{p.label}</span>
                    <span style={{fontSize:11,color:TEXT_MUTED}}>{bows.length} BOW{bows.length!==1?"s":""}</span>
                    <span style={{fontSize:11,color:isSelected?p.color:TEXT_MUTED,transition:"transform .15s",display:"inline-block",transform:isSelected?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connector: Portfolios → BOWs */}
        <ConnectorColumn
          leftItems={PORTS} rightItems={PORTS.flatMap(p=>portBows(p.id).map(b=>({...b,_portId:p.id,_portColor:p.color})))}
          getLeftId={p=>p.id}
          getRightId={b=>b.id}
          isConnected={(p,b)=>b._portId===p.id}
          highlightLeft={hoveredPort || selectedPort}
          highlightRight={hoveredBow || selectedBow?.bowId}
          getLeftColor={p=>p.color}
          getRightColor={b=>b._portColor}
          leftCount={PORTS.length}
          rightCount={PORTS.reduce((s,p)=>s+portBows(p.id).length,0)}
        />

        {/* ── BOWs ── */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:TEXT_MUTED,marginBottom:12,paddingLeft:2}}>Bodies of Work</div>
          {PORTS.map(p => {
            const bows = portBows(p.id);
            if (!bows.length) return null;
            const dim = portDim(p.id);
            return (
              <div key={p.id} style={{marginBottom:8,opacity:dim?0.25:1,transition:"opacity .18s"}}>
                <div style={{fontSize:10,fontWeight:600,color:p.color,letterSpacing:1,textTransform:"uppercase",marginBottom:5,paddingLeft:2}}>
                  {p.label}
                </div>
                {bows.map(b=>{
                  const isSel = selectedBow?.bowId === b.id;
                  return (
                    <div key={b.id}
                      onMouseEnter={()=>setHoveredBow(b.id)}
                      onMouseLeave={()=>setHoveredBow(null)}
                      onClick={(e)=>handleBowClick(p.id,b.id,e)}
                      style={{display:"flex",alignItems:"center",gap:8,
                        padding:"9px 12px",marginBottom:4,borderRadius:8,
                        border:"1.5px solid "+(isSel?p.color:hoveredBow===b.id?p.color+"66":BORDER),
                        background:isSel?p.color+"10":hoveredBow===b.id?p.color+"06":SURFACE,
                        transition:"all .15s",cursor:"pointer",
                        boxShadow:isSel?"0 2px 10px rgba(0,0,0,0.07)":"none"}}>
                      <span style={{width:3,height:32,borderRadius:2,background:p.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:isSel?600:400,color:isSel?p.color:TEXT,lineHeight:1.3}}>{b.name}</div>
                      </div>
                      <span style={{fontSize:10,color:isSel?p.color:TEXT_MUTED,transition:"transform .15s",transform:isSel?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {(detailPort || detailBow) && (
        <div ref={detailRef} style={{marginTop:20,borderRadius:12,border:"1.5px solid "+(detailPort?detailPort.color:detailBowPort?.color||BORDER),
          background:SURFACE,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.07)",animation:"fadeUp .18s ease"}}>

          {/* Panel header */}
          <div style={{
            padding:"16px 22px",
            background:(detailPort?detailPort.color:detailBowPort?.color||BRAND)+"0D",
            borderBottom:"1px solid "+(detailPort?detailPort.color:detailBowPort?.color||BORDER)+"33",
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {detailPort && <span style={{width:10,height:10,borderRadius:"50%",background:detailPort.color,display:"inline-block"}}/>}
              <div>
                <div style={{fontSize:10,fontWeight:600,color:(detailPort?detailPort.color:detailBowPort?.color),textTransform:"uppercase",letterSpacing:1.5,marginBottom:2}}>
                  {detailPort ? "Portfolio" : "Body of Work"}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:TEXT}}>{detailPort?.label || detailBow?.name}</div>
              </div>
            </div>
            <button onClick={()=>{setSelectedPort(null);setSelectedBow(null);}}
              style={{background:"none",border:"1px solid "+BORDER,borderRadius:6,padding:"4px 12px",fontSize:12,color:TEXT_MUTED,cursor:"pointer"}}>
              ✕ Close
            </button>
          </div>

          <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:16}}>

            {/* Description */}
            {(detailPortData?.description || detailBow?.description) && (
              <div>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Description</div>
                <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.7,maxWidth:860}}>
                  {(detailPortData?.description || detailBow?.description || "").split('\n\n').map((para,i)=><p key={i} style={{margin:i===0?"0 0 8px":"0"}}>{para}</p>)}
                </div>
              </div>
            )}

            {/* Portfolio outcomes */}
            {detailPort && detailPortData?.portfolioOutcomes?.length > 0 && (
              <div>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Portfolio Outcomes</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))",gap:10}}>
                  {detailPortData.portfolioOutcomes.map((o,i)=>(
                    <div key={o.id} style={{padding:"12px 14px",borderRadius:9,border:"1px solid "+BORDER,background:SURFACE_2}}>
                      <div style={{fontSize:10,fontWeight:700,color:detailPort.color,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Outcome {i+1}</div>
                      <div style={{fontSize:12,fontWeight:600,color:TEXT,marginBottom:4}}>{o.shortTitle}</div>
                      <div style={{fontSize:11,color:TEXT_MUTED,lineHeight:1.55}}>{o.outcome}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOW outcomes */}
            {detailBow && detailBow.outcomes?.length > 0 && (
              <div>
                <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Outcomes</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {detailBow.outcomes.map((o,i)=>{
                    const indCount = (o.impactIndicators||[]).filter(ind=>ind.text&&!ind.text.startsWith("[Placeholder]")).length;
                    return (
                      <div key={o.id} style={{padding:"12px 16px",borderRadius:9,border:"1px solid "+BORDER,background:SURFACE_2,display:"flex",gap:14,alignItems:"flex-start"}}>
                        <span style={{width:24,height:24,borderRadius:"50%",background:detailBowPort?.color||ACCENT,color:"#fff",fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{o.number}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:TEXT,marginBottom:3}}>{o.shortTitle}</div>
                          <div style={{fontSize:11,color:TEXT_MUTED,lineHeight:1.6}}>{o.title}</div>
                          {indCount>0&&<div style={{fontSize:10,color:detailBowPort?.color,marginTop:5,fontWeight:600}}>{indCount} impact indicator{indCount!==1?"s":""}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// Simple SVG connector lines between two columns
function ConnectorColumn({ leftItems, rightItems, getLeftId, getRightId, isConnected, highlightLeft, highlightRight, getLeftColor, getRightColor, leftCount, rightCount }) {
  // Heights are approximated — 60px per goal item, 72px per portfolio item
  const GOAL_H = 100;
  const PORT_H = 86;
  const TOP_OFFSET = 28; // label row height
  const svgH = Math.max(leftCount * GOAL_H, rightCount * PORT_H) + TOP_OFFSET;

  const leftCY = (i) => TOP_OFFSET + i * GOAL_H + GOAL_H / 2;
  const rightCY = (i) => TOP_OFFSET + i * PORT_H + PORT_H / 2;

  return (
    <svg width="20" height={svgH} style={{overflow:"visible",flexShrink:0}}>
      {leftItems.map((l, li)=>
        rightItems.map((r, ri)=>{
          if (!isConnected(l, r)) return null;
          const isHigh = (getLeftId(l) === highlightLeft) || (getRightId(r) === highlightRight);
          const color = isHigh ? (getLeftColor(l) || getLeftColor(r)) : "#D1D5DB";
          return (
            <line key={`${getLeftId(l)}-${getRightId(r)}`}
              x1={0} y1={leftCY(li)}
              x2={20} y2={rightCY(ri)}
              stroke={color} strokeWidth={isHigh?2:1}
              strokeDasharray={isHigh?"none":"4 3"}
              opacity={isHigh?0.8:0.4}
              style={{transition:"stroke .18s, stroke-width .18s"}}
            />
          );
        })
      )}
    </svg>
  );
}

// ── MeasurementHierarchyView ──────────────────────────────────────────────────
function MeasurementHierarchyView() {
  const [expanded, setExpanded] = useState(null);

  const LI_COLOR    = "#7C3AED";
  const INVEST_COLOR= "#6B7280";

  // Primary hierarchy tiers
  const TIERS = [
    {
      id:"ambition",
      tier:null,
      label:"Ambition 2045",
      tag:"North star · long-term vision",
      color:BRAND,
      desc:"The Foundation's long-term vision for equitable, AI-enabled learning outcomes. Not directly measured — it sets the direction that all strategy goals and investments are oriented toward.",
      arrow:"guides",
      lateral:null,
    },
    {
      id:"goals",
      tier:"Tier 1",
      label:"2030 Strategy Goals",
      tag:"5 goals",
      color:"#3086AB",
      desc:"Five time-bound goals defining what the team commits to achieving by 2030. Each goal has a metric, a 2026 baseline, and a 2030 target. Goals are contributed to by portfolios in a many-to-many relationship — only AI Infrastructure and System Feedback Loops contribute directly.",
      arrow:"pursued through",
      lateral:null,
    },
    {
      id:"portfolios",
      tier:"Tier 2",
      label:"Portfolios",
      tag:"4 portfolios",
      color:"#4EAB9A",
      desc:"Four thematic investment areas. AI Infrastructure and System Feedback Loops are direct drivers of the 2030 goals (M:N). Cross-Cutting Supports and Data & AI Enablement Hub are internal enablers — they support team execution and strategy effectiveness but do not contribute directly to any 2030 goal.",
      arrow:"define",
      lateral:null,
    },
    {
      id:"port-outcomes",
      tier:"Tier 3",
      label:"Portfolio Outcomes",
      tag:"activity–outcome pairs",
      color:"#FBAE40",
      desc:"Specific results each portfolio is working toward. Each pairs a discrete activity (what the team does) with an expected outcome (what changes as a result). Portfolio Outcomes sit between the broad 2030 Goals and the detailed BOW Outcomes.",
      arrow:"executed via",
      lateral:{
        label:"Leading Indicators",
        sublabel:"Portfolio-level · parsimonious set",
        color:LI_COLOR,
        note:"A curated, small set of forward-looking signals per Portfolio Outcome. Draws from a subset of BOW-level indicators, and may include additional indicators not tracked within any individual BOW.",
      },
    },
    {
      id:"bows",
      tier:"Tier 4",
      label:"Bodies of Work (BOWs)",
      tag:"10 BOWs across 4 portfolios",
      color:ACCENT,
      desc:"Ten major workstreams — the primary unit of execution. Each BOW defines a focused area of work, the outcomes it aims to produce, and the investments made to deliver it. Nested within one portfolio.",
      arrow:"produce",
      lateral:null,
    },
    {
      id:"bow-outcomes",
      tier:"Tier 5",
      label:"BOW Outcomes",
      tag:"specific measurable results",
      color:"#059669",
      desc:"The most granular outcome-level element. Aggregate upward toward Portfolio Outcomes in a many-to-many relationship (tracked in bow_portfolio_outcome_links, distinguishing direct vs. indirect contributions). Investments link directly to BOW Outcomes via INVEST.",
      arrow:"tracked by",
      lateral:{
        label:"Leading Indicators",
        sublabel:"BOW-level · one set per BOW",
        color:LI_COLOR,
        note:"Each BOW has its own set of forward-looking signals. Partial overlap with portfolio-level indicators — some BOW indicators surface to the portfolio set, others remain BOW-specific. The portfolio set may also include indicators not present at BOW level.",
      },
    },
    {
      id:"execution",
      tier:"Tier 6",
      label:"Execution Targets",
      tag:"milestones & deliverables",
      color:"#DC2626",
      desc:"The most granular tracking layer. Specific milestones and deliverables tied to BOW Outcomes, defining what success looks like within a given strategy period.",
      arrow:null,
      lateral:{
        label:"Investments",
        sublabel:"Lateral · via INVEST (Salesforce)",
        color:INVEST_COLOR,
        note:"Grants and funded activities managed in INVEST — read-only here. Linked via bows.invest_bow_id. Investments connect laterally into the hierarchy at two points: BOW Outcomes (which outcomes each grant advances) and Execution Targets (milestone-level tracking).",
      },
    },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>

      {/* Intro */}
      <div style={{marginBottom:24,padding:"14px 20px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
        <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.75}}>
          The strategy is organized across <strong>seven measurement tiers</strong> — from the long-term Ambition 2045 vision down to granular execution targets. Two lateral elements, <span style={{color:LI_COLOR,fontWeight:600}}>Leading Indicators</span> and <span style={{color:INVEST_COLOR,fontWeight:600}}>Investments</span>, connect into the hierarchy at specific points rather than sitting in the primary chain. Click any tier to read its full description.
        </div>
      </div>

      {/* Hierarchy grid — main column + lateral column */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:"0 20px",alignItems:"start"}}>
        {TIERS.map((tier) => (
          <React.Fragment key={tier.id}>

            {/* ── Tier card (left column) ── */}
            <div
              onClick={()=>setExpanded(expanded===tier.id?null:tier.id)}
              style={{
                borderRadius:10,overflow:"hidden",
                border:"1.5px solid "+(expanded===tier.id?tier.color:BORDER),
                background:expanded===tier.id?tier.color+"0B":SURFACE,
                cursor:"pointer",transition:"all .15s",
                boxShadow:expanded===tier.id?"0 2px 12px rgba(0,0,0,0.07)":"none",
                display:"flex",
              }}>
              <div style={{width:5,flexShrink:0,background:tier.color}}/>
              <div style={{flex:1,padding:"13px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:expanded===tier.id?6:0}}>
                  {tier.tier&&(
                    <span style={{fontSize:9,fontWeight:700,color:tier.color,background:tier.color+"15",borderRadius:4,padding:"2px 7px",letterSpacing:0.6,textTransform:"uppercase",flexShrink:0}}>
                      {tier.tier}
                    </span>
                  )}
                  <span style={{fontSize:13,fontWeight:700,color:TEXT,flex:1}}>{tier.label}</span>
                  <span style={{fontSize:11,color:TEXT_MUTED,flexShrink:0}}>{tier.tag}</span>
                  <span style={{fontSize:11,color:TEXT_MUTED,flexShrink:0,marginLeft:4,transition:"transform .15s",display:"inline-block",transform:expanded===tier.id?"rotate(90deg)":"none"}}>›</span>
                </div>
                {expanded===tier.id&&(
                  <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.75,paddingTop:4,borderTop:"1px solid "+tier.color+"22",marginTop:4}}>
                    {tier.desc}
                  </div>
                )}
              </div>
            </div>

            {/* ── Lateral card (right column) ── */}
            {tier.lateral ? (
              <div style={{position:"relative"}}>
                {/* Dashed horizontal connector */}
                <div style={{position:"absolute",top:"50%",left:-22,width:22,height:0,
                  borderTop:"1.5px dashed "+tier.lateral.color+"77",transform:"translateY(-50%)"}}/>
                <div style={{position:"absolute",top:"50%",left:-8,fontSize:9,color:tier.lateral.color+"99",transform:"translateY(-60%)"}}>►</div>

                <div style={{
                  borderRadius:10,border:"1.5px dashed "+tier.lateral.color+"55",
                  background:tier.lateral.color+"08",
                  padding:"11px 14px",
                }}>
                  <div style={{fontSize:11,fontWeight:700,color:tier.lateral.color,marginBottom:2}}>{tier.lateral.label}</div>
                  <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:expanded===tier.id?8:0,lineHeight:1.4}}>{tier.lateral.sublabel}</div>
                  {expanded===tier.id&&(
                    <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.65,paddingTop:6,borderTop:"1px solid "+tier.lateral.color+"22"}}>
                      {tier.lateral.note}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div/>
            )}

            {/* ── Connector arrow between tiers ── */}
            {tier.arrow && (
              <React.Fragment>
                <div style={{display:"flex",alignItems:"stretch",padding:"0 0 0 16px",height:34}}>
                  <div style={{width:1.5,background:BORDER,marginRight:10}}/>
                  <div style={{display:"flex",alignItems:"center",gap:0}}>
                    <span style={{fontSize:10,color:TEXT_MUTED,fontStyle:"italic",letterSpacing:0.2}}>{tier.arrow}</span>
                  </div>
                </div>
                <div/>
              </React.Fragment>
            )}

          </React.Fragment>
        ))}
      </div>

      {/* Leading indicator overlap note */}
      <div style={{marginTop:24,padding:"13px 18px",borderRadius:10,border:"1px solid "+LI_COLOR+"33",background:LI_COLOR+"06",
        borderLeft:"4px solid "+LI_COLOR}}>
        <div style={{fontSize:11,fontWeight:700,color:LI_COLOR,marginBottom:5,textTransform:"uppercase",letterSpacing:0.8}}>
          Leading Indicators — Partial Overlap Relationship
        </div>
        <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.75}}>
          The two leading indicator sets are <strong>not a simple roll-up</strong>. Some BOW-level indicators surface to the portfolio level; others remain BOW-specific. The portfolio set may also include indicators not present in any individual BOW — reflecting signals relevant at portfolio scale. This relationship is one of <em>partial overlap with portfolio-level additions</em>.
        </div>
      </div>

    </div>
  );
}

// ── Strategy Overview ─────────────────────────────────────────────────────────
function StrategyOverview({ data, onUpdateRatings, onNavigateToPortfolio, selectedGoal }) {
  const ratings = data.strategyRatings||{};
  const [activeTab, setActiveTab] = useState("goals");

  // When navigating here from a portfolio goal badge, switch to Goals tab
  useEffect(() => { if (selectedGoal) setActiveTab("goals"); }, [selectedGoal]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:28}}>

      {/* Hero block */}
      <div style={{
        background:BRAND, borderRadius:16, padding:"36px 40px",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:-60,right:80,width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle, rgba(240,165,0,0.08) 0%, transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:3,textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:12}}>
            USP Data & AI Strategy Vision
          </div>
          <div style={{fontSize:22,lineHeight:1.7,color:"rgba(255,255,255,0.92)",fontWeight:600}}>
            By 2045 all learners—especially those historically underserved—and the adults who support them are empowered by safe, evidence-based, AI-enabled solutions that deliver personalized experiences.
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid "+BORDER,marginBottom:-4,alignItems:"center"}}>
        {[["goals","Goals"],["map","Strategy Map"],["hierarchy","Measurement Hierarchy"]].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{padding:"10px 20px",fontSize:13,fontWeight:activeTab===id?600:400,border:"none",background:"none",cursor:"pointer",
              borderBottom:activeTab===id?"2px solid "+ACCENT:"2px solid transparent",
              color:activeTab===id?TEXT:TEXT_MUTED,marginBottom:-1,transition:"color .15s"}}>
            {label}
          </button>
        ))}
        <button onClick={()=>setActiveTab("decision-insights")}
          style={{padding:"8px 14px",fontWeight:600,fontSize:12,cursor:"pointer",letterSpacing:0.2,
            border:"1.5px solid "+(activeTab==="decision-insights"?ACCENT:ACCENT+"66"),borderRadius:7,
            background:activeTab==="decision-insights"?ACCENT+"18":ACCENT+"08",
            color:ACCENT,display:"flex",alignItems:"center",gap:5,
            marginLeft:8,transition:"all .15s"}}>
          Decision Insights & Forecasts
          <span style={{fontSize:11,opacity:0.8}}>↗</span>
        </button>
      </div>

      {/* Content */}
      {activeTab==="goals" && (
        <div>
          <GoalTabExplorer ratings={ratings} onUpdateRatings={onUpdateRatings} goalRatings={data.goalRatings||{}} initialGoal={selectedGoal}/>
        </div>
      )}
      {activeTab==="map" && (
        <StrategyMap data={data} onNavigateToPortfolio={onNavigateToPortfolio}/>
      )}
      {activeTab==="hierarchy" && (
        <MeasurementHierarchyView/>
      )}
      {activeTab==="decision-insights" && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:360}}>
          <div style={{textAlign:"center",maxWidth:480}}>
            <div style={{width:56,height:56,borderRadius:16,background:ACCENT+"15",border:"1.5px solid "+ACCENT+"33",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:26}}>
              ✦
            </div>
            <div style={{fontSize:20,fontWeight:700,color:TEXT,marginBottom:10}}>Decision Insights & Forecasts</div>
            <div style={{fontSize:14,color:TEXT_SUB,lineHeight:1.7,marginBottom:24}}>
              This view will surface predictive insights, scenario models, and decision-support signals for the 2030 strategy goals.
            </div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 18px",borderRadius:20,background:ACCENT+"12",border:"1px solid "+ACCENT+"33"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:ACCENT,display:"inline-block",animation:"pulse 2s ease-in-out infinite"}}/>
              <span style={{fontSize:12,fontWeight:600,color:ACCENT}}>Coming Soon</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeView, onNavigate, data }) {
  const PORTFOLIOS = [
    {id:"ai-infra",      label:"AI Infrastructure"},
    {id:"sfl",           label:"System Feedback Loops"},
    {id:"hub",           label:"Data & AI Enablement Hub"},
    {id:"cross-cutting", label:"Cross Cutting Supports"},
  ];
  const isStrategyActive = activeView.type==="strategy";
  const isPortActive = (id) => activeView.type==="portfolio" && activeView.portId===id;

  return (
    <div style={{
      width:SIDEBAR_W, minHeight:"100vh", flexShrink:0, position:"sticky", top:0,
      background:BRAND, display:"flex", flexDirection:"column", overflowY:"auto",
    }}>
      <style>{FONT_CSS}</style>

      {/* Wordmark */}
      <div style={{padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:10, fontWeight:600, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:6}}>
          USP Data & AI
        </div>
        <div style={{fontSize:17, color:"#fff", lineHeight:1.25}}>
          Measurement &<br/>Insights Hub
        </div>
      </div>

      {/* Nav */}
      <div style={{padding:"12px 10px", flex:1}}>
        {/* Overview */}
        <NavItem
          label="Strategy Overview"
          icon={<IconGrid/>}
          active={isStrategyActive}
          onClick={()=>onNavigate({type:"strategy"})}
        />

        {/* Portfolios */}
        <div style={{padding:"16px 10px 6px", fontSize:10, fontWeight:600, letterSpacing:2, color:"rgba(255,255,255,0.25)", textTransform:"uppercase"}}>
          Portfolios
        </div>
        {PORTFOLIOS.map(p=>{
          const pc = PORT_COLORS[p.id];
          const isShell = false;
          return (
            <NavItem
              key={p.id}
              label={p.label}
              active={isPortActive(p.id)}
              onClick={()=>onNavigate({type:"portfolio", portId:p.id})}
              accent={isShell ? null : pc.color}
              muted={isShell}
              tag={isShell?"WIP":null}
            />
          );
        })}

        {/* Tools */}
        <div style={{padding:"20px 10px 6px", fontSize:10, fontWeight:600, letterSpacing:2, color:"rgba(255,255,255,0.25)", textTransform:"uppercase"}}>
          Tools
        </div>
        {[
          {label:"Decision Insights & Forecasts", soon:true},
          {label:"USP Co-Leverage Tracking", soon:true},
          {label:"ROI Calculator", soon:true},
        ].map(t=>(
          <NavItem key={t.label} label={t.label} muted soon={t.soon}/>
        ))}

        {/* Resources */}
        <div style={{padding:"20px 10px 6px", fontSize:10, fontWeight:600, letterSpacing:2, color:"rgba(255,255,255,0.25)", textTransform:"uppercase"}}>
          Resources
        </div>
        {[
          {label:"Team Sharepoint",        href:"https://bmgf.sharepoint.com/sites/USProgramDataTeam/SitePages/USP-Data-%26-AI-Team.aspx"},
          {label:"Data & Enablement Hub",  href:"https://bmgf.sharepoint.com/:u:/r/sites/USProgramDataTeam/SitePages/USP-Data-%26-AI-Resource-Hub.aspx"},
          {label:"INVEST",                 href:"https://gatesfoundation.lightning.force.com/lightning/n/Home_IMS"},
          {label:"Evidence Base",          href:"#"},
        ].map(r=>(
          <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:6,textDecoration:"none",transition:"background .15s",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:12, color:"rgba(255,255,255,0.45)", flex:1}}>{r.label}</span>
            <span style={{fontSize:10, color:"rgba(255,255,255,0.2)"}}>↗</span>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:10, color:"rgba(255,255,255,0.2)", letterSpacing:0.5}}>Draft · Do Not Distribute</div>
      </div>
    </div>
  );
}

function NavItem({ label, icon, active, onClick, accent, muted, tag, soon }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        width:"100%", display:"flex", alignItems:"center", gap:8,
        padding:"8px 10px", borderRadius:6, border:"none", cursor:onClick?"pointer":"default",
        background: active ? "rgba(255,255,255,0.1)" : hov && onClick ? "rgba(255,255,255,0.05)" : "transparent",
        transition:"background .12s", textAlign:"left",
        opacity: muted && !active ? 0.5 : 1,
      }}>
      {accent && <span style={{width:6,height:6,borderRadius:"50%",background:accent,flexShrink:0,display:"inline-block"}}/>}
      {icon && <span style={{color:"rgba(255,255,255,0.5)",flexShrink:0}}>{icon}</span>}
      <span style={{fontSize:13, fontWeight:active?600:400, color:active?"#fff":"rgba(255,255,255,0.6)", flex:1, lineHeight:1.3}}>
        {label}
      </span>
      {soon && <span style={{fontSize:9,fontWeight:700,color:ACCENT,background:"rgba(240,165,0,0.15)",borderRadius:3,padding:"1px 5px",letterSpacing:0.5,textTransform:"uppercase",border:"1px solid rgba(240,165,0,0.2)"}}>Soon</span>}
      {tag && !soon && <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.07)",borderRadius:3,padding:"1px 5px"}}>{tag}</span>}
    </button>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0" y="0" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="0" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
      <rect x="0" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="8" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [saveStatus,setSaveStatus] = useState("saved");
  const [activeView,setActiveView] = useState({type:"strategy"});

  const [usingPlaceholder, setUsingPlaceholder] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false); // "ok" | "db-error" | false

  useEffect(() => {
    async function init() {
      const ready = await isAPIReady();
      setApiAvailable(ready);
      if (ready === "ok") {
        const { data: apiData, fromAPI } = await loadFromAPI();
        if (apiData) {
          const stored = await loadFromStorage();
          if (stored) {
            apiData.strategyRatings = stored.strategyRatings || {};
            Object.keys(apiData.portfolios).forEach(portId => {
              const storedPort = stored.portfolios?.[portId];
              if (!storedPort) return;
              apiData.portfolios[portId].bows = apiData.portfolios[portId].bows.map(bow => {
                const storedBow = storedPort.bows?.find(b => b.id === bow.id);
                if (storedBow?.yearRatings) bow.yearRatings = storedBow.yearRatings;
                bow.outcomes = bow.outcomes.map(o => {
                  const storedO = storedBow?.outcomes?.find(so => so.id === o.id);
                  if (storedO?.manualStatus) o.manualStatus = storedO.manualStatus;
                  o.impactIndicators = o.impactIndicators.map(ind => {
                    const storedInd = storedO?.impactIndicators?.find(si => si.id === ind.id);
                    if (storedInd?.manualStatus) ind.manualStatus = storedInd.manualStatus;
                    return ind;
                  });
                  return o;
                });
                return bow;
              });
            });
          }
          setData(apiData);
          setUsingPlaceholder(!fromAPI);
          setLoading(false);
          return;
        }
      }
      const stored = await loadFromStorage();
      setData(stored || DEFAULT_DATA);
      setUsingPlaceholder(true);
      setLoading(false);
    }
    init();
  }, []);
  const saveTimeout = React.useRef(null);
  useEffect(() => {
    if (!data || loading) return;
    setSaveStatus("saving");
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const ok = await saveToStorage(data);
      setSaveStatus(ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(saveTimeout.current);
  }, [data]);

  const updatePortfolio = (portId,p) => setData(prev=>({...prev,portfolios:{...prev.portfolios,[portId]:{...prev.portfolios[portId],portfolio:p}}}));
  const updateBows = (portId,bows) => setData(prev=>({...prev,portfolios:{...prev.portfolios,[portId]:{...prev.portfolios[portId],bows}}}));

  if(loading) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:16,background:BG,fontFamily:"Calibri,'Segoe UI',Arial,sans-serif"}}>
      <style>{FONT_CSS}</style>
      <div style={{width:36,height:36,border:"2.5px solid "+BORDER,borderTopColor:ACCENT,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:14,color:TEXT_MUTED,letterSpacing:0.3}}>Loading…</div>
    </div>
  );

  const activePortId = activeView.type==="portfolio" ? activeView.portId : null;
  const activePortData = activePortId ? data.portfolios[activePortId] : null;
  const pc = activePortId ? PORT_COLORS[activePortId] : null;

  const breadcrumb = activeView.type==="strategy"
    ? "2026–2030 Strategy"
    : pc?.label || "";

  const pageTitle = activeView.type==="strategy"
    ? "USP Data & AI"
    : (activePortData?.portfolio?.name || pc?.label || "");

  return (
    <div style={{fontFamily:"Calibri,'Segoe UI',Arial,sans-serif",minHeight:"100vh",background:BG,display:"flex",color:TEXT}}>
      <style>{FONT_CSS}</style>
      <Sidebar activeView={activeView} onNavigate={setActiveView} data={data}/>

      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,maxHeight:"100vh",overflowY:"auto"}}>

        {/* Top bar */}
        <div style={{
          background:SURFACE, borderBottom:"1px solid "+BORDER,
          padding:"0 36px", height:56,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, zIndex:100,
        }}>
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <span style={{fontSize:11,fontWeight:500,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.2}}>{breadcrumb}</span>
            {pageTitle && breadcrumb !== pageTitle && (
              <>
                <span style={{color:TEXT_MUTED,opacity:0.4,fontSize:13}}>/</span>
                <span style={{fontSize:16,color:TEXT}}>{pageTitle}</span>
              </>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {/* Save indicator */}
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:TEXT_MUTED}}>
              {saveStatus==="saving"&&<><span style={{width:5,height:5,borderRadius:"50%",background:YELLOW,display:"inline-block",animation:"pulse 1s ease-in-out infinite"}}/><span>Saving</span></>}
              {saveStatus==="saved"&&<><span style={{width:5,height:5,borderRadius:"50%",background:"#10B981",display:"inline-block"}}/><span>Saved</span></>}
            </div>
            {/* Submit Data button */}
            <button
              title="Open management app to submit actuals or request BOW updates"
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"7px 16px",
                background:ACCENT,color:"#fff",
                border:"none",borderRadius:8,
                fontSize:12,fontWeight:700,cursor:"pointer",
                letterSpacing:0.2,
                boxShadow:"0 1px 4px rgba(248,92,2,0.25)",
                transition:"background .15s,box-shadow .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="#D94E02";e.currentTarget.style.boxShadow="0 2px 8px rgba(248,92,2,0.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.background=ACCENT;e.currentTarget.style.boxShadow="0 1px 4px rgba(248,92,2,0.25)";}}>
              Submit Data
            </button>
          </div>
        </div>


        {/* Connection status bar */}
        <div style={{padding:"5px 36px",borderBottom:"1px solid "+BORDER,display:"flex",alignItems:"center",gap:6,background:SURFACE}}>
          {!usingPlaceholder
            ? <><span style={{width:6,height:6,borderRadius:"50%",background:"#10B981",display:"inline-block",flexShrink:0}}/><span style={{fontSize:11,color:"#065F46",fontWeight:600}}>Live</span><span style={{fontSize:11,color:TEXT_MUTED}}>— connected to <code>usp_data.usp_strategy</code></span></>
            : apiAvailable==="db-error"
              ? <><span style={{width:6,height:6,borderRadius:"50%",background:"#EF4444",display:"inline-block",flexShrink:0}}/><span style={{fontSize:11,color:"#B91C1C",fontWeight:600}}>DB Unreachable</span><span style={{fontSize:11,color:TEXT_MUTED}}>— API is up but cannot connect to warehouse · showing placeholder data · </span><a href="/api/debug" target="_blank" style={{fontSize:11,color:"#B91C1C",textDecoration:"underline",cursor:"pointer"}}>view diagnostic</a></>
              : apiAvailable==="ok"
                ? <><span style={{width:6,height:6,borderRadius:"50%",background:YELLOW,display:"inline-block",flexShrink:0}}/><span style={{fontSize:11,color:"#92400E",fontWeight:600}}>Connected</span><span style={{fontSize:11,color:TEXT_MUTED}}>— warehouse reachable but tables appear empty · showing placeholder data</span></>
                : <><span style={{width:6,height:6,borderRadius:"50%",background:"#EF4444",display:"inline-block",flexShrink:0}}/><span style={{fontSize:11,color:"#B91C1C",fontWeight:600}}>Offline</span><span style={{fontSize:11,color:TEXT_MUTED}}>— API not reachable · showing placeholder data</span></>
          }
        </div>

        {/* Page content */}
        <div style={{flex:1,padding:"32px 36px",maxWidth:1600,width:"100%",boxSizing:"border-box"}}>
          {activeView.type==="strategy"&&(
            <StrategyOverview data={data} onUpdateRatings={r=>setData(prev=>({...prev,strategyRatings:r}))} onNavigateToPortfolio={id=>setActiveView({type:"portfolio",portId:id})} selectedGoal={activeView.goalNumber}/>
          )}
          {activeView.type==="portfolio"&&activePortData&&(
            <PortfolioDashboard
              portId={activePortId}
              portData={activePortData}
              portColor={PORT_COLORS[activePortId]}
              strategyRatings={data.strategyRatings||{}}
              onUpdateStrategyRatings={r=>setData(prev=>({...prev,strategyRatings:r}))}
              onUpdatePortfolio={p=>updatePortfolio(activePortId,p)}
              onUpdateBows={bows=>updateBows(activePortId,bows)}
              onNavigateToOutcome={idx=>{}}
              onNavigateToBow={bowId=>{}}
              onNavigateToStrategy={(goalNumber)=>setActiveView({type:"strategy",goalNumber})}/>
          )}
        </div>
      </div>
    </div>
  );
}