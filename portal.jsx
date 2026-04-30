const { useState, useEffect } = React;

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:           "#F4F5F7",
  white:        "#FFFFFF",
  border:       "#E5E7EB",
  primary:      "#2563EB",
  primaryLight: "#EFF6FF",
  primaryHover: "#1D4ED8",
  success:      "#16A34A",
  successLight: "#F0FDF4",
  warning:      "#D97706",
  warningLight: "#FFFBEB",
  danger:       "#DC2626",
  dangerLight:  "#FEF2F2",
  gray100:      "#F3F4F6",
  gray200:      "#E5E7EB",
  gray400:      "#9CA3AF",
  gray500:      "#6B7280",
  gray700:      "#374151",
  gray900:      "#111827",
  indigo:       "#4338CA",
  indigoLight:  "#EEF2FF",
};

const PORTFOLIO_LABELS = {
  "ai-infra":      "AI Infrastructure",
  "sfl":           "System Feedback Loops",
  "cross-cutting": "Cross-Cutting Supports",
  "hub":           "Data & AI Enablement Hub",
};

const PERIOD_OPTIONS = {
  annual:    [],
  quarterly: ["Q1", "Q2", "Q3", "Q4"],
  bimonthly: ["Jan–Feb", "Mar–Apr", "May–Jun", "Jul–Aug", "Sep–Oct", "Nov–Dec"],
  monthly:   ["M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12"],
};

const INSIGHT_TYPES = [
  { value: "field_observation", label: "Field observation" },
  { value: "partner_update",    label: "Partner update" },
  { value: "market_signal",     label: "Market signal" },
  { value: "risk_concern",      label: "Risk / concern" },
  { value: "general_note",      label: "General note" },
];

const TODAY = new Date().toISOString().split("T")[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function api(path, opts = {}) {
  return fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  }).then(r => r.json());
}

function Badge({ status }) {
  const map = {
    pending:  { bg: C.warningLight, color: C.warning,  label: "Pending Review" },
    approved: { bg: C.successLight, color: C.success,  label: "Approved" },
    rejected: { bg: C.dangerLight,  color: C.danger,   label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20,
      padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: 24, ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const variants = {
    primary:  { background: disabled ? C.gray400 : C.primary,  color: C.white, border: "none" },
    secondary:{ background: C.white, color: C.gray700, border: `1px solid ${C.border}` },
    danger:   { background: disabled ? C.gray400 : C.danger,   color: C.white, border: "none" },
    success:  { background: disabled ? C.gray400 : C.success,  color: C.white, border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], borderRadius: 8, padding: "9px 18px", fontSize: 14,
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, helper, style = {} }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600,
        color: C.gray700, marginBottom: 5 }}>
        {label} {required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {helper && <p style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>{helper}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, fontSize: 14, outline: "none", ...style }} />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, required, helper }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600,
        color: C.gray700, marginBottom: 5 }}>
        {label} {required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {helper && <p style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>{helper}</p>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, fontSize: 14, background: C.white, outline: "none" }}>
        <option value="">{placeholder || "Select..."}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Context pill shown when an indicator has linked assumptions/decisions ────
function IndicatorContextPill({ context }) {
  if (!context) return null;
  const { assumption_count, decision_count } = context;
  if (!assumption_count && !decision_count) return null;
  const parts = [];
  if (assumption_count) parts.push(`feeds ${assumption_count} assumption${assumption_count !== 1 ? "s" : ""}`);
  if (decision_count)  parts.push(`${decision_count} key decision${decision_count !== 1 ? "s" : ""} watching`);
  return (
    <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
      background: C.indigoLight, color: C.indigo, borderRadius: 6,
      padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
      <span>◆</span>
      <span>{parts.join(" · ")}</span>
    </div>
  );
}

// ─── Submit Form ──────────────────────────────────────────────────────────────
function SubmitForm({ user, bows, goals, portfolios, indicators }) {
  const [step, setStep]                   = useState(1);
  const [level, setLevel]                 = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [entityId, setEntityId]           = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [indicatorId, setIndicatorId]     = useState("");
  const [indicatorContext, setIndicatorContext] = useState(null);
  const [indicatorActuals, setIndicatorActuals] = useState([]);
  const [value, setValue]                 = useState("");
  const [period, setPeriod]               = useState("");
  const [readingDate, setReadingDate]     = useState(TODAY);
  const [source, setSource]               = useState("");
  const [sourceUrl, setSourceUrl]         = useState("");
  const [notes, setNotes]                 = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!indicatorId) { setIndicatorContext(null); setIndicatorActuals([]); return; }
    api(`/api/indicators/${indicatorId}/context`).then(setIndicatorContext).catch(() => null);
    api(`/api/indicators/${indicatorId}/actuals`).then(setIndicatorActuals).catch(() => []);
  }, [indicatorId]);

  const bowOptions = () => {
    const pool = portfolioFilter ? bows.filter(b => b.portfolio_id === portfolioFilter) : bows;
    return pool.map(b => ({ value: b.bow_id, label: b.title }));
  };

  const entityOptions = () => {
    if (level === "bow")       return bowOptions();
    if (level === "portfolio") return portfolios.map(p => ({
      value: p.portfolio_id, label: p.title || PORTFOLIO_LABELS[p.portfolio_id]
    }));
    if (level === "goal") return goals.map(g => ({
      value: g.goal_id, label: `${g.goal_id.toUpperCase()} — ${g.metric}`
    }));
    return [];
  };

  const filteredIndicators = indicators.filter(i => {
    if (level === "bow")       return i.bow_id === entityId;
    if (level === "portfolio") return i.portfolio_id === entityId;
    return false;
  });

  const visibleIndicators = filteredIndicators.filter(i =>
    !indicatorSearch || i.text.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  const selectedIndicator = indicators.find(i => i.indicator_id === indicatorId);
  const freq = selectedIndicator?.collection_frequency || "annual";
  const periodOptions = PERIOD_OPTIONS[freq] || [];

  const canAdvance1 = level && entityId;
  const canAdvance2 = level === "goal" || indicatorId;
  const canSubmit   = value && source && readingDate && (periodOptions.length === 0 || period);

  const reset = () => {
    setStep(1); setLevel(""); setPortfolioFilter(""); setEntityId("");
    setIndicatorSearch(""); setIndicatorId(""); setIndicatorContext(null); setIndicatorActuals([]);
    setValue(""); setPeriod(""); setSource(""); setSourceUrl(""); setNotes("");
    setReadingDate(TODAY); setSubmitted(false); setError(null);
  };

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const sourceText = [source, sourceUrl ? `Link: ${sourceUrl}` : ""].filter(Boolean).join(" — ");
      await api("/api/pending-actuals/submit", {
        method: "POST",
        body: JSON.stringify({
          indicator_id:    indicatorId || null,
          level,
          entity_id:       entityId,
          year:            currentYear,
          period:          period || null,
          submitted_value: parseFloat(value),
          reading_date:    readingDate,
          source_notes:    sourceText,
          notes,
        }),
      });
      setSubmitted(true);
    } catch(e) {
      setError("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <Card style={{ maxWidth: 580, margin: "0 auto", textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.success, marginBottom: 8 }}>
        Submission received
      </h2>
      <p style={{ color: C.gray500, marginBottom: 8 }}>
        Your data has been added to the review queue. Track its status in{" "}
        <strong>My Submissions</strong>.
      </p>
      {selectedIndicator && (
        <p style={{ fontSize: 13, color: C.gray400, marginBottom: 24 }}>
          {selectedIndicator.text}
        </p>
      )}
      <Btn onClick={reset}>Submit another</Btn>
    </Card>
  );

  const stepLabels = ["What are you reporting on?", "Which indicator?", "Data details"];

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        {stepLabels.map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: step > i+1 ? C.success : step === i+1 ? C.primary : C.gray200,
                color: step >= i+1 ? C.white : C.gray500,
              }}>{step > i+1 ? "✓" : i+1}</div>
              <span style={{ fontSize: 12, color: step === i+1 ? C.gray900 : C.gray400,
                fontWeight: step === i+1 ? 600 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: C.border }} />}
          </React.Fragment>
        ))}
      </div>

      <Card>
        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.gray900 }}>
              What are you reporting on?
            </h3>
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
                label="Filter by portfolio"
                value={portfolioFilter}
                onChange={v => { setPortfolioFilter(v); setEntityId(""); }}
                options={portfolios.map(p => ({
                  value: p.portfolio_id,
                  label: p.title || PORTFOLIO_LABELS[p.portfolio_id]
                }))}
                placeholder="All portfolios"
              />
            )}
            {level && (
              <Select
                label={level === "bow" ? "Body of Work" : level === "portfolio" ? "Portfolio" : "Goal"}
                value={entityId}
                onChange={setEntityId}
                options={entityOptions()}
                required
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Btn onClick={() => setStep(2)} disabled={!canAdvance1}>Continue</Btn>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: C.gray900 }}>
              Which indicator?
            </h3>
            {level === "goal" ? (
              <p style={{ color: C.gray500, fontSize: 14, marginBottom: 20 }}>
                Goal-level actuals are submitted directly as a value against the goal metric.
              </p>
            ) : filteredIndicators.length === 0 ? (
              <p style={{ color: C.gray500, fontSize: 14, marginBottom: 20 }}>
                No indicators found for this {level}. Indicators may not yet be defined.
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={indicatorSearch}
                  onChange={e => setIndicatorSearch(e.target.value)}
                  placeholder="Search indicators..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${C.border}`, fontSize: 14,
                    marginBottom: 16, outline: "none", background: C.gray100 }}
                />
                {visibleIndicators.length === 0 && (
                  <p style={{ color: C.gray400, fontSize: 13, marginBottom: 12 }}>
                    No indicators match your search.
                  </p>
                )}
                {/* Group indicators by outcome */}
                {(() => {
                  const groups = [];
                  const seen = {};
                  visibleIndicators.forEach(ind => {
                    const key = ind.outcome_id || "__none";
                    if (!seen[key]) {
                      seen[key] = true;
                      groups.push({ outcome_id: key, outcome_title: ind.outcome_title, indicators: [] });
                    }
                    groups[groups.findIndex(g => g.outcome_id === key)].indicators.push(ind);
                  });
                  return groups.map(group => (
                    <div key={group.outcome_id} style={{ marginBottom: 20 }}>
                      {group.outcome_title && (
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.gray400,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          marginBottom: 8 }}>
                          {group.outcome_title}
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {group.indicators.map(ind => {
                          const isSelected = indicatorId === ind.indicator_id;
                          return (
                            <div key={ind.indicator_id} onClick={() => setIndicatorId(ind.indicator_id)}
                              style={{ padding: 14, borderRadius: 8, cursor: "pointer",
                                border: `2px solid ${isSelected ? C.primary : C.border}`,
                                background: isSelected ? C.primaryLight : C.white }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: C.gray900,
                                  marginBottom: 4, flex: 1, marginRight: 8 }}>
                                  {ind.text}
                                </p>
                                {isSelected && (
                                  <div style={{ width: 20, height: 20, borderRadius: "50%",
                                    background: C.primary, display: "flex", alignItems: "center",
                                    justifyContent: "center", flexShrink: 0, fontSize: 11, color: C.white, fontWeight: 700 }}>
                                    ✓
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.gray500, flexWrap: "wrap" }}>
                                {ind.data_source && <span>Source: {ind.data_source}</span>}
                                {ind.collection_frequency && (
                                  <span style={{ textTransform: "capitalize" }}>{ind.collection_frequency}</span>
                                )}
                                {ind.target_2026 != null && <span>2026 target: {ind.target_2026}</span>}
                              </div>
                              {/* Historical data panel — shown when selected */}
                              {isSelected && (
                                <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: C.gray400,
                                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                                    Historical data
                                  </p>
                                  <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                      <thead>
                                        <tr>
                                          {["Baseline", "Target 2026", "Target 2027", "Target 2028", "Target 2029", "Target 2030"].map(h => (
                                            <th key={h} style={{ padding: "4px 8px", textAlign: "right",
                                              color: C.gray400, fontWeight: 600, whiteSpace: "nowrap",
                                              borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          {[ind.baseline, ind.target_2026, ind.target_2027, ind.target_2028, ind.target_2029, ind.target_2030].map((v, i) => (
                                            <td key={i} style={{ padding: "6px 8px", textAlign: "right",
                                              color: v != null ? C.gray700 : C.gray400, fontWeight: v != null ? 600 : 400 }}>
                                              {v != null ? v : "—"}
                                            </td>
                                          ))}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                  {indicatorActuals.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray400,
                                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                                        Actuals on record
                                      </p>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        {indicatorActuals.map((a, i) => (
                                          <div key={i} style={{ background: C.successLight,
                                            borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                                            <span style={{ color: C.gray500 }}>
                                              {a.period ? `${a.period} ` : ""}{a.year}:
                                            </span>{" "}
                                            <span style={{ fontWeight: 700, color: C.success }}>{a.actual_value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <IndicatorContextPill context={indicatorContext} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
              <Btn onClick={() => setStep(3)} disabled={!canAdvance2}>Continue</Btn>
            </div>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.gray900 }}>
              Data details
            </h3>
            {selectedIndicator && (
              <p style={{ fontSize: 13, color: C.gray500, marginBottom: 4 }}>
                {selectedIndicator.text}
              </p>
            )}
            {indicatorContext && (indicatorContext.assumption_count > 0 || indicatorContext.decision_count > 0) && (
              <div style={{ marginBottom: 18 }}>
                <IndicatorContextPill context={indicatorContext} />
              </div>
            )}
            <Input
              label="Value"
              type="number"
              value={value}
              onChange={setValue}
              placeholder="Enter the data value"
              required
            />
            {periodOptions.length > 0 && (
              <Select
                label="Reporting period"
                value={period}
                onChange={setPeriod}
                options={periodOptions.map(p => ({ value: p, label: p }))}
                required
              />
            )}
            <Input
              label="Data date"
              type="date"
              value={readingDate}
              onChange={setReadingDate}
              required
              helper="When was this data collected or published? Use today's date if you collected it just now. Otherwise use the date from the source report or partner update."
            />
            <Input
              label="Source"
              value={source}
              onChange={setSource}
              placeholder="e.g. Q1 2026 partner report, CSGA dashboard, conversation with..."
              required
              helper="Include enough detail for a reviewer to verify this data."
            />
            <Input
              label="Source link (optional)"
              value={sourceUrl}
              onChange={setSourceUrl}
              placeholder="https://..."
              helper="Have a report, PDF, or deck? Upload it to your team's SharePoint folder, then paste the link here."
            />
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600,
                color: C.gray700, marginBottom: 5 }}>Additional notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any caveats, methodology notes, or context the reviewer should know..."
                rows={3}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", outline: "none" }}
              />
            </div>
            {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(2)}>Back</Btn>
              <Btn onClick={submit} disabled={!canSubmit || submitting}>
                {submitting ? "Submitting..." : "Submit for review"}
              </Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Insight Form ─────────────────────────────────────────────────────────────
function InsightForm({ user, bows, portfolios }) {
  const [portfolioId, setPortfolioId]   = useState("");
  const [bowId, setBowId]               = useState("");
  const [insightType, setInsightType]   = useState("");
  const [description, setDescription]   = useState("");
  const [source, setSource]             = useState("");
  const [insightDate, setInsightDate]   = useState(TODAY);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState(null);

  const filteredBows = portfolioId ? bows.filter(b => b.portfolio_id === portfolioId) : bows;
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
        body: JSON.stringify({ bow_id: bowId, insight_type: insightType, description, source, insight_date: insightDate }),
      });
      setSubmitted(true);
    } catch(e) {
      setError("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <Card style={{ maxWidth: 580, margin: "0 auto", textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.success, marginBottom: 8 }}>
        Insight shared
      </h2>
      <p style={{ color: C.gray500, marginBottom: 24 }}>
        Your insight has been added to this BOW's notes and will inform assumption confidence assessments.
      </p>
      <Btn onClick={reset}>Share another</Btn>
    </Card>
  );

  const typeDescriptions = {
    field_observation: "Something you directly observed in the field — a school visit, community interaction, or first-hand data point.",
    partner_update:    "What a partner, grantee, or collaborator shared with you — a report-out, check-in, or conversation.",
    market_signal:     "An external trend, policy development, or ecosystem shift relevant to this work.",
    risk_concern:      "A risk, barrier, or concern that may affect delivery or impact.",
    general_note:      "Other relevant context, reflection, or update.",
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: C.gray900 }}>
          Share a qualitative insight
        </h3>
        <p style={{ fontSize: 13, color: C.gray500, marginBottom: 24, lineHeight: 1.6 }}>
          Qualitative insights — what you're hearing from partners, observing in the field,
          or seeing in the market — are as important as numeric data. They feed directly into
          assumption confidence assessments and the team's picture of progress.
        </p>

        <Select
          label="Portfolio"
          value={portfolioId}
          onChange={v => { setPortfolioId(v); setBowId(""); }}
          options={portfolios.map(p => ({
            value: p.portfolio_id,
            label: p.title || PORTFOLIO_LABELS[p.portfolio_id]
          }))}
          placeholder="Select portfolio..."
        />

        {portfolioId && (
          <Select
            label="Body of Work"
            value={bowId}
            onChange={setBowId}
            options={filteredBows.map(b => ({ value: b.bow_id, label: b.title }))}
            required
          />
        )}

        <Select
          label="Type of insight"
          value={insightType}
          onChange={setInsightType}
          options={INSIGHT_TYPES}
          required
        />

        {insightType && typeDescriptions[insightType] && (
          <p style={{ fontSize: 12, color: C.gray500, marginTop: -12, marginBottom: 16,
            padding: "8px 12px", background: C.gray100, borderRadius: 6 }}>
            {typeDescriptions[insightType]}
          </p>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600,
            color: C.gray700, marginBottom: 5 }}>
            Description <span style={{ color: C.danger }}>*</span>
          </label>
          <p style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>
            Be specific — include names, numbers, context, and anything that helps the team interpret this.
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What did you observe, hear, or learn? The more specific, the more useful..."
            rows={5}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", outline: "none" }}
          />
        </div>

        <Input
          label="Source"
          value={source}
          onChange={setSource}
          placeholder="e.g. conversation with [partner], field visit to [location], [report name]..."
          helper="Who or what is this insight based on?"
        />

        <Input
          label="Date"
          type="date"
          value={insightDate}
          onChange={setInsightDate}
          helper="When did you observe or hear this?"
        />

        {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}

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
  const indicatorMap = Object.fromEntries((indicators || []).map(i => [i.indicator_id, i.text]));

  if (loading) return <p style={{ color: C.gray400, padding: 20 }}>Loading...</p>;
  if (!submissions.length) return (
    <Card style={{ textAlign: "center", padding: 40 }}>
      <p style={{ color: C.gray400 }}>You haven't submitted any data yet.</p>
    </Card>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {submissions.map(s => (
        <Card key={s.pending_id} style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.gray900, marginBottom: 2 }}>
                {s.indicator_id && indicatorMap[s.indicator_id]
                  ? indicatorMap[s.indicator_id]
                  : `${s.level?.toUpperCase()} — ${s.entity_id}`}
              </p>
              <p style={{ fontSize: 12, color: C.gray500 }}>
                {s.period ? `${s.period} · ` : ""}{s.year} · Value: <strong>{s.submitted_value}</strong>
              </p>
            </div>
            <Badge status={s.status} />
          </div>
          {s.source_notes && (
            <p style={{ fontSize: 12, color: C.gray500, marginBottom: 4 }}>
              Source: {s.source_notes}
            </p>
          )}
          {s.reading_date && (
            <p style={{ fontSize: 12, color: C.gray500, marginBottom: 4 }}>
              Data date: {s.reading_date}
            </p>
          )}
          {s.status === "rejected" && s.reviewer_notes && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: C.dangerLight,
              borderRadius: 6, borderLeft: `3px solid ${C.danger}` }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.danger, marginBottom: 2 }}>
                Reviewer feedback
              </p>
              <p style={{ fontSize: 12, color: C.danger }}>{s.reviewer_notes}</p>
            </div>
          )}
          {s.status === "approved" && s.reviewed_by && (
            <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>
              Approved by {s.reviewed_by}
            </p>
          )}
          <p style={{ fontSize: 11, color: C.gray400, marginTop: 6 }}>
            Submitted {new Date(s.submitted_at).toLocaleDateString()}
          </p>
        </Card>
      ))}
    </div>
  );
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
function ReviewQueue({ queue, loading, onRefresh, indicators }) {
  const indicatorMap = Object.fromEntries((indicators || []).map(i => [i.indicator_id, i.text]));
  const [rejectId, setRejectId]       = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editId, setEditId]           = useState(null);
  const [editValue, setEditValue]     = useState("");
  const [working, setWorking]         = useState(false);

  const approve = async (id, value) => {
    setWorking(true);
    await api(`/api/pending-actuals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewed_value: value ? parseFloat(value) : undefined }),
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

  if (loading) return <p style={{ color: C.gray400, padding: 20 }}>Loading...</p>;
  if (!queue.length) return (
    <Card style={{ textAlign: "center", padding: 40 }}>
      <p style={{ color: C.gray400 }}>No submissions pending review.</p>
    </Card>
  );

  return (
    <>
      {rejectId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 28,
            width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: C.gray900 }}>
              Reject submission
            </h3>
            <p style={{ fontSize: 13, color: C.gray500, marginBottom: 14 }}>
              Provide feedback for the submitter — this will be visible to them in My Submissions.
            </p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="Explain why this submission was rejected or what needs to change..."
              rows={4}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical",
                marginBottom: 16, outline: "none" }}
            />
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
        {queue.map(s => (
          <Card key={s.pending_id} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gray900, marginBottom: 3 }}>
                  {s.indicator_id && indicatorMap[s.indicator_id]
                    ? indicatorMap[s.indicator_id]
                    : `${s.level?.toUpperCase()} — ${s.entity_id}`}
                </p>
                <p style={{ fontSize: 12, color: C.gray500 }}>
                  {s.level?.toUpperCase()} · {s.period ? `${s.period} · ` : ""}{s.year}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gray900 }}>
                  {s.submitted_value}
                </p>
                <p style={{ fontSize: 11, color: C.gray400 }}>submitted value</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: C.gray400, marginBottom: 2 }}>Submitted by</p>
                <p style={{ fontSize: 13, color: C.gray700 }}>{s.submitted_by}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: C.gray400, marginBottom: 2 }}>Data date</p>
                <p style={{ fontSize: 13, color: C.gray700 }}>{s.reading_date || "—"}</p>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ fontSize: 11, color: C.gray400, marginBottom: 2 }}>Source</p>
                <p style={{ fontSize: 13, color: C.gray700 }}>{s.source_notes || "—"}</p>
              </div>
              {s.notes && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: 11, color: C.gray400, marginBottom: 2 }}>Notes</p>
                  <p style={{ fontSize: 13, color: C.gray700 }}>{s.notes}</p>
                </div>
              )}
            </div>

            {editId === s.pending_id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <input
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder={s.submitted_value}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${C.border}`, fontSize: 14, outline: "none" }}
                />
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
                <Btn variant="secondary" onClick={() => { setEditId(s.pending_id); setEditValue(s.submitted_value); }}>
                  Approve with edit
                </Btn>
                <Btn variant="danger" onClick={() => setRejectId(s.pending_id)} disabled={working}>
                  Reject
                </Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function PortalApp() {
  const [user, setUser]                   = useState(null);
  const [tab, setTab]                     = useState("submit");
  const [bows, setBows]                   = useState([]);
  const [goals, setGoals]                 = useState([]);
  const [portfolios, setPortfolios]       = useState([]);
  const [indicators, setIndicators]       = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [queue, setQueue]                 = useState([]);
  const [loadingMine, setLoadingMine]     = useState(false);
  const [loadingQueue, setLoadingQueue]   = useState(false);

  useEffect(() => {
    api("/api/me").then(setUser);
    api("/api/bows").then(setBows);
    api("/api/goals").then(setGoals);
    api("/api/portfolios").then(setPortfolios);
    api("/api/indicators/all").then(setIndicators);
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
    { id: "insight", label: "Share an Insight" },
    { id: "mine",    label: "My Submissions" },
    ...(canReview ? [{ id: "queue", label: `Review Queue${queue.length ? ` (${queue.length})` : ""}` }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>
              Measurement & Insights
            </span>
            <span style={{ fontSize: 13, color: C.gray400, marginLeft: 8 }}>
              Submit Portal
            </span>
          </div>
          <a href="/" style={{ fontSize: 13, color: C.primary, textDecoration: "none",
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>
            ← Main Dashboard
          </a>
        </div>
        {user && (
          <div style={{ fontSize: 13, color: C.gray500 }}>
            {user.display_name}
            <span style={{ marginLeft: 8, fontSize: 11, background: C.primaryLight,
              color: C.primary, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
              {user.permission_level}
            </span>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: "0 32px", display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t.id ? C.primary : C.gray500,
              borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px", maxWidth: 720, margin: "0 auto" }}>
        {tab === "submit" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900, marginBottom: 6 }}>
                Submit an indicator actual
              </h1>
              <p style={{ fontSize: 14, color: C.gray500 }}>
                Submit a numeric data point for review by the MLE team. Once approved,
                it will appear in the dashboard and update assumption confidence ratings.
              </p>
            </div>
            <SubmitForm user={user} bows={bows} goals={goals}
              portfolios={portfolios} indicators={indicators} />
          </>
        )}

        {tab === "insight" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900, marginBottom: 6 }}>
                Share an insight
              </h1>
              <p style={{ fontSize: 14, color: C.gray500 }}>
                Share what you're observing in the field, from partners, or from the broader market.
                Qualitative insights inform assumption confidence assessments alongside numeric data.
              </p>
            </div>
            <InsightForm user={user} bows={bows} portfolios={portfolios} />
          </>
        )}

        {tab === "mine" && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900, marginBottom: 24 }}>
              My submissions
            </h1>
            <MySubmissions submissions={mySubmissions} loading={loadingMine} indicators={indicators} />
          </>
        )}

        {tab === "queue" && canReview && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900 }}>
                Review queue
              </h1>
              <Btn variant="secondary" onClick={loadQueue}>Refresh</Btn>
            </div>
            <ReviewQueue queue={queue} loading={loadingQueue}
              onRefresh={loadQueue} indicators={indicators} />
          </>
        )}
      </div>
    </div>
  );
}
