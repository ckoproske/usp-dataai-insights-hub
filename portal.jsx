const { useState, useEffect } = React;

// ─── Design system — matches main dashboard ───────────────────────────────────
const BRAND        = "#303A44";
const ACCENT       = "#F85C02";
const ACCENT_LIGHT = "#FEF0E6";
const ACCENT_MID   = "#FDDCCA";
const BG           = "#F5F3ED";
const SURFACE      = "#FFFFFF";
const BORDER       = "#D7CBB2";
const TEXT         = "#303A44";
const TEXT_SUB     = "#666666";
const TEXT_MUTED   = "#A49A8C";
const SUCCESS      = "#059669";
const SUCCESS_BG   = "#ECFDF5";
const DANGER       = "#DC2626";
const DANGER_BG    = "#FEF2F2";
const WARNING      = "#D97706";
const WARNING_BG   = "#FEF5E7";

const PORT_COLORS = {
  "ai-infra":      { color: "#3086AB", light: "#EBF4F9", dark: "#1F5F80", label: "AI Infrastructure" },
  "sfl":           { color: "#4EAB9A", light: "#ECF7F5", dark: "#337A6C", label: "System Feedback Loops" },
  "cross-cutting": { color: "#A49A8C", light: "#F5F3ED", dark: "#7A7068", label: "Cross-Cutting Supports" },
  "hub":           { color: "#FBAE40", light: "#FEF5E7", dark: "#C07D10", label: "Data & AI Enablement Hub" },
};

const PERIOD_OPTIONS = {
  annual:    [],
  quarterly: ["Q1", "Q2", "Q3", "Q4"],
  bimonthly: ["Jan–Feb", "Mar–Apr", "May–Jun", "Jul–Aug", "Sep–Oct", "Nov–Dec"],
  monthly:   ["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],
};

const SOURCE_TYPES = [
  { value: "public_report",        label: "Public Report" },
  { value: "grantee_deliverable",  label: "Grantee Deliverable" },
  { value: "administrative_data",  label: "Administrative Data" },
  { value: "internal_spreadsheet", label: "Internal Spreadsheet / Tracker" },
  { value: "dashboard_system",     label: "Dashboard / Data System" },
  { value: "evaluation",           label: "Evaluation" },
  { value: "methodology_docs",     label: "Methodology / Technical Documentation" },
  { value: "other",                label: "Other" },
];

const UNIT_OPTIONS = [
  { value: "#",         label: "# (count)" },
  { value: "%",         label: "% (percent)" },
  { value: "$",         label: "$ (dollars)" },
  { value: "schools",   label: "schools" },
  { value: "learners",  label: "learners" },
  { value: "partners",  label: "partners" },
  { value: "tools",     label: "tools" },
  { value: "users",     label: "users" },
  { value: "countries", label: "countries" },
  { value: "other",     label: "other (specify in notes)" },
];

const INSIGHT_TYPES = [
  { value: "field_observation", label: "Field observation" },
  { value: "partner_update",    label: "Partner update" },
  { value: "market_signal",     label: "Market signal" },
  { value: "risk_concern",      label: "Risk / concern" },
  { value: "general_note",      label: "General note" },
];

const TODAY       = new Date().toISOString().split("T")[0];
const CURRENT_YEAR = new Date().getFullYear();

// Returns the most relevant target for the current period: current year first,
// then next year, then the nearest year that has a value.
function getRelevantTarget(ind) {
  const candidates = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR - 1,
                      CURRENT_YEAR + 2, CURRENT_YEAR - 2];
  for (const y of candidates) {
    const val = ind[`target_${y}`];
    if (val != null) return { year: y, value: val };
  }
  return null;
}

// Inject brand font + animations once
const STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; background: ${BG}; color: ${TEXT}; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-up { animation: fadeUp 0.22s cubic-bezier(.4,0,.2,1) both; }
  .fade-in { animation: fadeIn 0.18s ease both; }
  input, select, textarea, button { font-family: inherit; }
  input:focus, select:focus, textarea:focus { outline: 2px solid ${ACCENT}; outline-offset: 1px; }
  a { color: ${ACCENT}; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function injectStyle() {
  if (document.getElementById("portal-style")) return;
  const el = document.createElement("style");
  el.id = "portal-style";
  el.textContent = STYLE;
  document.head.appendChild(el);
}

function api(path, opts = {}) {
  return fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  }).then(r => r.json());
}

function PortfolioPill({ portfolioId, style = {} }) {
  const p = PORT_COLORS[portfolioId];
  if (!p) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
      background: p.light, color: p.dark, ...style }}>
      {p.label}
    </span>
  );
}

function Badge({ status }) {
  const map = {
    pending:  { bg: WARNING_BG,  color: WARNING,  label: "Pending Review" },
    approved: { bg: SUCCESS_BG,  color: SUCCESS,  label: "Approved" },
    rejected: { bg: DANGER_BG,   color: DANGER,   label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20,
      padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function Card({ children, style = {}, className = "" }) {
  return (
    <div className={className}
      style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`,
        padding: 28, boxShadow: "0 1px 4px rgba(48,58,68,0.06)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {}, size = "md" }) {
  const pad = size === "sm" ? "6px 14px" : "10px 20px";
  const fs  = size === "sm" ? 13 : 14;
  const variants = {
    primary:   { background: disabled ? TEXT_MUTED : ACCENT,   color: SURFACE, border: "none" },
    secondary: { background: SURFACE, color: TEXT,             border: `1px solid ${BORDER}` },
    danger:    { background: disabled ? TEXT_MUTED : DANGER,   color: SURFACE, border: "none" },
    success:   { background: disabled ? TEXT_MUTED : SUCCESS,  color: SURFACE, border: "none" },
    ghost:     { background: "transparent", color: TEXT_SUB,   border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], borderRadius: 7, padding: pad, fontSize: fs,
        fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 0.15s", ...style }}>
      {children}
    </button>
  );
}

function Field({ label, required, helper, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700,
        color: TEXT, marginBottom: helper ? 3 : 6 }}>
        {label}{required && <span style={{ color: ACCENT, marginLeft: 3 }}>*</span>}
      </label>
      {helper && <p style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6, lineHeight: 1.5 }}>{helper}</p>}
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 7,
  border: `1px solid ${BORDER}`, fontSize: 14, background: SURFACE,
  color: TEXT, outline: "none",
};

function Input({ label, value, onChange, type = "text", placeholder, required, helper }) {
  return (
    <Field label={label} required={required} helper={helper}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle} />
    </Field>
  );
}

function Select({ label, value, onChange, options, placeholder, required, helper }) {
  return (
    <Field label={label} required={required} helper={helper}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "auto" }}>
        <option value="">{placeholder || "Select..."}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase",
      letterSpacing: "0.07em", marginBottom: 8 }}>
      {children}
    </p>
  );
}

function ContextPill({ context }) {
  if (!context) return null;
  const { assumption_count, decision_count } = context;
  if (!assumption_count && !decision_count) return null;
  const parts = [];
  if (assumption_count) parts.push(`${assumption_count} assumption${assumption_count !== 1 ? "s" : ""}`);
  if (decision_count)  parts.push(`${decision_count} key decision${decision_count !== 1 ? "s" : ""}`);
  return (
    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
      background: ACCENT_LIGHT, color: ACCENT, borderRadius: 6,
      padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
      <span style={{ fontSize: 10 }}>◆</span>
      <span>Feeds {parts.join(" · ")}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: BORDER, margin: "20px 0" }} />;
}

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ step, labels }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28, gap: 0 }}>
      {labels.map((label, i) => {
        const done    = step > i + 1;
        const active  = step === i + 1;
        const dotColor = done ? SUCCESS : active ? ACCENT : BORDER;
        const textColor = active ? TEXT : done ? TEXT_SUB : TEXT_MUTED;
        return (
          <React.Fragment key={i}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              flexShrink: 0, width: 140 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", marginBottom: 6,
                background: dotColor, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12, fontWeight: 700,
                color: (done || active) ? SURFACE : TEXT_MUTED,
                border: active ? `3px solid ${ACCENT_MID}` : "none",
                boxSizing: "border-box",
                transition: "background 0.2s" }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 400,
                color: textColor, textAlign: "center", lineHeight: 1.3 }}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div style={{ flex: 1, height: 2, marginTop: 13,
                background: step > i + 1 ? SUCCESS : BORDER,
                transition: "background 0.2s" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ height = 40, style = {} }) {
  return (
    <div style={{ height, borderRadius: 7, background: `linear-gradient(90deg, #EDE8E0 25%, #E5DFD5 50%, #EDE8E0 75%)`,
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", ...style }} />
  );
}

// ─── Submit Form ──────────────────────────────────────────────────────────────
function SubmitForm({ user, bows, goals, portfolios, indicators, portfolioIndicators, loading }) {
  const [step, setStep]                       = useState(1);
  const [level, setLevel]                     = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [entityId, setEntityId]               = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [openOutcomeId, setOpenOutcomeId]     = useState(null);
  const [indicatorId, setIndicatorId]         = useState("");
  const [indicatorContext, setIndicatorContext] = useState(null);
  const [indicatorActuals, setIndicatorActuals] = useState([]);
  const [value, setValue]                     = useState("");
  const [period, setPeriod]                   = useState("");
  const [readingDate, setReadingDate]         = useState(TODAY);
  const [sourceName, setSourceName]           = useState("");
  const [sourceType, setSourceType]           = useState("");
  const [sourceOther, setSourceOther]         = useState("");
  const [sourceUrl, setSourceUrl]             = useState("");
  const [notes, setNotes]                     = useState("");
  const [unitOverride, setUnitOverride]       = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  const [error, setError]                     = useState(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!indicatorId) { setIndicatorContext(null); setIndicatorActuals([]); return; }
    api(`/api/indicators/${indicatorId}/context`).then(setIndicatorContext).catch(() => null);
    api(`/api/indicators/${indicatorId}/actuals`).then(setIndicatorActuals).catch(() => []);
  }, [indicatorId]);

  const filteredBows = portfolioFilter ? bows.filter(b => b.portfolio_id === portfolioFilter) : bows;

  const entityOptions = () => {
    if (level === "bow")       return filteredBows.map(b => ({ value: b.bow_id, label: b.title }));
    if (level === "portfolio") return portfolios.map(p => ({
      value: p.portfolio_id, label: PORT_COLORS[p.portfolio_id]?.label || p.title
    }));
    if (level === "goal")      return goals.map(g => ({ value: g.goal_id, label: g.metric }));
    return [];
  };

  const sourceIndicators   = level === "portfolio" ? portfolioIndicators : indicators;
  const filteredIndicators = sourceIndicators.filter(i => {
    if (level === "bow")       return i.bow_id === entityId;
    if (level === "portfolio") return i.portfolio_id === entityId;
    return false;
  });

  const visibleIndicators = filteredIndicators.filter(i =>
    !indicatorSearch || i.text.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  const selectedIndicator = indicators.find(i => i.indicator_id === indicatorId);
  const selectedBow       = bows.find(b => b.bow_id === entityId);
  const freq = selectedIndicator?.collection_frequency || "annual";
  const periodOptions = PERIOD_OPTIONS[freq] || [];

  const canAdvance1 = level && entityId && (level !== "bow" || portfolioFilter);
  const activeUnit  = selectedIndicator?.unit || unitOverride;
  const canSubmit   = value && sourceName.trim() && sourceType && readingDate
                      && (periodOptions.length === 0 || period)
                      && (!selectedIndicator || selectedIndicator.unit || unitOverride);

  const reset = () => {
    setStep(1); setLevel(""); setPortfolioFilter(""); setEntityId("");
    setIndicatorSearch(""); setOpenOutcomeId(null); setIndicatorId("");
    setIndicatorContext(null); setIndicatorActuals([]);
    setValue(""); setPeriod(""); setSourceName(""); setSourceType(""); setSourceOther("");
    setSourceUrl(""); setNotes(""); setUnitOverride("");
    setReadingDate(TODAY); setSubmitted(false); setError(null);
  };

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const typeLabel  = sourceType === "other"
        ? (sourceOther.trim() || "Other")
        : SOURCE_TYPES.find(t => t.value === sourceType)?.label || sourceType;
      const sourceText = [
        `${sourceName.trim()} · ${typeLabel}`,
        sourceUrl ? `Link: ${sourceUrl}` : "",
      ].filter(Boolean).join(" — ");
      await api("/api/pending-actuals/submit", {
        method: "POST",
        body: JSON.stringify({
          indicator_id: indicatorId || null, level, entity_id: entityId,
          year: currentYear, period: period || null,
          submitted_value: parseFloat(value),
          reading_date: readingDate, source_notes: sourceText, notes,
        }),
      });
      setSubmitted(true);
    } catch(e) {
      setError("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Skeleton height={52} />
      <Skeleton height={52} />
      <Skeleton height={52} />
    </div>
  );

  if (submitted) return (
    <Card className="fade-up" style={{ textAlign: "center", padding: "48px 32px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: SUCCESS_BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", fontSize: 24, color: SUCCESS }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
        Submission received
      </h2>
      <p style={{ color: TEXT_SUB, marginBottom: 4, fontSize: 14 }}>
        Your data is in the review queue. The MLE team will review it shortly.
      </p>
      {selectedIndicator && (
        <div style={{ margin: "16px auto", padding: "12px 20px", background: BG,
          borderRadius: 8, border: `1px solid ${BORDER}`, display: "inline-block",
          textAlign: "left", minWidth: 300 }}>
          <p style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>You submitted</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
            {selectedIndicator.text}
          </p>
          <p style={{ fontSize: 13, color: TEXT_SUB }}>
            Value: <strong style={{ color: ACCENT }}>{value}{selectedIndicator?.unit ? ` ${selectedIndicator.unit}` : ""}</strong>
            {period && <span> · {period}</span>}
            <span> · {currentYear}</span>
          </p>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <Btn onClick={reset}>Submit another</Btn>
      </div>
    </Card>
  );

  const stepLabels = ["What are you reporting on?", "Select indicator", "Review & submit"];

  return (
    <div style={{ maxWidth: 660, margin: "0 auto" }} className="fade-in">
      <StepBar step={step} labels={stepLabels} />

      <Card>
        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="fade-in">
            <Select
              label="Reporting level"
              value={level}
              onChange={v => { setLevel(v); setPortfolioFilter(""); setEntityId(""); setIndicatorId(""); }}
              options={[
                { value: "bow",       label: "Body of Work (BOW)" },
                { value: "portfolio", label: "Portfolio" },
                { value: "goal",      label: "Strategy Goal" },
              ]}
              required
            />

            {level === "bow" && (
              <Select
                label="Portfolio"
                value={portfolioFilter}
                onChange={v => { setPortfolioFilter(v); setEntityId(""); }}
                options={portfolios.map(p => ({
                  value: p.portfolio_id,
                  label: PORT_COLORS[p.portfolio_id]?.label || p.title
                }))}
                placeholder="Select portfolio..."
                required
              />
            )}

            {level && (level !== "bow" || portfolioFilter) && (
              <>
                {level === "bow" && portfolioFilter && (
                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <PortfolioPill portfolioId={portfolioFilter} />
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                      {filteredBows.length} bodies of work
                    </span>
                  </div>
                )}
                <Select
                  label={level === "bow" ? "Body of Work" : level === "portfolio" ? "Portfolio" : "Goal"}
                  value={entityId}
                  onChange={setEntityId}
                  options={entityOptions()}
                  required
                />
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn onClick={() => setStep(2)} disabled={!canAdvance1}>Continue</Btn>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="fade-in">
            {/* Context breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
              padding: "10px 14px", background: BG, borderRadius: 7, border: `1px solid ${BORDER}` }}>
              {(selectedBow || level === "portfolio") && (
                <PortfolioPill portfolioId={selectedBow ? selectedBow.portfolio_id : entityId} />
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                {selectedBow?.title
                  || (level === "portfolio"
                      ? (PORT_COLORS[entityId]?.label || portfolios.find(p => p.portfolio_id === entityId)?.title || entityId)
                      : entityId)}
              </span>
            </div>

            {level === "goal" ? (
              <>
                <p style={{ color: TEXT_SUB, fontSize: 14, marginBottom: 20 }}>
                  Goal-level actuals are submitted directly as a value against the goal metric.
                </p>
                <Field label="Value" required>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)}
                    placeholder="Enter the data value" style={{ ...inputStyle }} />
                </Field>
                <Input label="When was this data collected or published?" type="date"
                  value={readingDate} onChange={setReadingDate} required
                  helper="Use today's date if you collected it just now. Otherwise use the date from the source." />
                <Input label="Source name" value={sourceName} onChange={setSourceName}
                  placeholder="e.g. Q1 2026 Partner Report, CSGA Dashboard, Cohort 3 Baseline Survey..."
                  required helper="Name the specific report, dataset, or document this data comes from." />
                <Select label="Source type" value={sourceType} onChange={setSourceType}
                  options={SOURCE_TYPES} required
                  helper="What kind of source is this?" />
                {sourceType === "other" && (
                  <Input label="Describe the source" value={sourceOther} onChange={setSourceOther}
                    placeholder="Briefly describe the source..." />
                )}
                <Input label="Source link" value={sourceUrl} onChange={setSourceUrl}
                  placeholder="https://..."
                  helper="Have a report or deck? Upload to SharePoint first, then paste the link here." />
                <Field label="Additional notes">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any caveats or context the reviewer should know..."
                    rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                  <Btn onClick={submit} disabled={!canSubmit || submitting}>
                    {submitting ? "Submitting..." : "Submit for review"}
                  </Btn>
                </div>
              </>
            ) : filteredIndicators.length === 0 ? (
              <>
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <p style={{ color: TEXT_MUTED, fontSize: 14 }}>
                    No indicators found for this {level}. Indicators may not yet be configured.
                  </p>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                </div>
              </>
            ) : (
              <>
                {/* Guidance */}
                <div style={{ marginBottom: 20, padding: "11px 14px", background: SURFACE,
                  borderRadius: 7, border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${BRAND}` }}>
                  <p style={{ fontSize: 13, color: TEXT, fontWeight: 600, lineHeight: 1.6 }}>
                    Select the outcome associated with the indicator you want to update,
                    then click the indicator to view targets and submit your value.
                  </p>
                </div>

                {/* Outcome accordions */}
                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                  {level === "portfolio" ? "Portfolio Outcomes" : "BOW Outcomes"}
                </p>
                {(() => {
                  const groups = [];
                  const seen = {};
                  filteredIndicators.forEach(ind => {
                    const key = ind.outcome_id || "__none";
                    if (!seen[key]) {
                      seen[key] = true;
                      groups.push({ outcome_id: key, outcome_title: ind.outcome_title, indicators: [] });
                    }
                    groups[groups.findIndex(g => g.outcome_id === key)].indicators.push(ind);
                  });

                  return groups.map((group, gi) => {
                    const isOpen = openOutcomeId === group.outcome_id;
                    const outcomeNum = `O${gi + 1}`;
                    const hasSelected = group.indicators.some(i => i.indicator_id === indicatorId);
                    return (
                      <div key={group.outcome_id} style={{ marginBottom: 16 }}>
                        {/* Accordion header */}
                        <div
                          onClick={() => {
                            setOpenOutcomeId(isOpen ? null : group.outcome_id);
                            setIndicatorId("");
                            setValue(""); setPeriod(""); setSourceName(""); setSourceType("");
                            setSourceOther(""); setSourceUrl(""); setNotes(""); setReadingDate(TODAY);
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "13px 16px",
                            borderRadius: isOpen ? "8px 8px 0 0" : 8,
                            background: isOpen ? BRAND : BG,
                            border: `1px solid ${isOpen ? BRAND : BORDER}`,
                            borderLeft: isOpen ? `4px solid ${ACCENT}` : `4px solid ${BORDER}`,
                            cursor: "pointer", userSelect: "none",
                            transition: "background 0.15s, border-color 0.15s" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, marginRight: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
                              color: isOpen ? ACCENT : TEXT_MUTED,
                              background: isOpen ? "rgba(248,92,2,0.15)" : SURFACE,
                              borderRadius: 4, padding: "2px 7px", flexShrink: 0, marginTop: 1 }}>
                              {outcomeNum}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45,
                              color: isOpen ? "#FFFFFF" : TEXT }}>
                              {group.outcome_title || "General indicators"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            {hasSelected && !isOpen && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: SUCCESS,
                                background: SUCCESS_BG, borderRadius: 10, padding: "2px 8px" }}>
                                Selected
                              </span>
                            )}
                            <span style={{ fontSize: 12,
                              color: isOpen ? "rgba(255,255,255,0.6)" : TEXT_MUTED }}>
                              {group.indicators.length} indicator{group.indicators.length !== 1 ? "s" : ""}
                            </span>
                            <span style={{ fontSize: 13,
                              color: isOpen ? "#FFFFFF" : TEXT_MUTED,
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s", display: "inline-block" }}>▾</span>
                          </div>
                        </div>

                        {/* Accordion body */}
                        {isOpen && (
                          <div style={{ border: `1px solid ${BRAND}`, borderLeft: `4px solid ${ACCENT}`,
                            borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden",
                            background: SURFACE }}>
                            {group.indicators.map((ind, idx) => {
                              const isSelected = indicatorId === ind.indicator_id;
                              return (
                                <div key={ind.indicator_id}
                                  style={{ borderTop: idx > 0 ? `1px solid ${BORDER}` : "none" }}>
                                  <div
                                    onClick={() => {
                                      setIndicatorId(isSelected ? "" : ind.indicator_id);
                                      setValue(""); setPeriod(""); setSourceName(""); setSourceType("");
                                      setSourceOther(""); setSourceUrl(""); setNotes("");
                                      setReadingDate(TODAY); setUnitOverride("");
                                    }}
                                    style={{ padding: "14px 18px", cursor: "pointer",
                                      background: isSelected ? ACCENT_LIGHT : SURFACE,
                                      transition: "background 0.15s",
                                      display: "flex", justifyContent: "space-between",
                                      alignItems: "center" }}>
                                    <div style={{ flex: 1, marginRight: 16 }}>
                                      {/* Line 1: indicator text */}
                                      <p style={{ fontSize: 14, fontWeight: 600, color: isSelected ? BRAND : TEXT,
                                        marginBottom: 8, lineHeight: 1.4 }}>
                                        {ind.text}
                                      </p>
                                      {/* Line 2: metadata pills */}
                                      {(() => {
                                        const target = getRelevantTarget(ind);
                                        return (
                                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                            {ind.unit && (
                                              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT,
                                                background: ACCENT_LIGHT, borderRadius: 4, padding: "2px 8px" }}>
                                                {ind.unit}
                                              </span>
                                            )}
                                            {ind.collection_frequency && (
                                              <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SUB,
                                                background: BG, borderRadius: 4, padding: "2px 8px",
                                                border: `1px solid ${BORDER}`, textTransform: "capitalize" }}>
                                                {ind.collection_frequency}
                                              </span>
                                            )}
                                            {target ? (
                                              <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SUB,
                                                background: BG, borderRadius: 4, padding: "2px 8px",
                                                border: `1px solid ${BORDER}` }}>
                                                {target.year} target:{" "}
                                                <strong style={{ color: TEXT }}>
                                                  {target.value}{ind.unit ? ` ${ind.unit}` : ""}
                                                </strong>
                                              </span>
                                            ) : (
                                              <span style={{ fontSize: 11, color: TEXT_MUTED,
                                                fontStyle: "italic" }}>
                                                No target set
                                              </span>
                                            )}
                                            {ind.data_source && (
                                              <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                                                {ind.data_source}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    {isSelected ? (
                                      <div style={{ width: 24, height: 24, borderRadius: "50%",
                                        background: ACCENT, flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 12, color: SURFACE, fontWeight: 700 }}>✓</div>
                                    ) : (
                                      <div style={{ width: 24, height: 24, borderRadius: "50%",
                                        border: `2px solid ${BORDER}`, flexShrink: 0 }} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
                  <Btn onClick={() => setStep(3)} disabled={!indicatorId}>Continue</Btn>
                </div>
              </>
            )}
          </div>
        )}
        {/* ── Step 3 ── */}
        {step === 3 && selectedIndicator && (
          <div className="fade-in">
            {/* Indicator context header */}
            <div style={{ marginBottom: 24, padding: "12px 16px", background: BG,
              borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {selectedBow && <PortfolioPill portfolioId={selectedBow.portfolio_id} />}
                {selectedIndicator.outcome_title && (
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>{selectedIndicator.outcome_title}</span>
                )}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.4, marginBottom: 4 }}>
                {selectedIndicator.text}
              </p>
              <ContextPill context={indicatorContext} />
            </div>

            <SectionLabel>
              Targets & baseline{selectedIndicator.unit ? ` (${selectedIndicator.unit})` : ""}
            </SectionLabel>
            <div style={{ overflowX: "auto", marginBottom: 14 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                <thead>
                  <tr>
                    {["Baseline", "2026", "2027", "2028", "2029", "2030"].map(h => (
                      <th key={h} style={{ padding: "4px 10px", textAlign: "right",
                        color: TEXT_MUTED, fontWeight: 700, whiteSpace: "nowrap",
                        borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[selectedIndicator.baseline, selectedIndicator.target_2026,
                      selectedIndicator.target_2027, selectedIndicator.target_2028,
                      selectedIndicator.target_2029, selectedIndicator.target_2030].map((v, vi) => (
                      <td key={vi} style={{ padding: "6px 10px", textAlign: "right",
                        color: v != null ? TEXT : TEXT_MUTED, fontWeight: v != null ? 700 : 400 }}>
                        {v != null ? v : "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {indicatorActuals.length > 0 && (
              <>
                <SectionLabel>Actuals on record</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {indicatorActuals.map((a, ai) => (
                    <span key={ai} style={{ background: SUCCESS_BG, borderRadius: 6,
                      padding: "3px 10px", fontSize: 12, color: SUCCESS, fontWeight: 700 }}>
                      {a.period ? `${a.period} ` : ""}{a.year}: {a.actual_value}
                      {selectedIndicator.unit ? ` ${selectedIndicator.unit}` : ""}
                    </span>
                  ))}
                </div>
              </>
            )}

            <Divider />

            <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 18 }}>
              Submit new value
            </p>

            {(() => {
              const activeUnit = selectedIndicator.unit || unitOverride;
              return (
                <>
                  {!selectedIndicator.unit && (
                    <Field label="Unit of measurement" required>
                      <select value={unitOverride} onChange={e => setUnitOverride(e.target.value)}
                        style={{ ...inputStyle, appearance: "auto" }}>
                        <option value="">Select unit...</option>
                        {UNIT_OPTIONS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label={activeUnit ? `Value (${activeUnit})` : "Value"} required>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" value={value} onChange={e => setValue(e.target.value)}
                        placeholder="Enter the data value" style={{ ...inputStyle, flex: 1 }} />
                      {activeUnit && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT,
                          background: ACCENT_LIGHT, padding: "9px 14px", borderRadius: 7,
                          border: `1px solid ${ACCENT_MID}`, whiteSpace: "nowrap" }}>
                          {activeUnit}
                        </span>
                      )}
                    </div>
                  </Field>
                </>
              );
            })()}

            {periodOptions.length > 0 && (
              <Select label="Reporting period" value={period} onChange={setPeriod}
                options={periodOptions.map(p => ({ value: p, label: p }))} required />
            )}

            <Input label="When was this data collected or published?" type="date"
              value={readingDate} onChange={setReadingDate} required
              helper="Use today's date if collected just now, or the date from the source." />

            <Input label="Source name" value={sourceName} onChange={setSourceName}
              placeholder="e.g. Q1 2026 Partner Report, CSGA Dashboard, Cohort 3 Baseline Survey..."
              required helper="Name the specific report, dataset, or document this data comes from." />
            <Select label="Source type" value={sourceType} onChange={setSourceType}
              options={SOURCE_TYPES} required
              helper="What kind of source is this?" />
            {sourceType === "other" && (
              <Input label="Describe the source" value={sourceOther} onChange={setSourceOther}
                placeholder="Briefly describe the source..." />
            )}
            <Input label="Source link" value={sourceUrl} onChange={setSourceUrl}
              placeholder="https://..."
              helper="Have a report or deck? Upload to SharePoint first, then paste the link here." />

            <Field label="Additional notes">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any caveats, methodology notes, or context the reviewer should know..."
                rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(2)}>Back</Btn>
              <Btn onClick={submit} disabled={!canSubmit || submitting}>
                {submitting ? "Submitting..." : "Submit for review"}
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Insight Form ─────────────────────────────────────────────────────────────
function InsightForm({ bows, portfolios, loading }) {
  const [portfolioId, setPortfolioId] = useState("");
  const [bowId, setBowId]             = useState("");
  const [insightType, setInsightType] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource]           = useState("");
  const [insightDate, setInsightDate] = useState(TODAY);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState(null);

  const filteredBows = portfolioId ? bows.filter(b => b.portfolio_id === portfolioId) : [];
  const canSubmit = bowId && insightType && description.trim();

  const reset = () => {
    setPortfolioId(""); setBowId(""); setInsightType("");
    setDescription(""); setSource(""); setInsightDate(TODAY);
    setSubmitted(false); setError(null);
  };

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      await api("/api/insights/submit", {
        method: "POST",
        body: JSON.stringify({ bow_id: bowId, insight_type: insightType,
          description, source, insight_date: insightDate }),
      });
      setSubmitted(true);
    } catch(e) {
      setError("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Skeleton height={52} /><Skeleton height={52} /><Skeleton height={120} />
    </div>
  );

  if (submitted) return (
    <Card className="fade-up" style={{ textAlign: "center", padding: "48px 32px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: SUCCESS_BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", fontSize: 24, color: SUCCESS }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Insight shared</h2>
      <p style={{ color: TEXT_SUB, marginBottom: 24, fontSize: 14 }}>
        Your insight has been added to this BOW's notes and will inform assumption confidence assessments.
      </p>
      <Btn onClick={reset}>Share another</Btn>
    </Card>
  );

  const typeDescriptions = {
    field_observation: "Something you directly observed — a school visit, community interaction, or first-hand data point.",
    partner_update:    "What a partner, grantee, or collaborator shared — a report-out, check-in, or conversation.",
    market_signal:     "An external trend, policy development, or ecosystem shift relevant to this work.",
    risk_concern:      "A risk, barrier, or concern that may affect delivery or impact.",
    general_note:      "Other relevant context, reflection, or update.",
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }} className="fade-in">
      <Card>
        <p style={{ fontSize: 14, color: TEXT_SUB, marginBottom: 24, lineHeight: 1.6 }}>
          Qualitative insights — what you're hearing from partners, observing in the field,
          or seeing in the market — are as important as numeric data.
          They feed directly into assumption confidence assessments.
        </p>

        <Select label="Portfolio" value={portfolioId}
          onChange={v => { setPortfolioId(v); setBowId(""); }}
          options={portfolios.map(p => ({
            value: p.portfolio_id, label: PORT_COLORS[p.portfolio_id]?.label || p.title
          }))}
          placeholder="Select portfolio..." required />

        {portfolioId && (
          <>
            {portfolioId && (
              <div style={{ marginBottom: 12 }}>
                <PortfolioPill portfolioId={portfolioId} />
              </div>
            )}
            <Select label="Body of Work" value={bowId} onChange={setBowId}
              options={filteredBows.map(b => ({ value: b.bow_id, label: b.title }))}
              required />
          </>
        )}

        <Select label="Type of insight" value={insightType} onChange={setInsightType}
          options={INSIGHT_TYPES} required />

        {insightType && typeDescriptions[insightType] && (
          <div style={{ marginTop: -12, marginBottom: 20, padding: "10px 14px",
            background: BG, borderRadius: 7, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
              {typeDescriptions[insightType]}
            </p>
          </div>
        )}

        <Field label="Description" required
          helper="Be specific — include names, numbers, context, and anything that helps the team interpret this.">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What did you observe, hear, or learn? The more specific, the more useful..."
            rows={5} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <Input label="Source" value={source} onChange={setSource}
          placeholder="e.g. conversation with [partner], field visit to [location], [report name]..."
          helper="Who or what is this insight based on?" />

        <Input label="Date" type="date" value={insightDate} onChange={setInsightDate}
          helper="When did you observe or hear this?" />

        {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn onClick={submit} disabled={!canSubmit || submitting}>
            {submitting ? "Sharing..." : "Share insight"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── My Submissions ───────────────────────────────────────────────────────────
function MySubmissions({ submissions, loading, indicators }) {
  const [filter, setFilter] = useState("all");
  const indicatorMap = Object.fromEntries((indicators || []).map(i => [i.indicator_id, i]));

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton height={100} /><Skeleton height={100} /><Skeleton height={100} />
    </div>
  );

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);

  if (!submissions.length) return (
    <Card style={{ textAlign: "center", padding: 48 }}>
      <p style={{ color: TEXT_MUTED, fontSize: 14 }}>You haven't submitted any data yet.</p>
    </Card>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: `1px solid ${filter === f ? ACCENT : BORDER}`,
              background: filter === f ? ACCENT_LIGHT : SURFACE,
              color: filter === f ? ACCENT : TEXT_SUB }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(s => {
          const ind = indicatorMap[s.indicator_id];
          const portId = ind?.portfolio_id;
          return (
            <Card key={s.pending_id} className="fade-in" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  {portId && <PortfolioPill portfolioId={portId} style={{ marginBottom: 5 }} />}
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                    {ind?.text || `${s.level?.toUpperCase()} — ${s.entity_id}`}
                  </p>
                  <p style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {s.period ? `${s.period} · ` : ""}{s.year} · Value:{" "}
                    <strong style={{ color: TEXT }}>{s.submitted_value}</strong>
                  </p>
                </div>
                <Badge status={s.status} />
              </div>
              {s.source_notes && (
                <p style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 3 }}>
                  Source: {renderSourceNotes(s.source_notes)}
                </p>
              )}
              {s.status === "rejected" && s.reviewer_notes && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: DANGER_BG,
                  borderRadius: 7, borderLeft: `3px solid ${DANGER}` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: DANGER, marginBottom: 2 }}>
                    Reviewer feedback
                  </p>
                  <p style={{ fontSize: 12, color: DANGER }}>{s.reviewer_notes}</p>
                </div>
              )}
              {s.status === "approved" && s.reviewed_by && (
                <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                  Approved by {s.reviewed_by}
                </p>
              )}
              <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                Submitted {new Date(s.submitted_at).toLocaleDateString()}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// Parses stored source_notes into { name, typeLabel, url }
// New format: "Source Name · Type Label — Link: https://..."
// Legacy format (free text or "Type Label — Link: ...") falls back gracefully
function parseSourceNotes(text) {
  if (!text) return { name: null, typeLabel: null, url: null };
  const linkMatch = text.match(/ — Link: (https?:\/\/\S+)/);
  const url  = linkMatch ? linkMatch[1].replace(/[.,;)]+$/, "") : null;
  const body = (url ? text.replace(/ — Link:.*$/, "") : text).trim();
  const dotIdx = body.indexOf(" · ");
  if (dotIdx !== -1) {
    return { name: body.slice(0, dotIdx).trim(), typeLabel: body.slice(dotIdx + 3).trim(), url };
  }
  return { name: body || null, typeLabel: null, url };
}

// Renders the source name as a hyperlink when a URL is present, with type label below
function renderSourceNotes(text) {
  const { name, typeLabel, url } = parseSourceNotes(text);
  if (!name) return "—";
  return (
    <span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: ACCENT, fontWeight: 600, textDecoration: "underline" }}>
          {name}
        </a>
      ) : (
        <span style={{ fontWeight: 600, color: TEXT }}>{name}</span>
      )}
      {typeLabel && (
        <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 6 }}>({typeLabel})</span>
      )}
    </span>
  );
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
function ReviewQueue({ queue, loading, onRefresh, indicators, bows, user }) {
  const canAct = user?.permission_level === "MLE";
  const indicatorMap = Object.fromEntries((indicators || []).map(i => [i.indicator_id, i]));
  const bowMap       = Object.fromEntries((bows || []).map(b => [b.bow_id, b]));
  const [rejectId, setRejectId]       = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editId, setEditId]           = useState(null);
  const [editValue, setEditValue]     = useState("");
  const [working, setWorking]         = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [actualsCache, setActualsCache] = useState({});

  const toggleExpand = (pendingId, indicatorId) => {
    if (expandedId === pendingId) { setExpandedId(null); return; }
    setExpandedId(pendingId);
    if (indicatorId && actualsCache[indicatorId] === undefined) {
      api(`/api/indicators/${indicatorId}/actuals`)
        .then(data => setActualsCache(prev => ({ ...prev, [indicatorId]: data })))
        .catch(() => setActualsCache(prev => ({ ...prev, [indicatorId]: [] })));
    }
  };

  const approve = async (id, val) => {
    setWorking(true);
    await api(`/api/pending-actuals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewed_value: val ? parseFloat(val) : undefined }),
    });
    setWorking(false); setEditId(null); onRefresh();
  };

  const reject = async () => {
    if (!rejectNotes.trim()) return;
    setWorking(true);
    await api(`/api/pending-actuals/${rejectId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewer_notes: rejectNotes }),
    });
    setWorking(false); setRejectId(null); setRejectNotes(""); onRefresh();
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton height={160} /><Skeleton height={160} />
    </div>
  );

  if (!queue.length) return (
    <Card style={{ textAlign: "center", padding: 48 }}>
      <p style={{ color: TEXT_MUTED, fontSize: 14 }}>No submissions pending review.</p>
    </Card>
  );

  return (
    <>
      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(48,58,68,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div className="fade-up" style={{ background: SURFACE, borderRadius: 12, padding: 32,
            width: 440, boxShadow: "0 12px 40px rgba(48,58,68,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>
              Reject submission
            </h3>
            <p style={{ fontSize: 13, color: TEXT_SUB, marginBottom: 16, lineHeight: 1.5 }}>
              Your feedback will be visible to the submitter in their My Submissions view.
            </p>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
              placeholder="Explain why this was rejected and what needs to change..."
              rows={4} style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => { setRejectId(null); setRejectNotes(""); }}>
                Cancel
              </Btn>
              <Btn variant="danger" onClick={reject} disabled={!rejectNotes.trim() || working}>
                {working ? "Rejecting..." : "Reject"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {queue.map(s => {
          const ind      = indicatorMap[s.indicator_id];
          const portId   = ind?.portfolio_id || (s.level === "portfolio" ? s.entity_id : null);
          const bow      = ind?.bow_id ? bowMap[ind.bow_id] : null;
          const isExpanded = expandedId === s.pending_id;
          const cachedActuals = actualsCache[s.indicator_id];
          return (
            <Card key={s.pending_id} className="fade-in" style={{ padding: 20 }}>
              {/* Clickable header — toggles historical record */}
              <div
                onClick={() => toggleExpand(s.pending_id, s.indicator_id)}
                style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 14, cursor: "pointer" }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  {portId && <PortfolioPill portfolioId={portId} style={{ marginBottom: 6 }} />}
                  {bow && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                      textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                      {bow.title}
                    </p>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 3, lineHeight: 1.4 }}>
                    {ind?.text || `${s.level?.toUpperCase()} — ${s.entity_id}`}
                  </p>
                  <p style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {s.level?.toUpperCase()} · {s.period ? `${s.period} · ` : ""}{s.year}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{s.submitted_value}</p>
                    <p style={{ fontSize: 11, color: TEXT_MUTED }}>submitted value</p>
                  </div>
                  <span style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 4,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s", display: "inline-block", userSelect: "none" }}>▾</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                padding: "12px 14px", background: BG, borderRadius: 7, marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Submitted by</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{s.submitted_by}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Data date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{s.reading_date || "—"}</p>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  {(() => {
                    const { name, typeLabel, url } = parseSourceNotes(s.source_notes);
                    return (
                      <>
                        <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Source</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: typeLabel ? 2 : 0 }}>
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              style={{ color: ACCENT, textDecoration: "underline" }}>
                              {name || "—"}
                            </a>
                          ) : (name || "—")}
                        </p>
                        {typeLabel && (
                          <p style={{ fontSize: 11, color: TEXT_MUTED }}>{typeLabel}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
                {s.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>Notes</p>
                    <p style={{ fontSize: 13, color: TEXT }}>{s.notes}</p>
                  </div>
                )}
              </div>

              {/* Expanded historical record */}
              {isExpanded && ind && (
                <div className="fade-in" style={{ marginBottom: 14, padding: "14px 16px",
                  background: ACCENT_LIGHT, borderRadius: 8, border: `1px solid ${ACCENT_MID}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT,
                    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                    Historical record
                  </p>

                  {/* Targets & baseline table */}
                  <p style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 5 }}>
                    Targets & baseline{ind.unit ? ` (${ind.unit})` : ""}
                  </p>
                  <div style={{ overflowX: "auto", marginBottom: 12 }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                      <thead>
                        <tr>
                          {["Baseline", "2026", "2027", "2028", "2029", "2030"].map(h => (
                            <th key={h} style={{ padding: "3px 10px", textAlign: "right",
                              color: TEXT_MUTED, fontWeight: 700, whiteSpace: "nowrap",
                              borderBottom: `1px solid ${ACCENT_MID}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[ind.baseline, ind.target_2026, ind.target_2027,
                            ind.target_2028, ind.target_2029, ind.target_2030].map((v, vi) => (
                            <td key={vi} style={{ padding: "5px 10px", textAlign: "right",
                              color: v != null ? TEXT : TEXT_MUTED, fontWeight: v != null ? 700 : 400 }}>
                              {v != null ? v : "—"}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Actuals on record */}
                  {cachedActuals === undefined ? (
                    <p style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic" }}>Loading actuals...</p>
                  ) : cachedActuals.length === 0 ? (
                    <p style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic" }}>No actuals on record yet.</p>
                  ) : (
                    <>
                      <p style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 5 }}>
                        Actuals on record
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {cachedActuals.map((a, ai) => (
                          <span key={ai} style={{ background: SUCCESS_BG, borderRadius: 6,
                            padding: "3px 10px", fontSize: 12, color: SUCCESS, fontWeight: 700 }}>
                            {a.period ? `${a.period} ` : ""}{a.year}: {a.actual_value}
                            {ind.unit ? ` ${ind.unit}` : ""}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {canAct ? (
                editId === s.pending_id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder={s.submitted_value}
                      style={{ ...inputStyle, flex: 1 }} />
                    <Btn variant="success" onClick={() => approve(s.pending_id, editValue)} disabled={working}>
                      Approve with edit
                    </Btn>
                    <Btn variant="secondary" onClick={() => setEditId(null)}>Cancel</Btn>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="success" onClick={() => approve(s.pending_id, null)} disabled={working}>
                      Approve
                    </Btn>
                    <Btn variant="secondary"
                      onClick={() => { setEditId(s.pending_id); setEditValue(s.submitted_value); }}>
                      Approve with edit
                    </Btn>
                    <Btn variant="danger" onClick={() => setRejectId(s.pending_id)} disabled={working}>
                      Reject
                    </Btn>
                  </div>
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: BG, borderRadius: 7,
                  border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT_MUTED }}>🔒</span>
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                    Approve / Reject — <strong style={{ color: TEXT_SUB }}>MLE access required</strong>
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
function PortalApp() {
  injectStyle();

  const [user, setUser]                   = useState(null);
  const [tab, setTab]                     = useState("submit");
  const [bows, setBows]                   = useState([]);
  const [goals, setGoals]                 = useState([]);
  const [portfolios, setPortfolios]       = useState([]);
  const [indicators, setIndicators]                   = useState([]);
  const [portfolioIndicators, setPortfolioIndicators] = useState([]);
  const [mySubmissions, setMySubmissions]             = useState([]);
  const [queue, setQueue]                             = useState([]);
  const [loadingData, setLoadingData]                 = useState(true);
  const [loadingMine, setLoadingMine]                 = useState(false);
  const [loadingQueue, setLoadingQueue]               = useState(false);

  useEffect(() => {
    Promise.all([
      api("/api/me").catch(() => null),
      api("/api/bows").catch(() => []),
      api("/api/goals").catch(() => []),
      api("/api/portfolios").catch(() => []),
      api("/api/indicators/all").catch(() => []),
      api("/api/portfolio-indicators/all").catch(() => []),
    ]).then(([u, b, g, p, i, pi]) => {
      if (u) setUser(u);
      setBows(Array.isArray(b) ? b : []);
      setGoals(Array.isArray(g) ? g : []);
      setPortfolios(Array.isArray(p) ? p : []);
      setIndicators(Array.isArray(i) ? i : []);
      setPortfolioIndicators(Array.isArray(pi) ? pi : []);
      setLoadingData(false);
    });
  }, []);

  const loadMine = () => {
    setLoadingMine(true);
    api("/api/pending-actuals/mine").then(setMySubmissions).finally(() => setLoadingMine(false));
  };

  const loadQueue = () => {
    setLoadingQueue(true);
    api("/api/pending-actuals?status=pending").then(setQueue).finally(() => setLoadingQueue(false));
  };

  useEffect(() => { if (tab === "mine")  loadMine();  }, [tab]);
  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab]);

  const canReview = user?.permission_level === "MLE" || user?.permission_level === "Leadership";

  const tabs = [
    { id: "submit",  label: "Submit Data" },
    { id: "mine",    label: "My Submissions" },
    { id: "insight", label: "Share an Insight" },
    ...(canReview ? [{ id: "queue", label: `Review Queue${queue.length ? ` (${queue.length})` : ""}` }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      {/* Header — dark slate, matches dashboard weight */}
      <div style={{ background: BRAND, padding: "0 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
              Measurement & Insights
            </span>
            <span style={{ fontSize: 13, color: ACCENT, marginLeft: 10, fontWeight: 600 }}>
              Submit Portal
            </span>
          </div>
          <a href="/" style={{ fontSize: 12, color: "#FFFFFF", textDecoration: "none",
            padding: "4px 12px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.25)", opacity: 0.8 }}>
            ← Dashboard
          </a>
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {user.display_name}
            </span>
            <span style={{ fontSize: 11, background: ACCENT_LIGHT, color: ACCENT,
              padding: "2px 9px", borderRadius: 10, fontWeight: 700 }}>
              {user.permission_level}
            </span>
          </div>
        )}
      </div>

      {/* Tab nav — sits below header on cream */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`,
        padding: "0 32px", display: "flex", gap: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "13px 18px", fontSize: 14, fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t.id ? ACCENT : TEXT_MUTED,
              borderBottom: tab === t.id ? `3px solid ${ACCENT}` : "3px solid transparent",
              transition: "color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div style={{ padding: "36px 32px", maxWidth: 760, margin: "0 auto" }}>
        {tab === "submit" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                Submit New Data
              </h1>
              <p style={{ fontSize: 14, color: TEXT_SUB, lineHeight: 1.7 }}>
                Welcome to the USP Data & AI Strategy submission portal. This is the place
                to share updated actuals for our impact indicators and strategy goals — everything
                submitted here is linked directly to the indicators, outcomes, and assumptions that
                drive our strategy. Once you submit, the MLE team will review your data and, once
                approved, it will automatically populate in the main dashboard and be reflected in
                our ratings and forecasts.
              </p>
            </div>
            <SubmitForm user={user} bows={bows} goals={goals}
              portfolios={portfolios} indicators={indicators}
              portfolioIndicators={portfolioIndicators} loading={loadingData} />
          </>
        )}

        {tab === "mine" && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 24 }}>
              My submissions
            </h1>
            <MySubmissions submissions={mySubmissions} loading={loadingMine} indicators={indicators} />
          </>
        )}

        {tab === "insight" && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                Share an insight
              </h1>
              <p style={{ fontSize: 14, color: TEXT_SUB, lineHeight: 1.6 }}>
                Share what you're observing in the field, from partners, or from the broader market.
                Qualitative insights inform assumption confidence assessments alongside numeric data.
              </p>
            </div>
            <InsightForm bows={bows} portfolios={portfolios} loading={loadingData} />
          </>
        )}

        {tab === "queue" && canReview && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>Review queue</h1>
              <Btn variant="secondary" size="sm" onClick={loadQueue}>Refresh</Btn>
            </div>
            <ReviewQueue queue={queue} loading={loadingQueue}
              onRefresh={loadQueue} indicators={indicators} bows={bows} user={user} />
          </>
        )}
      </div>
    </div>
  );
}
