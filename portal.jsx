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

const REVISION_REASONS = [
  { value: "corrected_error",  label: "Corrected error" },
  { value: "updated_data",     label: "Updated data / better information" },
  { value: "revised_ambition", label: "Revised ambition" },
  { value: "scope_change",     label: "Scope change" },
];

const TARGET_YEARS = [2026, 2027, 2028, 2029, 2030];

// ─── Inline Submit Form ────────────────────────────────────────────────────────
function InlineSubmitForm({ indicator, bow, onClose, onSubmitted }) {
  const freq = indicator.collection_frequency || "annual";
  const periodOptions = PERIOD_OPTIONS[freq] || [];

  const [value, setValue]          = useState("");
  const [period, setPeriod]        = useState("");
  const [readingDate, setDate]     = useState(TODAY);
  const [sourceName, setSrcName]   = useState("");
  const [sourceType, setSrcType]   = useState("");
  const [sourceOther, setSrcOther] = useState("");
  const [sourceUrl, setSrcUrl]     = useState("");
  const [notes, setNotes]          = useState("");
  const [submitting, setSubmitting]= useState(false);
  const [error, setError]          = useState(null);

  const canSubmit = value && sourceName.trim() && sourceType && readingDate
    && (periodOptions.length === 0 || period);

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
          indicator_id: indicator.indicator_id,
          level: bow.portfolio_id ? "bow" : "portfolio",
          entity_id: bow.bow_id || bow.portfolio_id,
          year: CURRENT_YEAR, period: period || null,
          submitted_value: parseFloat(value),
          reading_date: readingDate, source_notes: sourceText, notes,
        }),
      });
      onSubmitted();
    } catch (e) {
      setError("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ marginTop: 10, padding: "18px 20px", background: ACCENT_LIGHT,
      borderRadius: 8, border: `1px solid ${ACCENT_MID}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>Submit actual — {indicator.text}</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
          fontSize: 18, color: TEXT_MUTED, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: periodOptions.length ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 4 }}>
        <Field label={`Value${indicator.unit ? ` (${indicator.unit})` : ""}`} required>
          <input type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder="Enter value..." style={inputStyle} />
        </Field>
        {periodOptions.length > 0 && (
          <Field label="Period" required>
            <select value={period} onChange={e => setPeriod(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}>
              <option value="">Select period...</option>
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <Field label="Data date" required helper="When was this data collected or published?">
          <input type="date" value={readingDate} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Source type" required>
          <select value={sourceType} onChange={e => setSrcType(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">Select...</option>
            {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Source name" required helper="Report, dataset, or document this came from.">
        <input type="text" value={sourceName} onChange={e => setSrcName(e.target.value)}
          placeholder="e.g. Q1 2026 Partner Report..." style={inputStyle} />
      </Field>
      {sourceType === "other" && (
        <Field label="Describe the source">
          <input type="text" value={sourceOther} onChange={e => setSrcOther(e.target.value)}
            placeholder="Briefly describe..." style={inputStyle} />
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Source link">
          <input type="url" value={sourceUrl} onChange={e => setSrcUrl(e.target.value)}
            placeholder="https://..." style={inputStyle} />
        </Field>
        <Field label="Notes">
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any caveats for the reviewer..." style={inputStyle} />
        </Field>
      </div>

      {error && <p style={{ color: DANGER, fontSize: 13, marginTop: 6, marginBottom: 4 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <Btn variant="secondary" size="sm" onClick={onClose}>Cancel</Btn>
        <Btn size="sm" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? "Submitting..." : "Submit for review"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Inline Edit Outcome ───────────────────────────────────────────────────────
function InlineEditOutcome({ outcome, onSave, onCancel, user, isPortfolio }) {
  const [title, setTitle]         = useState(outcome.title || "");
  const [shortTitle, setShort]    = useState(outcome.short_title || "");
  const [text, setText]           = useState(outcome.text || "");
  const [rationale, setRationale] = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const titleChanged   = title !== (outcome.title || "");
  const textChanged    = text  !== (outcome.text  || "");
  const needsRationale = titleChanged || textChanged;
  const canSave        = title.trim() && (!needsRationale || rationale.trim());

  const save = async () => {
    setSaving(true); setError(null);
    const endpoint = isPortfolio
      ? `/api/portfolio-outcomes/${outcome.outcome_id}`
      : `/api/bow-outcomes/${outcome.outcome_id}`;
    try {
      const res = await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ title, short_title: shortTitle, text,
          rationale: rationale || undefined, edited_by: user?.email }),
      });
      if (res.error) { setError(res.error); return; }
      onSave({ ...outcome, title, short_title: shortTitle, text });
    } catch (e) {
      setError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <Field label="Outcome title" required>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Short title" helper="Abbreviated label used in compact views.">
        <input type="text" value={shortTitle} onChange={e => setShort(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Description / narrative">
        <textarea value={text} onChange={e => setText(e.target.value)}
          rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      {needsRationale && (
        <Field label="Rationale for change" required
          helper="Required when editing title or description — explain why this text is changing.">
          <textarea value={rationale} onChange={e => setRationale(e.target.value)}
            placeholder="e.g. Clarified scope after Q1 strategy review..."
            rows={2} style={{ ...inputStyle, resize: "vertical", borderColor: ACCENT }} />
        </Field>
      )}
      {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
        <Btn size="sm" onClick={save} disabled={!canSave || saving}>
          {saving ? "Saving..." : "Save outcome"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Inline Edit Indicator ─────────────────────────────────────────────────────
function InlineEditIndicator({ indicator, onSave, onCancel, user, isPortfolio }) {
  const [itext, setItext]     = useState(indicator.text || "");
  const [unit, setUnit]       = useState(indicator.unit || "");
  const [freq, setFreq]       = useState(indicator.collection_frequency || "");
  const [baseline, setBase]   = useState(String(indicator.baseline ?? ""));
  const [targets, setTargets] = useState(
    TARGET_YEARS.reduce((a, y) => ({ ...a, [y]: String(indicator[`target_${y}`] ?? "") }), {})
  );
  const [rationale, setRationale]   = useState("");
  const [revReason, setRevReason]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  const textChanged    = itext !== (indicator.text || "");
  const targetsChanged = TARGET_YEARS.some(y => targets[y] !== String(indicator[`target_${y}`] ?? ""));
  const canSave = itext.trim()
    && (!textChanged    || rationale.trim())
    && (!targetsChanged || revReason);

  const save = async () => {
    setSaving(true); setError(null);
    const endpoint = isPortfolio
      ? `/api/portfolio-indicators/${indicator.indicator_id}`
      : `/api/bow-indicators/${indicator.indicator_id}`;
    const body = {
      text: itext, unit, collection_frequency: freq, baseline: baseline || null,
      ...TARGET_YEARS.reduce((a, y) => ({ ...a, [`target_${y}`]: targets[y] || null }), {}),
      rationale: rationale || undefined,
      revision_reason: revReason || undefined,
      edited_by: user?.email,
    };
    try {
      const res = await api(endpoint, { method: "PATCH", body: JSON.stringify(body) });
      if (res.error) { setError(res.error); return; }
      onSave({ ...indicator, ...body });
    } catch (e) {
      setError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: "16px 20px", background: SURFACE,
      border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 8 }}>
      <Field label="Indicator" required>
        <textarea value={itext} onChange={e => setItext(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Field label="Unit">
          <select value={unit} onChange={e => setUnit(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">None</option>
            {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
        <Field label="Collection frequency">
          <select value={freq} onChange={e => setFreq(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">Select...</option>
            {Object.keys(PERIOD_OPTIONS).map(f =>
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8 }}>Baseline & Targets</p>
      <div style={{ display: "grid",
        gridTemplateColumns: `repeat(${TARGET_YEARS.length + 1}, 1fr)`, gap: 8, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, display: "block", marginBottom: 3 }}>
            Baseline
          </label>
          <input type="number" value={baseline} onChange={e => setBase(e.target.value)}
            style={{ ...inputStyle, textAlign: "right" }} />
        </div>
        {TARGET_YEARS.map(y => (
          <div key={y}>
            <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, display: "block", marginBottom: 3 }}>
              {y}
            </label>
            <input type="number" value={targets[y]}
              onChange={e => setTargets(t => ({ ...t, [y]: e.target.value }))}
              style={{ ...inputStyle, textAlign: "right" }} />
          </div>
        ))}
      </div>

      {textChanged && (
        <Field label="Rationale for indicator text change" required>
          <textarea value={rationale} onChange={e => setRationale(e.target.value)}
            placeholder="Why is the indicator wording changing?"
            rows={2} style={{ ...inputStyle, resize: "vertical", borderColor: ACCENT }} />
        </Field>
      )}
      {targetsChanged && (
        <Field label="Reason for target revision" required>
          <select value={revReason} onChange={e => setRevReason(e.target.value)}
            style={{ ...inputStyle, appearance: "auto", borderColor: ACCENT }}>
            <option value="">Select reason...</option>
            {REVISION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      )}

      {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
        <Btn size="sm" onClick={save} disabled={!canSave || saving}>
          {saving ? "Saving..." : "Save indicator"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Indicator Row ─────────────────────────────────────────────────────────────
function IndicatorRow({ indicator, bow, user, isPortfolio, onDeleted, onUpdated }) {
  const [mode, setMode]             = useState("view"); // view | submit | edit
  const [submitted, setSubmitted]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const target = getRelevantTarget(indicator);

  const handleDelete = async () => {
    setDeleting(true);
    const ep = isPortfolio
      ? `/api/portfolio-indicators/${indicator.indicator_id}`
      : `/api/bow-indicators/${indicator.indicator_id}`;
    await api(ep, { method: "DELETE" });
    onDeleted(indicator.indicator_id);
  };

  if (submitted) return (
    <div className="fade-in" style={{ padding: "10px 14px", background: SUCCESS_BG,
      borderRadius: 7, border: `1px solid ${SUCCESS}`, display: "flex",
      alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
      <p style={{ fontSize: 13, color: SUCCESS, fontWeight: 700 }}>
        ✓ Submitted for review
      </p>
      <Btn variant="ghost" size="sm" onClick={() => { setSubmitted(false); setMode("view"); }}>
        Submit another
      </Btn>
    </div>
  );

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4, marginBottom: 6 }}>
            {indicator.text}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {indicator.unit && (
              <span style={{ fontSize: 11, fontWeight: 700, background: ACCENT_LIGHT,
                color: ACCENT, borderRadius: 4, padding: "2px 7px" }}>
                {indicator.unit}
              </span>
            )}
            {indicator.collection_frequency && (
              <span style={{ fontSize: 11, fontWeight: 600, background: BG, color: TEXT_SUB,
                borderRadius: 4, padding: "2px 7px", border: `1px solid ${BORDER}`,
                textTransform: "capitalize" }}>
                {indicator.collection_frequency}
              </span>
            )}
            {target && (
              <span style={{ fontSize: 11, fontWeight: 600, background: BG, color: TEXT_SUB,
                borderRadius: 4, padding: "2px 7px", border: `1px solid ${BORDER}` }}>
                Target {target.year}: {target.value}{indicator.unit ? ` ${indicator.unit}` : ""}
              </span>
            )}
            {indicator.latest_actual != null && (
              <span style={{ fontSize: 11, fontWeight: 700, background: SUCCESS_BG,
                color: SUCCESS, borderRadius: 4, padding: "2px 7px" }}>
                Actual {indicator.latest_actual_year}: {indicator.latest_actual}
                {indicator.unit ? ` ${indicator.unit}` : ""}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {mode === "view" && !confirmDel && (
            <>
              <Btn size="sm" onClick={() => setMode("submit")}>Submit</Btn>
              <Btn variant="secondary" size="sm" onClick={() => setMode("edit")}>Edit</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(true)}
                style={{ color: DANGER, fontSize: 12 }}>Remove</Btn>
            </>
          )}
          {confirmDel && (
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: DANGER, fontWeight: 600 }}>Remove?</span>
              <Btn variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>Yes</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>No</Btn>
            </span>
          )}
          {mode !== "view" && !confirmDel && (
            <Btn variant="ghost" size="sm" onClick={() => setMode("view")}
              style={{ color: TEXT_MUTED }}>Cancel</Btn>
          )}
        </div>
      </div>

      {mode === "submit" && (
        <InlineSubmitForm
          indicator={indicator} bow={bow}
          onClose={() => setMode("view")}
          onSubmitted={() => { setMode("view"); setSubmitted(true); }}
        />
      )}
      {mode === "edit" && (
        <InlineEditIndicator
          indicator={indicator} user={user} isPortfolio={isPortfolio}
          onSave={updated => { onUpdated(updated); setMode("view"); }}
          onCancel={() => setMode("view")}
        />
      )}
    </div>
  );
}

// ─── Outcome Card (BOW) ────────────────────────────────────────────────────────
function OutcomeCard({ outcome: initOutcome, index, bow, user, onDeleted }) {
  const [outcome, setOutcome]       = useState(initOutcome);
  const [indicators, setIndicators] = useState(initOutcome.indicators || []);
  const [editing, setEditing]       = useState(false);
  const [addingInd, setAddingInd]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [newIndText, setNewIndText] = useState("");
  const [newUnit, setNewUnit]       = useState("");
  const [newFreq, setNewFreq]       = useState("");
  const [savingInd, setSavingInd]   = useState(false);

  const p = PORT_COLORS[bow.portfolio_id];

  const handleDeleteOutcome = async () => {
    setDeleting(true);
    await api(`/api/bow-outcomes/${outcome.outcome_id}`, { method: "DELETE" });
    onDeleted(outcome.outcome_id);
  };

  const handleAddIndicator = async () => {
    if (!newIndText.trim()) return;
    setSavingInd(true);
    const res = await api("/api/bow-indicators", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, outcome_id: outcome.outcome_id,
        text: newIndText, unit: newUnit || null, collection_frequency: newFreq || null }),
    });
    if (!res.error) {
      const fresh = await api(`/api/bow/${bow.bow_id}/full`);
      const updOut = fresh.outcomes?.find(o => o.outcome_id === outcome.outcome_id);
      if (updOut) setIndicators(updOut.indicators || []);
      setAddingInd(false); setNewIndText(""); setNewUnit(""); setNewFreq("");
    }
    setSavingInd(false);
  };

  return (
    <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", background: BG,
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
          background: p?.light || ACCENT_LIGHT, color: p?.dark || ACCENT,
          borderRadius: 4, padding: "3px 8px", flexShrink: 0, marginTop: 1 }}>
          O{index + 1}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.4,
            marginBottom: outcome.short_title ? 2 : 0 }}>
            {outcome.title || "Untitled outcome"}
          </p>
          {outcome.short_title && (
            <p style={{ fontSize: 12, color: TEXT_MUTED }}>{outcome.short_title}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {!editing && !confirmDel && (
            <>
              <Btn variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(true)}
                style={{ color: DANGER, fontSize: 12 }}>Remove</Btn>
            </>
          )}
          {confirmDel && (
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: DANGER, fontWeight: 600 }}>
                Remove outcome + all indicators?
              </span>
              <Btn variant="danger" size="sm" onClick={handleDeleteOutcome} disabled={deleting}>
                Yes, remove
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancel</Btn>
            </span>
          )}
          {editing && (
            <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {editing ? (
          <InlineEditOutcome
            outcome={outcome} user={user}
            onSave={updated => { setOutcome(updated); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {outcome.text && (
              <p style={{ fontSize: 13, color: TEXT_SUB, lineHeight: 1.6, marginBottom: 16 }}>
                {outcome.text}
              </p>
            )}

            {indicators.length === 0 && !addingInd && (
              <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 12 }}>
                No indicators added yet.
              </p>
            )}

            {indicators.map(ind => (
              <IndicatorRow key={ind.indicator_id}
                indicator={ind} bow={bow} user={user}
                onDeleted={id => setIndicators(prev => prev.filter(i => i.indicator_id !== id))}
                onUpdated={upd => setIndicators(prev =>
                  prev.map(i => i.indicator_id === upd.indicator_id ? { ...i, ...upd } : i)
                )}
              />
            ))}

            {addingInd ? (
              <div className="fade-in" style={{ marginTop: 14, padding: "14px 16px", background: BG,
                border: `1px dashed ${BORDER}`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 10 }}>
                  New indicator
                </p>
                <Field label="Indicator" required>
                  <textarea value={newIndText} onChange={e => setNewIndText(e.target.value)}
                    placeholder="Describe what this indicator measures..."
                    rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Unit">
                    <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                      style={{ ...inputStyle, appearance: "auto" }}>
                      <option value="">None</option>
                      {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Collection frequency">
                    <select value={newFreq} onChange={e => setNewFreq(e.target.value)}
                      style={{ ...inputStyle, appearance: "auto" }}>
                      <option value="">Select...</option>
                      {Object.keys(PERIOD_OPTIONS).map(f =>
                        <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <Btn variant="secondary" size="sm"
                    onClick={() => { setAddingInd(false); setNewIndText(""); }}>Cancel</Btn>
                  <Btn size="sm" onClick={handleAddIndicator}
                    disabled={!newIndText.trim() || savingInd}>
                    {savingInd ? "Adding..." : "Add indicator"}
                  </Btn>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <Btn variant="ghost" size="sm" onClick={() => setAddingInd(true)}
                  style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
                  + Add indicator
                </Btn>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Add Outcome Form ──────────────────────────────────────────────────────────
function AddOutcomeForm({ bow, onSaved, onCancel }) {
  const [title, setTitle]   = useState("");
  const [short, setShort]   = useState("");
  const [text, setText]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await api("/api/bow-outcomes", {
        method: "POST",
        body: JSON.stringify({ bow_id: bow.bow_id, title, short_title: short, text }),
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    } catch (e) {
      setError("Failed to add outcome.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="fade-in" style={{ border: `1px dashed ${BORDER}`, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED, marginBottom: 14 }}>
        New outcome
      </p>
      <Field label="Outcome title" required>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Improved data infrastructure adoption..." style={inputStyle} />
      </Field>
      <Field label="Short title" helper="Used in compact views.">
        <input type="text" value={short} onChange={e => setShort(e.target.value)}
          placeholder="Abbreviated label..." style={inputStyle} />
      </Field>
      <Field label="Description">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Narrative description of this outcome..."
          rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
        <Btn size="sm" onClick={save} disabled={!title.trim() || saving}>
          {saving ? "Adding..." : "Add outcome"}
        </Btn>
      </div>
    </Card>
  );
}

// ─── Execution Targets Section ─────────────────────────────────────────────────
function ExecutionTargetsSection({ targets: initTargets, bow, outcomes, user }) {
  const [targets, setTargets]       = useState(initTargets);
  const [editId, setEditId]         = useState(null);
  const [editText, setEditText]     = useState("");
  const [rationale, setRationale]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [adding, setAdding]         = useState(false);
  const [newYear, setNewYear]       = useState(String(CURRENT_YEAR));
  const [newText, setNewText]       = useState("");
  const [newOutcome, setNewOutcome] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const years = [...new Set(targets.map(t => t.year))].sort();

  const saveEdit = async (target_id) => {
    if (!rationale.trim()) return;
    setSaving(true);
    const res = await api(`/api/execution-targets/${target_id}`, {
      method: "PATCH",
      body: JSON.stringify({ text: editText, rationale, edited_by: user?.email }),
    });
    if (!res.error) {
      setTargets(prev => prev.map(t => t.target_id === target_id ? { ...t, text: editText } : t));
      setEditId(null); setEditText(""); setRationale("");
    }
    setSaving(false);
  };

  const addTarget = async () => {
    setSaving(true);
    const res = await api("/api/execution-targets", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, year: newYear,
        outcome_id: newOutcome || null, text: newText }),
    });
    if (!res.error) {
      const fresh = await api(`/api/bow/${bow.bow_id}/full`);
      setTargets(fresh.execution_targets || []);
      setAdding(false); setNewText(""); setNewYear(String(CURRENT_YEAR)); setNewOutcome("");
    }
    setSaving(false);
  };

  const deleteTarget = async (target_id) => {
    await api(`/api/execution-targets/${target_id}`, { method: "DELETE" });
    setTargets(prev => prev.filter(t => t.target_id !== target_id));
    setConfirmDel(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 14 }}>
        <SectionLabel>Execution Targets (Theory of Action)</SectionLabel>
        {!adding && (
          <Btn variant="ghost" size="sm" onClick={() => setAdding(true)}
            style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
            + Add target
          </Btn>
        )}
      </div>

      {targets.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 12 }}>
          No execution targets added yet.
        </p>
      )}

      {years.map(year => (
        <div key={year} style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8 }}>{year}</p>
          {targets.filter(t => t.year === year).map(t => (
            <div key={t.target_id} style={{ marginBottom: 8 }}>
              {editId === t.target_id ? (
                <div style={{ padding: "14px 16px", background: SURFACE,
                  border: `1px solid ${ACCENT_MID}`, borderRadius: 8 }}>
                  <Field label="Target text" required>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </Field>
                  <Field label="Rationale for change" required>
                    <textarea value={rationale} onChange={e => setRationale(e.target.value)}
                      placeholder="Why is this target wording changing?"
                      rows={2} style={{ ...inputStyle, resize: "vertical", borderColor: ACCENT }} />
                  </Field>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Btn variant="secondary" size="sm"
                      onClick={() => { setEditId(null); setRationale(""); }}>Cancel</Btn>
                    <Btn size="sm" onClick={() => saveEdit(t.target_id)}
                      disabled={!editText.trim() || !rationale.trim() || saving}>
                      {saving ? "Saving..." : "Save"}
                    </Btn>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "10px 14px", background: BG, borderRadius: 7,
                  border: `1px solid ${BORDER}`,
                  display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{t.text}</p>
                    {t.completion && (
                      <span style={{ fontSize: 11, fontWeight: 700, marginTop: 5,
                        display: "inline-block",
                        background: t.completion === "complete" ? SUCCESS_BG : WARNING_BG,
                        color: t.completion === "complete" ? SUCCESS : WARNING,
                        borderRadius: 4, padding: "2px 7px" }}>
                        {t.completion}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Btn variant="ghost" size="sm"
                      onClick={() => { setEditId(t.target_id); setEditText(t.text); }}>
                      Edit
                    </Btn>
                    {confirmDel === t.target_id ? (
                      <>
                        <Btn variant="danger" size="sm" onClick={() => deleteTarget(t.target_id)}>
                          Confirm
                        </Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>No</Btn>
                      </>
                    ) : (
                      <Btn variant="ghost" size="sm" onClick={() => setConfirmDel(t.target_id)}
                        style={{ color: DANGER, fontSize: 12 }}>Remove</Btn>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {adding && (
        <div className="fade-in" style={{ padding: "16px 18px", background: BG,
          border: `1px dashed ${BORDER}`, borderRadius: 8, marginTop: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 12 }}>
            New execution target
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <Field label="Year" required>
              <select value={newYear} onChange={e => setNewYear(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}>
                {TARGET_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Linked outcome">
              <select value={newOutcome} onChange={e => setNewOutcome(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">None</option>
                {outcomes.map(o => (
                  <option key={o.outcome_id} value={o.outcome_id}>{o.title}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Target text" required>
            <textarea value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="Describe the execution target or milestone..."
              rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm"
              onClick={() => { setAdding(false); setNewText(""); }}>Cancel</Btn>
            <Btn size="sm" onClick={addTarget} disabled={!newText.trim() || saving}>
              {saving ? "Adding..." : "Add target"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOW Content Table ────────────────────────────────────────────────────────
// Mirrors the slide layout: outcome rows × year columns for execution targets,
// then indicators as rows × year columns for targets & actuals.
function BowContentTable({ outcomes, executionTargets, bow, user, onRefresh }) {
  const p = PORT_COLORS[bow.portfolio_id];

  // Editing state
  const [editOutId, setEditOutId]       = useState(null);
  const [editTargetId, setEditTargetId] = useState(null);
  const [editIndId, setEditIndId]       = useState(null);
  const [submitIndId, setSubmitIndId]   = useState(null);
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [addingIndFor, setAddingIndFor] = useState(null); // outcome_id
  const [addingTargetFor, setAddingTargetFor] = useState(null); // {outcome_id, year}
  const [confirmDelOut, setConfirmDelOut]   = useState(null);
  const [confirmDelInd, setConfirmDelInd]   = useState(null);

  // Group execution targets by outcome_id → year → [targets]
  const tByOY = {};
  executionTargets.forEach(t => {
    const oid = t.outcome_id || "__";
    if (!tByOY[oid]) tByOY[oid] = {};
    if (!tByOY[oid][t.year]) tByOY[oid][t.year] = [];
    tByOY[oid][t.year].push(t);
  });

  const cellTargets = (oid, year) => (tByOY[oid || "__"] || {})[year] || [];

  const thStyle = { padding: "8px 12px", textAlign: "left", fontSize: 12,
    fontWeight: 700, color: TEXT_MUTED, background: BG,
    borderBottom: `2px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`,
    whiteSpace: "nowrap" };
  const tdStyle = { padding: "12px 14px", verticalAlign: "top", fontSize: 13,
    borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` };
  const yearColW = `${Math.floor(78 / TARGET_YEARS.length)}%`;

  // ── Outcome + Execution Targets table ───────────────────────────────────────
  const renderExecutionTable = () => (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>Outcomes & Execution Targets</SectionLabel>
        <Btn variant="ghost" size="sm" onClick={() => setAddingOutcome(true)}
          style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
          + Add outcome
        </Btn>
      </div>

      {addingOutcome && (
        <AddOutcomeForm bow={bow}
          onSaved={() => { setAddingOutcome(false); onRefresh(); }}
          onCancel={() => setAddingOutcome(false)} />
      )}

      {outcomes.length === 0 && !addingOutcome && (
        <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
          No outcomes added yet.
        </p>
      )}

      {outcomes.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse",
            tableLayout: "fixed", border: `1px solid ${BORDER}` }}>
            <colgroup>
              <col style={{ width: "22%" }} />
              {TARGET_YEARS.map(y => <col key={y} style={{ width: yearColW }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>Outcome</th>
                {TARGET_YEARS.map(y => (
                  <th key={y} style={{ ...thStyle, textAlign: "center" }}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((out, i) => {
                const isEditingOut = editOutId === out.outcome_id;
                return (
                  <React.Fragment key={out.outcome_id}>
                    {/* Outcome row */}
                    <tr>
                      {/* Left cell — outcome description */}
                      <td style={{ ...tdStyle, background: BG, verticalAlign: "top",
                        borderRight: `2px solid ${BORDER}` }}>
                        {isEditingOut ? (
                          <InlineEditOutcome outcome={out} user={user}
                            onSave={() => { setEditOutId(null); onRefresh(); }}
                            onCancel={() => setEditOutId(null)} />
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "flex-start",
                              justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 800,
                                background: p?.light || ACCENT_LIGHT, color: p?.dark || ACCENT,
                                borderRadius: 3, padding: "2px 6px", flexShrink: 0 }}>
                                O{i + 1}
                              </span>
                              <div style={{ display: "flex", gap: 3 }}>
                                <button onClick={() => setEditOutId(out.outcome_id)}
                                  style={{ background: "none", border: "none", cursor: "pointer",
                                    fontSize: 11, color: TEXT_MUTED, padding: "2px 4px" }}
                                  title="Edit outcome">✎</button>
                                {confirmDelOut === out.outcome_id ? (
                                  <>
                                    <button onClick={async () => {
                                      await api(`/api/bow-outcomes/${out.outcome_id}`, { method: "DELETE" });
                                      setConfirmDelOut(null); onRefresh();
                                    }} style={{ background: "none", border: "none", cursor: "pointer",
                                      fontSize: 11, color: DANGER, padding: "2px 4px", fontWeight: 700 }}>
                                      ✓ Remove
                                    </button>
                                    <button onClick={() => setConfirmDelOut(null)}
                                      style={{ background: "none", border: "none", cursor: "pointer",
                                        fontSize: 11, color: TEXT_MUTED, padding: "2px 4px" }}>✕</button>
                                  </>
                                ) : (
                                  <button onClick={() => setConfirmDelOut(out.outcome_id)}
                                    style={{ background: "none", border: "none", cursor: "pointer",
                                      fontSize: 11, color: TEXT_MUTED, padding: "2px 4px" }}
                                    title="Remove outcome">✕</button>
                                )}
                              </div>
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT,
                              lineHeight: 1.4, marginBottom: out.text ? 6 : 0 }}>
                              {out.title}
                            </p>
                            {out.text && (
                              <p style={{ fontSize: 12, color: TEXT_SUB, lineHeight: 1.5 }}>
                                {out.text}
                              </p>
                            )}
                          </>
                        )}
                      </td>

                      {/* Year cells — execution targets */}
                      {TARGET_YEARS.map(year => {
                        const targets = cellTargets(out.outcome_id, year);
                        const isAddingHere = addingTargetFor?.outcome_id === out.outcome_id
                          && addingTargetFor?.year === year;
                        return (
                          <td key={year} style={{ ...tdStyle, background: SURFACE }}>
                            {targets.map(t => (
                              <div key={t.target_id} style={{ marginBottom: 8 }}>
                                {editTargetId === t.target_id ? (
                                  <EditTargetInline target={t} user={user}
                                    onSave={() => { setEditTargetId(null); onRefresh(); }}
                                    onCancel={() => setEditTargetId(null)} />
                                ) : (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                                    <span style={{ color: p?.color || ACCENT, fontWeight: 700,
                                      fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                                      •
                                    </span>
                                    <span style={{ fontSize: 12, color: TEXT, lineHeight: 1.5,
                                      flex: 1 }}>
                                      {t.text}
                                    </span>
                                    <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
                                      <button onClick={() => setEditTargetId(t.target_id)}
                                        style={{ background: "none", border: "none",
                                          cursor: "pointer", fontSize: 10,
                                          color: TEXT_MUTED, padding: "0 3px" }}
                                        title="Edit">✎</button>
                                      <button onClick={async () => {
                                        await api(`/api/execution-targets/${t.target_id}`,
                                          { method: "DELETE" });
                                        onRefresh();
                                      }} style={{ background: "none", border: "none",
                                        cursor: "pointer", fontSize: 10,
                                        color: TEXT_MUTED, padding: "0 3px" }}
                                        title="Remove">✕</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {isAddingHere ? (
                              <AddTargetInline
                                bow={bow} outcomeId={out.outcome_id} year={year}
                                onSaved={() => { setAddingTargetFor(null); onRefresh(); }}
                                onCancel={() => setAddingTargetFor(null)} />
                            ) : (
                              <button
                                onClick={() => setAddingTargetFor({
                                  outcome_id: out.outcome_id, year })}
                                style={{ background: "none", border: "none", cursor: "pointer",
                                  fontSize: 11, color: TEXT_MUTED, padding: "2px 0",
                                  display: "block" }}>
                                + add
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Impact Indicators table ──────────────────────────────────────────────────
  const renderIndicatorsTable = () => {
    const allIndicators = outcomes.flatMap(o =>
      (o.indicators || []).map(i => ({ ...i, outcome_title: o.short_title || o.title,
        outcome_id: o.outcome_id }))
    );
    const hasIndicators = allIndicators.length > 0;

    return (
      <div>
        <SectionLabel style={{ marginBottom: 10 }}>Impact Indicators</SectionLabel>

        {!hasIndicators && (
          <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 8 }}>
            No indicators added yet.
          </p>
        )}

        {hasIndicators && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse",
              tableLayout: "fixed", border: `1px solid ${BORDER}` }}>
              <colgroup>
                <col style={{ width: "22%" }} />
                {TARGET_YEARS.map(y => <col key={y} style={{ width: yearColW }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={thStyle}>Impact Indicators</th>
                  {TARGET_YEARS.map(y => (
                    <th key={y} style={{ ...thStyle, textAlign: "center" }}>
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outcomes.map(out => {
                  const inds = out.indicators || [];
                  if (inds.length === 0 && addingIndFor !== out.outcome_id) return null;
                  return (
                    <React.Fragment key={out.outcome_id}>
                      {/* Outcome sub-header */}
                      <tr>
                        <td colSpan={TARGET_YEARS.length + 1}
                          style={{ ...tdStyle, background: BG, padding: "6px 14px",
                            borderRight: "none" }}>
                          <div style={{ display: "flex", alignItems: "center",
                            justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                              textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {out.short_title || out.title}
                            </span>
                            <button
                              onClick={() => setAddingIndFor(
                                addingIndFor === out.outcome_id ? null : out.outcome_id)}
                              style={{ background: "none", border: "none", cursor: "pointer",
                                fontSize: 11, color: ACCENT, fontWeight: 700, padding: "2px 0" }}>
                              + Add indicator
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Indicator rows */}
                      {inds.map(ind => {
                        const isEditing  = editIndId  === ind.indicator_id;
                        const isSubmitting = submitIndId === ind.indicator_id;
                        return (
                          <React.Fragment key={ind.indicator_id}>
                            <tr>
                              {/* Left cell — indicator name */}
                              <td style={{ ...tdStyle,
                                background: p?.light || ACCENT_LIGHT,
                                borderRight: `2px solid ${BORDER}` }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: p?.dark || BRAND,
                                  lineHeight: 1.4, marginBottom: 5 }}>
                                  {ind.text}
                                </p>
                                {ind.unit && (
                                  <span style={{ fontSize: 11, fontWeight: 700,
                                    background: SURFACE, color: ACCENT,
                                    borderRadius: 3, padding: "1px 5px",
                                    display: "inline-block", marginBottom: 4 }}>
                                    {ind.unit}
                                  </span>
                                )}
                                {ind.baseline != null && (
                                  <p style={{ fontSize: 11, color: TEXT_MUTED }}>
                                    Baseline: {ind.baseline}
                                    {ind.unit ? ` ${ind.unit}` : ""}
                                  </p>
                                )}
                                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                  <button
                                    onClick={() => setSubmitIndId(
                                      submitIndId === ind.indicator_id ? null : ind.indicator_id)}
                                    style={{ fontSize: 11, fontWeight: 700, cursor: "pointer",
                                      background: ACCENT, color: SURFACE, border: "none",
                                      borderRadius: 4, padding: "3px 8px" }}>
                                    Submit
                                  </button>
                                  <button
                                    onClick={() => setEditIndId(
                                      editIndId === ind.indicator_id ? null : ind.indicator_id)}
                                    style={{ fontSize: 11, fontWeight: 600, cursor: "pointer",
                                      background: SURFACE, color: TEXT_SUB,
                                      border: `1px solid ${BORDER}`,
                                      borderRadius: 4, padding: "3px 8px" }}>
                                    Edit
                                  </button>
                                  {confirmDelInd === ind.indicator_id ? (
                                    <>
                                      <button onClick={async () => {
                                        await api(`/api/bow-indicators/${ind.indicator_id}`,
                                          { method: "DELETE" });
                                        setConfirmDelInd(null); onRefresh();
                                      }} style={{ fontSize: 11, fontWeight: 700,
                                        cursor: "pointer", background: "none",
                                        border: "none", color: DANGER, padding: "3px 4px" }}>
                                        ✓ Remove
                                      </button>
                                      <button onClick={() => setConfirmDelInd(null)}
                                        style={{ fontSize: 11, cursor: "pointer",
                                          background: "none", border: "none",
                                          color: TEXT_MUTED, padding: "3px 4px" }}>✕</button>
                                    </>
                                  ) : (
                                    <button onClick={() => setConfirmDelInd(ind.indicator_id)}
                                      style={{ fontSize: 11, cursor: "pointer",
                                        background: "none", border: "none",
                                        color: TEXT_MUTED, padding: "3px 4px" }}
                                      title="Remove">✕</button>
                                  )}
                                </div>
                              </td>

                              {/* Year cells — T: target, A: actual */}
                              {TARGET_YEARS.map(year => {
                                const tval = ind[`target_${year}`];
                                const aval = ind.latest_actual_year === year
                                  ? ind.latest_actual : null;
                                return (
                                  <td key={year} style={{ ...tdStyle, textAlign: "center",
                                    background: SURFACE }}>
                                    {tval != null ? (
                                      <div style={{ marginBottom: aval != null ? 4 : 0 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700,
                                          color: TEXT_MUTED }}>T: </span>
                                        <span style={{ fontSize: 13, fontWeight: 700,
                                          color: TEXT }}>
                                          {tval}{ind.unit ? ` ${ind.unit}` : ""}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                                    )}
                                    {aval != null && (
                                      <div>
                                        <span style={{ fontSize: 10, fontWeight: 700,
                                          color: SUCCESS }}>A: </span>
                                        <span style={{ fontSize: 13, fontWeight: 700,
                                          color: SUCCESS }}>
                                          {aval}{ind.unit ? ` ${ind.unit}` : ""}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Expanded submit row */}
                            {isSubmitting && (
                              <tr>
                                <td colSpan={TARGET_YEARS.length + 1}
                                  style={{ padding: 0, borderBottom: `1px solid ${BORDER}` }}>
                                  <div style={{ padding: "16px 20px", background: ACCENT_LIGHT }}>
                                    <InlineSubmitForm
                                      indicator={ind} bow={bow}
                                      onClose={() => setSubmitIndId(null)}
                                      onSubmitted={() => setSubmitIndId(null)}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Expanded edit row */}
                            {isEditing && (
                              <tr>
                                <td colSpan={TARGET_YEARS.length + 1}
                                  style={{ padding: 0, borderBottom: `1px solid ${BORDER}` }}>
                                  <div style={{ padding: "16px 20px", background: BG }}>
                                    <InlineEditIndicator
                                      indicator={ind} user={user}
                                      onSave={() => { setEditIndId(null); onRefresh(); }}
                                      onCancel={() => setEditIndId(null)}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Add indicator row */}
                      {addingIndFor === out.outcome_id && (
                        <tr>
                          <td colSpan={TARGET_YEARS.length + 1}
                            style={{ padding: 0, borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ padding: "14px 20px", background: BG }}>
                              <AddIndicatorInline
                                bow={bow} outcomeId={out.outcome_id} user={user}
                                onSaved={() => { setAddingIndFor(null); onRefresh(); }}
                                onCancel={() => setAddingIndFor(null)} />
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
        )}

        {/* Add indicator for outcomes with no indicators yet */}
        {outcomes.filter(o => (o.indicators || []).length === 0 &&
          addingIndFor !== o.outcome_id).map(o => (
          <div key={o.outcome_id} style={{ marginTop: 8 }}>
            <Btn variant="ghost" size="sm"
              onClick={() => setAddingIndFor(o.outcome_id)}
              style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
              + Add indicator to {o.short_title || o.title}
            </Btn>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {renderExecutionTable()}
      {renderIndicatorsTable()}
    </div>
  );
}

// ─── Small inline helpers for table editing ───────────────────────────────────
function EditTargetInline({ target, user, onSave, onCancel }) {
  const [text, setText]           = useState(target.text || "");
  const [rationale, setRationale] = useState("");
  const [saving, setSaving]       = useState(false);

  const save = async () => {
    if (!rationale.trim()) return;
    setSaving(true);
    const res = await api(`/api/execution-targets/${target.target_id}`, {
      method: "PATCH",
      body: JSON.stringify({ text, rationale, edited_by: user?.email }),
    });
    if (!res.error) onSave();
    setSaving(false);
  };

  return (
    <div style={{ fontSize: 12 }}>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={3} style={{ ...inputStyle, fontSize: 12, marginBottom: 6, resize: "vertical" }} />
      <textarea value={rationale} onChange={e => setRationale(e.target.value)}
        placeholder="Rationale for change (required)..."
        rows={2} style={{ ...inputStyle, fontSize: 12, marginBottom: 6,
          borderColor: ACCENT, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 4 }}>
        <Btn size="sm" onClick={save} disabled={!text.trim() || !rationale.trim() || saving}>
          {saving ? "…" : "Save"}
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddTargetInline({ bow, outcomeId, year, onSaved, onCancel }) {
  const [text, setText]     = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await api("/api/execution-targets", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, outcome_id: outcomeId, year, text }),
    });
    if (!res.error) onSaved();
    setSaving(false);
  };

  return (
    <div style={{ fontSize: 12 }}>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Target text..."
        rows={3} style={{ ...inputStyle, fontSize: 12, marginBottom: 6, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 4 }}>
        <Btn size="sm" onClick={save} disabled={!text.trim() || saving}>
          {saving ? "…" : "Add"}
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddIndicatorInline({ bow, outcomeId, user, onSaved, onCancel }) {
  const [text, setText]   = useState("");
  const [unit, setUnit]   = useState("");
  const [freq, setFreq]   = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await api("/api/bow-indicators", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, outcome_id: outcomeId,
        text, unit: unit || null, collection_frequency: freq || null }),
    });
    if (!res.error) onSaved();
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        <Field label="Indicator" required>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Describe what this indicator measures..."
            rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
        <Field label="Unit">
          <select value={unit} onChange={e => setUnit(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">None</option>
            {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
        <Field label="Frequency">
          <select value={freq} onChange={e => setFreq(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">Select...</option>
            {Object.keys(PERIOD_OPTIONS).map(f =>
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn size="sm" onClick={save} disabled={!text.trim() || saving}>
          {saving ? "Adding..." : "Add indicator"}
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── BOW Panel ─────────────────────────────────────────────────────────────────
function BowPanel({ bow, user, onBack }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [outcomes, setOutcomes] = useState([]);

  const load = () => {
    setLoading(true);
    api(`/api/bow/${bow.bow_id}/full`)
      .then(d => { setData(d); setOutcomes(d.outcomes || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bow.bow_id]);

  const p = PORT_COLORS[bow.portfolio_id];

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 0" }}>
      <Skeleton height={40} /><Skeleton height={300} /><Skeleton height={300} />
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: TEXT_MUTED, fontWeight: 600, padding: 0,
            textDecoration: "underline" }}>
          ← All BOWs
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{bow.title}</h2>
          {p && <PortfolioPill portfolioId={bow.portfolio_id} />}
        </div>
      </div>

      <BowContentTable
        outcomes={outcomes}
        executionTargets={data?.execution_targets || []}
        bow={bow} user={user}
        onRefresh={load}
      />
    </div>
  );
}

// ─── Portfolio Panel ────────────────────────────────────────────────────────────
function PortfolioPanel({ portfolio, user, onBack }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [outcomes, setOutcomes]     = useState([]);
  const [addingOut, setAddingOut]   = useState(false);
  const [editOutId, setEditOutId]   = useState(null);
  const [newOutTitle, setNewOutTitle] = useState("");
  const [saving, setSaving]         = useState(false);

  const p = PORT_COLORS[portfolio.portfolio_id];

  const load = () => {
    setLoading(true);
    api(`/api/portfolio/${portfolio.portfolio_id}/full`)
      .then(d => { setData(d); setOutcomes(d.outcomes || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [portfolio.portfolio_id]);

  const addOutcome = async () => {
    if (!newOutTitle.trim()) return;
    setSaving(true);
    const res = await api("/api/portfolio-outcomes", {
      method: "POST",
      body: JSON.stringify({ portfolio_id: portfolio.portfolio_id, title: newOutTitle }),
    });
    if (!res.error) { load(); setAddingOut(false); setNewOutTitle(""); }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 0" }}>
      <Skeleton height={40} /><Skeleton height={220} /><Skeleton height={220} />
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: TEXT_MUTED, fontWeight: 600, padding: 0,
            textDecoration: "underline" }}>
          ← All portfolios
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>
            {p?.label || portfolio.title}
          </h2>
          {p && <span style={{ width: 10, height: 10, borderRadius: "50%",
            background: p.color, display: "inline-block" }} />}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14 }}>
          <SectionLabel>Portfolio Outcomes & Indicators</SectionLabel>
          {!addingOut && (
            <Btn variant="ghost" size="sm" onClick={() => setAddingOut(true)}
              style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
              + Add outcome
            </Btn>
          )}
        </div>

        {addingOut && (
          <Card className="fade-in" style={{ border: `1px dashed ${BORDER}`, marginBottom: 16 }}>
            <Field label="Outcome title" required>
              <input type="text" value={newOutTitle} onChange={e => setNewOutTitle(e.target.value)}
                placeholder="e.g. Improved data system access..." style={inputStyle} />
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="secondary" size="sm"
                onClick={() => { setAddingOut(false); setNewOutTitle(""); }}>Cancel</Btn>
              <Btn size="sm" onClick={addOutcome} disabled={!newOutTitle.trim() || saving}>
                {saving ? "Adding..." : "Add outcome"}
              </Btn>
            </div>
          </Card>
        )}

        {outcomes.length === 0 && !addingOut && (
          <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
            No outcomes added yet.
          </p>
        )}

        {outcomes.map((out, i) => {
          const indicators = out.indicators || [];
          return (
            <Card key={out.outcome_id} style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "12px 18px", background: BG,
                borderBottom: `1px solid ${BORDER}`,
                display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800,
                  background: p?.light || ACCENT_LIGHT, color: p?.dark || ACCENT,
                  borderRadius: 4, padding: "2px 7px" }}>
                  PO{i + 1}
                </span>
                <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: TEXT }}>
                  {out.title}
                </p>
                <Btn variant="secondary" size="sm"
                  onClick={() => setEditOutId(editOutId === out.outcome_id ? null : out.outcome_id)}>
                  {editOutId === out.outcome_id ? "Cancel" : "Edit"}
                </Btn>
                <Btn variant="ghost" size="sm"
                  onClick={async () => {
                    await api(`/api/portfolio-outcomes/${out.outcome_id}`, { method: "DELETE" });
                    setOutcomes(prev => prev.filter(o => o.outcome_id !== out.outcome_id));
                  }}
                  style={{ color: DANGER, fontSize: 12 }}>Remove</Btn>
              </div>

              {editOutId === out.outcome_id && (
                <div style={{ padding: 18 }}>
                  <InlineEditOutcome
                    outcome={out} user={user} isPortfolio
                    onSave={updated => {
                      setOutcomes(prev => prev.map(o =>
                        o.outcome_id === out.outcome_id ? { ...o, ...updated } : o));
                      setEditOutId(null);
                    }}
                    onCancel={() => setEditOutId(null)}
                  />
                </div>
              )}

              <div style={{ padding: "12px 18px" }}>
                {indicators.length === 0 && (
                  <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 10 }}>
                    No indicators yet.
                  </p>
                )}
                {indicators.map(ind => (
                  <IndicatorRow key={ind.indicator_id}
                    indicator={{ ...ind, portfolio_id: portfolio.portfolio_id }}
                    bow={{ bow_id: portfolio.portfolio_id, portfolio_id: null }}
                    user={user} isPortfolio
                    onDeleted={id => setOutcomes(prev => prev.map(o =>
                      o.outcome_id === out.outcome_id
                        ? { ...o, indicators: o.indicators.filter(i => i.indicator_id !== id) }
                        : o
                    ))}
                    onUpdated={upd => setOutcomes(prev => prev.map(o =>
                      o.outcome_id === out.outcome_id
                        ? { ...o, indicators: o.indicators.map(i =>
                            i.indicator_id === upd.indicator_id ? { ...i, ...upd } : i) }
                        : o
                    ))}
                  />
                ))}
                <div style={{ marginTop: 10 }}>
                  <Btn variant="ghost" size="sm"
                    onClick={async () => {
                      const text = window.prompt("New indicator:");
                      if (!text?.trim()) return;
                      await api("/api/portfolio-indicators", {
                        method: "POST",
                        body: JSON.stringify({ portfolio_id: portfolio.portfolio_id,
                          outcome_id: out.outcome_id, text: text.trim() }),
                      });
                      load();
                    }}
                    style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
                    + Add indicator
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── BOW + Portfolio List ──────────────────────────────────────────────────────
function BowPortfolioList({ bows, portfolios, onSelectBow, onSelectPortfolio }) {
  const [view, setView] = useState("bows");

  const bowsByPortfolio = portfolios.map(p => ({
    portfolio: p,
    bows: bows.filter(b => b.portfolio_id === p.portfolio_id),
  }));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[{ id: "bows", label: "Bodies of Work" },
          { id: "portfolios", label: "Portfolios" }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: `1px solid ${view === v.id ? ACCENT : BORDER}`,
              background: view === v.id ? ACCENT_LIGHT : SURFACE,
              color: view === v.id ? ACCENT : TEXT_SUB }}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "bows" && bowsByPortfolio.map(({ portfolio, bows: pbows }) => {
        const p = PORT_COLORS[portfolio.portfolio_id];
        return (
          <div key={portfolio.portfolio_id} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {p && <span style={{ width: 10, height: 10, borderRadius: "50%",
                background: p.color, display: "inline-block" }} />}
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED,
                textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {p?.label || portfolio.portfolio_id}
              </p>
            </div>
            {pbows.length === 0 && (
              <p style={{ fontSize: 13, color: TEXT_MUTED, paddingLeft: 14 }}>
                No BOWs in this portfolio.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pbows.map(bow => (
                <div key={bow.bow_id} onClick={() => onSelectBow(bow)}
                  style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px", background: SURFACE, borderRadius: 9,
                    border: `1px solid ${BORDER}`, cursor: "pointer",
                    borderLeft: `4px solid ${p?.color || BRAND}`,
                    transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(48,58,68,0.10)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{bow.title}</p>
                  <span style={{ fontSize: 12, color: TEXT_MUTED, flexShrink: 0 }}>Open →</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {view === "portfolios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portfolios.map(portfolio => {
            const p = PORT_COLORS[portfolio.portfolio_id];
            return (
              <div key={portfolio.portfolio_id}
                onClick={() => onSelectPortfolio(portfolio)}
                style={{ display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px", background: SURFACE, borderRadius: 9,
                  border: `1px solid ${BORDER}`, cursor: "pointer",
                  borderLeft: `4px solid ${p?.color || BRAND}`,
                  transition: "box-shadow 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(48,58,68,0.10)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p && <span style={{ width: 12, height: 12, borderRadius: "50%",
                    background: p.color, display: "inline-block" }} />}
                  <p style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                    {p?.label || portfolio.title}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>Open →</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder for old SubmitForm (now unused — kept to avoid ref errors) ───
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

// ─── Activity Feed ─────────────────────────────────────────────────────────────
function ActivityFeed({ bows, portfolios }) {
  const [feed, setFeed]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [bowFilter, setBowFilter]   = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (bowFilter) params.set("bow_id", bowFilter);
    api(`/api/activity-feed?${params}`)
      .then(d => setFeed(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [typeFilter, bowFilter]);

  const fmtDate = ts => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ts.slice(0, 10); }
  };

  const fmtActor = actor => actor?.split("@")[0] || actor || "Unknown";

  const entityLabel = type => ({
    bow_outcome:           "BOW Outcome",
    bow_indicator:         "BOW Indicator",
    execution_target:      "Execution Target",
    portfolio_outcome:     "Portfolio Outcome",
    portfolio_indicator:   "Portfolio Indicator",
  }[type] || type);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "all", label: "All activity" },
            { id: "edit", label: "Content edits" },
            { id: "submission", label: "Submissions" }].map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: `1px solid ${typeFilter === f.id ? ACCENT : BORDER}`,
                background: typeFilter === f.id ? ACCENT_LIGHT : SURFACE,
                color: typeFilter === f.id ? ACCENT : TEXT_SUB }}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={bowFilter} onChange={e => setBowFilter(e.target.value)}
          style={{ ...inputStyle, width: "auto", fontSize: 13, padding: "5px 10px" }}>
          <option value="">All BOWs</option>
          {bows.map(b => <option key={b.bow_id} value={b.bow_id}>{b.title}</option>)}
        </select>
        <Btn variant="secondary" size="sm" onClick={load}>Refresh</Btn>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton height={80} /><Skeleton height={80} /><Skeleton height={80} />
        </div>
      ) : feed.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: TEXT_MUTED, fontSize: 14 }}>No activity yet.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feed.map(item => {
            const isEdit = item.type === "edit";
            const borderColor = isEdit ? ACCENT : BRAND;
            const changes = (() => {
              try { return typeof item.changes === "string" ? JSON.parse(item.changes) : (item.changes || {}); }
              catch { return {}; }
            })();
            const changedFields = Object.keys(changes);

            return (
              <Card key={item.id} className="fade-in"
                style={{ padding: "14px 18px", borderLeft: `4px solid ${borderColor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type tag + entity + BOW */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 4,
                        padding: "2px 7px",
                        background: isEdit ? ACCENT_LIGHT : BG,
                        color: isEdit ? ACCENT : TEXT_MUTED }}>
                        {isEdit ? entityLabel(item.entity_type) : "Submission"}
                      </span>
                      {item.bow_title && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED }}>
                          {item.bow_title}
                        </span>
                      )}
                      {!isEdit && item.status && (
                        <Badge status={item.status} />
                      )}
                    </div>

                    {/* Main content */}
                    {isEdit ? (
                      <div>
                        {changedFields.length > 0 ? changedFields.map(f => (
                          <div key={f} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                              textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {f.replace(/_/g, " ")}
                            </span>
                            {changes[f].new && (
                              <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.4, marginTop: 2 }}>
                                {String(changes[f].new).length > 120
                                  ? String(changes[f].new).slice(0, 120) + "…"
                                  : changes[f].new}
                              </p>
                            )}
                          </div>
                        )) : (
                          <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
                            Content updated
                          </p>
                        )}
                        {item.rationale && (
                          <p style={{ fontSize: 12, color: TEXT_SUB, marginTop: 6,
                            fontStyle: "italic" }}>
                            Rationale: {item.rationale}
                          </p>
                        )}
                        {item.revision_reason && (
                          <p style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>
                            Reason: {REVISION_REASONS.find(r => r.value === item.revision_reason)?.label
                              || item.revision_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>
                          {item.indicator_text || `${item.entity_id}`}
                        </p>
                        <p style={{ fontSize: 13, color: TEXT_SUB, marginTop: 3 }}>
                          Value:{" "}
                          <strong style={{ color: ACCENT }}>{item.submitted_value}</strong>
                          {item.period && <span> · {item.period}</span>}
                          {item.year  && <span> · {item.year}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>
                      {fmtActor(item.actor)}
                    </p>
                    <p style={{ fontSize: 11, color: TEXT_MUTED }}>{fmtDate(item.ts)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
function PortalApp() {
  injectStyle();

  const [user, setUser]             = useState(null);
  const [tab, setTab]               = useState("content");
  const [bows, setBows]             = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [queue, setQueue]           = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedBow, setSelectedBow]           = useState(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  useEffect(() => {
    Promise.all([
      api("/api/me").catch(() => null),
      api("/api/bows").catch(() => []),
      api("/api/portfolios").catch(() => []),
      api("/api/indicators/all").catch(() => []),
    ]).then(([u, b, p, i]) => {
      if (u) setUser(u);
      setBows(Array.isArray(b) ? b : []);
      setPortfolios(Array.isArray(p) ? p : []);
      setIndicators(Array.isArray(i) ? i : []);
      setLoadingData(false);
    });
  }, []);

  const loadQueue = () => {
    setLoadingQueue(true);
    api("/api/pending-actuals?status=pending").then(setQueue).finally(() => setLoadingQueue(false));
  };

  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab]);

  const canReview = user?.permission_level === "MLE" || user?.permission_level === "Leadership";

  const tabs = [
    { id: "content", label: "BOWs & Portfolios" },
    { id: "insight", label: "Share an Insight" },
    { id: "activity", label: "Activity" },
    ...(canReview ? [{ id: "queue", label: `Review Queue${queue.length ? ` (${queue.length})` : ""}` }] : []),
  ];

  const handleSelectBow = bow => {
    setSelectedBow(bow);
    setSelectedPortfolio(null);
  };
  const handleSelectPortfolio = portfolio => {
    setSelectedPortfolio(portfolio);
    setSelectedBow(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      {/* Header */}
      <div style={{ background: BRAND, padding: "0 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
              Measurement & Insights
            </span>
            <span style={{ fontSize: 13, color: ACCENT, marginLeft: 10, fontWeight: 600 }}>
              Data Hub
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

      {/* Tab nav */}
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

      {/* Page content — wider for BOW panels */}
      <div style={{ padding: "36px 32px", maxWidth: 980, margin: "0 auto" }}>

        {tab === "content" && (
          <>
            {!selectedBow && !selectedPortfolio && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                    BOWs & Portfolios
                  </h1>
                  <p style={{ fontSize: 14, color: TEXT_SUB, lineHeight: 1.6 }}>
                    Select a Body of Work or Portfolio to view its outcomes, indicators, and
                    execution targets — submit data or edit content directly from here.
                  </p>
                </div>
                {loadingData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Skeleton height={52} /><Skeleton height={52} /><Skeleton height={52} />
                  </div>
                ) : (
                  <BowPortfolioList
                    bows={bows} portfolios={portfolios}
                    onSelectBow={handleSelectBow}
                    onSelectPortfolio={handleSelectPortfolio}
                  />
                )}
              </>
            )}

            {selectedBow && (
              <BowPanel bow={selectedBow} user={user}
                onBack={() => setSelectedBow(null)} />
            )}

            {selectedPortfolio && (
              <PortfolioPanel portfolio={selectedPortfolio} user={user}
                onBack={() => setSelectedPortfolio(null)} />
            )}
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

        {tab === "activity" && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 24 }}>
              Activity
            </h1>
            <ActivityFeed bows={bows} portfolios={portfolios} />
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
