// ── CDN Shims — replaces import statements (loaded via index.html script tags) ──
const { useState, useEffect, useRef, useCallback } = React;
const _Recharts = window.Recharts || window.recharts || {};
const { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
        Tooltip, ResponsiveContainer, BarChart, Bar, LabelList, Legend } = _Recharts;


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
// Extract the division segment from INVEST team names.
// Format is "Prefix\Division\Sub-team" — we always want the Division (parts[1]).
// Falls back to the full name if no separator is present.
function cleanTeam(name) {
  if (!name) return "";
  const parts = name.split(/[\\\/]/);
  return (parts.length > 1 ? parts[1] : parts[0]).trim();
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
          {
            id:"sfl-po6", shortTitle:"Shared Agreement & Alignment",
            activity:"Build shared agreement and alignment across key stakeholders",
            outcome:"Shared agreement and alignment across key stakeholders.",
            manualStatus:null,
            indicators:[],
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

  // Clear all hardcoded content so DB is always the source of truth.
  // BOWs/portfolios with no DB rows will show empty rather than fake placeholder data.
  Object.values(base.portfolios).forEach(portData => {
    portData.bows.forEach(bow => { bow.outcomes = []; });
    portData.portfolio.portfolioOutcomes = [];
  });

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

        // ── Rebuild bow.outcomes from DB when DB has data ───────────────────
        // The DB is the source of truth for outcome count, IDs, titles.
        // Using DB IDs as o.id means Steps 3 (indicators) and targets both
        // resolve correctly without any positional mapping.
        // Falls back to DEFAULT_DATA outcomes if DB has none for this BOW.
        if (bowOutcomes.length > 0) {
          const sorted = [...bowOutcomes].sort(
            (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
          );
          bow.outcomes = sorted.map((o, i) => ({
            id:              o.outcome_id,          // DB UUID — used as truth key
            number:          i + 1,                 // sequential 1,2,3 regardless of sort_order gaps
            shortTitle:      o.short_title || o.title || "",
            title:           o.title || "",
            notes:           "",
            manualStatus:    null,
            executionTargets: YEARS.reduce((a, y) => ({ ...a, [y]: [] }), {}),
            impactIndicators: [],
          }));
        }

        // ── Merge execution targets ─────────────────────────────────────────
        // Now that o.id === DB outcome_id, direct key match works.
        if (targets.length > 0) {
          const grouped = {};
          targets.forEach(t => {
            const key = `${t.outcome_id || "__none"}|${t.year}`;
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
            // DB is the source of truth: id, text, targets, baseline, frequency
            byOutcome[ind.outcome_id][ind.indicator_id] = {
              id:          ind.indicator_id,
              text:        ind.text || "",
              source:      ind.data_source || "",
              baseline:    ind.baseline !== null ? String(ind.baseline) : "",
              updateFreq:  ind.collection_frequency || "",
              lastUpdated: "",   // populated below from most recent reading_date
              targets: {
                2026: ind.target_2026 !== null ? String(ind.target_2026) : "",
                2027: ind.target_2027 !== null ? String(ind.target_2027) : "",
                2028: ind.target_2028 !== null ? String(ind.target_2028) : "",
                2029: ind.target_2029 !== null ? String(ind.target_2029) : "",
                2030: ind.target_2030 !== null ? String(ind.target_2030) : "",
              },
              actuals: {},
              actualsList: [],   // all (year, period, value) entries for the trend chart
              manualStatus: null,
            };
          }
          // Actuals: one row per (year, period). Accumulate every entry so the chart
          // can plot individual period dots, and also keep actuals[year] for status calcs.
          // Track the most recent reading_date across all actuals for the "last updated" label.
          if (ind.year && ind.actual_value !== null && ind.actual_value !== undefined) {
            const entry = byOutcome[ind.outcome_id][ind.indicator_id];
            entry.actuals[ind.year] = String(ind.actual_value);
            entry.actualsList.push({
              year:   ind.year,
              period: ind.period || null,
              value:  Number(ind.actual_value),
            });
            if (ind.reading_date) {
              // Keep the latest reading_date seen across all period rows
              if (!entry.lastUpdated || ind.reading_date > entry.lastUpdated) {
                entry.lastUpdated = ind.reading_date;
              }
            }
          }
        });

        bow.outcomes.forEach(o => {
          // outcome_id in DB may be fully-qualified ("bow1-o1") while DEFAULT_DATA
          // uses short form ("o1") — try both so either schema works
          const inds = byOutcome[o.id] || byOutcome[`${bowId}-${o.id}`];
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
// ── Load all investments (called by All Investments page) ────────────────────
async function loadAllInvestments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.portfolio_id) params.append("portfolio_id", filters.portfolio_id);
  if (filters.status)       params.append("status", filters.status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  try {
    const rows = await apiFetch(`/api/investments/all${qs}`);
    // Map each raw row
    const mapped = rows.map(inv => ({
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
      owner:          inv.Investment_Owner            || "",
      secondaryOwner: inv.Secondary_Investment_Owner  || "",
      bow_id:         inv.bow_id                      || "",
      bow_title:      inv.bow_title              || "",
      portfolio_id:   inv.portfolio_id           || "",
      investmentUrl:  inv.Investment_URL         || "",
      description:    inv.Public_Description     || "",
      coFundingTeams:  inv.co_funding_teams || "",
      startDate:       inv.Start_Date             || "",
      endDate:         inv.End_Date               || "",
      internal_notes:  inv.internal_notes         || "",
      approver:        inv.approver               || "",
      overlay_id:      inv.overlay_id             || null,
      notesUpdatedAt:  inv.notes_updated_at       || null,
      notesUpdatedBy:  inv.notes_updated_by       || null,
    }));
    // Deduplicate by Investment_ID — collect all BOW associations into arrays
    const byId = {};
    mapped.forEach(inv => {
      if (!byId[inv.id]) {
        byId[inv.id] = {
          ...inv,
          bowIds:          inv.bow_id    ? [inv.bow_id]          : [],
          bowTitles:       inv.bow_title ? [inv.bow_title]       : [],
          bowPortfolioIds: inv.portfolio_id ? [inv.portfolio_id] : [],
        };
      } else {
        if (inv.bow_id && !byId[inv.id].bowIds.includes(inv.bow_id)) {
          byId[inv.id].bowIds.push(inv.bow_id);
          byId[inv.id].bowTitles.push(inv.bow_title || "");
          byId[inv.id].bowPortfolioIds.push(inv.portfolio_id || "");
        }
      }
    });
    return Object.values(byId);
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
  // Find the most recent year that has an actual value
  let latestIdx = -1;
  for (let j = actuals.length - 1; j >= 0; j--) {
    if (actuals[j] !== null && actuals[j] !== undefined) { latestIdx = j; break; }
  }
  if (latestIdx === -1) return "No Data";
  const latestActual = actuals[latestIdx];
  // Compare against the target for that same year — avoids comparing a 2026
  // actual against a 2030 target which would almost always look "behind"
  const correspondingTarget = targets[latestIdx];
  if (correspondingTarget === null || correspondingTarget === undefined) return "No Data";
  const r = latestActual / correspondingTarget;
  if (r > 1.0)  return "Exceeds Expectations";
  if (r >= 0.9) return "Meets Expectations";
  if (r >= 0.7) return "Slightly Below Expectations";
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

  const total     = allT.length;
  const complete  = allT.filter(t=>t.completion==="Complete").length;
  const onTrack   = allT.filter(t=>t.completion==="On Track").length;
  const delayed   = allT.filter(t=>t.completion==="Delayed").length;
  const positive  = complete + onTrack;  // Complete or On Track = heading in the right direction

  // All untouched — too early to assess
  if (positive === 0 && delayed === 0) return {complete,onTrack,delayed,total,year:yr,...STATUS["No Data"]};

  let rating;
  if (delayed === 0 && complete === total)          rating = "Exceeds Expectations";       // everything done
  else if (delayed === 0)                           rating = "Meets Expectations";          // on track, nothing slipping
  else if (positive > delayed)                      rating = "Slightly Below Expectations"; // majority positive, some slippage
  else                                              rating = "Below Expectations";           // delayed items outnumber or match positive

  return { complete, onTrack, delayed, total, year:yr, ...STATUS[rating] };
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
      {lastUpdated && <><span style={{opacity:0.25}}>·</span><span style={{opacity:0.65}}>Updated {(()=>{try{return new Date(lastUpdated).toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"});}catch{return lastUpdated;}})()}</span></>}
      {/* Divider + frequency */}
      {updateFreq && <><span style={{opacity:0.25}}>·</span><span style={{opacity:0.65}}>{updateFreq}</span></>}
    </div>
  );
}

// ── IndicatorTile ─────────────────────────────────────────────────────────────
function IndicatorTile({ ind, iIdx, activeYear, fluid }) {
  const { baseline:baselineVal, actuals:actualVals, targets:targetVals } = getIndData(ind);
  const sc = STATUS[ind.manualStatus||autoSuggestStatus(ind)];
  const yrIdx = YEARS.indexOf(activeYear);

  // Detect multi-period indicators (bimonthly / quarterly)
  const rawList = (ind.actualsList || []).slice().sort((a,b)=>
    a.year!==b.year ? a.year-b.year : (a.period||"").localeCompare(b.period||""));
  const isMultiPeriod = rawList.some(a => a.period);

  // Build chart series
  // For multi-period: one dot per (year, period) entry, then annual target-only points
  // for future years that have no actuals yet.
  // Label: "Jan '26" for period entries, "'27" for annual target-only points.
  const periodLabel = (year, period) => {
    if (!period) return "'" + String(year).slice(2);
    // Take first 3 chars of period (e.g. "Jan–Feb" → "Jan", "Q1" → "Q1")
    const abbr = period.length > 3 ? period.slice(0, 3) : period;
    return abbr + " '" + String(year).slice(2);
  };

  let chartPoints;
  if (isMultiPeriod) {
    const targetByYear = {};
    YEARS.forEach((yr,j)=>{ if(targetVals[j]!==null) targetByYear[yr]=targetVals[j]; });
    const yearsWithActuals = new Set(rawList.map(a=>a.year));

    // Period actual points
    chartPoints = rawList.map(a => ({
      label:    periodLabel(a.year, a.period),
      year:     a.year,
      isTarget: false,
      Actual:   a.year <= activeYear ? a.value : null,
      Target:   targetByYear[a.year] || null,
    }));
    // Add annual target-only points for years with no actuals
    YEARS.forEach((yr,j) => {
      if(!yearsWithActuals.has(yr) && targetVals[j]!==null) {
        chartPoints.push({ label:periodLabel(yr,null), year:yr, isTarget:true, Actual:null, Target:targetVals[j] });
      }
    });
    chartPoints.sort((a,b)=>a.year!==b.year?a.year-b.year:(a.label).localeCompare(b.label));
  } else {
    chartPoints = YEARS.map((yr,j)=>({
      label: String(yr), year:yr, isTarget:false,
      Actual: actualVals[j], Target: targetVals[j],
    }));
  }

  const allChartData = [{label:"Base",year:null,Actual:baselineVal,Target:null}, ...chartPoints];

  // "activeYear Actual" big number — for multi-period use the latest period in that year
  const activeActual = isMultiPeriod
    ? (rawList.filter(a=>a.year===activeYear).slice(-1)[0]?.value ?? null)
    : actualVals[yrIdx];

  return (
    <div style={{flexShrink:0,width:(fluid||ind._fluid)?"100%":380,border:"1px solid "+BORDER,borderLeft:"3px solid "+sc.color,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(10,37,64,0.04)",background:SURFACE}}>
      <div style={{padding:"12px 16px 10px",background:SURFACE,borderBottom:"1px solid "+BORDER}}>
        <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:5}}>Indicator {iIdx+1}</div>
        <div style={{fontSize:13,fontWeight:700,color:TEXT,lineHeight:1.5,marginBottom:5}}>{ind.text}</div>
        <DataMeta source={ind.source} lastUpdated={ind.lastUpdated} updateFreq={ind.updateFreq}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid "+BORDER}}>
        <div style={{padding:"12px 12px 10px",borderRight:"1px solid "+BORDER,textAlign:"center",background:SURFACE}}>
          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>{activeYear} Target</div>
          <div style={{fontSize:26,fontWeight:800,color:targetVals[yrIdx]!==null?sc.color:"#D0CBC2",lineHeight:1}}>{targetVals[yrIdx]!==null?targetVals[yrIdx]:"—"}</div>
        </div>
        <div style={{padding:"12px 12px 10px",textAlign:"center",background:SURFACE}}>
          <div style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.6,marginBottom:4}}>{activeYear} Actual</div>
          <div style={{fontSize:26,fontWeight:800,color:activeActual!==null?sc.color:"#D0CBC2",lineHeight:1}}>{activeActual!==null?activeActual:"—"}</div>
        </div>
      </div>
      <div style={{padding:"10px 10px 8px"}}>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={allChartData} margin={{top:4,right:4,bottom:0,left:-22}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
            <XAxis dataKey="label" tick={({x,y,payload})=>{
              const isBase = payload.value==="Base";
              const isHL   = !isBase && payload.value.includes("'"+String(activeYear).slice(2));
              return <text x={x} y={y+10} textAnchor="middle" fontSize={isHL?10:8} fontWeight={isHL?700:400} fill={TEXT_SUB}>{isBase?"B":payload.value}</text>;
            }}/>
            <YAxis tick={{fontSize:9,fill:TEXT_SUB}}/>
            <Tooltip contentStyle={{fontSize:11,borderRadius:6,border:"1px solid "+BORDER}}
              formatter={(val,name)=>[val!==null&&val!==undefined?val:"—",name]}/>
            <Line type="monotone" dataKey="Actual" stroke={sc.color} strokeWidth={2} connectNulls
              dot={(props)=>{
                const d=props.payload;
                const isBase=d.label==="Base";
                const inActiveYr=!isBase&&d.year===activeYear;
                if(d.Actual===null||d.Actual===undefined) return <circle key={props.index} r={0} cx={0} cy={0}/>;
                return <circle key={props.index} cx={props.cx} cy={props.cy}
                  r={isBase?4:inActiveYr?5:2}
                  fill={isBase?"#94A3B8":inActiveYr?sc.color:"#fff"}
                  stroke={isBase?"#94A3B8":sc.color} strokeWidth={1.5}/>;
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

// ── IndicatorRow — flat inline indicator (no card chrome) ─────────────────────
function IndicatorRow({ ind, iIdx, activeYear }) {
  const { baseline:baselineVal, actuals:actualVals, targets:targetVals } = getIndData(ind);
  const sc = STATUS[ind.manualStatus||autoSuggestStatus(ind)];
  const yrIdx = YEARS.indexOf(activeYear);

  const rawList = (ind.actualsList || []).slice().sort((a,b)=>
    a.year!==b.year ? a.year-b.year : (a.period||"").localeCompare(b.period||""));
  const isMultiPeriod = rawList.some(a => a.period);

  const periodLabel = (year, period) => {
    if (!period) return "'" + String(year).slice(2);
    const abbr = period.length > 3 ? period.slice(0,3) : period;
    return abbr + " '" + String(year).slice(2);
  };

  let chartPoints;
  if (isMultiPeriod) {
    const targetByYear = {};
    YEARS.forEach((yr,j)=>{ if(targetVals[j]!==null) targetByYear[yr]=targetVals[j]; });
    const yearsWithActuals = new Set(rawList.map(a=>a.year));
    chartPoints = rawList.map(a => ({
      label:periodLabel(a.year,a.period), year:a.year, isTarget:false,
      Actual:a.year<=activeYear?a.value:null, Target:targetByYear[a.year]||null,
    }));
    YEARS.forEach((yr,j)=>{
      if(!yearsWithActuals.has(yr)&&targetVals[j]!==null)
        chartPoints.push({label:periodLabel(yr,null),year:yr,isTarget:true,Actual:null,Target:targetVals[j]});
    });
    chartPoints.sort((a,b)=>a.year!==b.year?a.year-b.year:(a.label).localeCompare(b.label));
  } else {
    chartPoints = YEARS.map((yr,j)=>({label:String(yr),year:yr,isTarget:false,Actual:actualVals[j],Target:targetVals[j]}));
  }
  const allChartData = [{label:"Base",year:null,Actual:baselineVal,Target:null},...chartPoints];

  const activeActual = isMultiPeriod
    ? (rawList.filter(a=>a.year===activeYear).slice(-1)[0]?.value ?? null)
    : actualVals[yrIdx];

  return (
    <div style={{padding:"14px 16px",borderRight:"1px solid "+BORDER,borderBottom:"1px solid "+BORDER,display:"flex",flexDirection:"column",gap:0}}>
      {/* Status accent + label */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:sc.color,flexShrink:0,display:"inline-block"}}/>
        <span style={{fontSize:10,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Indicator {iIdx+1}</span>
      </div>
      {/* Indicator text */}
      <div style={{fontSize:13,fontWeight:700,color:TEXT,lineHeight:1.5,marginBottom:6}}>{ind.text}</div>
      <DataMeta source={ind.source} lastUpdated={ind.lastUpdated} updateFreq={ind.updateFreq}/>
      {/* Numbers */}
      <div style={{display:"flex",gap:16,margin:"10px 0 6px"}}>
        <div>
          <div style={{fontSize:9,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.6,marginBottom:2}}>{activeYear} Target</div>
          <div style={{fontSize:22,fontWeight:800,color:targetVals[yrIdx]!==null?sc.color:"#D0CBC2",lineHeight:1}}>
            {targetVals[yrIdx]!==null?targetVals[yrIdx]:"—"}
          </div>
        </div>
        <div>
          <div style={{fontSize:9,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.6,marginBottom:2}}>{activeYear} Actual</div>
          <div style={{fontSize:22,fontWeight:800,color:activeActual!==null?sc.color:"#D0CBC2",lineHeight:1}}>
            {activeActual!==null?activeActual:"—"}
          </div>
        </div>
      </div>
      {/* Chart */}
      <ResponsiveContainer width="100%" height={70}>
        <LineChart data={allChartData} margin={{top:4,right:4,bottom:0,left:-22}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8"/>
          <XAxis dataKey="label" tick={({x,y,payload})=>{
            const isHL=payload.value.includes("'"+String(activeYear).slice(2));
            return <text x={x} y={y+10} textAnchor="middle" fontSize={isHL?9:7} fontWeight={isHL?700:400} fill={TEXT_SUB}>{payload.value==="Base"?"B":payload.value}</text>;
          }}/>
          <YAxis tick={{fontSize:8,fill:TEXT_SUB}}/>
          <Tooltip contentStyle={{fontSize:10,borderRadius:6,border:"1px solid "+BORDER}} formatter={(v,n)=>[v!=null?v:"—",n]}/>
          <Line type="monotone" dataKey="Actual" stroke={sc.color} strokeWidth={2} connectNulls
            dot={({payload:d,...p})=>{
              if(d.Actual===null||d.Actual===undefined) return <circle key={p.index} r={0} cx={0} cy={0}/>;
              const isBase=d.label==="Base", inYr=!isBase&&d.year===activeYear;
              return <circle key={p.index} cx={p.cx} cy={p.cy} r={isBase?3:inYr?4:2} fill={isBase?"#94A3B8":inYr?sc.color:"#fff"} stroke={isBase?"#94A3B8":sc.color} strokeWidth={1.5}/>;
            }}/>
          <Line type="monotone" dataKey="Target" stroke={BORDER} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls/>
        </LineChart>
      </ResponsiveContainer>
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
                    <span style={{width:7,height:7,borderRadius:"50%",background:c.color,flexShrink:0,marginTop:5,display:"inline-block"}}/>
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
function SolidBadge({ label, color }) {
  return (
    <span style={{display:"inline-block",padding:"2px 8px",borderRadius:6,
      background:color||"#A49A8C",color:"#fff",fontSize:10,fontWeight:700,
      letterSpacing:0.5,whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}

function PortfolioOutcomesView({ portId, portfolio, bows, portColor, onChange, initialIdx, portShortTitles, onNavigateToStrategy }) {
  const pc = portColor || { color: ACCENT, light: ACCENT_LIGHT };
  const SHORT_TITLES = portShortTitles || PO_SHORT_TITLES_CC;
  const [activeIdx, setActiveIdx] = useState(initialIdx ?? 0);
  const [bowOpen, setBowOpen] = useState(false);

  const [bowLinks, setBowLinks] = useState({});
  useEffect(() => {
    if (!bows || !bows.length) return;
    Promise.all(bows.map(b => apiFetch(`/api/bow-portfolio-links/${b.id}`).catch(() => [])))
      .then(results => {
        const map = {};
        results.flat().forEach(link => {
          if (!map[link.portfolio_outcome_id]) map[link.portfolio_outcome_id] = new Set();
          map[link.portfolio_outcome_id].add(link.bow_outcome_id);
        });
        setBowLinks(map);
      });
  }, [portId]);

  const switchOutcome = (i) => { setActiveIdx(i); setBowOpen(false); };
  const bowProgress = (bows||[]).map(b => ({ id:b.id, name:b.name, outcomes:b.outcomes }));
  const po = portfolio.portfolioOutcomes[activeIdx] || portfolio.portfolioOutcomes[0];

  const linkedIds = po ? bowLinks[po.id] : null;
  const contributingBows = bowProgress.map(b => {
    const visible = linkedIds
      ? b.outcomes.filter(o => linkedIds.has(o.id))
      : b.outcomes.filter(o => o.title || o.shortTitle);
    return {...b, outcomes: visible};
  }).filter(b => b.outcomes.length > 0);
  const bowCount = contributingBows.reduce((s,b) => s + b.outcomes.length, 0);

  const goals = (PORT_GOAL_MAP[portId]||[]).map(gNum => STRATEGY_GOALS.find(x=>x.number===gNum)).filter(Boolean);

  const allOutcomes = portfolio.portfolioOutcomes;
  let kpiOnTrack = 0, kpiWatch = 0, kpiOffTrack = 0;
  allOutcomes.forEach(p => {
    const s = impactAutoStatus({impactIndicators: p.indicators});
    if (!s) return;
    if (s.label==="Exceeds Expectations"||s.label==="Meets Expectations") kpiOnTrack++;
    else if (s.label==="Slightly Below Expectations") kpiWatch++;
    else if (s.label==="Below Expectations") kpiOffTrack++;
  });
  const totalSignals = allOutcomes.reduce((sum,p)=>sum+p.indicators.filter(i=>i.text).length, 0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── KPI strip ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        {[
          {label:"On Track",        value:kpiOnTrack,   sub:"outcomes",          color:"#059669"},
          {label:"Watch",           value:kpiWatch,     sub:"outcomes",          color:"#D97706"},
          {label:"Off Track",       value:kpiOffTrack,  sub:"outcomes",          color:"#DC2626"},
          {label:"Signals Tracked", value:totalSignals, sub:"leading indicators", color:pc.color},
        ].map(k=>(
          <div key={k.label} style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"18px 20px",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
            <div style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:32,fontWeight:700,color:k.color,lineHeight:1,marginBottom:6}}>{k.value}</div>
            <div style={{fontSize:12,color:TEXT_SUB}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Outcome status overview (pipeline-style) ── */}
      <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"18px 22px",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
        <div style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>Outcome Status — click to explore</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {allOutcomes.map((p,i)=>{
            const s = impactAutoStatus({impactIndicators:p.indicators});
            const rs = s ? (STATUS[s.label]||STATUS["No Data"]) : STATUS["No Data"];
            const isActive = i===activeIdx;
            return (
              <div key={p.id} onClick={()=>switchOutcome(i)} style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:rs.color,flexShrink:0}}/>
                <div style={{width:160,fontSize:12,fontWeight:isActive?700:500,color:isActive?TEXT:TEXT_SUB,flexShrink:0}}>{SHORT_TITLES[i]||p.shortTitle}</div>
                <div style={{flex:1,height:26,borderRadius:6,background:rs.color+"18",border:"1px solid "+(isActive?rs.color:rs.color+"44"),display:"flex",alignItems:"center",paddingLeft:12,transition:"all .15s",boxShadow:isActive?"0 0 0 2px "+rs.color+"55":"none"}}>
                  <span style={{fontSize:12,fontWeight:600,color:rs.color}}>{rs.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Outcome detail ── */}
      {po && (
        <div style={{display:"flex",gap:20}}>
          <div style={{flex:1,minWidth:0,background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,overflow:"hidden",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>

            {/* Header */}
            <div style={{padding:"16px 22px",borderBottom:"1px solid "+BORDER,background:"#FAFAF8",borderLeft:"3px solid "+pc.color}}>
              <div style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Outcome {activeIdx+1} — {SHORT_TITLES[activeIdx]||po.shortTitle}</div>
              <div style={{fontSize:15,fontWeight:600,color:TEXT,lineHeight:1.6}}>{po.outcome}</div>
            </div>

            {/* Leading signals */}
            <div style={{padding:"16px 22px",borderBottom:"1px solid "+BORDER}}>
              <div style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Leading Signals</div>
              {po.indicators.filter(ind=>ind.text).length > 0 ? (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,borderTop:"1px solid "+BORDER}}>
                  {po.indicators.filter(ind=>ind.text).map((ind,iIdx)=>(
                    <IndicatorRow key={ind.id} ind={ind} iIdx={iIdx} activeYear={CURRENT_YEAR}/>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:13,color:"#C9C3BA",fontStyle:"italic"}}>No indicators defined.</div>
              )}
            </div>

            {/* Contributing BOW Outcomes — collapsible */}
            <div>
              <button onClick={()=>setBowOpen(v=>!v)}
                style={{width:"100%",textAlign:"left",padding:"11px 22px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:bowOpen?"1px solid "+BORDER:"none"}}>
                <span style={{fontSize:11,color:TEXT_MUTED}}>{bowOpen?"▾":"▸"}</span>
                <span style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Contributing BOW Outcomes</span>
                <span style={{fontSize:11,background:"#EEEBE6",color:TEXT_SUB,borderRadius:10,padding:"1px 8px",fontWeight:700}}>{bowCount}</span>
                <span style={{marginLeft:"auto",fontSize:11,color:TEXT_MUTED,fontStyle:"italic",fontWeight:400}}>{bowOpen?"collapse":"expand"}</span>
              </button>
              {bowOpen&&(
                <div style={{padding:"4px 22px 18px",display:"flex",flexDirection:"column",gap:12}}>
                  {contributingBows.length===0
                    ? <div style={{fontSize:13,color:"#C9C3BA",fontStyle:"italic",paddingTop:10}}>No linked BOW outcomes.</div>
                    : contributingBows.map(b=>(
                        <div key={b.id} style={{borderRadius:10,border:"1px solid "+BORDER,borderLeft:"3px solid #C9C3BA",overflow:"hidden",background:SURFACE}}>
                          <div style={{padding:"8px 14px",background:"#EEEBE6",borderBottom:"1px solid "+BORDER}}>
                            <div style={{fontSize:11,fontWeight:700,color:TEXT_SUB,textTransform:"uppercase",letterSpacing:1.2}}>{b.name}</div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column"}}>
                            {b.outcomes.map((o,oi)=>{
                              const oExec = execAutoStatus(o,CURRENT_YEAR);
                              const oImpact = impactAutoStatus({impactIndicators:o.impactIndicators||[]});
                              const oExecRs = oExec ? (STATUS[oExec.label]||null) : null;
                              const isLast = oi===b.outcomes.length-1;
                              return (
                                <div key={o.id||oi} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderBottom:isLast?"none":"1px solid "+BORDER}}>
                                  <span style={{width:18,height:18,borderRadius:"50%",background:"#EEEBE6",border:"1px solid "+BORDER,fontSize:9,fontWeight:700,color:TEXT_SUB,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{oi+1}</span>
                                  <div style={{flex:1,fontSize:12,color:TEXT,lineHeight:1.55}}>{o.title||o.shortTitle}</div>
                                  <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"center",paddingTop:1}}>
                                    {oExec && oExecRs && (
                                      <SolidBadge label={"Exec: "+oExec.complete+"/"+oExec.total} color={oExecRs.color}/>
                                    )}
                                    {oImpact && (
                                      <SolidBadge label={oImpact.label.replace(" Expectations","")} color={(STATUS[oImpact.label]||{color:"#A49A8C"}).color}/>
                                    )}
                                    {!oExec && !oImpact && <span style={{fontSize:11,color:"#D0CBC2"}}>—</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Goals panel — simplified, no individual cards */}
          {goals.length > 0 && (
            <div style={{flex:"0 0 240px",background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,padding:"18px 18px 24px",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
              <div style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:16}}>2030 Goals Enabled</div>
              <div style={{display:"flex",flexDirection:"column",gap:18}}>
                {goals.map(g => {
                  const pct = (g.goal2030 && g.current2026 !== undefined)
                    ? Math.round((g.current2026 / g.goal2030) * 100) : null;
                  return (
                    <div key={g.number}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:pct!==null?8:0}}>
                        <span style={{width:20,height:20,borderRadius:"50%",background:"#EEEBE6",border:"1px solid "+BORDER,fontSize:10,fontWeight:800,color:TEXT_SUB,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{g.number}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:TEXT,lineHeight:1.3,marginBottom:2}}>{g.title}</div>
                          <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.4}}>{g.target}</div>
                        </div>
                      </div>
                      {pct !== null && (
                        <div style={{paddingLeft:28}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                            <div style={{flex:1,height:4,borderRadius:2,background:BORDER,overflow:"hidden"}}>
                              <div style={{height:"100%",borderRadius:2,width:Math.min(pct,100)+"%",background:pc.color,transition:"width .4s"}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:700,color:TEXT,flexShrink:0}}>{pct}%</span>
                          </div>
                          <div style={{fontSize:10,color:TEXT_MUTED,marginBottom:4}}>{g.current2026}{g.unit} of {g.goal2030}{g.unit}</div>
                          {onNavigateToStrategy&&(
                            <button onClick={()=>onNavigateToStrategy(g.number)}
                              style={{fontSize:11,fontWeight:600,color:pc.color,background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3}}>
                            View full goal ↗
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
        const pct=raw.length?Math.round((raw.filter(t=>t.completion==="Complete"||t.completion==="On Track").length/raw.length)*100):null;
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
                {raw.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:160}}>{raw.map((t,ti)=>{const c2=COMPLETION[migrateCompletion(t.completion)]||COMPLETION["Not Started"];return <span key={ti} title={(t.text||"Target "+(ti+1))+"\n"+c2.label} style={{width:9,height:9,borderRadius:"50%",background:c2.color,display:"inline-block",flexShrink:0,cursor:"default"}}/>;})}</div>}
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
// ── Shared investment helpers ─────────────────────────────────────────────────
function fmtNoteDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtInvDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return ts.split("T")[0] || ts;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const yr = String(d.getFullYear()).slice(2);
  return `${m}/${day}/${yr}`;
}


const PIPELINE_STAGES = [
  "Start Concept",
  "Request Proposal",
  "Refine Proposal",
  "Create Agreement",
  "Request Approval",
  "Obtain Signatures",
];

const STAGE_FILTER_OPTIONS = [
  { value: "",                    label: "All" },
  { value: "Active",              label: "Active" },
  { value: "Start Concept",       label: "Start Concept" },
  { value: "Request Proposal",    label: "Request Proposal" },
  { value: "Refine Proposal",     label: "Refine Proposal" },
  { value: "Create Agreement",    label: "Create Agreement" },
  { value: "Request Approval",    label: "Request Approval" },
  { value: "Obtain Signatures",   label: "Obtain Signatures" },
];

const APPROVERS = ["Matt Gee", "Natasha Fedo", "Nicole Ifill", "Allan Golston", "Other"];

 
 
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

// ── Generic Theory of Action (DB-driven) ─────────────────────────────────────
function ToaAmb45Buckets({ buckets }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {buckets.map(bucket => {
        const isOpen = expanded === bucket.label;
        const bc = bucket.color || C.slate;
        return (
          <div key={bucket.label}>
            <button onClick={() => setExpanded(isOpen ? null : bucket.label)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0, marginBottom:3 }}>
              <div style={{ fontSize:12, fontWeight:800, color:bc, letterSpacing:"0.06em", textTransform:"uppercase", background:`${bc}15`, padding:"4px 10px", borderLeft:`3px solid ${bc}`, borderRadius:"0 4px 4px 0" }}>{bucket.label}</div>
              <div style={{ flex:1, height:1, background:C.bd }} />
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {isOpen && (
              <div style={{ background:`${C.teal}04`, border:`1px solid ${C.teal}20`, borderLeft:`3px solid ${C.teal}`, borderRadius:"0 6px 6px 0", padding:"8px 10px", display:"flex", flexDirection:"column", gap:8 }}>
                {bucket.contribution && <div style={{ fontSize:11, color:C.textMid, lineHeight:1.6, marginBottom:bucket.priorities&&bucket.priorities.length?4:0 }}>{bucket.contribution}</div>}
                {bucket.priorities && bucket.priorities.length > 0 && (
                  <>
                    <div style={{ height:1, background:C.bd }} />
                    {bucket.priorities.map(p => (
                      <div key={p.n}>
                        <div style={{ fontSize:10, fontWeight:800, color:C.gold, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{p.n}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.navy, lineHeight:1.3, marginBottom:p.t1?2:0 }}>{p.title}</div>
                        {p.t1 && <div style={{ fontSize:11, color:C.textMid, lineHeight:1.5 }}>{p.t1}{p.t2?" · "+p.t2:""}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ToA inline edit helpers ───────────────────────────────────────────────────
function ToaTextField({ value, onChange, multiline, placeholder, style={} }) {
  const base = {
    width:"100%", border:`1.5px solid ${C.tealBd}`, borderRadius:6, padding:"5px 8px",
    fontSize:12, fontFamily:"inherit", color:C.text, background:"#fff",
    outline:"none", resize:multiline?"vertical":"none",
    minHeight:multiline?52:"auto", lineHeight:1.5, ...style
  };
  return multiline
    ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>
    : <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...base,height:28}}/>;
}

function ToaEditList({ items, onChange, placeholder, accent }) {
  // items = array of strings
  const ac = accent || C.teal;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",gap:4,alignItems:"flex-start"}}>
          <textarea
            value={item} rows={2}
            onChange={e=>{ const n=[...items]; n[i]=e.target.value; onChange(n); }}
            style={{flex:1,border:`1px solid ${C.bd}`,borderRadius:5,padding:"4px 7px",fontSize:11,fontFamily:"inherit",color:C.text,background:"#fff",resize:"vertical",outline:"none",lineHeight:1.45}}
          />
          <button onClick={()=>onChange(items.filter((_,j)=>j!==i))}
            style={{flexShrink:0,background:"none",border:`1px solid #f8a0a0`,borderRadius:5,width:24,height:24,cursor:"pointer",color:"#c04040",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>✕</button>
        </div>
      ))}
      <button onClick={()=>onChange([...items,""])}
        style={{alignSelf:"flex-start",background:"none",border:`1px solid ${ac}50`,borderRadius:5,padding:"3px 10px",fontSize:11,color:ac,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
    </div>
  );
}

function PortfolioToaView({ portfolioId, portColor }) {
  const [toaData, setToaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLane, setActiveLane] = useState(null);
  const [expandedIndicators, setExpandedIndicators] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editState, setEditState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fetchToa = () => {
    setLoading(true);
    return fetch(`/api/toa/${portfolioId}`)
      .then(r => r.json())
      .then(d => { setToaData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    setActiveLane(null);
    setExpandedIndicators({});
    setEditMode(false);
    setEditState(null);
    fetchToa();
  }, [portfolioId]);

  const enterEdit = () => {
    if (!toaData) return;
    const { toa, lanes } = toaData;
    setEditState({
      toa: { ...toa },
      crossInds: toa.cross_indicators_json ? JSON.parse(toa.cross_indicators_json) : [],
      lanes: lanes.map(l => ({
        ...l,
        activities: (l.activities || []).map(a => ({ ...a })),
        indicators: (l.indicators || []).map(i => ({ ...i })),
      }))
    });
    setEditMode(true);
    setSaveError(null);
  };

  const cancelEdit = () => { setEditMode(false); setEditState(null); setSaveError(null); };

  const setToaField = (field, val) =>
    setEditState(s => ({ ...s, toa: { ...s.toa, [field]: val } }));

  const setCrossInds = inds =>
    setEditState(s => ({ ...s, crossInds: inds }));

  const setLaneField = (laneId, field, val) =>
    setEditState(s => ({
      ...s,
      lanes: s.lanes.map(l => l.lane_id === laneId ? { ...l, [field]: val } : l)
    }));

  const setLaneActivities = (laneId, acts) =>
    setEditState(s => ({
      ...s,
      lanes: s.lanes.map(l => l.lane_id === laneId ? { ...l, activities: acts } : l)
    }));

  const setLaneIndicators = (laneId, inds) =>
    setEditState(s => ({
      ...s,
      lanes: s.lanes.map(l => l.lane_id === laneId ? { ...l, indicators: inds } : l)
    }));

  const saveAll = async () => {
    setSaving(true); setSaveError(null);
    const orig = toaData;
    try {
      const promises = [];

      // 1. Top-level toa fields
      const toaChanged = {};
      const toaFields = ["problem_statement","col1_label","col2_label","cross_indicators_label","amb45_intro_text","amb45_label","amb45_full_text","amb45_buckets_json"];
      toaFields.forEach(f => { if (editState.toa[f] !== orig.toa[f]) toaChanged[f] = editState.toa[f]; });
      const newCrossJson = JSON.stringify(editState.crossInds);
      if (newCrossJson !== orig.toa.cross_indicators_json) toaChanged.cross_indicators_json = newCrossJson;
      if (Object.keys(toaChanged).length) {
        promises.push(fetch(`/api/toa/${portfolioId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(toaChanged) }));
      }

      // 2. Lane fields + activities + indicators
      editState.lanes.forEach((lane, li) => {
        const origLane = orig.lanes[li] || {};
        // Lane label/outcome
        const laneChanged = {};
        ["label","outcome_text","icon","color"].forEach(f => { if (lane[f] !== origLane[f]) laneChanged[f] = lane[f]; });
        if (Object.keys(laneChanged).length) {
          promises.push(fetch(`/api/toa/lanes/${lane.lane_id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(laneChanged) }));
        }

        // Activities
        const origActIds = new Set((origLane.activities||[]).map(a=>a.activity_id));
        const editActIds = new Set(lane.activities.filter(a=>!a._isNew).map(a=>a.activity_id));
        // Deleted
        (origLane.activities||[]).forEach(a => {
          if (!editActIds.has(a.activity_id)) {
            promises.push(fetch(`/api/toa/activities/${a.activity_id}`, { method:"DELETE" }));
          }
        });
        // New
        lane.activities.filter(a=>a._isNew && a.activity_text.trim()).forEach((a,ai) => {
          promises.push(fetch("/api/toa/activities", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ lane_id:lane.lane_id, portfolio_id:portfolioId, activity_text:a.activity_text.trim(), sort_order:100+ai }) }));
        });
        // Modified existing
        lane.activities.filter(a=>!a._isNew && origActIds.has(a.activity_id)).forEach(a => {
          const origA = (origLane.activities||[]).find(oa=>oa.activity_id===a.activity_id);
          if (origA && a.activity_text !== origA.activity_text) {
            promises.push(fetch(`/api/toa/activities/${a.activity_id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ activity_text:a.activity_text }) }));
          }
        });

        // Indicators
        const origIndIds = new Set((origLane.indicators||[]).map(i=>i.indicator_id));
        const editIndIds = new Set(lane.indicators.filter(i=>!i._isNew).map(i=>i.indicator_id));
        (origLane.indicators||[]).forEach(i => {
          if (!editIndIds.has(i.indicator_id)) {
            promises.push(fetch(`/api/toa/lane-indicators/${i.indicator_id}`, { method:"DELETE" }));
          }
        });
        lane.indicators.filter(i=>i._isNew && i.indicator_text.trim()).forEach((i,ii) => {
          promises.push(fetch("/api/toa/lane-indicators", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ lane_id:lane.lane_id, portfolio_id:portfolioId, indicator_text:i.indicator_text.trim(), sort_order:100+ii }) }));
        });
        lane.indicators.filter(i=>!i._isNew && origIndIds.has(i.indicator_id)).forEach(i => {
          const origI = (origLane.indicators||[]).find(oi=>oi.indicator_id===i.indicator_id);
          if (origI && i.indicator_text !== origI.indicator_text) {
            promises.push(fetch(`/api/toa/lane-indicators/${i.indicator_id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ indicator_text:i.indicator_text }) }));
          }
        });
      });

      await Promise.all(promises);
      await fetchToa();  // re-fetch fresh data
      setEditMode(false); setEditState(null);
    } catch(e) {
      setSaveError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.textDim }}>Loading…</div>;
  if (!toaData || !toaData.toa) return (
    <div style={{ padding:40, textAlign:"center", color:C.textDim }}>
      <div style={{ fontSize:15, marginBottom:8 }}>No Theory of Action defined for this portfolio.</div>
    </div>
  );

  const { toa, lanes } = toaData;
  const accent = portColor?.color || C.teal;
  const col1Label = toa.col1_label || "Service Lines";
  const col2Label = toa.col2_label || "Core Activities";
  const crossLabel = toa.cross_indicators_label || "2030 Impact Goals";
  const toggleLane = id => setActiveLane(p => p === id ? null : id);
  const toggleInd = (id, e) => { e.stopPropagation(); setExpandedIndicators(p => ({ ...p, [id]: !p[id] })); };
  const crossIndicators = toa.cross_indicators_json ? JSON.parse(toa.cross_indicators_json) : [];
  const amb45Buckets = toa.amb45_buckets_json ? JSON.parse(toa.amb45_buckets_json) : null;

  // ── Edit mode render ────────────────────────────────────────────────────────
  if (editMode && editState) {
    const es = editState;
    const eCol1 = es.toa.col1_label || "Service Lines";
    const eCol2 = es.toa.col2_label || "Core Activities";
    return (
      <div style={{ background:C.bg, color:C.text }}>
        {/* Edit header bar */}
        <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.bd}`, background:`${accent}0a`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:ACCENT, animation:"pulse 1.4s infinite" }} />
            <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>Editing Theory of Action</span>
            <span style={{ fontSize:11, color:C.textDim }}>— changes are saved when you click Save</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {saveError && <span style={{ fontSize:12, color:"#c04040" }}>{saveError}</span>}
            <button onClick={cancelEdit} style={{ background:"none", border:`1px solid ${C.bd}`, borderRadius:6, padding:"5px 14px", fontSize:12, color:C.textSub, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={saveAll} disabled={saving} style={{ background:saving?C.bd:ACCENT, border:"none", borderRadius:6, padding:"5px 16px", fontSize:12, fontWeight:700, color:"#fff", cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>{saving?"Saving…":"Save Changes"}</button>
          </div>
        </div>

        {/* Problem statement */}
        <div style={{ padding:"14px 18px 0" }}>
          <div style={{ background:C.slatePale, border:`1px solid ${C.slateBd}`, borderLeft:`4px solid ${accent}`, borderRadius:8, padding:"10px 14px", marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.navy, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Problem / Gap Statement</div>
            <ToaTextField value={es.toa.problem_statement} onChange={v=>setToaField("problem_statement",v)} multiline placeholder="Describe the problem or gap this portfolio addresses…" />
          </div>
        </div>

        <div style={{ padding:"0 18px 18px" }}>
          {/* Column label editors */}
          <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.textDim }}>Column labels:</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:C.slate, fontWeight:700 }}>Col 1</span>
              <input value={es.toa.col1_label||""} onChange={e=>setToaField("col1_label",e.target.value)} placeholder="e.g. Service Lines" style={{ border:`1px solid ${C.slateBd}`, borderRadius:5, padding:"3px 8px", fontSize:11, fontFamily:"inherit", width:160, outline:"none", color:C.text }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:C.teal, fontWeight:700 }}>Col 2</span>
              <input value={es.toa.col2_label||""} onChange={e=>setToaField("col2_label",e.target.value)} placeholder="e.g. Core Activities" style={{ border:`1px solid ${C.tealBd}`, borderRadius:5, padding:"3px 8px", fontSize:11, fontFamily:"inherit", width:160, outline:"none", color:C.text }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:C.gold, fontWeight:700 }}>Impact Label</span>
              <input value={es.toa.cross_indicators_label||""} onChange={e=>setToaField("cross_indicators_label",e.target.value)} placeholder="e.g. 2030 Impact Goals" style={{ border:`1px solid ${C.goldBd}`, borderRadius:5, padding:"3px 8px", fontSize:11, fontFamily:"inherit", width:180, outline:"none", color:C.text }} />
            </div>
          </div>

          {/* Main grid */}
          <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 36px 400px", gap:6, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label={eCol1} sub="" color={C.slate} />
            <StageHead num="2" label={eCol2} sub="" color={C.teal} />
            <StageHead num="3" label="Enabling Outcomes" sub="What changes as a result?" color={C.teal} />
            <div />
            <StageHead num="4" label="Impact Achieved" sub="What does this make possible?" color={C.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 36px 400px", gap:6, alignItems:"center", marginBottom:8 }}>
            <div style={{ height:2, background:`linear-gradient(90deg, ${C.slate}60, ${C.teal})`, borderRadius:2 }} />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:C.teal }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.teal}/></svg></div>
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.teal}, ${C.slate})` }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.slate}/></svg></div>
            <div />
            <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg, ${C.slate}, ${C.gold})`, borderRadius:2 }} /><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={C.gold}/></svg></div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 36px 400px", gap:0, alignItems:"start" }}>
            {/* Lanes edit grid */}
            <div style={{ borderRight:`2px solid ${C.bd}`, paddingRight:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr", gap:4, alignItems:"stretch" }}>
                {es.lanes.map((lane, li) => {
                  const lc = lane.color || C.teal;
                  return (
                    <div key={lane.lane_id} style={{ display:"contents" }}>
                      {/* Col 1 — lane label */}
                      <div style={{ borderRadius:8, background:`${lc}10`, border:`1px solid ${lc}35`, borderLeft:`4px solid ${lc}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:6, gridRow:li+1 }}>
                        <input value={lane.label||""} onChange={e=>setLaneField(lane.lane_id,"label",e.target.value)}
                          style={{ border:`1px solid ${lc}60`, borderRadius:5, padding:"4px 7px", fontSize:12, fontWeight:700, fontFamily:"inherit", color:lc, background:`${lc}08`, outline:"none", width:"100%" }} />
                        {lane.is_tbd && <div style={{ fontSize:9, background:`${lc}20`, border:`1px solid ${lc}40`, borderRadius:3, padding:"1px 6px", color:lc, fontWeight:700, width:"fit-content" }}>TBD</div>}
                        {lane.is_multiplier && <div style={{ background:`${lc}30`, border:`1px solid ${lc}60`, borderRadius:4, padding:"2px 6px", fontSize:9, color:lc, fontWeight:800, textAlign:"center", letterSpacing:"0.08em", textTransform:"uppercase" }}>× Multiplier</div>}
                      </div>
                      {/* Col 2 — activities */}
                      <div style={{ borderRadius:8, background:`${lc}04`, border:`1.5px solid ${C.bd}`, padding:"9px 10px", gridRow:li+1 }}>
                        <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>{eCol2}</div>
                        <ToaEditList
                          items={lane.activities.map(a=>a.activity_text)}
                          accent={lc}
                          onChange={newTexts => setLaneActivities(lane.lane_id, newTexts.map((t,i) => {
                            const existing = lane.activities[i];
                            return existing ? { ...existing, activity_text:t } : { activity_id:null, activity_text:t, _isNew:true };
                          }).concat(
                            // preserve any items beyond newTexts length (shouldn't happen but guard)
                            lane.activities.slice(newTexts.length).map(a=>({...a, _deleted:true}))
                          ))}
                        />
                      </div>
                      {/* Col 3 — outcome + indicators */}
                      <div style={{ borderRadius:8, background:`${C.teal}06`, border:`1.5px solid ${C.teal}30`, padding:"9px 12px", gridRow:li+1, display:"flex", flexDirection:"column", gap:8 }}>
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Outcome {li+1}</div>
                          <ToaTextField value={lane.outcome_text} onChange={v=>setLaneField(lane.lane_id,"outcome_text",v)} multiline placeholder="Describe the enabling outcome…" style={{ fontSize:12, minHeight:70 }} />
                        </div>
                        <div>
                          <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Leading Indicators</div>
                          <ToaEditList
                            items={lane.indicators.map(i=>i.indicator_text)}
                            accent={lc}
                            onChange={newTexts => setLaneIndicators(lane.lane_id, newTexts.map((t,i) => {
                              const existing = lane.indicators[i];
                              return existing ? { ...existing, indicator_text:t } : { indicator_id:null, indicator_text:t, _isNew:true };
                            }).concat(
                              lane.indicators.slice(newTexts.length).map(i=>({...i, _deleted:true}))
                            ))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Connector />

            {/* Impact panel edit */}
            <ImpactPanel num="4">
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:C.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
                  {es.toa.cross_indicators_label || "2030 Impact Goals"}
                </div>
                <ToaEditList items={es.crossInds} accent={C.gold} onChange={setCrossInds} />
              </div>
              <div style={{ height:1, background:C.bd }} />
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:C.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Impact Enabled · Ambition 2045</div>
                {amb45Buckets ? (
                  <div>
                    <div style={{ fontSize:11, color:C.textDim, marginBottom:6 }}>This portfolio uses structured bucket data. Edit the JSON below:</div>
                    <textarea
                      value={es.toa.amb45_buckets_json||""}
                      onChange={e=>setToaField("amb45_buckets_json",e.target.value)}
                      style={{ width:"100%", minHeight:160, border:`1.5px solid ${C.goldBd}`, borderRadius:6, padding:"6px 8px", fontSize:11, fontFamily:"monospace", color:C.text, background:"#fff", outline:"none", resize:"vertical" }}
                    />
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div>
                      <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Intro text (italic)</div>
                      <ToaTextField value={es.toa.amb45_intro_text} onChange={v=>setToaField("amb45_intro_text",v)} multiline placeholder="Optional italic intro paragraph…" style={{ fontSize:11 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Box label</div>
                      <ToaTextField value={es.toa.amb45_label} onChange={v=>setToaField("amb45_label",v)} placeholder="e.g. Division Enablement" style={{ fontSize:11 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>Box body text</div>
                      <ToaTextField value={es.toa.amb45_full_text} onChange={v=>setToaField("amb45_full_text",v)} multiline placeholder="Describe how this portfolio enables Ambition 2045…" style={{ fontSize:11, minHeight:90 }} />
                    </div>
                  </div>
                )}
              </div>
            </ImpactPanel>
          </div>
        </div>
      </div>
    );
  }

  // ── Read mode render ────────────────────────────────────────────────────────
  return (
    <div style={{ background:C.bg, color:C.text }}>
      {toa.problem_statement && (
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ background:C.slatePale, border:`1px solid ${C.slateBd}`, borderLeft:`4px solid ${accent}`, borderRadius:8, padding:"12px 16px", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <div style={{ flexShrink:0, background:C.navy, color:"#fff", fontSize:9, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 8px", borderRadius:4, marginTop:1 }}>Problem / Gap</div>
              <div style={{ fontSize:12, color:C.textSub, lineHeight:1.65, fontStyle:"italic" }}>{toa.problem_statement}</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding:"0 18px 18px" }}>
        <div style={{ marginBottom:6 }}>
          <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 36px 400px", gap:6, alignItems:"end", marginBottom:4 }}>
            <StageHead num="1" label={col1Label} sub="" color={C.slate} />
            <StageHead num="2" label={col2Label} sub="" color={C.teal} />
            <StageHead num="3" label="Enabling Outcomes" sub="What changes as a result?" color={C.teal} />
            <div />
            <StageHead num="4" label="Impact Achieved" sub="What does this make possible?" color={C.gold} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 36px 400px", gap:6, alignItems:"center", marginBottom:6 }}>
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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 36px 400px", gap:0, alignItems:"start" }}>
          <div style={{ borderRight:`2px solid ${C.bd}`, paddingRight:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr", gap:4, alignItems:"stretch" }}>
              {lanes.map((lane, li) => {
                const isActive = activeLane === lane.lane_id;
                const isDimmed = activeLane && !isActive;
                const lc = lane.color || C.teal;
                const hasInds = (lane.indicators||[]).length > 0;
                return (
                  <div key={lane.lane_id} style={{ display:"contents" }}>
                    <div onClick={() => toggleLane(lane.lane_id)} style={{ borderRadius:8, background:isActive?`${lc}18`:`${lc}10`, border:`1px solid ${isActive?lc:`${lc}35`}`, borderLeft:`4px solid ${lc}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:4, justifyContent:"center", cursor:"pointer", opacity:isDimmed?0.4:1, transition:"all 0.15s", boxShadow:isActive?`0 2px 16px ${lc}30`:"0 1px 3px rgba(0,0,0,0.08)", gridRow:li+1 }}>
                      {lane.icon && <div style={{ fontSize:18, color:lc, lineHeight:1 }}>{lane.icon}</div>}
                      <div style={{ fontSize:13, fontWeight:800, color:lc, lineHeight:1.3 }}>{lane.label}</div>
                      {lane.is_tbd && <div style={{ fontSize:9, background:`${lc}20`, border:`1px solid ${lc}40`, borderRadius:3, padding:"1px 6px", color:lc, fontWeight:700, width:"fit-content" }}>TBD</div>}
                      {lane.is_multiplier && <div style={{ background:`${lc}30`, border:`1px solid ${lc}60`, borderRadius:4, padding:"2px 6px", fontSize:9, color:lc, fontWeight:800, textAlign:"center", letterSpacing:"0.08em", textTransform:"uppercase" }}>× Multiplier</div>}
                    </div>
                    <div style={{ borderRadius:8, background:`${lc}04`, border:`1.5px solid ${isActive?lc:C.bd}`, padding:"9px 10px", opacity:isDimmed?0.4:1, transition:"all 0.15s", gridRow:li+1 }}>
                      <div style={{ fontSize:11, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{col2Label}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {(lane.activities||[]).map((act, i) => (
                          <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                            <div style={{ width:4, height:4, borderRadius:"50%", background:lc, marginTop:6, flexShrink:0, opacity:0.7 }} />
                            <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{act.activity_text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ gridRow:li+1, display:"flex", gap:0, opacity:isDimmed?0.4:1, transition:"all 0.15s" }}>
                      <div onClick={() => toggleLane(lane.lane_id)} style={{ flex:1, borderRadius:expandedIndicators[lane.lane_id]?"8px 0 0 8px":8, background:isActive?`${lc}10`:`${C.teal}06`, border:`1.5px solid ${isActive?lc:`${C.teal}30`}`, borderRight:expandedIndicators[lane.lane_id]?`1.5px solid ${lc}30`:undefined, padding:"9px 12px", cursor:"pointer", transition:"all 0.15s", display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginBottom:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:18, height:18, borderRadius:"50%", background:lc, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", flexShrink:0 }}>{li+1}</div>
                            <div style={{ fontSize:11, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {li+1}</div>
                          </div>
                          {hasInds && (
                            <button onClick={(e) => toggleInd(lane.lane_id, e)} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, background:"none", border:`1px solid ${lc}40`, borderRadius:5, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                              <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase" }}>Indicators</div>
                              <div style={{ background:`${lc}15`, borderRadius:8, padding:"1px 5px", fontSize:10, fontWeight:700, color:lc }}>{lane.indicators.length}</div>
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:expandedIndicators[lane.lane_id]?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={lc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.5, paddingRight:expandedIndicators[lane.lane_id]?0:120 }}>{lane.outcome_text}</div>
                      </div>
                      {expandedIndicators[lane.lane_id] && (
                        <div style={{ width:220, flexShrink:0, borderRadius:"0 8px 8px 0", background:`${lc}07`, border:`1.5px solid ${lc}40`, borderLeft:"none", padding:"9px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Indicators</div>
                          {(lane.indicators||[]).map((ind, i) => (
                            <div key={i} style={{ display:"flex", gap:5, alignItems:"flex-start", paddingBottom:4, borderBottom:i<lane.indicators.length-1?`1px solid ${lc}15`:"none" }}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background:lc, marginTop:5, flexShrink:0, opacity:0.6 }} />
                              <div style={{ fontSize:12, color:C.textMid, lineHeight:1.45 }}>{ind.indicator_text}</div>
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
            {crossIndicators.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:C.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>{crossLabel}</div>
                <div style={{ fontSize:10, color:C.textDim, fontStyle:"italic", marginBottom:8 }}>Portfolio-level impact signals</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {crossIndicators.map((ind, i) => (
                    <div key={i} style={{ background:C.off, border:`1px solid ${C.goldBd}60`, borderLeft:`3px solid ${C.gold}`, borderRadius:"0 7px 7px 0", padding:"8px 12px" }}>
                      <div style={{ fontSize:12, color:C.textMid, lineHeight:1.55 }}>{ind}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(crossIndicators.length > 0) && (toa.amb45_full_text || amb45Buckets) && <div style={{ height:1, background:C.bd }} />}
            {toa.amb45_intro_text && <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6, fontStyle:"italic" }}>{toa.amb45_intro_text}</div>}
            {(toa.amb45_full_text || amb45Buckets) && <BidirectionalDivider />}
            {(toa.amb45_full_text || amb45Buckets) && (
              <div>
                <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
                  <div style={{ width:3, borderRadius:2, background:C.goldMid, alignSelf:"stretch", minHeight:24, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:10, fontWeight:800, color:C.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Enabled</div>
                    <div style={{ fontSize:13, fontWeight:800, color:C.navy, lineHeight:1.2 }}>Ambition 2045</div>
                  </div>
                </div>
                {amb45Buckets ? (
                  <ToaAmb45Buckets buckets={amb45Buckets} />
                ) : (
                  <div style={{ background:`${C.teal}06`, border:`1px solid ${C.tealBd}`, borderLeft:`3px solid ${C.teal}`, borderRadius:"0 7px 7px 0", padding:"10px 12px" }}>
                    {toa.amb45_label && <div style={{ fontSize:10, fontWeight:800, color:C.teal, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{toa.amb45_label}</div>}
                    <div style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{toa.amb45_full_text}</div>
                  </div>
                )}
              </div>
            )}
          </ImpactPanel>
        </div>
      </div>
    </div>
  );
}

// ── Portfolio Overview — By the Numbers ──────────────────────────────────────
function PortfolioByTheNumbers({ portId, portColor, bows }) {
  const pc = portColor || { color: ACCENT };
  const [stats, setStats]           = useState(null);
  const [budgetAlloc, setBudgetAlloc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const toNum = v => parseFloat(String(v||"0").replace(/[^0-9.]/g,""))||0;
    loadAllInvestments({ portfolio_id: portId }).then(rows => {
      if (cancelled) return;
      const active = rows.filter(inv => inv.status === "Active");
      const count = active.length;
      const totalBudget = active.reduce((s, inv) => s + toNum(inv.amount), 0);
      const coFundedCount = active.filter(inv => inv.coFundingTeams && inv.coFundingTeams.trim()).length;
      const coFundedPct = count > 0 ? Math.round((coFundedCount / count) * 100) : 0;
      const partners = new Set(active.map(inv => inv.grantee).filter(Boolean)).size;
      const coFundingTeams = Array.from(new Set(
        active.flatMap(inv => inv.coFundingTeams ? inv.coFundingTeams.split(", ").filter(Boolean) : [])
      )).sort();
      setStats({ count, totalBudget, coFundedPct, partners, coFundingTeams });
    }).catch(() => {
      if (!cancelled) setStats({ count: 0, totalBudget: 0, coFundedPct: 0, partners: 0 });
    });
    return () => { cancelled = true; };
  }, [portId]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/budget-forecasts/multi-year").then(data => {
      if (cancelled || !data) return;
      let total = 0;
      [2026, 2027, 2028, 2029].forEach(y => {
        (data[String(y)] || []).filter(r => r.portfolio_id === portId)
          .forEach(r => { total += r.budget_allocation || 0; });
      });
      if (!cancelled) setBudgetAlloc(total);
    }).catch(() => {});
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
    { label:"Active Investments", value: loading ? "…" : String(stats.count||"0"),   sub:"grants & contracts" },
    { label:"% Co-funded",        value: loading ? "…" : `${stats.coFundedPct}%`,    sub:"active investments with a co-funding team", teams: stats?.coFundingTeams || [] },
    { label:"Partners",           value: loading ? "…" : String(stats.partners||"0"),sub:"discrete grantees / vendors" },
    { label:"Bodies of Work",     value: String((bows||[]).length),                   sub:"active workstreams in this portfolio" },
  ];

  const committed   = stats?.totalBudget || 0;
  const allocation  = budgetAlloc || 0;
  const remaining   = Math.max(0, allocation - committed);
  const overBudget  = Math.max(0, committed - allocation);
  const pieData = allocation > 0
    ? [
        { name:"Committed",  value: Math.min(committed, allocation), color: pc.color },
        ...(remaining > 0 ? [{ name:"Remaining",  value: remaining,  color: "#E8E4DB" }] : []),
        ...(overBudget > 0 ? [{ name:"Over Budget", value: overBudget, color: "#FCA5A5" }] : []),
      ]
    : [{ name:"No data", value: 1, color: BORDER }];

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
            <div key={i} style={{padding:"4px 28px 4px"+(i===0?"0":""),borderLeft:i===0?"none":"1px solid "+BORDER}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap",marginBottom:8}}>
                <div style={{fontSize:44,fontWeight:800,color:stat.value==="…"?BORDER:pc.color,letterSpacing:-2,lineHeight:1}}>{stat.value}</div>
                {stat.teams && stat.teams.length > 0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                    {stat.teams.map(t => (
                      <span key={t} style={{fontSize:10,fontWeight:600,color:TEXT_SUB,
                        background:SURFACE_2,border:"1px solid "+BORDER,
                        borderRadius:4,padding:"2px 7px",display:"inline-block"}}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:TEXT,marginBottom:3}}>{stat.label}</div>
              <div style={{fontSize:11,color:TEXT_MUTED,lineHeight:1.4}}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PortfolioOverviewToa — three-section overview: outcomes matrix, how we work, ambition ──
function PortfolioOverviewToa({ portId, portfolio, bows, portColor, portShortTitles, onNavigateToStrategy }) {
  const pc = portColor || { color: ACCENT };
  const SHORT_TITLES = portShortTitles || PO_SHORT_TITLES_CC;

  const [toa, setToa] = useState(null);
  // outcomeLinks: bowOutcomeId -> Set<portfolioOutcomeId>
  const [outcomeLinks, setOutcomeLinks] = useState({});
  const [expandedOutcomes, setExpandedOutcomes] = useState({});
  const [expandedInputs, setExpandedInputs] = useState({});
  const [expandedBows, setExpandedBows] = useState({});
  const [showMatrix, setShowMatrix] = useState(false);
  const [hoveredBow, setHoveredBow] = useState(null);
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    apiFetch(`/api/toa/${portId}`).then(data => {
      if (!data) return;
      setToa(data.toa || null);
    }).catch(() => {});
  }, [portId]);

  // stable key so effect re-fires if bows finish loading after first mount
  const bowIdsKey = (bows||[]).map(b=>b.id).join(',');
  useEffect(() => {
    if (!bows?.length) return;
    setLinksLoaded(false);
    Promise.all(bows.map(b => apiFetch(`/api/bow-portfolio-links/${b.id}`).catch(() => [])))
      .then(results => {
        const map = {};
        results.forEach(links => {
          links.forEach(link => {
            if (!map[link.bow_outcome_id]) map[link.bow_outcome_id] = new Set();
            map[link.bow_outcome_id].add(link.portfolio_outcome_id);
          });
        });
        setOutcomeLinks(map);
        setLinksLoaded(true);
      });
  }, [portId, bowIdsKey]);

  const allOutcomes = portfolio.portfolioOutcomes;
  const goals = (PORT_GOAL_MAP[portId]||[]).map(gNum => STRATEGY_GOALS.find(x=>x.number===gNum)).filter(Boolean);

  let crossIndicators = [], amb45Text = null, amb45Label = null, amb45Buckets = null;
  if (toa) {
    try { crossIndicators = JSON.parse(toa.cross_indicators_json || '[]'); } catch(e) {}
    amb45Text  = toa.amb45_full_text || null;
    amb45Label = toa.amb45_label || null;
    try { amb45Buckets = toa.amb45_buckets_json ? JSON.parse(toa.amb45_buckets_json) : null; } catch(e) {}
  }

  const numCols = allOutcomes.length;
  // left label col + one col per portfolio outcome
  const colTemplate = `200px repeat(${numCols}, 1fr)`;
  const problemStatement = toa?.problem_statement || null;

  // For a portfolio outcome, return [{bow, bowOutcomes:[]}] that link to it
  const getContributors = (portOutcomeId) =>
    bows.map(bow => {
      const linked = (bow.outcomes||[]).filter(o => outcomeLinks[o.id]?.has(portOutcomeId));
      return linked.length ? { bow, bowOutcomes: linked } : null;
    }).filter(Boolean);

  // Does any bow outcome of this bow link to this portfolio outcome?
  const bowLinksToOutcome = (bow, portOutcomeId) =>
    (bow.outcomes||[]).some(o => outcomeLinks[o.id]?.has(portOutcomeId));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── Problem / Gap statement ── */}
      {problemStatement && (
        <div style={{borderRadius:"0 10px 10px 0",border:"1px solid "+pc.color+"28",borderLeft:"5px solid "+pc.color,background:pc.color+"07",padding:"16px 22px"}}>
          <div style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>↳ This portfolio responds to</div>
          <div style={{fontSize:14,color:TEXT,lineHeight:1.7,fontWeight:500}}>{problemStatement}</div>
        </div>
      )}

      {/* ── Section 1: What We're Trying to Achieve ── */}
      <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,overflow:"hidden",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
        <div style={{height:4,background:`linear-gradient(90deg,${pc.color},${pc.color}55)`}}/>
        <div style={{padding:"16px 22px",borderBottom:"1px solid "+BORDER,background:"#FAFAF8",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:16,top:-6,fontSize:80,fontWeight:900,color:pc.color,opacity:0.05,lineHeight:1,letterSpacing:-3,userSelect:"none",pointerEvents:"none"}}>01</div>
          <div style={{fontSize:17,fontWeight:800,color:TEXT,letterSpacing:-0.3,lineHeight:1.2}}>What We're Trying to Achieve</div>
        </div>
        <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:`repeat(${Math.min(numCols,3)},1fr)`,gap:14}}>
          {allOutcomes.map((o,i) => {
            const outcomeOpen = !!expandedOutcomes[o.id];
            const inputsOpen  = !!expandedInputs[o.id];
            const contributors = getContributors(o.id);
            return (
              <div key={o.id} style={{borderRadius:10,border:"1px solid "+BORDER,overflow:"hidden",background:pc.color+"04",display:"flex",flexDirection:"column"}}>
                <div style={{height:4,background:`linear-gradient(90deg,${pc.color},${pc.color}88)`}}/>
                <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
                  {/* Number + short title */}
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <span style={{width:22,height:22,borderRadius:"50%",background:pc.color,color:"#fff",fontSize:11,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span>
                    <div style={{fontSize:14,fontWeight:800,color:TEXT,lineHeight:1.3}}>{SHORT_TITLES[i]||o.shortTitle}</div>
                  </div>
                  {/* Full outcome text — expandable */}
                  {outcomeOpen && (
                    <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.65,paddingLeft:32,borderLeft:"2px solid "+pc.color+"33",marginLeft:11}}>{o.outcome}</div>
                  )}
                  {/* Two toggle buttons side by side */}
                  <div style={{display:"flex",gap:8,paddingLeft:32,flexWrap:"wrap"}}>
                    <button onClick={()=>setExpandedOutcomes(v=>({...v,[o.id]:!v[o.id]}))}
                      style={{background:"none",border:"1px solid "+pc.color+"44",borderRadius:5,cursor:"pointer",padding:"3px 10px",fontSize:11,color:pc.color,fontWeight:600}}>
                      {outcomeOpen ? "▴ less" : "▾ full outcome"}
                    </button>
                    {linksLoaded && contributors.length > 0 && (
                      <button onClick={()=>setExpandedInputs(v=>({...v,[o.id]:!v[o.id]}))}
                        style={{background:inputsOpen?pc.color+"12":"none",border:"1px solid "+pc.color+"44",borderRadius:5,cursor:"pointer",padding:"3px 10px",fontSize:11,color:pc.color,fontWeight:600}}>
                        {inputsOpen ? "▴ inputs" : "▾ investments & inputs"}
                      </button>
                    )}
                    {linksLoaded && contributors.length === 0 && (
                      <span style={{fontSize:10,color:TEXT_MUTED,fontStyle:"italic",alignSelf:"center"}}>No investments linked yet</span>
                    )}
                  </div>
                  {/* Investments & Inputs panel */}
                  {inputsOpen && contributors.length > 0 && (
                    <div style={{paddingLeft:32,display:"flex",flexDirection:"column",gap:10,borderTop:"1px solid "+BORDER,paddingTop:10,marginTop:2}}>
                      <div style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Investments & Inputs</div>
                      {contributors.map(({bow, bowOutcomes}) => (
                        <div key={bow.id}>
                          <div style={{fontSize:11,fontWeight:700,color:pc.color,marginBottom:4}}>{bow.name}</div>
                          <div style={{display:"flex",flexDirection:"column",gap:3}}>
                            {bowOutcomes.map((bo,j) => (
                              <div key={bo.id||j} style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                                <div style={{width:4,height:4,borderRadius:"50%",background:pc.color,marginTop:5,flexShrink:0,opacity:0.6}}/>
                                <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.5}}>{bo.title||bo.shortTitle}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: How We Work ── */}
      <div style={{background:SURFACE,borderRadius:12,border:"1px solid "+BORDER,overflow:"hidden",boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
        <div style={{height:4,background:`linear-gradient(90deg,${pc.color},${pc.color}55)`}}/>
        <div style={{padding:"16px 22px",borderBottom:"1px solid "+BORDER,background:"#FAFAF8",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:140,top:-6,fontSize:80,fontWeight:900,color:pc.color,opacity:0.05,lineHeight:1,letterSpacing:-3,userSelect:"none",pointerEvents:"none"}}>02</div>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:TEXT,letterSpacing:-0.3,lineHeight:1.2}}>How We Work</div>
          </div>
          <button onClick={()=>setShowMatrix(v=>!v)}
            style={{fontSize:11,fontWeight:600,color:pc.color,background:pc.color+"15",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",flexShrink:0}}>
            {showMatrix ? "Hide Alignment Map ↑" : "View Alignment Map →"}
          </button>
        </div>
        <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:`repeat(${Math.min(bows.length,4)},1fr)`,gap:14}}>
          {bows.map(bow => {
            const bowOpen = !!expandedBows[bow.id];
            const isHovered = hoveredBow === bow.id;
            const bowOutcomes = (bow.outcomes||[]).filter(o => o.title||o.shortTitle);
            return (
              <div key={bow.id}
                onMouseEnter={()=>setHoveredBow(bow.id)}
                onMouseLeave={()=>setHoveredBow(null)}
                style={{borderRadius:10,border:"1px solid "+(bowOpen?pc.color+"55":isHovered?pc.color+"33":BORDER),overflow:"hidden",display:"flex",flexDirection:"column",transition:"border-color .15s, box-shadow .15s",boxShadow:isHovered?"0 4px 14px rgba(10,37,64,0.10)":"0 1px 3px rgba(10,37,64,0.04)"}}>
                <div style={{height:4,background:bowOpen||isHovered?pc.color:BORDER,transition:"background .15s"}}/>
                <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:8,flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:TEXT,lineHeight:1.3}}>{bow.name}</div>
                  {bow.delegate && (
                    <div style={{fontSize:10,color:TEXT_MUTED,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:18,height:18,borderRadius:"50%",background:pc.color+"22",color:pc.color,fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{(bow.delegate||"").charAt(0)}</span>
                      <span style={{fontWeight:600,color:TEXT_SUB}}>{bow.delegate}</span>
                    </div>
                  )}
                  {bow.description && (
                    <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.6}}>{bow.description}</div>
                  )}
                  {bowOutcomes.length > 0 && (
                    <button onClick={()=>setExpandedBows(v=>({...v,[bow.id]:!v[bow.id]}))}
                      style={{background:bowOpen?pc.color+"12":"none",border:"1px solid "+pc.color+"44",borderRadius:5,cursor:"pointer",padding:"4px 10px",fontSize:11,color:pc.color,fontWeight:600,display:"flex",alignItems:"center",gap:4,alignSelf:"flex-start",marginTop:4}}>
                      {bowOpen ? "▴ hide outcomes" : "▾ outcomes"}
                    </button>
                  )}
                </div>
                {bowOpen && bowOutcomes.length > 0 && (
                  <div style={{borderTop:"1px solid "+pc.color+"22",background:pc.color+"06",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:9,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>BOW Outcomes</div>
                    {bowOutcomes.map((o,oi) => (
                      <div key={o.id||oi} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                        <span style={{width:18,height:18,borderRadius:"50%",background:pc.color,color:"#fff",fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{oi+1}</span>
                        <div style={{fontSize:11,color:TEXT_SUB,lineHeight:1.5}}>{o.title||o.shortTitle}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Alignment map: linked BOW outcomes as rows, portfolio outcomes as columns ── */}
        {showMatrix && (
          <div style={{borderTop:"1px solid "+BORDER,overflowX:"auto"}}>
            <div style={{padding:"12px 22px 4px",fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5}}>BOW Outcome → Portfolio Outcome Alignment</div>
            <div style={{padding:"0 22px 14px"}}>
              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:colTemplate,minWidth:560}}>
                <div style={{background:"#FAFAF8",borderBottom:"2px solid "+BORDER,borderRight:"1px solid "+BORDER,padding:"6px 10px"}}>
                  <span style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8}}>BOW / Outcome</span>
                </div>
                {allOutcomes.map((o,i) => (
                  <div key={o.id} style={{padding:"6px 6px",background:"#FAFAF8",borderBottom:"2px solid "+BORDER,borderRight:"1px solid "+BORDER,textAlign:"center"}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:pc.color,color:"#fff",fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:3}}>{i+1}</div>
                    <div style={{fontSize:9,fontWeight:700,color:TEXT,lineHeight:1.2}}>{SHORT_TITLES[i]||o.shortTitle}</div>
                  </div>
                ))}
              </div>
              {/* BOW groups — only BOW outcomes that have at least one link */}
              {bows.map((bow, bi) => {
                const linkedOutcomes = (bow.outcomes||[]).filter(bo =>
                  (bo.title||bo.shortTitle) && outcomeLinks[bo.id]?.size > 0
                );
                if (!linkedOutcomes.length) return null;
                const bgBase = bi%2===0 ? "transparent" : "#FAFAF8";
                return (
                  <React.Fragment key={bow.id}>
                    <div style={{display:"grid",gridTemplateColumns:colTemplate,minWidth:560,borderBottom:"1px solid "+BORDER,background:pc.color+"0A"}}>
                      <div style={{padding:"4px 10px",borderRight:"1px solid "+BORDER,display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:3,height:12,borderRadius:2,background:pc.color,flexShrink:0}}/>
                        <span style={{fontSize:10,fontWeight:800,color:pc.color}}>{bow.name}</span>
                      </div>
                      {allOutcomes.map(o => <div key={o.id} style={{borderRight:"1px solid "+BORDER}}/>)}
                    </div>
                    {linkedOutcomes.map((bo, oi) => {
                      const isLast = oi === linkedOutcomes.length - 1;
                      return (
                        <div key={bo.id||oi} style={{display:"grid",gridTemplateColumns:colTemplate,minWidth:560,borderBottom:isLast?"2px solid "+BORDER:"1px solid "+BORDER}}>
                          <div style={{padding:"5px 10px 5px 18px",borderRight:"1px solid "+BORDER,display:"flex",alignItems:"flex-start",gap:5,background:bgBase}}>
                            <div style={{width:3,height:3,borderRadius:"50%",background:pc.color,marginTop:5,flexShrink:0,opacity:0.5}}/>
                            <span style={{fontSize:10,color:TEXT_SUB,lineHeight:1.35}}>{bo.title||bo.shortTitle}</span>
                          </div>
                          {allOutcomes.map(o => {
                            const linked = outcomeLinks[bo.id]?.has(o.id);
                            return (
                              <div key={o.id} style={{padding:"5px",borderRight:"1px solid "+BORDER,background:bgBase,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {linked
                                  ? <span style={{width:16,height:16,borderRadius:"50%",background:pc.color+"18",border:"1.5px solid "+pc.color,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:pc.color,fontWeight:700}}>✓</span>
                                  : <span style={{width:4,height:4,borderRadius:"50%",background:BORDER,display:"inline-block"}}/>
                                }
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {/* Coverage footer */}
              <div style={{display:"grid",gridTemplateColumns:colTemplate,minWidth:560,background:"#FAFAF8"}}>
                <div style={{padding:"5px 10px",borderRight:"1px solid "+BORDER,display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8}}>Coverage</span>
                </div>
                {allOutcomes.map(o => {
                  const count = bows.filter(b => bowLinksToOutcome(b, o.id)).length;
                  return (
                    <div key={o.id} style={{padding:"5px 6px",textAlign:"center",borderRight:"1px solid "+BORDER}}>
                      <span style={{fontSize:9,fontWeight:700,color:count>0?pc.color:TEXT_MUTED}}>{count} of {bows.length}</span>
                    </div>
                  );
                })}
              </div>
              {/* Empty state — shown after links have loaded and none exist */}
              {linksLoaded && Object.keys(outcomeLinks).length === 0 && (
                <div style={{padding:"20px 22px",textAlign:"center",color:TEXT_MUTED,fontSize:12,fontStyle:"italic"}}>
                  No BOW outcome → portfolio outcome links found. Add them via the Theory of Action editor to populate this map.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: 2030 Goals ── */}
      {(crossIndicators.length > 0 || goals.length > 0 || amb45Text || amb45Buckets) && (
        <div style={{borderRadius:12,border:"1px solid "+pc.color+"33",overflow:"hidden",background:`linear-gradient(135deg,${pc.color}08 0%,${SURFACE} 60%)`,boxShadow:"0 1px 4px rgba(10,37,64,0.05)"}}>
          <div style={{height:4,background:`linear-gradient(90deg,${pc.color},${pc.color}55)`}}/>
          <div style={{padding:"22px 28px"}}>
            <div style={{marginBottom:22,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:0,top:-10,fontSize:80,fontWeight:900,color:pc.color,opacity:0.06,lineHeight:1,letterSpacing:-3,userSelect:"none",pointerEvents:"none"}}>03</div>
              <div style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:2,marginBottom:5}}>What This All Builds Toward</div>
              <div style={{fontSize:20,fontWeight:800,color:TEXT,letterSpacing:-0.3,lineHeight:1.2}}>2030 Goals</div>
            </div>
            <div style={{display:"flex",gap:32,alignItems:"flex-start"}}>
              {(crossIndicators.length > 0 || goals.length > 0) && (
                <div style={{flex:2,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>
                  {crossIndicators.map((ind,i) => (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{width:20,height:20,borderRadius:"50%",background:pc.color,color:"#fff",fontSize:10,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>{i+1}</span>
                      <div style={{fontSize:13,color:TEXT,lineHeight:1.65,fontWeight:500}}>{ind}</div>
                    </div>
                  ))}
                  {crossIndicators.length === 0 && goals.map(g => (
                    <div key={g.number} onClick={()=>onNavigateToStrategy&&onNavigateToStrategy(g.number)}
                      style={{display:"flex",alignItems:"flex-start",gap:10,cursor:onNavigateToStrategy?"pointer":"default"}}>
                      <span style={{width:20,height:20,borderRadius:"50%",background:g.color||pc.color,color:"#fff",fontSize:10,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>{g.number}</span>
                      <span style={{fontSize:13,color:TEXT,lineHeight:1.5,fontWeight:500,flex:1}}>{g.title}</span>
                      {onNavigateToStrategy&&<span style={{fontSize:11,color:TEXT_MUTED,flexShrink:0}}>↗</span>}
                    </div>
                  ))}
                </div>
              )}
              {(amb45Text || amb45Buckets) && (
                <div style={{flex:1,minWidth:0,borderLeft:"1px solid "+pc.color+"33",paddingLeft:28}}>
                  <div style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>
                    Ambition 2045{amb45Label && <span style={{fontWeight:400,color:TEXT_MUTED,textTransform:"none",letterSpacing:0,marginLeft:6}}>— {amb45Label}</span>}
                  </div>
                  {amb45Buckets
                    ? <ToaAmb45Buckets buckets={amb45Buckets} />
                    : <div style={{fontSize:12,color:TEXT_SUB,lineHeight:1.65}}>{amb45Text}</div>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        </div>
      </div>
      {/* Portfolio sub-tabs */}
      <div style={{background:SURFACE,borderBottom:"1px solid "+BORDER,display:"flex",gap:0,paddingLeft:4}}>
        {[{id:"portfolio-overview",label:"Overview"},{id:"theory-of-action",label:"Theory of Action"},{id:"measurement",label:"Measurement & Reporting"},{id:"partners",label:"Partners"}].map(tab=>{
          const active = tab.id==="portfolio-overview"?activeTab==="portfolio-overview"
            :tab.id==="partners"?activeTab==="partners"
            :tab.id==="theory-of-action"?activeTab==="theory-of-action"
            :inMeasurement;
          return <button key={tab.id}
            onClick={()=>{
              if(tab.id==="portfolio-overview") setActiveTab("portfolio-overview");
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
        <div style={{background:pc.color+"0C",borderBottom:"1px solid "+pc.color+"33",borderTop:"none",display:"flex",alignItems:"stretch",paddingLeft:0}}>
          {/* Portfolio Progress tab */}
          <button onClick={()=>setActiveTab("portfolio-progress")}
            style={{padding:"10px 20px",fontWeight:600,fontSize:13,border:"none",cursor:"pointer",
              background:activeTab==="portfolio-progress"?SURFACE:"transparent",
              borderBottom:activeTab==="portfolio-progress"?"3px solid "+pc.color:"3px solid transparent",
              borderRight:"1px solid "+pc.color+"22",
              color:activeTab==="portfolio-progress"?pc.color:TEXT_SUB,
              marginBottom:-1,whiteSpace:"nowrap",transition:"all .15s",flexShrink:0}}>
            Portfolio Progress
          </button>
          {/* Divider + BOW label */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 14px",borderRight:"1px solid "+pc.color+"22",flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,color:pc.color,textTransform:"uppercase",letterSpacing:1.2,opacity:0.7}}>Bodies of Work</span>
            <span style={{fontSize:12,color:pc.color+"66"}}>→</span>
          </div>
          {/* BOW tabs */}
          <div style={{display:"flex",alignItems:"stretch",flex:1}}>
            {bows.map(b=>{
              const active=activeTab==="bow"&&activeBow===b.id;
              return (
                <button key={b.id} onClick={()=>{setActiveTab("bow");setActiveBow(b.id);setBowView("progress");setActiveBowOutcomeIdx(0);}}
                  style={{padding:"10px 18px",fontWeight:active?700:500,fontSize:13,cursor:"pointer",
                    background:active?SURFACE:"transparent",border:"none",
                    borderBottom:active?"3px solid "+pc.color:"3px solid transparent",
                    borderRight:"1px solid "+pc.color+"22",
                    color:active?pc.color:TEXT_SUB,marginBottom:-1,whiteSpace:"nowrap",transition:"all .15s"}}>
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{padding:"28px 32px"}}>
        {activeTab==="portfolio-overview"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <PortfolioByTheNumbers portId={portId} portColor={pc} bows={bows}/>
            <PortfolioOverviewToa portId={portId} portfolio={portfolio} bows={bows} portColor={pc} portShortTitles={SHORT_TITLES} onNavigateToStrategy={onNavigateToStrategy}/>
          </div>
        )}
        {activeTab==="portfolio-progress"&&(
          <PortfolioOutcomesView portId={portId} portfolio={portfolio} bows={bows} portColor={pc} onChange={p=>onUpdatePortfolio(p)} initialIdx={activePortfolioOutcomeIdx} portShortTitles={SHORT_TITLES} onNavigateToStrategy={onNavigateToStrategy}/>
        )}
        {activeTab==="partners"&&(
          <PortfolioPartnersView portId={portId} portColor={pc}/>
        )}
        {activeTab==="theory-of-action"&&(
          <div style={{margin:"0 -32px",overflowX:"auto"}}>
            <PortfolioToaView portfolioId={portId} portColor={pc} />
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
              {[["progress","Progress"]].map(([v,label])=>(
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
                    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:0}}>
                      {currentBow.outcomes.map((o,i)=>{
                        const active=i===activeBowOutcomeIdx;
                        const manualRs=o.manualStatus&&STATUS[o.manualStatus]?STATUS[o.manualStatus]:null;
                        const exec=execAutoStatus(o,progressYear); const impact=impactAutoStatus(o);
                        const rawT=(o.executionTargets[progressYear]||[]).map(t=>typeof t==="string"?{text:t,completion:"Not Started"}:{...t,completion:migrateCompletion(t.completion)});
                        const totalT=rawT.length; const completeT=rawT.filter(t=>t.completion==="Complete").length; const onTrackT=rawT.filter(t=>t.completion==="On Track").length;
                        const positiveT=completeT+onTrackT;
                        const pct=totalT>0?Math.round((positiveT/totalT)*100):null;
                        const barC=pct===null?BORDER:pct>=80?"#059669":pct>=50?"#D97706":"#DC2626";
                        return (
                          <div key={o.id} onClick={()=>setActiveBowOutcomeIdx(active?-1:i)}
                            style={{border:"1.5px solid "+(active?pc.color:manualRs?manualRs.color+"55":BORDER),borderRadius:12,overflow:"hidden",background:active?pc.light:manualRs?manualRs.bg:SURFACE,cursor:"pointer",transition:"all .15s",boxShadow:active?"0 4px 16px rgba(0,0,0,0.1)":"0 2px 8px rgba(10,37,64,0.06)"}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:0}}>
                              {/* Left accent bar */}
                              <div style={{width:4,background:active?pc.color:manualRs?manualRs.color:pc.color+"33",flexShrink:0,alignSelf:"stretch"}}/>
                              {/* Content */}
                              <div style={{flex:1,padding:"14px 18px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:11,fontWeight:700,color:active?pc.color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Outcome {o.number}</div>
                                    <div style={{fontSize:15,fontWeight:700,color:TEXT,lineHeight:1.35,marginBottom:4}}>{BOW_TITLES[i]||o.shortTitle||"Outcome "+(i+1)}</div>
                                    <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.6}}>{o.title}</div>
                                  </div>
                                  {/* Impact badge */}
                                  <div style={{flexShrink:0,textAlign:"right"}}>
                                    <div style={{fontSize:9,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8,marginBottom:4}}>Impact</div>
                                    {impact
                                      ? <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:12,fontSize:11,fontWeight:700,
                                          background:(STATUS[impact.label]?.pill||impact.color+"15"),color:(STATUS[impact.label]?.color||impact.color),
                                          border:"1px solid "+(STATUS[impact.label]?.color||impact.color)+"44"}}>
                                          <span style={{width:5,height:5,borderRadius:"50%",background:STATUS[impact.label]?.color||impact.color,display:"inline-block",flexShrink:0}}/>
                                          {impact.label.replace(" Expectations","")}
                                        </span>
                                      : <span style={{fontSize:11,color:TEXT_MUTED}}>—</span>}
                                  </div>
                                </div>
                                {/* Execution progress bar */}
                                <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+(active?pc.color+"22":BORDER)}}>
                                  <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Execution {progressYear}</div>
                                  {totalT > 0 ? (
                                    <div>
                                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                                        <div style={{flex:1,height:6,borderRadius:3,background:BORDER,overflow:"hidden"}}>
                                          <div style={{height:"100%",borderRadius:3,width:pct+"%",background:barC,transition:"width .4s"}}/>
                                        </div>
                                        <span style={{fontSize:12,fontWeight:700,color:barC,flexShrink:0,minWidth:32}}>{pct}%</span>
                                      </div>
                                      <div style={{fontSize:11,color:TEXT_SUB}}>
                                        {completeT>0&&<span style={{fontWeight:600,color:"#059669"}}>{completeT} complete</span>}
                                        {completeT>0&&onTrackT>0&&<span>, </span>}
                                        {onTrackT>0&&<span style={{fontWeight:600,color:"#D97706"}}>{onTrackT} on track</span>}
                                        <span style={{color:TEXT_MUTED}}> of {totalT}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{fontSize:12,color:TEXT_MUTED}}>No targets</span>
                                  )}
                                </div>
                              </div>
                              {/* Expand chevron */}
                              <div style={{padding:"14px 14px 0",flexShrink:0}}>
                                <span style={{fontSize:14,color:active?pc.color:TEXT_MUTED,fontWeight:600}}>{active?"▴":"▾"}</span>
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
  "ai-infra":       [1, 2],
  "sfl":            [3, 4],
  "cross-cutting":  [],
  "hub":            [],
};
// Goals where portfolio-specific targets are still pending
const GOAL_TARGETS_PENDING = {};

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
  const [zoom,setZoom]         = useState(1);
  const [pan,setPan]           = useState({x:60,y:20});
  const [selected,setSelected] = useState(null);
  const [dragging,setDragging] = useState(false);
  const [lastMouse,setLastMouse] = useState(null);

  const LI_COLOR     = "#7C3AED";
  const INVEST_COLOR = "#6B7280";
  const BOX_W=270, BOX_H=64, LAT_W=210, LAT_H=52, COL_GAP=120, ROW_STEP=120;

  // Primary chain nodes
  const NODES = [
    {id:"ambition",      y:0,            label:"Ambition 2045",        tier:null,     tag:"North star · long-term vision",       color:BRAND,     desc:"The Foundation's long-term vision for equitable, AI-enabled learning outcomes. Not directly measured — it sets the direction that all strategy goals and investments are oriented toward."},
    {id:"goals",         y:ROW_STEP,     label:"2030 Strategy Goals",  tier:"Tier 1", tag:"5 goals",                             color:"#3086AB", desc:"Five time-bound goals defining what the team commits to achieving by 2030. Each goal has a metric, a 2026 baseline, and a 2030 target. Goals are contributed to by portfolios in a many-to-many relationship — only AI Infrastructure and System Feedback Loops contribute directly."},
    {id:"portfolios",    y:ROW_STEP*2,   label:"Portfolios",            tier:"Tier 2", tag:"4 portfolios",                        color:"#4EAB9A", desc:"Four thematic investment areas. AI Infrastructure and System Feedback Loops are direct drivers of the 2030 goals (M:N). Cross-Cutting Supports and Data & AI Enablement Hub are internal enablers — they support team execution and strategy effectiveness but do not contribute directly to any 2030 goal."},
    {id:"port-outcomes", y:ROW_STEP*3,   label:"Portfolio Outcomes",    tier:"Tier 3", tag:"activity–outcome pairs",              color:"#FBAE40", desc:"Specific results each portfolio is working toward. Each pairs a discrete activity (what the team does) with an expected outcome (what changes as a result). Portfolio Outcomes sit between the broad 2030 Goals and the detailed BOW Outcomes."},
    {id:"bows",          y:ROW_STEP*4,   label:"Bodies of Work (BOWs)", tier:"Tier 4", tag:"10 BOWs across 4 portfolios",         color:ACCENT,    desc:"Ten major workstreams — the primary unit of execution. Each BOW defines a focused area of work, the outcomes it aims to produce, and the investments made to deliver it. Nested within one portfolio."},
    {id:"bow-outcomes",  y:ROW_STEP*5,   label:"BOW Outcomes",          tier:"Tier 5", tag:"specific measurable results",         color:"#059669", desc:"The most granular outcome-level element. Aggregate upward toward Portfolio Outcomes in a many-to-many relationship (tracked in bow_portfolio_outcome_links, distinguishing direct vs. indirect contributions). Investments link directly to BOW Outcomes via INVEST."},
    {id:"execution",     y:ROW_STEP*6,   label:"Execution Targets",     tier:"Tier 6", tag:"milestones & deliverables",           color:"#DC2626", desc:"The most granular tracking layer. Specific milestones and deliverables tied to BOW Outcomes, defining what success looks like within a given strategy period."},
  ];

  // Connector labels between nodes
  const EDGES = [
    {from:"ambition",     to:"goals",        label:"guides"},
    {from:"goals",        to:"portfolios",   label:"pursued through"},
    {from:"portfolios",   to:"port-outcomes",label:"define"},
    {from:"port-outcomes",to:"bows",         label:"executed via"},
    {from:"bows",         to:"bow-outcomes", label:"produce"},
    {from:"bow-outcomes", to:"execution",    label:"tracked by"},
  ];

  // Lateral nodes (branch right of primary column)
  const LATERALS = [
    {id:"port-li",  label:"Leading Indicators", sublabel:"Portfolio-level · parsimonious set", color:LI_COLOR,     connectTo:["port-outcomes"], desc:"A curated, small set of forward-looking signals per Portfolio Outcome. Draws from a subset of BOW-level indicators, and may include additional indicators not tracked within any individual BOW."},
    {id:"bow-li",   label:"Leading Indicators", sublabel:"BOW-level · one set per BOW",        color:LI_COLOR,     connectTo:["bow-outcomes"],  desc:"Each BOW has its own set of forward-looking signals. Partial overlap with portfolio-level indicators — some BOW indicators surface to the portfolio set, others remain BOW-specific. The portfolio set may also include indicators not present at BOW level."},
    {id:"invest",   label:"Investments",         sublabel:"Lateral · via INVEST (Salesforce)",  color:INVEST_COLOR, connectTo:["bow-outcomes","execution"], desc:"Grants and funded activities managed in INVEST — read-only here. Linked via bows.invest_bow_id. Investments connect laterally at two points: BOW Outcomes (which outcomes each grant advances) and Execution Targets (milestone-level tracking)."},
  ];

  // Assign y to each lateral based on average y of its connected primary nodes
  const nodeY = n => NODES.find(x=>x.id===n)?.y ?? 0;
  const latWithPos = LATERALS.map(lat=>{
    const ys = lat.connectTo.map(nodeY);
    const avgY = ys.reduce((a,b)=>a+b,0)/ys.length;
    return {...lat, x:BOX_W+COL_GAP, y:avgY};
  });

  const allNodes = [
    ...NODES.map(n=>({...n,x:0,isLateral:false})),
    ...latWithPos.map(l=>({...l,isLateral:true})),
  ];
  const sel = selected ? allNodes.find(n=>n.id===selected) : null;

  const onWheel = e=>{e.preventDefault();setZoom(z=>Math.min(2.5,Math.max(0.3,z*(e.deltaY>0?0.9:1.1))));};
  const onDown  = e=>{if(e.button!==0)return;setDragging(true);setLastMouse({x:e.clientX,y:e.clientY});};
  const onMove  = e=>{if(!dragging)return;setPan(p=>({x:p.x+(e.clientX-lastMouse.x),y:p.y+(e.clientY-lastMouse.y)}));setLastMouse({x:e.clientX,y:e.clientY});};
  const onUp    = ()=>setDragging(false);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,height:"calc(100vh - 220px)",minHeight:500}}>
      {/* Diagram */}
      <div style={{flex:1,overflow:"hidden",position:"relative",cursor:dragging?"grabbing":"grab",background:"#F1F5F9",userSelect:"none",borderRadius:12,border:"1px solid "+BORDER}}
        onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>

        {/* Controls */}
        <div style={{position:"absolute",top:10,right:14,display:"flex",gap:6,zIndex:10,alignItems:"center"}}>
          <button onClick={()=>setZoom(z=>Math.min(2.5,z*1.2))} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:13,cursor:"pointer"}}>+</button>
          <button onClick={()=>setZoom(z=>Math.max(0.3,z*0.8))} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:13,cursor:"pointer"}}>−</button>
          <button onClick={()=>{setZoom(1);setPan({x:60,y:20});setSelected(null);}} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:11,cursor:"pointer"}}>Reset</button>
          <span style={{fontSize:11,color:TEXT_MUTED}}>{Math.round(zoom*100)}%</span>
        </div>

        <svg width="100%" height="100%" style={{display:"block"}}>
          <defs>
            <marker id="mh-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#94A3B8"/></marker>
            <marker id="mh-arrow-sel" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill={sel?.color||"#94A3B8"}/></marker>
            <marker id="mh-arrow-agg" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z" fill="#7C3AED"/></marker>
          </defs>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} onClick={()=>setSelected(null)}>

            {/* Primary chain vertical edges */}
            {EDGES.map((e,i)=>{
              const fn=NODES.find(n=>n.id===e.from), tn=NODES.find(n=>n.id===e.to);
              const cx=BOX_W/2, y1=fn.y+BOX_H, y2=tn.y, my=(y1+y2)/2;
              const isSel=selected&&(selected===e.from||selected===e.to);
              const selColor=selected?(NODES.find(n=>n.id===selected)||{color:"#94A3B8"}).color:"#94A3B8";
              return (
                <g key={i}>
                  <line x1={cx} y1={y1} x2={cx} y2={y2} stroke={isSel?selColor:"#94A3B8"} strokeWidth={isSel?2:1} markerEnd={isSel?"url(#mh-arrow-sel)":"url(#mh-arrow)"} opacity={selected&&!isSel?0.2:0.8}/>
                  <text x={cx+8} y={my} fontSize={10} fill={isSel?selColor:TEXT_MUTED} fontStyle="italic" dominantBaseline="middle" opacity={selected&&!isSel?0.2:1}>{e.label}</text>
                </g>
              );
            })}

            {/* BOW Outcomes → Portfolio Outcomes aggregation (upward, routed left) */}
            {(()=>{
              const bo=NODES.find(n=>n.id==="bow-outcomes"), po=NODES.find(n=>n.id==="port-outcomes");
              const x1=0, y1=bo.y+BOX_H/2, y2=po.y+BOX_H/2, lx=-36;
              const isSel=selected==="bow-outcomes"||selected==="port-outcomes";
              return (
                <g opacity={selected&&!isSel?0.12:1}>
                  <path d={`M ${x1},${y1} H ${lx} V ${y2} H ${x1}`} fill="none"
                    stroke="#7C3AED" strokeWidth={isSel?2:1.2} strokeDasharray="5 3"
                    markerEnd="url(#mh-arrow-agg)"/>
                  <text x={lx-4} y={(y1+y2)/2} fontSize={9} fill="#7C3AED" fontStyle="italic"
                    textAnchor="end" dominantBaseline="middle">contributes to</text>
                </g>
              );
            })()}

            {/* Lateral connector edges */}
            {latWithPos.map(lat=>
              lat.connectTo.map(nodeId=>{
                const pn=NODES.find(n=>n.id===nodeId);
                const x1=BOX_W, y1=pn.y+BOX_H/2;
                const x2=lat.x, y2=lat.y+LAT_H/2;
                const mx=(x1+x2)/2;
                const isSel=selected===lat.id||selected===nodeId;
                return (
                  <path key={nodeId} d={`M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none" stroke={isSel?lat.color:"#94A3B8"} strokeWidth={isSel?1.8:1}
                    strokeDasharray="6 3" opacity={selected&&!isSel?0.12:0.7}
                    markerEnd="url(#mh-arrow)"/>
                );
              })
            )}

            {/* Primary chain nodes */}
            {NODES.map(node=>{
              const isSel=selected===node.id;
              const dimmed=selected&&!isSel&&!EDGES.some(e=>(e.from===selected&&e.to===node.id)||(e.to===selected&&e.from===node.id));
              return (
                <g key={node.id} onClick={e=>{e.stopPropagation();setSelected(selected===node.id?null:node.id);}} style={{cursor:"pointer"}}>
                  <rect x={0} y={node.y} width={BOX_W} height={BOX_H} rx={8}
                    fill={isSel?node.color:node.color+"14"} stroke={node.color}
                    strokeWidth={isSel?2.5:1.5} opacity={dimmed?0.2:1}/>
                  {node.tier&&<text x={10} y={node.y+15} fontSize={8} fontWeight={700} fill={isSel?"rgba(255,255,255,0.8)":node.color} letterSpacing={0.8} opacity={dimmed?0.2:1}>{node.tier.toUpperCase()}</text>}
                  <text x={10} y={node.y+(node.tier?35:BOX_H/2+5)} fontSize={13} fontWeight={700} fill={isSel?"#fff":TEXT} opacity={dimmed?0.25:1}>{node.label}</text>
                  <text x={10} y={node.y+BOX_H-11} fontSize={10} fill={isSel?"rgba(255,255,255,0.65)":TEXT_MUTED} opacity={dimmed?0.2:1}>{node.tag}</text>
                </g>
              );
            })}

            {/* Lateral nodes */}
            {latWithPos.map(lat=>{
              const isSel=selected===lat.id;
              const isConn=selected&&lat.connectTo.includes(selected);
              const dimmed=selected&&!isSel&&!isConn;
              return (
                <g key={lat.id} onClick={e=>{e.stopPropagation();setSelected(selected===lat.id?null:lat.id);}} style={{cursor:"pointer"}}>
                  <rect x={lat.x} y={lat.y} width={LAT_W} height={LAT_H} rx={8}
                    fill={isSel?lat.color:lat.color+"0D"} stroke={lat.color}
                    strokeWidth={isSel?2.5:1.5} strokeDasharray={isSel?"none":"6 3"} opacity={dimmed?0.15:1}/>
                  <text x={lat.x+10} y={lat.y+22} fontSize={12} fontWeight={700} fill={isSel?"#fff":lat.color} opacity={dimmed?0.2:1}>{lat.label}</text>
                  <text x={lat.x+10} y={lat.y+38} fontSize={9} fill={isSel?"rgba(255,255,255,0.65)":TEXT_MUTED} opacity={dimmed?0.2:1}>{lat.sublabel}</text>
                </g>
              );
            })}
          </g>
        </svg>

        <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",fontSize:11,color:TEXT_MUTED,background:SURFACE+"EE",padding:"4px 14px",borderRadius:12,border:"1px solid "+BORDER,pointerEvents:"none",whiteSpace:"nowrap"}}>
          Click to highlight · Scroll to zoom · Drag to pan
        </div>
      </div>

      {/* Detail panel */}
      {sel ? (
        <div style={{flexShrink:0,marginTop:12,padding:"14px 20px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER,borderLeft:"4px solid "+sel.color}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            {sel.tier&&<span style={{fontSize:9,fontWeight:700,color:sel.color,background:sel.color+"15",borderRadius:4,padding:"2px 7px",letterSpacing:0.6,textTransform:"uppercase"}}>{sel.tier}</span>}
            <span style={{fontSize:14,fontWeight:700,color:TEXT}}>{sel.label}</span>
            {sel.sublabel&&<span style={{fontSize:11,color:TEXT_MUTED}}>{sel.sublabel}</span>}
          </div>
          <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.75}}>{sel.desc}</div>
        </div>
      ) : (
        <div style={{flexShrink:0,marginTop:12,padding:"12px 18px",background:SURFACE,borderRadius:10,border:"1px solid "+BORDER}}>
          <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.75}}>The strategy is organized across <strong>seven measurement tiers</strong> — from the long-term Ambition 2045 vision down to granular execution targets. Two lateral elements, <span style={{color:LI_COLOR,fontWeight:600}}>Leading Indicators</span> and <span style={{color:INVEST_COLOR,fontWeight:600}}>Investments</span>, connect at specific points. Click any node to read its full description.</div>
        </div>
      )}
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

    </div>
  );
}
// ── Sidebar ───────────────────────────────────────────────────────────────────
const PORTFOLIOS = [
  {id:"ai-infra",      label:"AI Infrastructure"},
  {id:"sfl",           label:"System Feedback Loops"},
  {id:"hub",           label:"Data & AI Enablement Hub"},
  {id:"cross-cutting", label:"Cross Cutting Supports"},
];

function IconTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0" y="0" width="14" height="3" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="0" y="4.5" width="14" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="0" y="8.5" width="14" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="0" y="12" width="14" height="2" rx="1" fill="currentColor" opacity="0.35"/>
    </svg>
  );
}

// ── AllInvestmentsView ────────────────────────────────────────────────────────
function AllInvestmentsView() {
  const [investments, setInvestments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState("all");
  const [editingId, setEditingId]       = useState(null);
  const [savingId, setSavingId]         = useState(null);
  const [search, setSearch]             = useState("");
  const [ownerSearch, setOwnerSearch]   = useState("");
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [sortBy, setSortBy]             = useState("grantee");
  const [sortDir, setSortDir]           = useState("asc");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedBow, setSelectedBow]               = useState("all");
  const [selectedCoFundingTeam, setSelectedCoFundingTeam] = useState("all");
  const [currentUser, setCurrentUser]               = useState(null);
  const [viewMode, setViewMode]                     = useState("table");
  const [selectedOwner, setSelectedOwner]           = useState("all");
  const [showApprover, setShowApprover]             = useState(false);
  const [showNotes, setShowNotes]                   = useState(false);
  const [paymentPopover, setPaymentPopover]         = useState(null);
  const paymentCache   = React.useRef({});
  const popoverTimeout = React.useRef(null);

  useEffect(() => {
    apiFetch("/api/me").then(u => { if (u) setCurrentUser(u); }).catch(() => {});
  }, []);

  const showPayments = async (invId, rect) => {
    clearTimeout(popoverTimeout.current);
    if (paymentCache.current[invId]) {
      setPaymentPopover({ invId, rows: paymentCache.current[invId], rect });
      return;
    }
    setPaymentPopover({ invId, rows: null, rect });
    try {
      const rows = await apiFetch(`/api/investments/${invId}/payments`);
      paymentCache.current[invId] = rows || [];
      setPaymentPopover(prev => prev?.invId === invId ? { invId, rows: rows || [], rect } : prev);
    } catch {
      paymentCache.current[invId] = [];
    }
  };

  const hidePayments = () => {
    popoverTimeout.current = setTimeout(() => setPaymentPopover(null), 200);
  };

  const pc = selectedPortfolio !== "all" && PORT_COLORS[selectedPortfolio]
    ? PORT_COLORS[selectedPortfolio]
    : { color: "#3086AB", light: "#EBF4F9" };

  const portfolioOptions = [
    { id: "all", name: "All Portfolios", color: "#3086AB" },
    ...PORTFOLIOS.map(p => ({ id: p.id, name: p.label, color: PORT_COLORS[p.id].color })),
  ];

  const portfolioFiltered = selectedPortfolio === "all"
    ? investments
    : investments.filter(inv => inv.portfolio_id === selectedPortfolio);

  const bowOptions = Array.from(new Set(
    portfolioFiltered.flatMap(inv => inv.bowTitles)
  )).filter(Boolean).sort();

  const coFundingOptions = Array.from(new Set(
    portfolioFiltered.flatMap(inv => inv.coFundingTeams
      ? inv.coFundingTeams.split(", ").filter(Boolean)
      : [])
  )).sort();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAllInvestments().then(rows => {
      if (!cancelled) { setInvestments(rows); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { setError("Could not load investment data."); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const saveNotes = async (invId, notes) => {
    setSavingId(invId);
    const cur = investments.find(i => i.id === invId);
    try {
      const res = await apiFetch(`/api/investments/${invId}/overlay`, {
        method: "POST",
        body: JSON.stringify({ internal_notes: notes, approver: cur?.approver || null }),
      });
      const savedAt = new Date().toISOString();
      const author = res?.updated_by || currentUser?.display_name || null;
      setInvestments(prev => prev.map(inv =>
        inv.id === invId ? { ...inv, internal_notes: notes, notesUpdatedBy: author, notesUpdatedAt: savedAt } : inv
      ));
    } catch (err) {
      console.warn("Failed to save overlay:", err);
    } finally {
      setSavingId(null);
    }
  };

  const saveApprover = async (invId, approver) => {
    setSavingId(invId);
    const cur = investments.find(i => i.id === invId);
    try {
      await apiFetch(`/api/investments/${invId}/overlay`, {
        method: "POST",
        body: JSON.stringify({ internal_notes: cur?.internal_notes || null, approver, updated_by: currentUser?.display_name || null }),
      });
      setInvestments(prev => prev.map(inv =>
        inv.id === invId ? { ...inv, approver: approver || "" } : inv
      ));
    } catch (err) {
      console.warn("Failed to save approver:", err);
    } finally {
      setSavingId(null);
    }
  };

  const fmtM = (n) => {
    const num = parseFloat(n) || 0;
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000)    return `$${(num/1000).toFixed(0)}K`;
    return `$${num}`;
  };
  const toNum = (v) => parseFloat(String(v || "0").replace(/[^0-9.]/g, "")) || 0;

  const handleColSort = (field) => {
    if (sortBy !== field) { setSortBy(field); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortBy(""); setSortDir("asc"); }
  };

  const filtered = investments
    .filter(inv => selectedPortfolio === "all" || inv.portfolio_id === selectedPortfolio)
    .filter(inv => selectedBow === "all" || inv.bowTitles.includes(selectedBow))
    .filter(inv => selectedCoFundingTeam === "all" || (inv.coFundingTeams &&
      inv.coFundingTeams.split(", ").includes(selectedCoFundingTeam)))
    .filter(inv => {
      if (!filterStatuses.length) return true;
      return filterStatuses.some(f => f === "Active" ? inv.status === "Active" : inv.stage === f);
    })
    .filter(inv => selectedOwner === "all" || inv.owner === selectedOwner || inv.secondaryOwner === selectedOwner)
    .filter(inv => !ownerSearch || [inv.owner, inv.secondaryOwner]
      .some(s => s && s.toLowerCase().includes(ownerSearch.toLowerCase())))
    .filter(inv => !search || [inv.grantee || "", inv.initiative || "", inv.internal_notes || ""]
      .some(s => s.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (!sortBy) return 0;
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortBy === "amount") return dir * (toNum(a.amount) - toNum(b.amount));
      return dir * (a[sortBy] || "").localeCompare(b[sortBy] || "");
    });

  const totalAmt = filtered.reduce((s, inv) => s + toNum(inv.amount), 0);

  const contextLevel = selectedBow !== "all" ? "BOW"
    : selectedPortfolio !== "all" ? "Portfolio"
    : "Strategy";
  const contextTitle = selectedBow !== "all" ? selectedBow
    : selectedPortfolio !== "all" ? (PORT_COLORS[selectedPortfolio]?.label || selectedPortfolio)
    : "Strategy-Wide Pipeline";

  const STAGE_SHORT = {
    "Start Concept":    "Start Concept",
    "Request Proposal": "Request Proposal",
    "Refine Proposal":  "Refine Proposal",
    "Create Agreement": "Agreement",
    "Request Approval": "Request Approval",
    "Obtain Signatures":"Signatures",
    "Active":           "Active",
  };
  const stageData = [...PIPELINE_STAGES, "Active"].map(stage => {
    const invs = stage === "Active"
      ? filtered.filter(inv => inv.status === "Active")
      : filtered.filter(inv => inv.stage === stage);
    return {
      stage,
      count:  invs.length,
      amount: invs.reduce((s, inv) => s + toNum(inv.amount), 0),
      grants:    invs.filter(inv => !inv.type?.toLowerCase().includes("amendment")).length,
      contracts: invs.filter(inv =>  inv.type?.toLowerCase().includes("amendment")).length,
    };
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 200, gap: 12, color: TEXT_SUB, fontSize: 14 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #3086AB",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Pipeline tracker header */}
      <div style={{ background: "#EEF4FB", border: "1px solid #D3E4F4", borderRadius: 12, padding: "16px 20px 14px" }}>
        {/* Title + summary stats */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED,
              textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>
              Investment Pipeline · {contextLevel}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>{contextTitle}</div>
          </div>
          <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
            {[
              { label: "In Pipeline", value: filtered.filter(i=>i.status==="In Process").length, color: "#3086AB" },
              { label: "Active",      value: filtered.filter(i=>i.status==="Active").length,     color: "#059669" },
            ].map(({ label, value, color }, i, arr) => (
              <React.Fragment key={label}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, background: BORDER, alignSelf: "stretch" }}/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stage flow — chevron chain */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 2, overflowX: "auto", paddingBottom: 2 }}>
          {stageData.map((sd, i) => {
            const isActive   = sd.stage === "Active";
            const isFirst    = i === 0;
            const isLast     = i === stageData.length - 1;
            const hasInvs    = sd.count > 0;
            const isFiltered = filterStatuses.includes(sd.stage) || (isActive && filterStatuses.includes("Active"));
            const N = 11; // notch size px
            const clipPath = isFirst
              ? `polygon(0 0, calc(100% - ${N}px) 0, 100% 50%, calc(100% - ${N}px) 100%, 0 100%)`
              : isLast
              ? `polygon(${N}px 0, 100% 0, 100% 100%, ${N}px 100%, 0 50%)`
              : `polygon(${N}px 0, calc(100% - ${N}px) 0, 100% 50%, calc(100% - ${N}px) 100%, ${N}px 100%, 0 50%)`;
            const bg = isFiltered
              ? (isActive ? "#059669" : "#3086AB")
              : hasInvs
              ? (isActive ? "#D1FAE5" : "#DBEAFE")
              : "#E8EEF5";
            const labelCol  = isFiltered ? "rgba(255,255,255,0.8)" : hasInvs ? (isActive ? "#065F46" : "#1E4D8C") : "#94A3B8";
            const countCol  = isFiltered ? "#fff" : hasInvs ? (isActive ? "#047857" : "#3086AB") : "#C0CAD6";
            const amtCol    = isFiltered ? "rgba(255,255,255,0.7)" : hasInvs ? "#64748B" : "#C0CAD6";
            const pl = isFirst ? 10 : N + 5;
            const pr = isLast  ? 10 : N + 5;
            return (
              <button
                key={sd.stage}
                onClick={() => {
                  if (!hasInvs) return;
                  const key = isActive ? "Active" : sd.stage;
                  setFilterStatuses(prev =>
                    prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
                  );
                }}
                title={sd.stage}
                style={{
                  flex: "1 1 0", minWidth: 88, border: "none",
                  background: bg, clipPath,
                  padding: `8px ${pr}px 8px ${pl}px`,
                  cursor: hasInvs ? "pointer" : "default",
                  textAlign: "center", transition: "background .12s",
                }}>
                <div style={{ fontSize: 9, color: labelCol, textTransform: "uppercase",
                  letterSpacing: 0.4, lineHeight: 1.25, marginBottom: 4,
                  whiteSpace: "normal", wordBreak: "break-word" }}>
                  {isActive ? "● Active" : STAGE_SHORT[sd.stage]}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: countCol }}>
                  {sd.count}
                </div>
              </button>
            );
          })}
        </div>
        {filterStatuses.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: TEXT_MUTED }}>Filtered to:</span>
            {filterStatuses.map(s => (
              <span key={s} style={{ fontSize: 10, fontWeight: 600, color: "#3086AB",
                background: "#DBEAFE", borderRadius: 4, padding: "2px 7px" }}>{s}</span>
            ))}
            <button onClick={() => setFilterStatuses([])}
              style={{ fontSize: 10, color: TEXT_MUTED, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", padding: 0, marginLeft: 4 }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
        {/* View toggle */}
        <div style={{ display: "flex", border: "1px solid " + BORDER, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {["table", "pipeline"].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                background: viewMode === mode ? pc.color : SURFACE,
                color: viewMode === mode ? "#fff" : TEXT_MUTED,
                borderRight: mode === "table" ? "1px solid " + BORDER : "none" }}>
              {mode === "table" ? "Table" : "Pipeline"}
            </button>
          ))}
        </div>
        {/* Portfolio filter dropdown */}
        <select value={selectedPortfolio}
          onChange={e => { setSelectedPortfolio(e.target.value); setSelectedBow("all"); setSelectedCoFundingTeam("all"); setSelectedOwner("all"); }}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid " + BORDER,
            fontSize: 12, color: TEXT, background: SURFACE, cursor: "pointer",
            fontFamily: "inherit", outline: "none" }}>
          {portfolioOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {/* Owner filter dropdown */}
        {viewMode === "pipeline" && (() => {
          const ownerOpts = ["all", ...Array.from(new Set(
            investments.filter(inv => inv.status === "In Process")
              .flatMap(inv => [inv.owner, inv.secondaryOwner].filter(Boolean))
          )).sort()];
          return (
            <select value={selectedOwner}
              onChange={e => { setSelectedOwner(e.target.value); setSelectedPortfolio("all"); setSelectedBow("all"); setSelectedCoFundingTeam("all"); }}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid " + BORDER,
                fontSize: 12, color: TEXT, background: SURFACE, cursor: "pointer",
                fontFamily: "inherit", outline: "none" }}>
              {ownerOpts.map(o => (
                <option key={o} value={o}>{o === "all" ? "All Owners" : o}</option>
              ))}
            </select>
          );
        })()}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", minWidth: 200 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search grantee, initiative, notes…"
            style={{ width: "100%", border: "1px solid " + BORDER, borderRadius: 8,
              padding: "6px 10px 6px 28px", fontSize: 12, fontFamily: "inherit",
              outline: "none", color: TEXT, boxSizing: "border-box", background: SURFACE }} />
          <span style={{ position: "absolute", left: 9, top: "50%",
            transform: "translateY(-50%)", fontSize: 12, opacity: 0.4 }}>&#x2315;</span>
        </div>
      </div>

      {/* Pipeline / Table view */}
      {viewMode === "pipeline" ? (() => {
        const pipelineInvs = filtered.filter(inv => inv.status === "In Process");
        const thP = { padding: "9px 12px", fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
          textTransform: "uppercase", letterSpacing: 0.8, textAlign: "left",
          borderLeft: "1px solid " + BORDER, verticalAlign: "middle" };
        return (
          <>
            {pipelineInvs.length === 0 ? (
              <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 12,
                padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 5 }}>
                  No in-process investments match the current filters
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Try adjusting your portfolio, BOW, or search filters.
                </div>
              </div>
            ) : (
              <>
                {/* Stacked bar chart — stages L→R, stacked by portfolio */}
                <div style={{ background: SURFACE, borderRadius: 12, border: "1px solid " + BORDER, padding: "20px 24px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 20 }}>
                    In-Process Investments by Stage
                  </div>
                  {(() => {
                    const portList = portfolioOptions.filter(p => p.id !== "all");
                    const maxTotal = Math.max(1, ...PIPELINE_STAGES.map(s =>
                      pipelineInvs.filter(inv => inv.stage === s).length));
                    const BAR_MAX_H = 160;
                    return (
                      <>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                          {PIPELINE_STAGES.map(stage => {
                            const stageInvs = pipelineInvs.filter(inv => inv.stage === stage);
                            const total = stageInvs.length;
                            const barH = Math.max(0, (total / maxTotal) * BAR_MAX_H);
                            return (
                              <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column",
                                alignItems: "center", gap: 6, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700,
                                  color: total > 0 ? TEXT : "transparent", height: 16, lineHeight: "16px" }}>
                                  {total || ""}
                                </div>
                                <div style={{ width: "100%", height: BAR_MAX_H,
                                  display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                  <div style={{ width: "100%", height: barH,
                                    display: "flex", flexDirection: "column",
                                    borderRadius: 4, overflow: "hidden" }}>
                                    {portList.map(p => {
                                      const cnt = stageInvs.filter(inv => inv.portfolio_id === p.id).length;
                                      if (!cnt) return null;
                                      return (
                                        <div key={p.id} title={`${p.name}: ${cnt}`}
                                          style={{ width: "100%", height: ((cnt / total) * 100) + "%",
                                            background: PORT_COLORS[p.id]?.color || "#94A3B8" }} />
                                      );
                                    })}
                                  </div>
                                </div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.2,
                                  color: total > 0 ? TEXT : TEXT_MUTED, textAlign: "center",
                                  lineHeight: 1.3, wordBreak: "break-word" }}>
                                  {stage}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px",
                          marginTop: 16, paddingTop: 12, borderTop: "1px solid " + BORDER }}>
                          {portList.filter(p => pipelineInvs.some(inv => inv.portfolio_id === p.id)).map(p => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 9, height: 9, borderRadius: 2,
                                background: PORT_COLORS[p.id]?.color || "#94A3B8", flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: TEXT_MUTED }}>{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Per-investment dot table */}
                <div style={{ background: SURFACE, borderRadius: 12, border: "1px solid " + BORDER,
                  overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed",
                      minWidth: 600 + PIPELINE_STAGES.length * 80 }}>
                      <colgroup>
                        <col style={{ minWidth: 180 }} />
                        <col style={{ width: 140 }} />
                        <col style={{ width: 100 }} />
                        {PIPELINE_STAGES.map(s => <col key={s} style={{ width: 78 }} />)}
                      </colgroup>
                      <thead>
                        <tr style={{ background: SURFACE_2, borderBottom: "2px solid " + BORDER }}>
                          <th style={{ ...thP, borderLeft: "none" }}>Investment</th>
                          <th style={{ ...thP }}>Owner</th>
                          <th style={{ ...thP }}>Amount</th>
                          {PIPELINE_STAGES.map(s => (
                            <th key={s} style={{ ...thP, fontSize: 9, textAlign: "center",
                              letterSpacing: 0.3, lineHeight: 1.3, padding: "6px 4px" }}>
                              {s}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pipelineInvs.map((inv, idx) => {
                          const stageIdx = PIPELINE_STAGES.indexOf(inv.stage);
                          const rowBg = idx % 2 === 0 ? SURFACE : SURFACE_2;
                          const rowPc = inv.portfolio_id && PORT_COLORS[inv.portfolio_id]
                            ? PORT_COLORS[inv.portfolio_id] : pc;
                          const rowBorder = idx < pipelineInvs.length - 1 ? "1px solid " + BORDER : "none";
                          const tdP = { background: rowBg, verticalAlign: "middle",
                            borderBottom: rowBorder, borderLeft: "1px solid " + BORDER };
                          return (
                            <tr key={inv.id}>
                              <td style={{ ...tdP, borderLeft: "none", padding: "10px 12px" }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: TEXT,
                                  lineHeight: 1.3 }}>{inv.initiative || "—"}</div>
                                <div style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: "monospace",
                                  marginTop: 2 }}>
                                  {inv.investmentUrl
                                    ? <a href={inv.investmentUrl} target="_blank" rel="noreferrer"
                                        style={{ color: "#3086AB", textDecoration: "none" }}>{inv.id}</a>
                                    : inv.id}
                                </div>
                              </td>
                              <td style={{ ...tdP, padding: "10px 12px", fontSize: 11, color: TEXT_SUB }}>
                                {inv.owner || "—"}
                              </td>
                              <td style={{ ...tdP, padding: "10px 12px", fontSize: 12, fontWeight: 600,
                                color: TEXT }}>
                                {inv.amount ? fmtM(toNum(inv.amount)) : "—"}
                              </td>
                              {PIPELINE_STAGES.map((s, si) => (
                                <td key={s} style={{ ...tdP, padding: "10px 4px", textAlign: "center" }}>
                                  {si === stageIdx ? (
                                    <span style={{ display: "inline-block", width: 14, height: 14,
                                      borderRadius: "50%", background: rowPc.color,
                                      boxShadow: "0 0 0 3px " + rowPc.color + "28" }} />
                                  ) : si < stageIdx && stageIdx !== -1 ? (
                                    <span style={{ display: "inline-block", width: 10, height: 10,
                                      borderRadius: "50%", background: rowPc.color + "35" }} />
                                  ) : (
                                    <span style={{ display: "inline-block", width: 10, height: 10,
                                      borderRadius: "50%", border: "1.5px solid " + BORDER }} />
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        );
      })() : (
      <>
      {filtered.length === 0 ? (
        <div style={{ background: SURFACE, border: "1px solid " + BORDER,
          borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>💼</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 5 }}>
            {investments.length === 0 ? "No investments found" : "No results match your filters"}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            {investments.length === 0
              ? "Investments will appear here once linked to BOWs in INVEST."
              : "Try adjusting your search or filters."}
          </div>
        </div>
      ) : (
        <div style={{ background: SURFACE, borderRadius: 12,
          border: "1px solid " + BORDER, overflow: "hidden", position: "relative" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
              <colgroup>
                <col style={{ width: 100 }} />
                <col style={{ minWidth: 120 }} />
                <col style={{ minWidth: 100 }} />
                <col style={{ minWidth: 140 }} />
                <col style={{ minWidth: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: showApprover ? 130 : 30 }} />
                <col style={{ width: showNotes ? 200 : 30 }} />
              </colgroup>
              <thead>
                {(() => {
                  const hStyle = (active) => ({
                    padding: "9px 12px", fontSize: 10, fontWeight: 700,
                    color: active ? pc.color : TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.8,
                    textAlign: "left", verticalAlign: "middle"
                  });
                  const sortArrow = (field) => sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";
                  const sortCol = (field, label) => (
                    <th onClick={() => handleColSort(field)}
                      style={{ ...hStyle(sortBy === field), borderRight: "1px solid " + BORDER,
                        cursor: "pointer", userSelect: "none" }}>
                      {label}<span style={{ fontSize: 8, opacity: 0.7 }}>{sortArrow(field)}</span>
                    </th>
                  );
                  const plainCol = (label, lastCol) => (
                    <th style={{ ...hStyle(false), borderRight: lastCol ? "none" : "1px solid " + BORDER }}>{label}</th>
                  );
                  return (
                    <tr style={{ background: SURFACE_2, borderBottom: "2px solid " + BORDER }}>
                      {plainCol("Investment ID", false)}
                      {sortCol("initiative", "Investment Title")}
                      {sortCol("grantee", "Grantee")}
                      {plainCol("Description", false)}
                      <th style={{ borderRight: "1px solid " + BORDER, padding: "5px 12px", verticalAlign: "middle" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: ownerSearch ? pc.color : TEXT_SUB,
                          textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                          Investment Owner
                        </div>
                        <input value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)}
                          placeholder="Filter by name…"
                          style={{ width: "100%", border: "1px solid " + (ownerSearch ? pc.color + "60" : BORDER),
                            borderRadius: 4, padding: "2px 6px", fontSize: 10, fontFamily: "inherit",
                            outline: "none", color: TEXT, background: ownerSearch ? pc.color + "08" : BG,
                            boxSizing: "border-box" }} />
                      </th>
                      <th style={{ position: "relative", borderRight: "1px solid " + BORDER, verticalAlign: "middle" }}>
                        <div onClick={() => setOpenDropdown(openDropdown === "bow" ? null : "bow")}
                          style={{ ...hStyle(selectedBow !== "all"), padding: "9px 12px", cursor: "pointer",
                            userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {selectedBow === "all" ? "BOW" : selectedBow.length > 22 ? selectedBow.slice(0, 22) + "…" : selectedBow}
                          <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                        </div>
                        {openDropdown === "bow" && (
                          <>
                            <div onClick={() => setOpenDropdown(null)}
                              style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100,
                              background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8,
                              padding: "4px 0", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                              minWidth: 220, maxHeight: 260, overflowY: "auto" }}>
                              {[{ value: "all", label: "All BOWs" }, ...bowOptions.map(b => ({ value: b, label: b }))].map(opt => (
                                <div key={opt.value}
                                  onClick={() => { setSelectedBow(opt.value); setOpenDropdown(null); }}
                                  style={{ padding: "7px 14px", fontSize: 12, cursor: "pointer",
                                    background: selectedBow === opt.value ? pc.color + "12" : "transparent",
                                    color: selectedBow === opt.value ? pc.color : TEXT,
                                    fontWeight: selectedBow === opt.value ? 700 : 400 }}>
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </th>
                      <th style={{ position: "relative", borderRight: "1px solid " + BORDER, verticalAlign: "middle" }}>
                        <div onClick={() => setOpenDropdown(openDropdown === "cofunding" ? null : "cofunding")}
                          style={{ ...hStyle(selectedCoFundingTeam !== "all"), padding: "9px 12px", cursor: "pointer",
                            userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {selectedCoFundingTeam === "all" ? "Co-Funding Team" : selectedCoFundingTeam.length > 18 ? selectedCoFundingTeam.slice(0, 18) + "…" : selectedCoFundingTeam}
                          <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                        </div>
                        {openDropdown === "cofunding" && (
                          <>
                            <div onClick={() => setOpenDropdown(null)}
                              style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100,
                              background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8,
                              padding: "4px 0", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                              minWidth: 200, maxHeight: 260, overflowY: "auto" }}>
                              {[{ value: "all", label: "All Co-Funding Teams" }, ...coFundingOptions.map(t => ({ value: t, label: t }))].map(opt => (
                                <div key={opt.value}
                                  onClick={() => { setSelectedCoFundingTeam(opt.value); setOpenDropdown(null); }}
                                  style={{ padding: "7px 14px", fontSize: 12, cursor: "pointer",
                                    background: selectedCoFundingTeam === opt.value ? pc.color + "12" : "transparent",
                                    color: selectedCoFundingTeam === opt.value ? pc.color : TEXT,
                                    fontWeight: selectedCoFundingTeam === opt.value ? 700 : 400 }}>
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </th>
                      <th onClick={() => handleColSort("amount")}
                        style={{ ...hStyle(sortBy === "amount"), borderRight: "1px solid " + BORDER,
                          cursor: "pointer", userSelect: "none" }}>
                        Total Amount<span style={{ fontSize: 8, opacity: 0.7 }}>{sortBy === "amount" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
                        <div style={{ fontSize: 9, fontWeight: 400, color: TEXT_MUTED,
                          textTransform: "none", letterSpacing: 0, marginTop: 2, fontStyle: "italic" }}>
                          Hover for By Year breakouts
                        </div>
                      </th>
                      {plainCol("Start Date", false)}
                      {plainCol("End Date", false)}
                      <th style={{ position: "relative", borderRight: "1px solid " + BORDER, verticalAlign: "middle" }}>
                        <div onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                          style={{ ...hStyle(filterStatuses.length > 0), padding: "7px 12px", cursor: "pointer",
                            userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {filterStatuses.length === 0 ? "Status" : filterStatuses.length === 1 ? `Status · ${filterStatuses[0]}` : `Status · ${filterStatuses.length} selected`}
                          <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                        </div>
                        {openDropdown === "status" && (
                          <>
                            <div onClick={() => setOpenDropdown(null)}
                              style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 100,
                              background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8,
                              padding: "4px 0", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180 }}>
                              {STAGE_FILTER_OPTIONS.map(opt => {
                                const isClear = opt.value === "";
                                const isSelected = isClear ? filterStatuses.length === 0 : filterStatuses.includes(opt.value);
                                return (
                                  <div key={opt.value}
                                    onClick={() => {
                                      if (isClear) { setFilterStatuses([]); setOpenDropdown(null); }
                                      else setFilterStatuses(prev =>
                                        prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                                      );
                                    }}
                                    style={{ padding: "7px 14px", fontSize: 12, cursor: "pointer",
                                      background: isSelected ? pc.color + "12" : "transparent",
                                      color: isSelected ? pc.color : TEXT,
                                      fontWeight: isSelected ? 700 : 400,
                                      display: "flex", alignItems: "center", gap: 8 }}>
                                    {!isClear && (
                                      <span style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                                        border: "1.5px solid " + (isSelected ? pc.color : BORDER),
                                        background: isSelected ? pc.color : "transparent",
                                        display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                        {isSelected && <span style={{ color: "#fff", fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                      </span>
                                    )}
                                    {opt.label}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </th>
                      {/* Approver — collapsible */}
                      <th onClick={() => setShowApprover(v => !v)}
                        style={{ ...hStyle(false), borderRight: "1px solid " + BORDER, cursor: "pointer",
                          userSelect: "none", padding: showApprover ? "9px 12px" : "9px 6px",
                          textAlign: showApprover ? "left" : "center", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {showApprover
                          ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Approver <span style={{ fontSize: 9, opacity: 0.5 }}>◀</span></span>
                          : <span style={{ fontSize: 11, color: TEXT_MUTED }} title="Expand Approver">+</span>}
                      </th>
                      {/* Notes — collapsible */}
                      <th onClick={() => setShowNotes(v => !v)}
                        style={{ ...hStyle(false), borderRight: "none", cursor: "pointer",
                          userSelect: "none", padding: showNotes ? "9px 12px" : "9px 6px",
                          textAlign: showNotes ? "left" : "center", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {showNotes
                          ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Investment Coordinator Notes <span style={{ fontSize: 9, opacity: 0.5 }}>◀</span></span>
                          : <span style={{ fontSize: 11, color: TEXT_MUTED }} title="Expand Investment Coordinator Notes">+</span>}
                      </th>
                    </tr>
                  );
                })()}
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const isEditing  = editingId === inv.id;
                  const isSaving   = savingId === inv.id;
                  const rowBg      = idx % 2 === 0 ? SURFACE : SURFACE_2;
                  const rowBorder  = idx < filtered.length - 1 ? "1px solid " + BORDER : "none";
                  const statusColor = inv.status === "Active"     ? "#10B981"
                    : inv.status === "In Process" ? "#60A5FA"
                    : inv.status === "Closed"     ? "#9CA3AF"
                    : inv.status === "Cancelled"  ? "#F87171"
                    : TEXT_MUTED;
                  const rowPc = inv.portfolio_id && PORT_COLORS[inv.portfolio_id]
                    ? PORT_COLORS[inv.portfolio_id]
                    : pc;
                  const tdBase = {
                    borderRight: "1px solid " + BORDER,
                    borderBottom: rowBorder,
                    verticalAlign: "middle",
                    background: isEditing ? "#F0F7FF" : rowBg,
                  };

                  return (
                    <React.Fragment key={inv.id}>
                      <tr>

                        {/* Investment ID */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                            {inv.investmentUrl
                              ? <a href={inv.investmentUrl} target="_blank" rel="noreferrer"
                                  style={{ color: "#3086AB", textDecoration: "none" }}
                                  onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                                  onMouseOut={e => e.currentTarget.style.textDecoration = "none"}>
                                  {inv.id || "—"}
                                </a>
                              : <span style={{ color: TEXT_SUB }}>{inv.id || "—"}</span>
                            }
                          </span>
                        </td>

                        {/* Initiative */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                            <span style={{ color: TEXT, fontWeight: 500 }}>{inv.initiative || "—"}</span>
                          </div>
                          {inv.type && (
                            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{inv.type}</div>
                          )}
                        </td>

                        {/* Grantee */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>
                            {inv.grantee || "—"}
                          </div>
                        </td>

                        {/* Description */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <div style={{ fontSize: 11, color: TEXT_SUB, lineHeight: 1.5 }}>
                            {inv.description || <span style={{ color: TEXT_MUTED }}>—</span>}
                          </div>
                        </td>

                        {/* Investment Owner */}
                        <td style={{ ...tdBase, padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, color: TEXT, lineHeight: 1.4, display: "block" }}>
                            {inv.owner || <span style={{ color: TEXT_MUTED }}>—</span>}
                          </span>
                          {inv.secondaryOwner && (
                            <span style={{ fontSize: 10, color: TEXT_SUB, lineHeight: 1.4, display: "block" }}>
                              {inv.secondaryOwner}
                            </span>
                          )}
                        </td>

                        {/* BOW */}
                        <td style={{ ...tdBase, padding: "9px 12px" }}>
                          {inv.bowTitles && inv.bowTitles.length > 0
                            ? inv.bowTitles.map((title, i) => {
                                const bowPc = PORT_COLORS[inv.bowPortfolioIds?.[i]] || PORT_COLORS[inv.portfolio_id] || rowPc;
                                return (
                                  <span key={i} style={{ fontSize: 10, fontWeight: 600,
                                    color: bowPc.color, background: bowPc.color + "15",
                                    borderRadius: 4, padding: "2px 6px",
                                    marginBottom: i < inv.bowTitles.length - 1 ? 3 : 0,
                                    wordBreak: "break-word", display: "inline-block" }}>
                                    {title}
                                  </span>
                                );
                              })
                            : <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                          }
                        </td>

                        {/* Co-Funding Teams */}
                        {(() => {
                          const teams = inv.coFundingTeams
                            ? inv.coFundingTeams.split(", ").filter(Boolean)
                            : [];
                          return (
                            <td style={{ ...tdBase, padding: "9px 12px" }}>
                              {teams.length > 0 ? teams.map((t, ti) => {
                                const c = teamColor(t);
                                return (
                                  <span key={ti} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px",
                                    borderRadius: 20, background: c.bg, color: c.color,
                                    wordBreak: "break-word", display: "inline-block",
                                    marginBottom: ti < teams.length - 1 ? 3 : 0 }}>
                                    {t}
                                  </span>
                                );
                              }) : (
                                <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                              )}
                            </td>
                          );
                        })()}

                        {/* Amount */}
                        <td style={{ ...tdBase, padding: "11px 12px", position: "relative" }}
                          onMouseEnter={e => inv.amount && showPayments(inv.id, e.currentTarget.getBoundingClientRect())}
                          onMouseLeave={hidePayments}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT,
                            borderBottom: inv.amount ? "1px dashed " + BORDER : "none", cursor: inv.amount ? "default" : "auto" }}>
                            {inv.amount ? fmtM(toNum(inv.amount)) : "—"}
                          </span>
                        </td>

                        {/* Start Date */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <span style={{ fontSize: 11, color: inv.startDate ? TEXT : TEXT_MUTED }}>
                            {fmtInvDate(inv.startDate)}
                          </span>
                        </td>

                        {/* End Date */}
                        <td style={{ ...tdBase, padding: "11px 12px" }}>
                          <span style={{ fontSize: 11, color: inv.endDate ? TEXT : TEXT_MUTED }}>
                            {fmtInvDate(inv.endDate)}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ ...tdBase, padding: "8px 12px" }}>
                          {inv.status ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: statusColor,
                              background: statusColor + "15", borderRadius: 5,
                              padding: "2px 7px", border: "1px solid " + statusColor + "30",
                              display: "inline-block" }}>
                              {inv.status === "In Process" && inv.stage ? inv.stage : inv.status}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                          )}
                        </td>

                        {/* Approver — collapsible */}
                        <td style={{ ...tdBase, padding: showApprover ? "8px 12px" : 0, overflow: "hidden" }}>
                          {showApprover && inv.status === "In Process" && (
                            <div style={{ position: "relative" }}>
                              <div onClick={() => setOpenDropdown(openDropdown === `appr-${inv.id}` ? null : `appr-${inv.id}`)}
                                style={{ fontSize: 10, cursor: "pointer", userSelect: "none",
                                  display: "flex", alignItems: "center", gap: 3,
                                  color: inv.approver ? TEXT_SUB : TEXT_MUTED }}>
                                <span>👤</span>
                                {inv.approver || "Set approver…"}
                                <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
                              </div>
                              {openDropdown === `appr-${inv.id}` && (
                                <>
                                  <div onClick={() => setOpenDropdown(null)}
                                    style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 200,
                                    background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8,
                                    padding: "4px 0", boxShadow: "0 4px 16px rgba(0,0,0,0.14)", minWidth: 160 }}>
                                    {APPROVERS.map(name => (
                                      <div key={name}
                                        onClick={() => { saveApprover(inv.id, name); setOpenDropdown(null); }}
                                        style={{ padding: "7px 14px", fontSize: 12, cursor: "pointer",
                                          background: inv.approver === name ? pc.color + "12" : "transparent",
                                          color: inv.approver === name ? pc.color : TEXT,
                                          fontWeight: inv.approver === name ? 700 : 400 }}>
                                        {name}
                                      </div>
                                    ))}
                                    {inv.approver && (
                                      <div onClick={() => { saveApprover(inv.id, null); setOpenDropdown(null); }}
                                        style={{ padding: "6px 14px", fontSize: 11, cursor: "pointer",
                                          color: TEXT_MUTED, borderTop: "1px solid " + BORDER }}>
                                        Clear
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Notes — collapsible */}
                        <td style={{ ...tdBase, padding: showNotes ? "8px 12px" : 0, borderRight: "none", overflow: "hidden" }}>
                          {showNotes && (isEditing ? (
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
                                  color: "#fff", whiteSpace: "nowrap", marginTop: 4 }}>
                                Done
                              </button>
                            </>
                          ) : (
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, lineHeight: 1.5,
                                  color: inv.internal_notes ? TEXT : TEXT_MUTED,
                                  fontStyle: inv.internal_notes ? "normal" : "italic" }}>
                                  {inv.internal_notes || "Add note…"}
                                </div>
                              </div>
                              <button onClick={() => setEditingId(inv.id)}
                                style={{ fontSize: 10, cursor: "pointer", flexShrink: 0,
                                  border: "1px solid " + BORDER, borderRadius: 4,
                                  padding: "2px 6px", background: BG, color: TEXT_MUTED }}>
                                ✎
                              </button>
                            </div>
                          ))}
                        </td>
                      </tr>

                      {isEditing && (
                        <tr>
                          <td colSpan={13} style={{ background: "#F0F7FF", borderTop: "1px solid #BFDBFE",
                            padding: "10px 16px", borderBottom: rowBorder }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
                              {[
                                ["Investment Owner", inv.owner],
                                ["Workflow Step",    inv.stage],
                                ["Start Date",       inv.startDate],
                                ["End Date",         inv.endDate],
                                ["Last Edited By",   inv.notesUpdatedBy && inv.internal_notes
                                  ? `${inv.notesUpdatedBy} · ${fmtNoteDate(inv.notesUpdatedAt)}`
                                  : null],
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}
      {/* Payment by year popover */}
      {paymentPopover && (() => {
        const { rows, rect } = paymentPopover;
        const top  = rect.bottom + 6 + window.scrollY;
        const left = rect.left + window.scrollX;
        const fmtExact = (n) => {
          const num = parseFloat(n) || 0;
          const abs = Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          return (num < 0 ? "-$" : "$") + abs;
        };
        const total = rows ? rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) : 0;
        return (
          <div onMouseEnter={() => clearTimeout(popoverTimeout.current)}
            onMouseLeave={hidePayments}
            style={{ position: "absolute", top, left, zIndex: 300,
              background: SURFACE, border: "1px solid " + BORDER, borderRadius: 10,
              boxShadow: "0 6px 24px rgba(10,37,64,0.13)", padding: "12px 16px",
              minWidth: 200, pointerEvents: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
              textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Committed by Year
            </div>
            {rows === null ? (
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>No payment data</div>
            ) : (
              <>
                {rows.map(r => (
                  <div key={r.year} style={{ display: "flex", justifyContent: "space-between",
                    gap: 24, fontSize: 11, padding: "2px 0",
                    borderBottom: "1px solid " + BORDER + "50" }}>
                    <span style={{ color: TEXT_SUB }}>{r.year}</span>
                    <span style={{ fontWeight: 600, color: parseFloat(r.amount) < 0 ? "#F87171" : TEXT }}>
                      {fmtExact(r.amount)}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between",
                  gap: 24, fontSize: 11, fontWeight: 700, paddingTop: 6, color: TEXT }}>
                  <span>Total</span>
                  <span style={{ color: total < 0 ? "#F87171" : TEXT }}>{fmtExact(total)}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── DataModelDiagram (ERD) ────────────────────────────────────────────────────
const DM_BOX_W = 180, DM_BOX_H = 30;
const DM_TABLE_POS = {
  strategy_goals:              {x:20,  y:42},  portfolios:                  {x:20,  y:80},
  portfolio_goal_links:        {x:20,  y:118}, bows:                        {x:20,  y:156},
  portfolio_outcomes:          {x:20,  y:194}, bow_outcomes:                {x:20,  y:232},
  bow_portfolio_outcome_links: {x:20,  y:270},
  bow_indicators:              {x:240, y:42},  bow_indicator_actuals:       {x:240, y:80},
  portfolio_indicators:        {x:240, y:118}, portfolio_indicator_actuals: {x:240, y:156},
  strategy_goal_actuals:       {x:240, y:194},
  execution_targets:           {x:460, y:42},  execution_target_status:     {x:460, y:80},
  bow_ratings:                 {x:460, y:160}, portfolio_outcome_ratings:   {x:460, y:198},
  goal_ratings:                {x:460, y:236},
  assumptions:                 {x:680, y:42},  assumption_confidence:       {x:680, y:80},
  assumption_indicator_links:  {x:680, y:118}, assumption_target_links:     {x:680, y:156},
  assumption_rating_criteria:  {x:680, y:194}, assumption_data_gaps:        {x:680, y:232},
  assumption_reassessment_log: {x:680, y:270}, field_signal_sources:        {x:680, y:308},
  key_decisions:               {x:680, y:378}, decision_assumption_links:   {x:680, y:416},
  invest_investments:          {x:900, y:42},  invest_bow_allocation:       {x:900, y:80},
  invest_bow_details:          {x:900, y:118}, investment_overlays:         {x:900, y:156},
  bow_notes:                   {x:900, y:216}, portfolio_tracking:          {x:900, y:254},
  team_members:                {x:900, y:292}, pending_actuals:             {x:900, y:330},
};
const DM_GROUP_RECTS = [
  {id:"structure",   x:10,  y:4,   w:200, h:308, label:"Strategy Structure"},
  {id:"indicators",  x:230, y:4,   w:200, h:232, label:"Indicators & Actuals"},
  {id:"execution",   x:450, y:4,   w:200, h:116, label:"Execution"},
  {id:"ratings",     x:450, y:130, w:200, h:148, label:"Ratings"},
  {id:"assumptions", x:670, y:4,   w:200, h:346, label:"Assumptions"},
  {id:"decisions",   x:670, y:360, w:200, h:108, label:"Key Decisions"},
  {id:"investments", x:890, y:4,   w:200, h:194, label:"Investments"},
  {id:"tracking",    x:890, y:208, w:200, h:174, label:"Notes & Tracking"},
];
function dmEdgePath(from, to) {
  const fp=DM_TABLE_POS[from], tp=DM_TABLE_POS[to];
  if(!fp||!tp) return null;
  const fmy=fp.y+DM_BOX_H/2, tmy=tp.y+DM_BOX_H/2;
  if(fp.x===tp.x){ const lx=fp.x-18; return `M ${fp.x},${fmy} H ${lx} V ${tmy} H ${tp.x}`; }
  if(fp.x<tp.x){ const fx=fp.x+DM_BOX_W,tx=tp.x,cx=(fx+tx)/2; return `M ${fx},${fmy} C ${cx},${fmy} ${cx},${tmy} ${tx},${tmy}`; }
  const fx=fp.x,tx=tp.x+DM_BOX_W,cx=(fx+tx)/2; return `M ${fx},${fmy} C ${cx},${fmy} ${cx},${tmy} ${tx},${tmy}`;
}

function DataModelDiagram({ onSelectTable }) {
  const [zoom,setZoom] = useState(0.9);
  const [pan,setPan]   = useState({x:20,y:20});
  const [hl,setHl]     = useState(null);
  const [dragging,setDragging] = useState(false);
  const [lastMouse,setLastMouse] = useState(null);

  const DM_EDGES = React.useMemo(()=>Object.entries(DM_TABLES).flatMap(([tName,tDef])=>
    (tDef.refs||[]).filter(ref=>DM_TABLE_POS[tName]&&DM_TABLE_POS[ref]).map(ref=>({from:tName,to:ref}))), []);

  const hlEdgeKeys  = hl ? new Set(DM_EDGES.filter(e=>e.from===hl||e.to===hl).map(e=>e.from+">"+e.to)) : null;
  const hlConnected = hl ? new Set(DM_EDGES.filter(e=>e.from===hl||e.to===hl).flatMap(e=>[e.from,e.to])) : null;

  const onWheel = e => { e.preventDefault(); setZoom(z=>Math.min(2.5,Math.max(0.25,z*(e.deltaY>0?0.9:1.1)))); };
  const onDown  = e => { if(e.button!==0) return; setDragging(true); setLastMouse({x:e.clientX,y:e.clientY}); };
  const onMove  = e => { if(!dragging) return; setPan(p=>({x:p.x+(e.clientX-lastMouse.x),y:p.y+(e.clientY-lastMouse.y)})); setLastMouse({x:e.clientX,y:e.clientY}); };
  const onUp    = () => setDragging(false);

  return (
    <div style={{flex:1,overflow:"hidden",position:"relative",cursor:dragging?"grabbing":"grab",background:"#F1F5F9",userSelect:"none"}}
      onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <div style={{position:"absolute",top:10,right:14,display:"flex",gap:6,zIndex:10,alignItems:"center"}}>
        <button onClick={()=>setZoom(z=>Math.min(2.5,z*1.2))} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:13,cursor:"pointer"}}>+</button>
        <button onClick={()=>setZoom(z=>Math.max(0.25,z*0.8))} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:13,cursor:"pointer"}}>−</button>
        <button onClick={()=>{setZoom(0.9);setPan({x:20,y:20});}} style={{padding:"3px 9px",borderRadius:5,border:"1px solid "+BORDER,background:SURFACE,fontSize:11,cursor:"pointer"}}>Reset</button>
        <span style={{fontSize:11,color:TEXT_MUTED}}>{Math.round(zoom*100)}%</span>
      </div>
      <svg width="100%" height="100%" style={{display:"block"}}>
        <defs>
          <marker id="dm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#94A3B8"/></marker>
          {DM_GROUPS.map(g=><marker key={g.id} id={"dm-arrow-"+g.id} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={g.color}/></marker>)}
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} onClick={()=>setHl(null)}>
          {/* Group backgrounds */}
          {DM_GROUP_RECTS.map(gr=>{ const g=DM_GROUPS.find(x=>x.id===gr.id); return (
            <g key={gr.id}>
              <rect x={gr.x} y={gr.y} width={gr.w} height={gr.h} rx={8} fill={g?.color+"0C"} stroke={g?.color+"55"} strokeWidth={1}/>
              <text x={gr.x+gr.w/2} y={gr.y+14} textAnchor="middle" fontSize={8} fontWeight={700} fill={g?.color} letterSpacing={1}>{gr.label.toUpperCase()}</text>
            </g>
          );})}
          {/* Edges */}
          {DM_EDGES.map((e,i)=>{ const p=dmEdgePath(e.from,e.to); if(!p) return null;
            const key=e.from+">"+e.to, isHl=hlEdgeKeys?hlEdgeKeys.has(key):false, fg=groupOfTable(e.from);
            return <path key={i} d={p} fill="none" stroke={isHl?fg?.color||"#64748B":"#94A3B8"} strokeWidth={isHl?1.8:0.7} opacity={hl&&!isHl?0.12:isHl?1:0.55} markerEnd={isHl?"url(#dm-arrow-"+(fg?.id||"structure")+")":"url(#dm-arrow)"}/>;
          })}
          {/* Table boxes */}
          {Object.entries(DM_TABLE_POS).map(([tName,pos])=>{
            const g=groupOfTable(tName), isSel=hl===tName, isConn=hlConnected?hlConnected.has(tName):false, dimmed=hl&&!isSel&&!isConn;
            return (
              <g key={tName} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();setHl(hl===tName?null:tName);}} onDoubleClick={e=>{e.stopPropagation();onSelectTable&&onSelectTable(tName);}}>
                <rect x={pos.x} y={pos.y} width={DM_BOX_W} height={DM_BOX_H} rx={4}
                  fill={isSel?g?.color||"#888":isConn?g?.color+"22":"#fff"}
                  stroke={isSel||isConn?g?.color||BORDER:"#CBD5E1"} strokeWidth={isSel?2:isConn?1.5:0.75} opacity={dimmed?0.18:1}/>
                <text x={pos.x+8} y={pos.y+DM_BOX_H/2} fontSize={10} fontFamily="monospace" dominantBaseline="middle"
                  fill={isSel?"#fff":g?.color||TEXT} fontWeight={isSel||isConn?700:400} opacity={dimmed?0.25:1}>{tName}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",fontSize:11,color:TEXT_MUTED,background:SURFACE+"EE",padding:"4px 14px",borderRadius:12,border:"1px solid "+BORDER,pointerEvents:"none",whiteSpace:"nowrap"}}>
        Click to highlight · Double-click to browse · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}

// ── DataModelExplorer ─────────────────────────────────────────────────────────
const DM_GROUPS = [
  {id:"structure",   label:"Strategy Structure",        color:"#2563EB", tables:["strategy_goals","portfolios","portfolio_goal_links","bows","portfolio_outcomes","bow_outcomes","bow_portfolio_outcome_links"]},
  {id:"indicators",  label:"Indicators & Actuals",      color:"#059669", tables:["bow_indicators","bow_indicator_actuals","portfolio_indicators","portfolio_indicator_actuals","strategy_goal_actuals"]},
  {id:"execution",   label:"Execution",                 color:"#D97706", tables:["execution_targets","execution_target_status"]},
  {id:"ratings",     label:"Ratings",                   color:"#7C3AED", tables:["bow_ratings","portfolio_outcome_ratings","goal_ratings"]},
  {id:"assumptions", label:"Assumptions",               color:"#DB2777", tables:["assumptions","assumption_confidence","assumption_indicator_links","assumption_target_links","assumption_rating_criteria","assumption_data_gaps","assumption_reassessment_log","field_signal_sources"]},
  {id:"decisions",   label:"Key Decisions",             color:"#0891B2", tables:["key_decisions","decision_assumption_links"]},
  {id:"investments", label:"Investments (INVEST/EDP)",  color:"#64748B", tables:["invest_investments","invest_bow_allocation","invest_bow_details","investment_overlays"]},
  {id:"tracking",    label:"Notes & Tracking",          color:"#92400E", tables:["bow_notes","portfolio_tracking","team_members","pending_actuals"]},
];
const DM_TABLES = {
  strategy_goals:{cols:[{n:"goal_id",t:"string",pk:true},{n:"metric",t:"string"},{n:"unit",t:"string"},{n:"goal_2030",t:"float"},{n:"current_2026",t:"float"},{n:"sort_order",t:"int"}],refs:[]},
  portfolios:{cols:[{n:"portfolio_id",t:"string",pk:true},{n:"title",t:"string"},{n:"sort_order",t:"int"}],refs:[]},
  portfolio_goal_links:{cols:[{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"goal_id",t:"string",fk:"strategy_goals"}],refs:["portfolios","strategy_goals"]},
  bows:{cols:[{n:"bow_id",t:"string",pk:true},{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"title",t:"string"},{n:"description",t:"string"},{n:"invest_bow_id",t:"string",note:"INVEST BoW_ID e.g. B06039"},{n:"sort_order",t:"int"}],refs:["portfolios"]},
  portfolio_outcomes:{cols:[{n:"outcome_id",t:"string",pk:true},{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"short_title",t:"string"},{n:"activity",t:"string"},{n:"outcome",t:"string"},{n:"sort_order",t:"int"}],refs:["portfolios"]},
  bow_outcomes:{cols:[{n:"outcome_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"title",t:"string"},{n:"description",t:"string"},{n:"sort_order",t:"int"}],refs:["bows"]},
  bow_portfolio_outcome_links:{cols:[{n:"bow_outcome_id",t:"string",fk:"bow_outcomes"},{n:"portfolio_outcome_id",t:"string",fk:"portfolio_outcomes"},{n:"contribution_type",t:"string",note:"direct | indirect"},{n:"sort_order",t:"int"}],refs:["bow_outcomes","portfolio_outcomes"]},
  bow_indicators:{cols:[{n:"indicator_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"outcome_id",t:"string",fk:"bow_outcomes"},{n:"text",t:"string"},{n:"data_source",t:"string"},{n:"baseline",t:"float"},{n:"target_2026",t:"float"},{n:"target_2027",t:"float"},{n:"target_2028",t:"float"},{n:"target_2029",t:"float"},{n:"target_2030",t:"float"},{n:"collection_frequency",t:"string",note:"annual | quarterly | bimonthly | monthly"},{n:"is_active",t:"boolean",note:"default true"}],refs:["bows","bow_outcomes"]},
  bow_indicator_actuals:{cols:[{n:"actual_id",t:"string",pk:true},{n:"indicator_id",t:"string",fk:"bow_indicators"},{n:"bow_id",t:"string",fk:"bows"},{n:"outcome_id",t:"string",fk:"bow_outcomes"},{n:"year",t:"int"},{n:"period",t:"string",note:"Q1–Q4 | M01–M12 — null for annual"},{n:"actual_value",t:"float"},{n:"reading_date",t:"date"},{n:"source_notes",t:"string"},{n:"loaded_by",t:"string"},{n:"loaded_at",t:"timestamp"}],refs:["bow_indicators","bows","bow_outcomes"]},
  portfolio_indicators:{cols:[{n:"indicator_id",t:"string",pk:true},{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"outcome_id",t:"string",fk:"portfolio_outcomes"},{n:"text",t:"string"},{n:"data_source",t:"string"},{n:"baseline",t:"float"},{n:"target_2026",t:"float"},{n:"target_2027",t:"float"},{n:"target_2028",t:"float"},{n:"target_2029",t:"float"},{n:"target_2030",t:"float"}],refs:["portfolios","portfolio_outcomes"]},
  portfolio_indicator_actuals:{cols:[{n:"actual_id",t:"string",pk:true},{n:"indicator_id",t:"string",fk:"portfolio_indicators"},{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"outcome_id",t:"string",fk:"portfolio_outcomes"},{n:"year",t:"int"},{n:"period",t:"string",note:"Q1–Q4 | M01–M12 — null for annual"},{n:"actual_value",t:"float"},{n:"reading_date",t:"date"},{n:"source_notes",t:"string"},{n:"loaded_by",t:"string"},{n:"loaded_at",t:"timestamp"}],refs:["portfolio_indicators","portfolios","portfolio_outcomes"]},
  strategy_goal_actuals:{cols:[{n:"actual_id",t:"string",pk:true},{n:"goal_id",t:"string",fk:"strategy_goals"},{n:"year",t:"int"},{n:"actual_value",t:"float"},{n:"reading_date",t:"date"},{n:"source_notes",t:"string"},{n:"loaded_by",t:"string"},{n:"loaded_at",t:"timestamp"}],refs:["strategy_goals"]},
  execution_targets:{cols:[{n:"target_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"outcome_id",t:"string",fk:"bow_outcomes"},{n:"year",t:"int"},{n:"text",t:"string"},{n:"sort_order",t:"int"},{n:"is_active",t:"boolean",note:"default true"}],refs:["bows","bow_outcomes"]},
  execution_target_status:{cols:[{n:"target_id",t:"string",fk:"execution_targets"},{n:"year",t:"int"},{n:"completion",t:"string",note:"Complete | On track | At risk | Not started"},{n:"notes",t:"string"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["execution_targets"]},
  bow_ratings:{cols:[{n:"rating_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"year",t:"int"},{n:"impact_rating",t:"string"},{n:"impact_rationale",t:"string"},{n:"impact_override",t:"boolean"},{n:"impact_override_reasoning",t:"string"},{n:"execution_rating",t:"string"},{n:"execution_rationale",t:"string"},{n:"execution_override",t:"boolean"},{n:"execution_override_reasoning",t:"string"},{n:"assessed_by",t:"string"},{n:"assessed_at",t:"timestamp"}],refs:["bows"]},
  portfolio_outcome_ratings:{cols:[{n:"rating_id",t:"string",pk:true},{n:"outcome_id",t:"string",fk:"portfolio_outcomes"},{n:"year",t:"int"},{n:"rating",t:"string"},{n:"rationale",t:"string"},{n:"assessed_by",t:"string"},{n:"assessed_at",t:"timestamp"}],refs:["portfolio_outcomes"]},
  goal_ratings:{cols:[{n:"rating_id",t:"string",pk:true},{n:"goal_id",t:"string",fk:"strategy_goals"},{n:"year",t:"int"},{n:"rating",t:"string"},{n:"rationale",t:"string"},{n:"assessed_by",t:"string"},{n:"assessed_at",t:"timestamp"}],refs:["strategy_goals"]},
  assumptions:{cols:[{n:"assumption_id",t:"string",pk:true},{n:"assumption_type",t:"string",note:"field | impact"},{n:"portfolio_outcome_id",t:"string",fk:"portfolio_outcomes"},{n:"bow_id",t:"string",fk:"bows",note:"nullable — BOW-scoped"},{n:"assumption_claim",t:"string",note:"if/then causal statement"},{n:"decision_gate",t:"string"},{n:"high_threshold",t:"string"},{n:"medium_threshold",t:"string"},{n:"low_threshold",t:"string"},{n:"signal_weights",t:"string",note:"JSON"},{n:"data_source_notes",t:"string"},{n:"is_active",t:"boolean",note:"default true"},{n:"version",t:"int",note:"default 1"},{n:"effective_from",t:"date"},{n:"created_by",t:"string"},{n:"created_at",t:"timestamp"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["portfolio_outcomes","bows"]},
  assumption_confidence:{cols:[{n:"confidence_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"confidence",t:"string",note:"High | Medium | Low | Untested | Data gap"},{n:"rationale",t:"string"},{n:"data_considered",t:"string"},{n:"human_override",t:"boolean"},{n:"override_reasoning",t:"string"},{n:"rating_source",t:"string",note:"tyton_baseline | ai_generated | human_override"},{n:"evidence_snapshot",t:"string",note:"JSON"},{n:"assessed_by",t:"string"},{n:"assessed_at",t:"timestamp"}],refs:["assumptions"]},
  assumption_indicator_links:{cols:[{n:"link_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"indicator_id",t:"string",note:"logical FK — bow_indicators or portfolio_indicators"},{n:"indicator_level",t:"string",note:"bow | portfolio"},{n:"signal_role",t:"string",note:"primary | secondary"},{n:"sort_order",t:"int"}],refs:["assumptions"]},
  assumption_target_links:{cols:[{n:"link_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"target_id",t:"string",fk:"execution_targets"},{n:"signal_role",t:"string",note:"primary | secondary"},{n:"sort_order",t:"int"}],refs:["assumptions","execution_targets"]},
  assumption_rating_criteria:{cols:[{n:"criteria_id",t:"string",pk:true},{n:"assumption_type",t:"string",note:"field | impact"},{n:"bow_id",t:"string",fk:"bows",note:"nullable — BOW-level"},{n:"portfolio_id",t:"string",fk:"portfolios",note:"nullable — portfolio-level"},{n:"high_threshold",t:"string"},{n:"medium_threshold",t:"string"},{n:"low_threshold",t:"string"},{n:"data_gap_trigger",t:"string"},{n:"signal_weights",t:"string",note:"JSON"},{n:"version",t:"int",note:"default 1"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["bows","portfolios"]},
  assumption_data_gaps:{cols:[{n:"gap_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"gap_description",t:"string"},{n:"priority",t:"string",note:"H | M | L"},{n:"proposed_owner",t:"string"},{n:"target_date",t:"date"},{n:"status",t:"string",note:"open | in_progress | closed"},{n:"created_at",t:"timestamp"},{n:"created_by",t:"string"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["assumptions"]},
  assumption_reassessment_log:{cols:[{n:"log_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"trigger_type",t:"string",note:"new_actual | new_target_status | scheduled | manual"},{n:"trigger_entity_type",t:"string",note:"bow_indicator | execution_target | field_signal"},{n:"trigger_entity_id",t:"string"},{n:"prior_confidence",t:"string"},{n:"new_confidence",t:"string"},{n:"triggered_at",t:"timestamp"},{n:"triggered_by",t:"string"}],refs:["assumptions"]},
  field_signal_sources:{cols:[{n:"source_id",t:"string",pk:true},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"source_type",t:"string",note:"market_intelligence | field_note | external_scan | hub_tool"},{n:"source_name",t:"string"},{n:"source_description",t:"string"},{n:"is_active",t:"boolean",note:"default true"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["assumptions"]},
  key_decisions:{cols:[{n:"decision_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"portfolio_id",t:"string",fk:"portfolios",note:"nullable — portfolio-level"},{n:"goal_id",t:"string",fk:"strategy_goals",note:"nullable — strategy-level"},{n:"level",t:"string",note:"strategy | portfolio | bow"},{n:"question",t:"string"},{n:"decision_text",t:"string"},{n:"timing",t:"string"},{n:"signals",t:"string"},{n:"decision_priority",t:"string",note:"H | M | L"},{n:"decision_maker",t:"string"},{n:"resolution_type",t:"string",note:"invest | scale | adapt | stop"},{n:"decision_rationale",t:"string"},{n:"recorded_outcome",t:"string"},{n:"status",t:"string"},{n:"is_active",t:"boolean",note:"default true"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["bows","portfolios","strategy_goals"]},
  decision_assumption_links:{cols:[{n:"link_id",t:"string",pk:true},{n:"decision_id",t:"string",fk:"key_decisions"},{n:"assumption_id",t:"string",fk:"assumptions"},{n:"signal_role",t:"string",note:"primary | secondary"},{n:"trigger_threshold",t:"string",note:"confidence level that auto-flags"},{n:"rationale",t:"string"}],refs:["key_decisions","assumptions"]},
  invest_investments:{cols:[{n:"Investment_ID",t:"string",pk:true},{n:"Investment_Name",t:"string"},{n:"Investment_Owner",t:"string"},{n:"Grant_Description",t:"string"},{n:"Amount",t:"float"},{n:"Status",t:"string"},{n:"Stage",t:"string"},{n:"Investment_Payment_Year",t:"int"},{n:"Investment_Payment_Status",t:"string"}],refs:[]},
  invest_bow_allocation:{cols:[{n:"Investment_ID",t:"string",fk:"invest_investments"},{n:"BoW_ID",t:"string"},{n:"Investment_Payment_Allocation_Amount",t:"float"},{n:"Investment_Payment_Allocation_Type",t:"string"},{n:"Investment_Payment_Status",t:"string"},{n:"Investment_Payment_Year",t:"int"},{n:"Investment_Payment_Date",t:"date"}],refs:["invest_investments"]},
  invest_bow_details:{cols:[{n:"BoW_ID",t:"string",pk:true},{n:"Impact_Performance_Rating",t:"string"},{n:"Impact_Performance_Rating_Rationale",t:"string"},{n:"Execution_Performance_Rating",t:"string"},{n:"Execution_Performance_Rating_Rationale",t:"string"}],refs:[]},
  investment_overlays:{cols:[{n:"overlay_id",t:"string",pk:true},{n:"investment_id",t:"string",fk:"invest_investments"},{n:"internal_notes",t:"string"},{n:"approver",t:"string"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["invest_investments"]},
  bow_notes:{cols:[{n:"note_id",t:"string",pk:true},{n:"bow_id",t:"string",fk:"bows"},{n:"outcome_id",t:"string",fk:"bow_outcomes"},{n:"year",t:"int"},{n:"note_text",t:"string"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["bows","bow_outcomes"]},
  portfolio_tracking:{cols:[{n:"tracking_id",t:"string",pk:true},{n:"portfolio_id",t:"string",fk:"portfolios"},{n:"year",t:"int"},{n:"notes",t:"string"},{n:"budget_annotation",t:"string"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["portfolios"]},
  team_members:{cols:[{n:"member_id",t:"string",pk:true},{n:"email",t:"string",note:"Databricks login — join key for token lookup"},{n:"display_name",t:"string"},{n:"permission_level",t:"string",note:"MLE | Leadership | Team"},{n:"portfolio_id",t:"string",fk:"portfolios",note:"nullable — primary portfolio"},{n:"is_active",t:"boolean",note:"default true"},{n:"last_updated",t:"timestamp"},{n:"updated_by",t:"string"}],refs:["portfolios"]},
  pending_actuals:{cols:[{n:"pending_id",t:"string",pk:true},{n:"indicator_id",t:"string",note:"logical FK — bow_indicators or portfolio_indicators"},{n:"level",t:"string",note:"bow | portfolio | goal"},{n:"entity_id",t:"string"},{n:"year",t:"int"},{n:"period",t:"string",note:"Q1–Q4 | M01–M12 — null for annual"},{n:"submitted_value",t:"float"},{n:"reading_date",t:"date"},{n:"source_notes",t:"string"},{n:"submitted_by",t:"string"},{n:"submitted_permission",t:"string",note:"MLE | Leadership | Team"},{n:"submitted_at",t:"timestamp"},{n:"status",t:"string",note:"pending | approved | rejected"},{n:"reviewed_value",t:"float"},{n:"reviewed_by",t:"string"},{n:"reviewer_notes",t:"string"},{n:"reviewed_at",t:"timestamp"},{n:"notes",t:"string"}],refs:[]},
};
// pre-compute reverse refs (which tables reference each table)
const DM_REFERENCED_BY = {};
Object.keys(DM_TABLES).forEach(tName => {
  (DM_TABLES[tName].refs||[]).forEach(ref => {
    if (!DM_REFERENCED_BY[ref]) DM_REFERENCED_BY[ref] = [];
    if (!DM_REFERENCED_BY[ref].includes(tName)) DM_REFERENCED_BY[ref].push(tName);
  });
});
function groupOfTable(tName) { return DM_GROUPS.find(g => g.tables.includes(tName)); }

function DataModelExplorer() {
  const [dmView, setDmView]       = useState("diagram"); // "browse" | "diagram"
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState("");
  const [expandedGroups, setExpandedGroups] = useState(()=>Object.fromEntries(DM_GROUPS.map(g=>[g.id,false])));

  const q = search.trim().toLowerCase();
  const matchesSearch = tName => !q || tName.toLowerCase().includes(q) ||
    (DM_TABLES[tName]?.cols||[]).some(c => c.n.toLowerCase().includes(q));

  const tbl        = selected ? DM_TABLES[selected] : null;
  const tblGroup   = selected ? groupOfTable(selected) : null;
  const referencedBy = selected ? (DM_REFERENCED_BY[selected]||[]) : [];
  const TYPE_COLOR = {string:"#0891B2", float:"#059669", int:"#7C3AED", boolean:"#D97706", date:"#DB2777", timestamp:"#64748B"};

  const jumpTo = tName => { setSelected(tName); setDmView("browse"); const g=groupOfTable(tName); if(g) setExpandedGroups(prev=>({...prev,[g.id]:true})); };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {/* View toggle */}
      <div style={{display:"flex",gap:6,padding:"10px 16px",borderBottom:"1px solid "+BORDER,background:SURFACE,flexShrink:0,alignItems:"center"}}>
        <button onClick={()=>setDmView("browse")} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(dmView==="browse"?ACCENT:BORDER),background:dmView==="browse"?ACCENT+"12":"none",color:dmView==="browse"?ACCENT:TEXT_MUTED,fontSize:12,fontWeight:dmView==="browse"?600:400,cursor:"pointer"}}>Browse</button>
        <button onClick={()=>setDmView("diagram")} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+(dmView==="diagram"?ACCENT:BORDER),background:dmView==="diagram"?ACCENT+"12":"none",color:dmView==="diagram"?ACCENT:TEXT_MUTED,fontSize:12,fontWeight:dmView==="diagram"?600:400,cursor:"pointer"}}>Diagram</button>
      </div>

      {dmView==="diagram" ? (
        <DataModelDiagram onSelectTable={jumpTo}/>
      ) : (
        <div style={{display:"flex",flex:1,minHeight:0}}>
          {/* Left panel */}
          <div style={{width:240,flexShrink:0,borderRight:"1px solid "+BORDER,overflowY:"auto",background:SURFACE,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 12px 10px",borderBottom:"1px solid "+BORDER,flexShrink:0}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tables or columns…"
                style={{width:"100%",boxSizing:"border-box",padding:"6px 10px",borderRadius:6,border:"1px solid "+BORDER,fontSize:12,color:TEXT,background:BG,outline:"none"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
              {DM_GROUPS.map(g => {
                const visibleTables = g.tables.filter(matchesSearch);
                if (q && visibleTables.length===0) return null;
                const open = expandedGroups[g.id];
                return (
                  <div key={g.id}>
                    <button onClick={()=>setExpandedGroups(prev=>({...prev,[g.id]:!prev[g.id]}))}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 12px",border:"none",background:"none",cursor:"pointer",textAlign:"left"}}>
                      <span style={{fontSize:9,color:g.color,fontWeight:700,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform .15s",display:"inline-block"}}>▶</span>
                      <span style={{fontSize:10,fontWeight:700,color:g.color,textTransform:"uppercase",letterSpacing:1.2,flex:1}}>{g.label}</span>
                      <span style={{fontSize:10,color:TEXT_MUTED}}>{g.tables.length}</span>
                    </button>
                    {open && visibleTables.map(tName => (
                      <button key={tName} onClick={()=>setSelected(tName)}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 12px 5px 26px",border:"none",cursor:"pointer",textAlign:"left",
                          background:selected===tName?g.color+"18":"transparent",
                          borderLeft:selected===tName?"3px solid "+g.color:"3px solid transparent",
                          transition:"background .1s"}}>
                        <span style={{fontSize:13,color:selected===tName?g.color:TEXT,fontWeight:selected===tName?600:400,fontFamily:"monospace"}}>{tName}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div style={{flex:1,overflowY:"auto",padding:"28px 36px"}}>
            {!selected ? (
              <div>
                <div style={{fontSize:22,fontWeight:800,color:TEXT,marginBottom:6}}>Data Model</div>
                <div style={{fontSize:14,color:TEXT_SUB,marginBottom:28,lineHeight:1.7}}>
                  {Object.keys(DM_TABLES).length} tables across {DM_GROUPS.length} domain groups · <span style={{fontFamily:"monospace",fontSize:12}}>usp_data.usp_strategy</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                  {DM_GROUPS.map(g=>(
                    <div key={g.id} style={{flex:"1 1 260px",minWidth:220,border:"1px solid "+BORDER,borderLeft:"4px solid "+g.color,borderRadius:10,padding:"16px 18px",background:SURFACE,cursor:"pointer"}}
                      onClick={()=>{ setSelected(g.tables[0]); setExpandedGroups(prev=>({...prev,[g.id]:true})); }}>
                      <div style={{fontSize:11,fontWeight:700,color:g.color,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>{g.label}</div>
                      <div style={{fontSize:13,color:TEXT_SUB,lineHeight:1.7}}>
                        {g.tables.map((t,i)=><span key={t} style={{fontFamily:"monospace",fontSize:11}}>{t}{i<g.tables.length-1?", ":""}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <span style={{fontSize:10,fontWeight:700,color:tblGroup?.color,textTransform:"uppercase",letterSpacing:1.2,background:tblGroup?.color+"18",padding:"3px 8px",borderRadius:4}}>{tblGroup?.label}</span>
                </div>
                <div style={{fontSize:22,fontWeight:800,color:TEXT,fontFamily:"monospace",marginBottom:4}}>{selected}</div>
                <div style={{fontSize:12,color:TEXT_MUTED,fontFamily:"monospace",marginBottom:24}}>usp_data.usp_strategy.{selected} · {tbl.cols.length} columns</div>

                {/* Columns table */}
                <div style={{border:"1px solid "+BORDER,borderRadius:10,overflow:"hidden",marginBottom:24}}>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 3fr",background:BG,borderBottom:"1px solid "+BORDER,padding:"8px 14px"}}>
                    <span style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Column</span>
                    <span style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Type</span>
                    <span style={{fontSize:10,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1}}>Notes</span>
                  </div>
                  {tbl.cols.map((c,i)=>{
                    const isHL = q && c.n.toLowerCase().includes(q);
                    return (
                      <div key={c.n} style={{display:"grid",gridTemplateColumns:"2fr 1fr 3fr",padding:"9px 14px",borderBottom:i<tbl.cols.length-1?"1px solid "+BORDER:"none",background:isHL?"#FFFBEB":i%2===0?SURFACE:BG+"88",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {c.pk&&<span style={{fontSize:9,fontWeight:700,color:"#D97706",background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:3,padding:"1px 4px"}}>PK</span>}
                          {c.fk&&<span style={{fontSize:9,fontWeight:700,color:"#2563EB",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:3,padding:"1px 4px",cursor:"pointer"}} onClick={()=>setSelected(c.fk)} title={"→ "+c.fk}>FK</span>}
                          <span style={{fontSize:13,fontFamily:"monospace",color:TEXT,fontWeight:c.pk?700:400}}>{c.n}</span>
                        </div>
                        <span style={{fontSize:12,fontFamily:"monospace",color:TYPE_COLOR[c.t]||TEXT_SUB,fontWeight:500}}>{c.t}</span>
                        <span style={{fontSize:12,color:TEXT_MUTED,lineHeight:1.5}}>
                          {c.fk&&<span style={{cursor:"pointer",color:"#2563EB",textDecoration:"underline",marginRight:4}} onClick={()=>setSelected(c.fk)}>→ {c.fk}</span>}
                          {c.note||c.default&&("default: "+c.default)||""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Outgoing references */}
                {tbl.refs.length>0&&(
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>References → ({tbl.refs.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {tbl.refs.map(r=>{const rg=groupOfTable(r);return(
                        <button key={r} onClick={()=>setSelected(r)}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid "+(rg?.color||BORDER)+"44",background:(rg?.color||BORDER)+"0D",cursor:"pointer",fontSize:12,fontFamily:"monospace",color:rg?.color||TEXT_SUB,fontWeight:500}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:rg?.color||TEXT_MUTED,display:"inline-block",flexShrink:0}}/>
                          {r}
                        </button>
                      );})}
                    </div>
                  </div>
                )}

                {/* Referenced by */}
                {referencedBy.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Referenced by ← ({referencedBy.length})</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {referencedBy.map(r=>{const rg=groupOfTable(r);return(
                        <button key={r} onClick={()=>setSelected(r)}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid "+(rg?.color||BORDER)+"44",background:(rg?.color||BORDER)+"0D",cursor:"pointer",fontSize:12,fontFamily:"monospace",color:rg?.color||TEXT_SUB,fontWeight:500}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:rg?.color||TEXT_MUTED,display:"inline-block",flexShrink:0}}/>
                          {r}
                        </button>
                      );})}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BudgetForecastsView ────────────────────────────────────────────────────────
function BudgetForecastsView() {
  const [year, setYear]                         = useState(2026);
  const [level, setLevel]                       = useState("bow");
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [rows, setRows]                         = useState([]);
  const [snapshots, setSnapshots]               = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [snapshotRows, setSnapshotRows]         = useState(null);
  const [currentUser, setCurrentUser]           = useState(null);
  const [showCommittedDetail, setShowCommittedDetail] = useState(false);
  const [showPotentialDetail, setShowPotentialDetail] = useState(false);
  const [expandedBows, setExpandedBows]         = useState({});
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotLabel, setSnapshotLabel]       = useState("");
  const [takingSnapshot, setTakingSnapshot]     = useState(false);
  const [snapshotError, setSnapshotError]       = useState(null);
  const [viewMode, setViewMode]                 = useState("table");
  const [multiYearData, setMultiYearData]       = useState({});
  const [selectedBar, setSelectedBar]           = useState(null);

  useEffect(() => {
    apiFetch("/api/me").then(u => { if (u) setCurrentUser(u); }).catch(()=>{});
    apiFetch("/api/budget-forecasts/snapshots").then(d => setSnapshots(d||[])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (selectedSnapshotId || year === "all") return;
    let cancelled = false;
    setLoading(true); setError(null);
    apiFetch(`/api/budget-forecasts/summary?year=${year}`)
      .then(d => { if (!cancelled) { setRows(d||[]); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Could not load budget forecast data."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [year, selectedSnapshotId]);

  useEffect(() => {
    if (year !== "all") return;
    let cancelled = false;
    setLoading(true); setError(null);
    apiFetch("/api/budget-forecasts/multi-year")
      .then(d => { if (!cancelled) { setMultiYearData(d||{}); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Could not load multi-year data."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [year]);

  useEffect(() => {
    if (!selectedSnapshotId) { setSnapshotRows(null); return; }
    setLoading(true);
    apiFetch(`/api/budget-forecasts/snapshots/${selectedSnapshotId}`)
      .then(d => { setSnapshotRows(d?.snapshot_data||[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedSnapshotId]);

  const displayRows = selectedSnapshotId ? (snapshotRows||[]) : rows;
  const canSnapshot = ["Leadership","MLE"].includes(currentUser?.permission_level);
  const selectedSnapshot = snapshots.find(s => s.snapshot_id === selectedSnapshotId);

  const fmtM = n => {
    if (n === null || n === undefined) return "—";
    const v = parseFloat(n);
    if (isNaN(v)) return "—";
    if (v === 0) return "0.0";
    return (v/1_000_000).toFixed(1);
  };

  const pctOfBudget = (n, budget) => {
    if (!budget || !n) return "—";
    return Math.round((n/budget)*100) + "%";
  };

  const AGG_KEYS = ["budget_allocation","committed_total","committed_paid","committed_unpaid",
    "committed_grants","committed_contracts","potential_total","potential_grants",
    "potential_contracts","pipeline_total","headroom"];

  const portfolioAgg = React.useMemo(() => {
    const map = {};
    displayRows.forEach(r => {
      const pid = r.portfolio_id;
      if (!map[pid]) map[pid] = {
        portfolio_id:pid, portfolio_title:r.portfolio_title, portfolio_sort:r.portfolio_sort, bows:[],
        ...Object.fromEntries(AGG_KEYS.map(k=>[k,0])),
      };
      map[pid].bows.push(r);
      AGG_KEYS.forEach(k => { map[pid][k] += r[k]||0; });
    });
    return Object.values(map).sort((a,b)=>a.portfolio_sort-b.portfolio_sort);
  }, [displayRows]);

  const strategyTotal = React.useMemo(() =>
    portfolioAgg.reduce((acc,p) => {
      AGG_KEYS.forEach(k => { acc[k] += p[k]; });
      return acc;
    }, Object.fromEntries(AGG_KEYS.map(k=>[k,0]))),
  [portfolioAgg]);

  // Multi-year: flatten all years into per-BOW rows with per-year sub-objects
  const multiYearRows = React.useMemo(() => {
    if (year !== "all") return [];
    const bowMap = {};
    BUDGET_YEARS.forEach(y => {
      (multiYearData[String(y)] || []).forEach(r => {
        if (!bowMap[r.bow_id]) bowMap[r.bow_id] = {
          bow_id: r.bow_id, bow_title: r.bow_title,
          portfolio_id: r.portfolio_id, portfolio_title: r.portfolio_title,
          portfolio_sort: r.portfolio_sort, bow_sort: r.bow_sort, years: {},
        };
        bowMap[r.bow_id].years[y] = r;
      });
    });
    return Object.values(bowMap).sort((a,b) => a.portfolio_sort-b.portfolio_sort || a.bow_sort-b.bow_sort);
  }, [year, multiYearData]);

  const multiYearPortfolios = React.useMemo(() => {
    if (year !== "all") return [];
    const map = {};
    multiYearRows.forEach(r => {
      const pid = r.portfolio_id;
      if (!map[pid]) map[pid] = {
        portfolio_id: pid, portfolio_title: r.portfolio_title,
        portfolio_sort: r.portfolio_sort, bows: [], years: {},
      };
      map[pid].bows.push(r);
      BUDGET_YEARS.forEach(y => {
        if (!map[pid].years[y]) map[pid].years[y] = {
          budget_allocation:0, committed_total:0, potential_total:0, pipeline_total:0, headroom:0,
        };
        const yr = r.years[y] || {};
        map[pid].years[y].budget_allocation += yr.budget_allocation || 0;
        map[pid].years[y].committed_total   += yr.committed_total   || 0;
        map[pid].years[y].potential_total   += yr.potential_total   || 0;
        map[pid].years[y].pipeline_total    += yr.pipeline_total    || 0;
        map[pid].years[y].headroom          += yr.headroom          || 0;
      });
    });
    return Object.values(map).sort((a,b) => a.portfolio_sort-b.portfolio_sort);
  }, [multiYearRows]);

  // Chart data — one entry per portfolio or BOW depending on level
  const chartData = React.useMemo(() => {
    const src = level === "bow"
      ? displayRows.slice().sort((a,b) => a.portfolio_sort - b.portfolio_sort || a.bow_sort - b.bow_sort)
      : level === "strategy"
      ? [{ ...strategyTotal, name: "USP Data Total" }]
      : portfolioAgg;
    return src.map(r => {
      const committed_paid    = +((r.committed_paid    ||0)/1e6).toFixed(2);
      const committed_unpaid  = +((r.committed_unpaid  ||0)/1e6).toFixed(2);
      const potential         = +((r.potential_total   ||0)/1e6).toFixed(2);
      const rawHeadroom       = (r.headroom||0)/1e6;
      const headroom          = +(Math.max(0, rawHeadroom)).toFixed(2);
      const over_budget       = +(Math.max(0, -rawHeadroom)).toFixed(2);
      return {
        name:              r.name || (level === "bow" ? r.bow_title : r.portfolio_title),
        portfolio:         r.portfolio_title || "",
        committed_paid,
        committed_unpaid,
        potential,
        headroom,
        over_budget,
        budget_allocation: +((r.budget_allocation||0)/1e6).toFixed(2),
        pipeline_total:    +((r.pipeline_total   ||0)/1e6).toFixed(2),
        committed_grants:  +((r.committed_grants ||0)/1e6).toFixed(2),
        committed_contracts: +((r.committed_contracts||0)/1e6).toFixed(2),
        potential_grants:  +((r.potential_grants ||0)/1e6).toFixed(2),
        potential_contracts: +((r.potential_contracts||0)/1e6).toFixed(2),
      };
    });
  }, [level, displayRows, portfolioAgg]);

  const BudgetTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload || {};
    const hColor = d.over_budget > 0 ? "#DC2626" : "#059669";
    return (
      <div style={{background:SURFACE,border:"1px solid "+BORDER,borderRadius:8,padding:"12px 16px",fontSize:12,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",minWidth:200}}>
        <div style={{fontWeight:700,color:TEXT,marginBottom:8,fontSize:13}}>{label}</div>
        {level==="bow" && <div style={{color:TEXT_MUTED,marginBottom:6,fontSize:11}}>{d.portfolio}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:TEXT_SUB}}>Budget Allocation</span>
            <span style={{fontWeight:600}}>${d.budget_allocation}M</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:"#3086AB"}}>Committed – Paid</span>
            <span>${d.committed_paid}M</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:"#A8D0E6"}}>Committed – Unpaid</span>
            <span>${d.committed_unpaid}M</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:"#4EAB9A"}}>Potential</span>
            <span>${d.potential}M</span>
          </div>
          <div style={{borderTop:"1px solid "+BORDER,marginTop:4,paddingTop:4,display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:TEXT_SUB}}>Pipeline Total</span>
            <span style={{fontWeight:600}}>${d.pipeline_total}M</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:24}}>
            <span style={{color:hColor,fontWeight:600}}>Headroom</span>
            <span style={{color:hColor,fontWeight:600}}>{d.over_budget>0 ? "-" : ""}${(d.over_budget||d.headroom).toFixed(2)}M</span>
          </div>
        </div>
      </div>
    );
  };

  const takeSnapshot = async () => {
    if (!snapshotLabel.trim()) return;
    setTakingSnapshot(true); setSnapshotError(null);
    try {
      await apiFetch("/api/budget-forecasts/snapshots", {
        method:"POST",
        body: JSON.stringify({ label: snapshotLabel.trim(), fiscal_year: year }),
      });
      const updated = await apiFetch("/api/budget-forecasts/snapshots");
      setSnapshots(updated||[]); setShowSnapshotModal(false); setSnapshotLabel("");
    } catch { setSnapshotError("Failed to save snapshot."); }
    finally { setTakingSnapshot(false); }
  };

  const headroomStyle = n => {
    const v = parseFloat(n);
    if (isNaN(v) || v === 0) return {};
    if (v < 0) return {color:"#DC2626", fontWeight:600};
    if (v < 1_000_000) return {color:"#D97706"};
    return {color:"#059669"};
  };

  const th = (align="right", extra={}) => ({
    padding:"8px 12px", fontSize:11, fontWeight:700, color:TEXT_SUB, textAlign:align,
    borderBottom:"2px solid "+BORDER, letterSpacing:0.3, whiteSpace:"nowrap",
    background:SURFACE, ...extra,
  });
  const td = (extra={}) => ({
    padding:"7px 12px", fontSize:13, color:TEXT, textAlign:"right",
    borderBottom:"1px solid "+BORDER, whiteSpace:"nowrap", ...extra,
  });

  const DataRow = ({ r, variant="bow" }) => {
    const isTot = variant !== "bow";
    const bg = variant==="portfolio" ? "#EEE9DF" : SURFACE;
    const fw = isTot ? 700 : 400;
    const bid = r.bow_id;

    return (
      <>
        <tr style={{background:bg}}>
          {variant==="strategy" ? (
            <td colSpan={2} style={td({textAlign:"left", fontWeight:700, background:bg, paddingLeft:16})}>USP Data Total</td>
          ) : variant==="portfolio" ? (
            <>
              <td style={td({textAlign:"left", fontWeight:fw, background:bg, paddingLeft:16})}>{r.portfolio_title}</td>
              <td style={td({background:bg})}></td>
            </>
          ) : (
            <>
              <td style={td({background:bg})}></td>
              <td style={td({textAlign:"left", background:bg, paddingLeft:20})}>{r.bow_title}</td>
            </>
          )}

          <td style={td({fontWeight:fw, background:bg})}>{fmtM(r.committed_total)}</td>
          {showCommittedDetail && <>
            <td style={td({background:bg, color:TEXT_SUB, fontSize:12})}>{fmtM(r.committed_paid)}</td>
            <td style={td({background:bg, color:TEXT_SUB, fontSize:12})}>{fmtM(r.committed_unpaid)}</td>
            <td style={td({background:bg, color:"#1F5F80", fontSize:12})}>{fmtM(r.committed_grants)}</td>
            <td style={td({background:bg, color:"#337A6C", fontSize:12})}>{fmtM(r.committed_contracts)}</td>
          </>}

          <td style={td({fontWeight:fw, background:bg})}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
              {fmtM(r.potential_total)}
              {variant==="bow" && r.potential_by_stage && Object.keys(r.potential_by_stage).length>0 && (
                <button onClick={()=>setExpandedBows(prev=>({...prev,[bid]:!prev[bid]}))}
                  style={{background:"none",border:"1px solid "+BORDER,borderRadius:3,cursor:"pointer",fontSize:9,color:TEXT_MUTED,padding:"1px 4px",lineHeight:1.4}}>
                  {expandedBows[bid]?"▲":"▼"}
                </button>
              )}
            </div>
          </td>
          {showPotentialDetail && <>
            <td style={td({background:bg, color:"#1F5F80", fontSize:12})}>{fmtM(r.potential_grants)}</td>
            <td style={td({background:bg, color:"#337A6C", fontSize:12})}>{fmtM(r.potential_contracts)}</td>
          </>}

          <td style={td({fontWeight:fw, background:bg})}>{fmtM(r.pipeline_total)}</td>
          <td style={td({fontWeight:fw, background:bg})}>{fmtM(r.budget_allocation)}</td>
          <td style={td({fontWeight:fw, background:bg, ...headroomStyle(r.headroom)})}>{fmtM(r.headroom)}</td>
          <td style={td({background:bg, color:TEXT_MUTED})}>—</td>
          <td style={td({background:bg, color:TEXT_MUTED})}>—</td>
        </tr>

        {variant==="bow" && expandedBows[bid] && r.potential_by_stage &&
          PIPELINE_STAGES.filter(s=>r.potential_by_stage[s]).map(s => {
            const sd = r.potential_by_stage[s];
            const stageBg = "#FAFAF8";
            return (
              <tr key={`${bid}-${s}`} style={{background:stageBg}}>
                <td style={td({background:stageBg})}></td>
                <td style={td({textAlign:"left",background:stageBg,paddingLeft:32,color:TEXT_MUTED,fontSize:12})}>↳ {s}</td>
                <td style={td({background:stageBg})}></td>
                {showCommittedDetail && <><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/></>}
                <td style={td({background:stageBg,color:TEXT_SUB,fontSize:12})}>{fmtM(sd.total)}</td>
                {showPotentialDetail && <>
                  <td style={td({background:stageBg,color:"#1F5F80",fontSize:12})}>{fmtM(sd.grants)}</td>
                  <td style={td({background:stageBg,color:"#337A6C",fontSize:12})}>{fmtM(sd.contracts)}</td>
                </>}
                <td style={td({background:stageBg})}/><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/><td style={td({background:stageBg})}/>
              </tr>
            );
          })
        }
      </>
    );
  };

  const tableBody = () => {
    if (level==="strategy") return <DataRow r={strategyTotal} variant="strategy"/>;
    if (level==="portfolio") return portfolioAgg.map(p=><DataRow key={p.portfolio_id} r={p} variant="portfolio"/>);
    return portfolioAgg.map(p=>(
      <React.Fragment key={p.portfolio_id}>
        <DataRow r={p} variant="portfolio"/>
        {p.bows.sort((a,b)=>a.bow_sort-b.bow_sort).map(b=><DataRow key={b.bow_id} r={b} variant="bow"/>)}
      </React.Fragment>
    ));
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:12}}>
      <div style={{width:24,height:24,border:"2px solid "+BORDER,borderTopColor:ACCENT,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <span style={{fontSize:14,color:TEXT_MUTED}}>Loading budget forecast…</span>
    </div>
  );

  if (error) return <div style={{padding:32,color:"#DC2626",fontSize:14}}>{error}</div>;

  return (
    <div className="fade-up">
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Year */}
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontSize:12,fontWeight:600,color:TEXT_MUTED,textTransform:"uppercase",letterSpacing:0.8}}>Timeframe</span>
            <select
              value={year}
              onChange={e=>{const v=e.target.value; setYear(v==="all"?"all":+v); setSelectedSnapshotId(null); setViewMode("table");}}
              style={{padding:"6px 10px",borderRadius:6,border:"1px solid "+BORDER,fontSize:13,color:TEXT,background:SURFACE,cursor:"pointer",fontWeight:600}}>
              {BUDGET_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
              <option value="all">4-Year Outlook</option>
            </select>
          </div>
          {/* Level toggle */}
          <div style={{display:"flex",border:"1px solid "+BORDER,borderRadius:6,overflow:"hidden"}}>
            {[{v:"strategy",l:"Strategy"},{v:"portfolio",l:"Portfolio"},{v:"bow",l:"BOW"}].map(({v,l})=>(
              <button key={v} onClick={()=>setLevel(v)}
                style={{padding:"5px 13px",border:"none",borderRight:"1px solid "+BORDER,
                        background:level===v?BRAND:SURFACE,color:level===v?"#fff":TEXT_SUB,
                        fontSize:13,fontWeight:level===v?600:400,cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>
          {/* View mode toggle — single year only */}
          {year!=="all" && <div style={{display:"flex",border:"1px solid "+BORDER,borderRadius:6,overflow:"hidden"}}>
            {[{v:"table",l:"Table"},{v:"chart",l:"Chart"}].map(({v,l})=>(
              <button key={v} onClick={()=>setViewMode(v)}
                style={{padding:"5px 13px",border:"none",borderRight:"1px solid "+BORDER,
                        background:viewMode===v?BRAND:SURFACE,color:viewMode===v?"#fff":TEXT_SUB,
                        fontSize:13,fontWeight:viewMode===v?600:400,cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>}
        </div>
        {/* Snapshot controls */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {snapshots.length>0 && (
            <select value={selectedSnapshotId||""} onChange={e=>setSelectedSnapshotId(e.target.value||null)}
              style={{padding:"6px 10px",borderRadius:6,border:"1px solid "+BORDER,fontSize:12,color:TEXT,background:SURFACE,cursor:"pointer"}}>
              <option value="">Live data</option>
              {snapshots.map(s=>(
                <option key={s.snapshot_id} value={s.snapshot_id}>{s.label} (FY{s.fiscal_year})</option>
              ))}
            </select>
          )}
          {canSnapshot && (
            <button onClick={()=>{setShowSnapshotModal(true);setSnapshotLabel("");setSnapshotError(null);}}
              style={{padding:"6px 16px",borderRadius:6,border:"none",background:BRAND,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Take Snapshot
            </button>
          )}
        </div>
      </div>

      {/* Snapshot banner */}
      {selectedSnapshot && (
        <div style={{marginBottom:12,padding:"8px 14px",background:"#FEF5E7",borderRadius:6,border:"1px solid #FDE68A",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#92400E"}}>
            Viewing snapshot: <strong>{selectedSnapshot.label}</strong> · FY{selectedSnapshot.fiscal_year} · taken by {selectedSnapshot.taken_by} on {selectedSnapshot.snapshot_date}
          </span>
          <button onClick={()=>setSelectedSnapshotId(null)}
            style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#92400E",textDecoration:"underline"}}>
            Return to live
          </button>
        </div>
      )}

      {/* Multi-year table */}
      {year==="all" && (() => {
        const src = level==="bow" ? multiYearRows
          : level==="portfolio" ? multiYearPortfolios
          : [{ portfolio_title:"USP Data Total", portfolio_id:"_total", bow_id:"_total",
               years: BUDGET_YEARS.reduce((acc,y)=>{
                 acc[y] = multiYearPortfolios.reduce((s,p)=>({
                   budget_allocation: s.budget_allocation + (p.years[y]?.budget_allocation||0),
                   committed_total:   s.committed_total   + (p.years[y]?.committed_total  ||0),
                   potential_total:   s.potential_total   + (p.years[y]?.potential_total  ||0),
                   pipeline_total:    s.pipeline_total    + (p.years[y]?.pipeline_total   ||0),
                   headroom:          s.headroom          + (p.years[y]?.headroom         ||0),
                 }), {budget_allocation:0,committed_total:0,potential_total:0,pipeline_total:0,headroom:0});
                 return acc;
               }, {}) }];
        const byPortfolio = level==="bow"
          ? multiYearPortfolios.map(p=>({...p, bowRows: multiYearRows.filter(r=>r.portfolio_id===p.portfolio_id)}))
          : [];
        const myTh = (extra={}) => ({padding:"7px 10px",fontSize:11,fontWeight:700,color:TEXT_SUB,
          textAlign:"right",borderBottom:"2px solid "+BORDER,whiteSpace:"nowrap",background:SURFACE,...extra});
        const myTd = (extra={}) => ({padding:"6px 10px",fontSize:12,color:TEXT,textAlign:"right",
          borderBottom:"1px solid "+BORDER,whiteSpace:"nowrap",...extra});
        const myFmtM = n => { const v=parseFloat(n); return isNaN(v)||v===0?"—":(v/1e6).toFixed(1); };
        const myHStyle = n => { const v=parseFloat(n); if(isNaN(v)||v===0) return {}; return v<0?{color:"#DC2626",fontWeight:600}:v<1e6?{color:"#D97706"}:{color:"#059669"}; };
        const YearCols = ({d}) => BUDGET_YEARS.map(y=>{
          const r=d?.years?.[y]||{}; return (
            <React.Fragment key={y}>
              <td style={myTd()}>{myFmtM(r.committed_total)}</td>
              <td style={myTd()}>{myFmtM(r.potential_total)}</td>
              <td style={myTd()}>{myFmtM(r.budget_allocation)}</td>
              <td style={myTd({...myHStyle(r.headroom)})}>{myFmtM(r.headroom)}</td>
            </React.Fragment>
          );
        });
        return (
          <div style={{background:SURFACE,borderRadius:8,border:"1px solid "+BORDER,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#F5F3ED"}}>
                  <th colSpan={2} style={myTh({textAlign:"left"})}></th>
                  {BUDGET_YEARS.map(y=>(
                    <th key={y} colSpan={4} style={myTh({textAlign:"center",borderLeft:"2px solid "+BORDER,
                      background: y%2===0?"#EBF4F9":"#ECF7F5", color: y%2===0?"#1F5F80":"#337A6C"})}>
                      FY{y}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={myTh({textAlign:"left",minWidth:140})}>Portfolio</th>
                  <th style={myTh({textAlign:"left",minWidth:180})}>BOW</th>
                  {BUDGET_YEARS.map(y=>(
                    <React.Fragment key={y}>
                      <th style={myTh({borderLeft:"2px solid "+BORDER})}>Committed</th>
                      <th style={myTh()}>Potential</th>
                      <th style={myTh()}>Budget Alloc</th>
                      <th style={myTh()}>Headroom</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {level==="bow" ? byPortfolio.map(p=>(
                  <React.Fragment key={p.portfolio_id}>
                    <tr style={{background:"#EEE9DF"}}>
                      <td style={myTd({textAlign:"left",fontWeight:700,paddingLeft:16})}>{p.portfolio_title}</td>
                      <td style={myTd()}></td>
                      <YearCols d={p}/>
                    </tr>
                    {p.bowRows.sort((a,b)=>a.bow_sort-b.bow_sort).map(b=>(
                      <tr key={b.bow_id} style={{background:SURFACE}}>
                        <td style={myTd()}></td>
                        <td style={myTd({textAlign:"left",paddingLeft:20})}>{b.bow_title}</td>
                        <YearCols d={b}/>
                      </tr>
                    ))}
                  </React.Fragment>
                )) : src.map((r,i)=>(
                  <tr key={r.portfolio_id||i} style={{background: level==="portfolio"?"#EEE9DF":SURFACE}}>
                    <td style={myTd({textAlign:"left",fontWeight:700,paddingLeft:16})}>{r.portfolio_title||"USP Data Total"}</td>
                    <td style={myTd()}></td>
                    <YearCols d={r}/>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Chart */}
      {year!=="all" && viewMode==="chart" && (
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          {/* Chart panel */}
          <div style={{flex:1,minWidth:0,background:SURFACE,borderRadius:8,border:"1px solid "+BORDER,padding:"24px 24px 16px"}}>
            {/* Legend */}
            <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20,flexWrap:"wrap"}}>
              {[
                {color:"#3086AB", label:"Committed – Paid"},
                {color:"#A8D0E6", label:"Committed – Unpaid"},
                {color:"#4EAB9A", label:"Potential (In-Process)"},
                {color:"#E8E4DB", label:"Headroom", border:true},
                {color:"#FCA5A5", label:"Over Budget"},
              ].map(({color,label,border})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:12,height:12,borderRadius:2,background:color,border:border?"1px solid "+BORDER:"none",flexShrink:0}}/>
                  <span style={{fontSize:12,color:TEXT_SUB}}>{label}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * (level==="bow" ? 38 : 56))}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{top:0, right:40, left:level==="bow"?200:160, bottom:0}}
                barSize={level==="bow" ? 18 : 28}
                onClick={e => { if (e?.activePayload?.[0]) setSelectedBar(e.activePayload[0].payload); }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke={BORDER}/>
                <XAxis
                  type="number"
                  tickFormatter={v=>`$${v}M`}
                  tick={{fontSize:11,fill:TEXT_MUTED}}
                  axisLine={false}
                  tickLine={false}/>
                <YAxis
                  type="category"
                  dataKey="name"
                  width={level==="bow"?195:155}
                  tick={({x, y, payload}) => {
                    const isSelected = selectedBar?.name === payload.value;
                    return (
                      <text x={x} y={y} dy={4} textAnchor="end"
                        fontSize={level==="bow"?11:12}
                        fontWeight={isSelected?700:400}
                        fill={isSelected?"#3086AB":TEXT}>
                        {payload.value}
                      </text>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}/>
                <Tooltip content={<BudgetTooltip/>} cursor={{fill:"rgba(0,0,0,0.04)"}}/>
                <Bar dataKey="committed_paid"   stackId="s" fill="#3086AB" name="Committed – Paid" radius={[0,0,0,0]}/>
                <Bar dataKey="committed_unpaid" stackId="s" fill="#A8D0E6" name="Committed – Unpaid"/>
                <Bar dataKey="potential"        stackId="s" fill="#4EAB9A" name="Potential"/>
                <Bar dataKey="headroom"         stackId="s" fill="#E8E4DB" name="Headroom" stroke={BORDER} strokeWidth={0.5}
                  radius={[0,3,3,0]}/>
                <Bar dataKey="over_budget"      stackId="s" fill="#FCA5A5" name="Over Budget"
                  radius={[0,3,3,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{marginTop:12,fontSize:11,color:TEXT_MUTED}}>
              Total bar width = Budget Allocation · Gap = Headroom · Red extension = Over Budget · Click a bar for detail
            </div>
          </div>

          {/* Detail panel */}
          <div style={{width:240,flexShrink:0,background:SURFACE,borderRadius:8,
            border:"1px solid "+(selectedBar ? "#3086AB" : BORDER),
            transition:"border-color .15s"}}>
            {selectedBar ? (() => {
              const d = selectedBar;
              const hColor = d.over_budget > 0 ? "#DC2626" : "#059669";
              const hVal = d.over_budget > 0 ? -d.over_budget : d.headroom;
              return (
                <div style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:TEXT,lineHeight:1.3}}>{d.name}</div>
                      {level==="bow" && d.portfolio && (
                        <div style={{fontSize:11,color:TEXT_MUTED,marginTop:3}}>{d.portfolio}</div>
                      )}
                    </div>
                    <button onClick={()=>setSelectedBar(null)}
                      style={{background:"none",border:"none",cursor:"pointer",color:TEXT_MUTED,fontSize:16,lineHeight:1,padding:"0 2px",flexShrink:0}}>
                      ×
                    </button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[
                      {label:"Budget Allocation", value:`$${d.budget_allocation}M`, color:TEXT, bold:true},
                      {label:"Committed – Paid",   value:`$${d.committed_paid}M`,   color:"#3086AB"},
                      {label:"Committed – Unpaid", value:`$${d.committed_unpaid}M`, color:"#7EB8D4"},
                      {label:"Committed Grants",   value:`$${d.committed_grants}M`, color:TEXT_SUB},
                      {label:"Committed Contracts",value:`$${d.committed_contracts}M`, color:TEXT_SUB},
                    ].map(({label,value,color,bold})=>(
                      <div key={label} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                        <span style={{color}}>{label}</span>
                        <span style={{fontWeight:bold?700:400,color}}>{value}</span>
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid "+BORDER,paddingTop:6,marginTop:2,display:"flex",flexDirection:"column",gap:6}}>
                      {[
                        {label:"Potential",          value:`$${d.potential}M`,       color:"#4EAB9A"},
                        {label:"Potential Grants",   value:`$${d.potential_grants}M`,color:TEXT_SUB},
                        {label:"Potential Contracts",value:`$${d.potential_contracts}M`,color:TEXT_SUB},
                      ].map(({label,value,color})=>(
                        <div key={label} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                          <span style={{color}}>{label}</span>
                          <span style={{color}}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{borderTop:"1px solid "+BORDER,paddingTop:6,marginTop:2,display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                        <span style={{color:TEXT_SUB}}>Pipeline Total</span>
                        <span style={{fontWeight:600}}>${d.pipeline_total}M</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                        <span style={{color:hColor,fontWeight:600}}>Headroom</span>
                        <span style={{color:hColor,fontWeight:600}}>${hVal.toFixed(2)}M</span>
                      </div>
                    </div>
                    <div style={{borderTop:"1px solid "+BORDER,paddingTop:6,marginTop:2,display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                        <span style={{color:TEXT_MUTED}}>Exp. Forecast</span>
                        <span style={{color:TEXT_MUTED,fontStyle:"italic"}}>—</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}>
                        <span style={{color:TEXT_MUTED}}>Exp. Headroom</span>
                        <span style={{color:TEXT_MUTED,fontStyle:"italic"}}>—</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div style={{padding:"32px 18px",textAlign:"center",color:TEXT_MUTED}}>
                <div style={{fontSize:22,marginBottom:8,opacity:0.3}}>↖</div>
                <div style={{fontSize:12}}>Click a bar to see breakdown</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {year!=="all" && viewMode==="table" && <div style={{background:SURFACE,borderRadius:8,border:"1px solid "+BORDER,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#F5F3ED"}}>
              <th colSpan={2} style={th("left",{borderRight:"1px solid "+BORDER})}></th>
              <th colSpan={showCommittedDetail?5:1} onClick={()=>setShowCommittedDetail(v=>!v)}
                style={th("center",{borderRight:"1px solid "+BORDER,color:"#1F5F80",background:"#EBF4F9",cursor:"pointer",userSelect:"none"})}>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  Committed (Active)
                  <span style={{fontSize:10,fontWeight:700,background:"#3086AB",color:"#fff",
                    borderRadius:3,padding:"1px 5px",lineHeight:1.5,letterSpacing:0}}>
                    {showCommittedDetail?"−":"+"}
                  </span>
                </span>
              </th>
              <th colSpan={showPotentialDetail?3:1} onClick={()=>setShowPotentialDetail(v=>!v)}
                style={th("center",{borderRight:"1px solid "+BORDER,color:"#337A6C",background:"#ECF7F5",cursor:"pointer",userSelect:"none"})}>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  Potential (In-Process)
                  <span style={{fontSize:10,fontWeight:700,background:"#4EAB9A",color:"#fff",
                    borderRadius:3,padding:"1px 5px",lineHeight:1.5,letterSpacing:0}}>
                    {showPotentialDetail?"−":"+"}
                  </span>
                </span>
              </th>
              <th colSpan={5} style={th("center")}></th>
            </tr>
            <tr>
              <th style={th("left",{minWidth:140})}>Portfolio</th>
              <th style={th("left",{minWidth:200})}>BOW</th>
              <th style={th("right",{background:"#EBF4F9"})}>Total ($M)</th>
              {showCommittedDetail && <>
                <th style={th("right",{color:"#1F5F80",fontSize:10,background:"#EBF4F9"})}>Paid</th>
                <th style={th("right",{color:"#1F5F80",fontSize:10,background:"#EBF4F9"})}>Unpaid</th>
                <th style={th("right",{color:"#1F5F80",fontSize:10,background:"#EBF4F9"})}>Grants</th>
                <th style={th("right",{color:"#337A6C",fontSize:10,background:"#EBF4F9"})}>Contracts</th>
              </>}
              <th style={th("right",{background:"#ECF7F5"})}>Total ($M)</th>
              {showPotentialDetail && <>
                <th style={th("right",{color:"#1F5F80",fontSize:10,background:"#ECF7F5"})}>Grants</th>
                <th style={th("right",{color:"#337A6C",fontSize:10,background:"#ECF7F5"})}>Contracts</th>
              </>}
              <th style={th("right")}>Pipeline Total</th>
              <th style={th("right")}>Budget Allocation</th>
              <th style={th("right")}>Headroom</th>
              <th style={th("right",{color:TEXT_MUTED})}>Exp. Forecast</th>
              <th style={th("right",{color:TEXT_MUTED})}>Exp. Headroom</th>
            </tr>
          </thead>
          <tbody>{tableBody()}</tbody>
          {level!=="strategy" && (
            <tfoot>
              <tr style={{background:"#E8E4DB"}}>
                <td colSpan={2} style={td({textAlign:"left",fontWeight:700,background:"#E8E4DB",paddingLeft:16,fontSize:12,letterSpacing:0.3})}>
                  TOTAL MANAGED
                </td>
                <td style={td({fontWeight:700,background:"#E8E4DB"})}>{fmtM(strategyTotal.committed_total)}</td>
                {showCommittedDetail && <>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.committed_paid)}</td>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.committed_unpaid)}</td>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.committed_grants)}</td>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.committed_contracts)}</td>
                </>}
                <td style={td({fontWeight:700,background:"#E8E4DB"})}>{fmtM(strategyTotal.potential_total)}</td>
                {showPotentialDetail && <>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.potential_grants)}</td>
                  <td style={td({fontWeight:700,background:"#E8E4DB",fontSize:12})}>{fmtM(strategyTotal.potential_contracts)}</td>
                </>}
                <td style={td({fontWeight:700,background:"#E8E4DB"})}>{fmtM(strategyTotal.pipeline_total)}</td>
                <td style={td({fontWeight:700,background:"#E8E4DB"})}>{fmtM(strategyTotal.budget_allocation)}</td>
                <td style={td({fontWeight:700,background:"#E8E4DB",...headroomStyle(strategyTotal.headroom)})}>{fmtM(strategyTotal.headroom)}</td>
                <td style={td({background:"#E8E4DB",color:TEXT_MUTED})}>—</td>
                <td style={td({background:"#E8E4DB",color:TEXT_MUTED})}>—</td>
              </tr>
              <tr style={{background:"#F0EDE6"}}>
                <td colSpan={2} style={td({textAlign:"left",background:"#F0EDE6",paddingLeft:16,fontSize:11,color:TEXT_MUTED})}>% of budget</td>
                <td style={td({background:"#F0EDE6",fontSize:11,color:TEXT_MUTED})}>{pctOfBudget(strategyTotal.committed_total, strategyTotal.budget_allocation)}</td>
                {showCommittedDetail && <><td style={td({background:"#F0EDE6"})}/><td style={td({background:"#F0EDE6"})}/><td style={td({background:"#F0EDE6"})}/><td style={td({background:"#F0EDE6"})}/></>}
                <td style={td({background:"#F0EDE6",fontSize:11,color:TEXT_MUTED})}>{pctOfBudget(strategyTotal.potential_total, strategyTotal.budget_allocation)}</td>
                {showPotentialDetail && <><td style={td({background:"#F0EDE6"})}/><td style={td({background:"#F0EDE6"})}/></>}
                <td style={td({background:"#F0EDE6",fontSize:11,color:TEXT_MUTED})}>{pctOfBudget(strategyTotal.pipeline_total, strategyTotal.budget_allocation)}</td>
                <td style={td({background:"#F0EDE6"})}/>
                <td style={td({background:"#F0EDE6",fontSize:11,color:TEXT_MUTED})}>{pctOfBudget(strategyTotal.headroom, strategyTotal.budget_allocation)}</td>
                <td style={td({background:"#F0EDE6"})}/><td style={td({background:"#F0EDE6"})}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>}
      <div style={{marginTop:8,fontSize:11,color:TEXT_MUTED}}>All figures in $M · All funding sources · Excludes envelope to NAT</div>

      {/* Snapshot modal */}
      {showSnapshotModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowSnapshotModal(false);}}>
          <div style={{background:SURFACE,borderRadius:10,padding:28,width:380,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:16,fontWeight:700,color:TEXT,marginBottom:4}}>Take Budget Snapshot</div>
            <div style={{fontSize:13,color:TEXT_MUTED,marginBottom:20}}>
              Captures the current FY{year} budget forecast as a named, permanent record.
            </div>
            <label style={{fontSize:12,fontWeight:600,color:TEXT_SUB,display:"block",marginBottom:4}}>Snapshot label</label>
            <input value={snapshotLabel} onChange={e=>setSnapshotLabel(e.target.value)}
              placeholder={`e.g. "May ${year} Forecast"`}
              style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid "+BORDER,fontSize:13,color:TEXT,marginBottom:16,boxSizing:"border-box"}}
              onKeyDown={e=>e.key==="Enter"&&takeSnapshot()}
              autoFocus/>
            {snapshotError && <div style={{fontSize:12,color:"#DC2626",marginBottom:12}}>{snapshotError}</div>}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowSnapshotModal(false)}
                style={{padding:"7px 16px",borderRadius:6,border:"1px solid "+BORDER,background:SURFACE,color:TEXT_SUB,fontSize:13,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={takeSnapshot} disabled={!snapshotLabel.trim()||takingSnapshot}
                style={{padding:"7px 16px",borderRadius:6,border:"none",
                        background:snapshotLabel.trim()?BRAND:BORDER,
                        color:"#fff",fontSize:13,fontWeight:600,
                        cursor:snapshotLabel.trim()?"pointer":"default",opacity:takingSnapshot?0.7:1}}>
                {takingSnapshot?"Saving…":"Save Snapshot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ activeView, onNavigate, data }) {
  const isStrategyActive  = activeView.type==="strategy";
  const isAllInvActive    = activeView.type==="all-investments";
  const isBudgetActive    = activeView.type==="budget-forecasts";
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
          Measurement & Insights<br/>Dashboard
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
        <NavItem
          label="All Investments"
          icon={<IconTable/>}
          active={isAllInvActive}
          onClick={()=>onNavigate({type:"all-investments"})}
        />
        <NavItem
          label="Budget Forecast"
          icon={<IconBarChart/>}
          active={isBudgetActive}
          onClick={()=>onNavigate({type:"budget-forecasts"})}
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
        <NavItem label="Explore the Data Model" active={activeView.type==="data-model"} onClick={()=>onNavigate({type:"data-model"})}/>
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

function IconBarChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0"  y="7" width="3" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="4"  y="3" width="3" height="11" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="8"  y="5" width="3" height="9" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="12" y="1" width="2" height="13" rx="1" fill="currentColor" opacity="0.7"/>
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
    : activeView.type==="all-investments"
    ? "2026–2030 Strategy"
    : activeView.type==="budget-forecasts"
    ? "All Investments"
    : activeView.type==="data-model"
    ? "Tools"
    : pc?.label || "";

  const pageTitle = activeView.type==="strategy"
    ? "USP Data & AI Measurement & Insights Dashboard"
    : activeView.type==="all-investments"
    ? "All Investments"
    : activeView.type==="budget-forecasts"
    ? "Budget Forecast"
    : activeView.type==="data-model"
    ? "Explore the Data Model"
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
            <a
              href="/portal"
              title="Submit actuals or share insights"
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"7px 16px",
                background:ACCENT,color:"#fff",
                border:"none",borderRadius:8,
                fontSize:12,fontWeight:700,cursor:"pointer",
                letterSpacing:0.2,textDecoration:"none",
                boxShadow:"0 1px 4px rgba(248,92,2,0.25)",
                transition:"background .15s,box-shadow .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="#D94E02";e.currentTarget.style.boxShadow="0 2px 8px rgba(248,92,2,0.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.background=ACCENT;e.currentTarget.style.boxShadow="0 1px 4px rgba(248,92,2,0.25)";}}>
              Update Data
            </a>
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
        <div style={{flex:1,padding:activeView.type==="data-model"?"0":"32px 36px",maxWidth:activeView.type==="data-model"?"100%":1600,width:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column"}}>
          {activeView.type==="data-model"&&(
            <DataModelExplorer/>
          )}
          {activeView.type==="strategy"&&(
            <StrategyOverview data={data} onUpdateRatings={r=>setData(prev=>({...prev,strategyRatings:r}))} onNavigateToPortfolio={id=>setActiveView({type:"portfolio",portId:id})} selectedGoal={activeView.goalNumber}/>
          )}
          {activeView.type==="all-investments"&&(
            <AllInvestmentsView/>
          )}
          {activeView.type==="budget-forecasts"&&(
            <BudgetForecastsView/>
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
