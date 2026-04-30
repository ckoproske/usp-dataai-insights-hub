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
  gray400:      "#9CA3AF",
  gray500:      "#6B7280",
  gray700:      "#374151",
  gray900:      "#111827",
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
    <button
      onClick={onClick}
      disabled={disabled}
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
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, fontSize: 14, outline: "none", ...style }}
      />
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
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, fontSize: 14, background: C.white, outline: "none" }}>
        <option value="">{placeholder || "Select..."}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Submit Form ──────────────────────────────────────────────────────────────
function SubmitForm({ user, bows, goals, portfolios, indicators }) {
  const [step, setStep]               = useState(1);
  const [level, setLevel]             = useState("");
  const [entityId, setEntityId]       = useState("");
  const [indicatorId, setIndicatorId] = useState("");
  const [value, setValue]             = useState("");
  const [period, setPeriod]           = useState("");
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource]           = useState("");
  const [notes, setNotes]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState(null);

  const currentYear = new Date().getFullYear();

  const entityOptions = () => {
    if (level === "bow") return bows.map(b => ({
      value: b.bow_id,
      label: `${PORTFOLIO_LABELS[b.portfolio_id] || b.portfolio_id} — ${b.title}`
    }));
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

  const selectedIndicator = indicators.find(i => i.indicator_id === indicatorId);
  const freq = selectedIndicator?.collection_frequency || "annual";
  const periodOptions = PERIOD_OPTIONS[freq] || [];

  const canAdvance1 = level && entityId;
  const canAdvance2 = level === "goal" || indicatorId;
  const canSubmit   = value && source && readingDate && (periodOptions.length === 0 || period);

  const reset = () => {
    setStep(1); setLevel(""); setEntityId(""); setIndicatorId("");
    setValue(""); setPeriod(""); setSource(""); setNotes("");
    setReadingDate(new Date().toISOString().split("T")[0]);
    setSubmitted(false); setError(null);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/pending-actuals/submit", {
        method: "POST",
        body: JSON.stringify({
          indicator_id:  indicatorId || null,
          level,
          entity_id:     entityId,
          year:          currentYear,
          period:        period || null,
          submitted_value: parseFloat(value),
          reading_date:  readingDate,
          source_notes:  source,
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
        Your data has been added to the review queue. You'll be able to track
        its status in <strong>My Submissions</strong>.
      </p>
      {selectedIndicator && (
        <p style={{ fontSize: 13, color: C.gray400, marginBottom: 24 }}>
          {selectedIndicator.text}
        </p>
      )}
      <Btn onClick={reset}>Submit another</Btn>
    </Card>
  );

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        {["What are you reporting on?", "Which indicator?", "Data details"].map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: step > i + 1 ? C.success : step === i + 1 ? C.primary : C.gray200,
                color: step >= i + 1 ? C.white : C.gray500,
              }}>{step > i + 1 ? "✓" : i + 1}</div>
              <span style={{ fontSize: 12, color: step === i + 1 ? C.gray900 : C.gray400,
                fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: C.border }} />}
          </React.Fragment>
        ))}
      </div>

      <Card>
        {/* Step 1 — Level + Entity */}
        {step === 1 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.gray900 }}>
              What are you reporting on?
            </h3>
            <Select
              label="Reporting level"
              value={level}
              onChange={v => { setLevel(v); setEntityId(""); setIndicatorId(""); }}
              options={[
                { value: "bow",       label: "Body of Work (BOW)" },
                { value: "portfolio", label: "Portfolio" },
                { value: "goal",      label: "Strategy Goal" },
              ]}
              required
            />
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

        {/* Step 2 — Indicator */}
        {step === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.gray900 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {filteredIndicators.map(ind => (
                  <div
                    key={ind.indicator_id}
                    onClick={() => setIndicatorId(ind.indicator_id)}
                    style={{
                      padding: 14, borderRadius: 8, cursor: "pointer",
                      border: `2px solid ${indicatorId === ind.indicator_id ? C.primary : C.border}`,
                      background: indicatorId === ind.indicator_id ? C.primaryLight : C.white,
                    }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.gray900, marginBottom: 4 }}>
                      {ind.text}
                    </p>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.gray500 }}>
                      {ind.data_source && <span>Source: {ind.data_source}</span>}
                      {ind.collection_frequency && (
                        <span style={{ textTransform: "capitalize" }}>
                          Collected: {ind.collection_frequency}
                        </span>
                      )}
                      {ind.target_2026 && <span>2026 target: {ind.target_2026}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setStep(1)}>Back</Btn>
              <Btn onClick={() => setStep(3)} disabled={!canAdvance2}>Continue</Btn>
            </div>
          </>
        )}

        {/* Step 3 — Data details */}
        {step === 3 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: C.gray900 }}>
              Data details
            </h3>
            {selectedIndicator && (
              <p style={{ fontSize: 13, color: C.gray500, marginBottom: 20 }}>
                {selectedIndicator.text}
              </p>
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
              helper="When was this data collected, published, or last updated? This may differ from today if you're entering data from a recent report or partner update. Use today's date if you collected it yourself just now."
            />
            <Input
              label="Source"
              value={source}
              onChange={setSource}
              placeholder="e.g. Q1 2026 partner report, CSGA dashboard export, conversation with..."
              required
              helper="Where did this data come from? Include enough detail for the reviewer to verify it."
            />
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600,
                color: C.gray700, marginBottom: 5 }}>Additional notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any context, caveats, or methodology notes..."
                rows={3}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, fontSize: 14, resize: "vertical", outline: "none" }}
              />
            </div>
            {error && (
              <p style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}
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

// ─── My Submissions ───────────────────────────────────────────────────────────
function MySubmissions({ submissions, loading }) {
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.gray900, marginBottom: 2 }}>
                {s.indicator_id || `${s.level} — ${s.entity_id}`}
              </p>
              <p style={{ fontSize: 12, color: C.gray500 }}>
                {s.level?.toUpperCase()} · {s.period ? `${s.period} ` : ""}{s.year} · Value: <strong>{s.submitted_value}</strong>
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
function ReviewQueue({ queue, loading, onRefresh }) {
  const [rejectId, setRejectId]     = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editId, setEditId]         = useState(null);
  const [editValue, setEditValue]   = useState("");
  const [working, setWorking]       = useState(false);

  const approve = async (id, value) => {
    setWorking(true);
    await api(`/api/pending-actuals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewed_value: value ? parseFloat(value) : undefined }),
    });
    setWorking(false);
    setEditId(null);
    onRefresh();
  };

  const reject = async () => {
    if (!rejectNotes.trim()) return;
    setWorking(true);
    await api(`/api/pending-actuals/${rejectId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewer_notes: rejectNotes }),
    });
    setWorking(false);
    setRejectId(null);
    setRejectNotes("");
    onRefresh();
  };

  if (loading) return <p style={{ color: C.gray400, padding: 20 }}>Loading...</p>;
  if (!queue.length) return (
    <Card style={{ textAlign: "center", padding: 40 }}>
      <p style={{ color: C.gray400 }}>No submissions pending review.</p>
    </Card>
  );

  return (
    <>
      {/* Reject modal */}
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
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.gray900, marginBottom: 3 }}>
                  {s.indicator_id || `${s.level} — ${s.entity_id}`}
                </p>
                <p style={{ fontSize: 12, color: C.gray500 }}>
                  {s.level?.toUpperCase()} · {s.period ? `${s.period} ` : ""}{s.year}
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

            {/* Approve with optional value edit */}
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
  const [user, setUser]             = useState(null);
  const [tab, setTab]               = useState("submit");
  const [bows, setBows]             = useState([]);
  const [goals, setGoals]           = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [queue, setQueue]           = useState([]);
  const [loadingMine, setLoadingMine]   = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);

  useEffect(() => {
    api("/api/me").then(setUser);
    api("/api/bows").then(setBows);
    api("/api/goals").then(setGoals);
    api("/api/portfolios").then(setPortfolios);
    api("/api/indicators/all").then(setIndicators);
  }, []);

  const loadMine = () => {
    setLoadingMine(true);
    api("/api/pending-actuals/mine")
      .then(setMySubmissions)
      .finally(() => setLoadingMine(false));
  };

  const loadQueue = () => {
    setLoadingQueue(true);
    api("/api/pending-actuals?status=pending")
      .then(setQueue)
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => { if (tab === "mine")  loadMine();  }, [tab]);
  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab]);

  const canReview = user?.permission_level === "MLE" || user?.permission_level === "Leadership";

  const tabs = [
    { id: "submit", label: "Submit Data" },
    { id: "mine",   label: "My Submissions" },
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
          <a href="/"
            style={{ fontSize: 13, color: C.primary, textDecoration: "none",
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
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "12px 16px", fontSize: 14, fontWeight: 600, background: "none",
              border: "none", cursor: "pointer",
              color: tab === t.id ? C.primary : C.gray500,
              borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
            }}>
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
                Submit data that will be reviewed by the MLE team before appearing in the dashboard.
                Every submission enriches the team's picture of progress and strengthens assumption confidence ratings.
              </p>
            </div>
            <SubmitForm
              user={user}
              bows={bows}
              goals={goals}
              portfolios={portfolios}
              indicators={indicators}
            />
          </>
        )}
        {tab === "mine" && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900, marginBottom: 24 }}>
              My submissions
            </h1>
            <MySubmissions submissions={mySubmissions} loading={loadingMine} />
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
            <ReviewQueue queue={queue} loading={loadingQueue} onRefresh={loadQueue} />
          </>
        )}
      </div>
    </div>
  );
}
