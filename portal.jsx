const { useState, useEffect, useRef } = React;

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

const MEASUREMENT_LEVELS = [
  { value: "bow",       label: "BOW" },
  { value: "portfolio", label: "Portfolio" },
  { value: "strategy",  label: "Strategy" },
  { value: "other",     label: "Other" },
];

const INDICATOR_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft",  label: "Draft" },
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
  }).then(async r => {
    const text = await r.text();
    try { return JSON.parse(text); }
    catch { return { error: `Server error ${r.status}: ${text.slice(0, 200)}` }; }
  });
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
  const [year, setYear]            = useState(String(CURRENT_YEAR));
  const [period, setPeriod]        = useState("");
  const [readingDate, setDate]     = useState(TODAY);
  const [sourceName, setSrcName]   = useState("");
  const [sourceType, setSrcType]   = useState("");
  const [sourceOther, setSrcOther] = useState("");
  const [sourceUrl, setSrcUrl]     = useState("");
  const [notes, setNotes]          = useState("");
  const [submitting, setSubmitting]= useState(false);
  const [error, setError]          = useState(null);

  const canSubmit = value && year && sourceName.trim() && sourceType && readingDate
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
          year: parseInt(year, 10), period: period || null,
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

      {/* Reporting year + period + value on one row */}
      <div style={{ display: "grid",
        gridTemplateColumns: periodOptions.length ? "1fr 1fr 1fr" : "1fr 1fr",
        gap: 12, marginBottom: 4 }}>
        <Field label="Reporting year" required
          helper="Which strategy year does this data count toward?">
          <select value={year} onChange={e => setYear(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            {TARGET_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
        <Field label={`Value${indicator.unit ? ` (${indicator.unit})` : ""}`} required>
          <input type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder="Enter value..." style={inputStyle} />
        </Field>
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

// ─── Source Picker (with inline create) ────────────────────────────────────────
function SourcePickerInline({ sourceId, roundId, onChange, user, showRounds = false }) {
  const [sources, setSources]           = useState([]);
  const [rounds, setRounds]             = useState([]);
  const [creating, setCreating]         = useState(false);
  const [creatingRound, setCreatingRound] = useState(false);
  const [saving, setSaving]             = useState(false);

  const [newName, setNewName]           = useState("");
  const [newType, setNewType]           = useState("");
  const [newUrl, setNewUrl]             = useState("");
  const [newOwner, setNewOwner]         = useState("");
  const [newCoverage, setNewCoverage]   = useState("");

  const [newRoundLabel, setNewRoundLabel]   = useState("");
  const [newRoundDate, setNewRoundDate]     = useState("");
  const [newRoundDocUrl, setNewRoundDocUrl] = useState("");
  const [newRoundNotes, setNewRoundNotes]   = useState("");

  useEffect(() => {
    api("/api/sources").then(d => setSources(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (sourceId) {
      api(`/api/sources/${sourceId}/rounds`).then(d => setRounds(Array.isArray(d) ? d : []));
    } else {
      setRounds([]);
    }
  }, [sourceId]);

  const handleSourceSel = (val) => {
    if (val === "__new__") { setCreating(true); return; }
    onChange(val || null, null);
  };

  const createSource = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await api("/api/sources", {
      method: "POST",
      body: JSON.stringify({ source_name: newName, source_type: newType || null,
        source_url: newUrl || null, owner: newOwner || null,
        coverage_notes: newCoverage || null, created_by: user?.email }),
    });
    if (!res.error) {
      const added = { source_id: res.source_id, source_name: newName, source_type: newType };
      setSources(prev => [...prev, added]);
      onChange(res.source_id, null);
      setCreating(false);
      setNewName(""); setNewType(""); setNewUrl(""); setNewOwner(""); setNewCoverage("");
    }
    setSaving(false);
  };

  const createRound = async () => {
    if (!newRoundLabel.trim()) return;
    setSaving(true);
    const res = await api(`/api/sources/${sourceId}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round_label: newRoundLabel, collection_date: newRoundDate || null,
        document_url: newRoundDocUrl || null, notes: newRoundNotes || null,
        created_by: user?.email }),
    });
    if (!res.error) {
      const added = { round_id: res.round_id, round_label: newRoundLabel, collection_date: newRoundDate };
      setRounds(prev => [...prev, added]);
      onChange(sourceId, res.round_id);
      setCreatingRound(false);
      setNewRoundLabel(""); setNewRoundDate(""); setNewRoundDocUrl(""); setNewRoundNotes("");
    }
    setSaving(false);
  };

  return (
    <div>
      {!creating ? (
        <select value={sourceId || ""} onChange={e => handleSourceSel(e.target.value)}
          style={{ ...inputStyle, appearance: "auto" }}>
          <option value="">No source linked</option>
          {sources.map(s => (
            <option key={s.source_id} value={s.source_id}>{s.source_name}
              {s.source_type ? ` — ${SOURCE_TYPES.find(t => t.value === s.source_type)?.label || s.source_type}` : ""}
            </option>
          ))}
          <option value="__new__">+ Create new source…</option>
        </select>
      ) : (
        <div style={{ padding: 12, background: BG, border: `1px solid ${BORDER}`,
          borderRadius: 6, marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: 0.5 }}>New Source</p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
            <Field label="Source name" required>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Annual Team Survey 2025" style={inputStyle} />
            </Field>
            <Field label="Type">
              <select value={newType} onChange={e => setNewType(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">Select…</option>
                {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <Field label="URL / file link">
              <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://…" style={inputStyle} />
            </Field>
            <Field label="Owner / contact">
              <input type="text" value={newOwner} onChange={e => setNewOwner(e.target.value)}
                style={inputStyle} />
            </Field>
          </div>
          <Field label="Coverage notes">
            <input type="text" value={newCoverage} onChange={e => setNewCoverage(e.target.value)}
              placeholder="e.g. Covers grantees in SSA, 2023–present" style={inputStyle} />
          </Field>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Btn size="sm" onClick={createSource} disabled={!newName.trim() || saving}>
              {saving ? "Saving…" : "Save source"}
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => setCreating(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {sourceId && !creating && showRounds && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
            display: "block", marginBottom: 3 }}>Round / collection event</label>
          {!creatingRound ? (
            <select value={roundId || ""} onChange={e => {
                if (e.target.value === "__new__") { setCreatingRound(true); return; }
                onChange(sourceId, e.target.value || null);
              }} style={{ ...inputStyle, appearance: "auto" }}>
              <option value="">No specific round</option>
              {rounds.map(r => (
                <option key={r.round_id} value={r.round_id}>
                  {r.round_label}{r.collection_date ? ` (${r.collection_date})` : ""}
                </option>
              ))}
              <option value="__new__">+ Add new round…</option>
            </select>
          ) : (
            <div style={{ padding: 12, background: BG, border: `1px solid ${BORDER}`,
              borderRadius: 6, marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 8,
                textTransform: "uppercase", letterSpacing: 0.5 }}>New Collection Round</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <Field label="Round label" required>
                  <input type="text" value={newRoundLabel} onChange={e => setNewRoundLabel(e.target.value)}
                    placeholder="e.g. 2025 Annual, Q3 2025" style={inputStyle} />
                </Field>
                <Field label="Collection date">
                  <input type="date" value={newRoundDate} onChange={e => setNewRoundDate(e.target.value)}
                    style={inputStyle} />
                </Field>
              </div>
              <Field label="Document URL">
                <input type="text" value={newRoundDocUrl} onChange={e => setNewRoundDocUrl(e.target.value)}
                  placeholder="Link to PDF, spreadsheet, etc." style={inputStyle} />
              </Field>
              <Field label="Notes">
                <input type="text" value={newRoundNotes} onChange={e => setNewRoundNotes(e.target.value)}
                  style={inputStyle} />
              </Field>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Btn size="sm" onClick={createRound} disabled={!newRoundLabel.trim() || saving}>
                  {saving ? "Saving…" : "Save round"}
                </Btn>
                <Btn variant="secondary" size="sm" onClick={() => setCreatingRound(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Edit Indicator ─────────────────────────────────────────────────────
function InlineEditIndicatorLinked({ indicator, onCancel, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    await api(`/api/portfolio-indicators/${indicator.indicator_id}`, { method: "DELETE" });
    setDeleting(false);
    if (onDeleted) onDeleted();
  };

  return (
    <div className="fade-in" style={{ padding: "16px 20px", background: SURFACE,
      border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 8 }}>
      <div style={{ padding: "10px 14px", background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 6, marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Linked BOW indicator — edit name, targets, and metadata on the BOW page
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: indicator.text && indicator.name ? 4 : 0 }}>
          {indicator.name || indicator.text}
        </p>
        {indicator.text && indicator.name && (
          <p style={{ fontSize: 12, color: TEXT_SUB }}>{indicator.text}</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Close</Btn>
      </div>
      <div style={{ paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
        {confirmDelete ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: DANGER, flexGrow: 1 }}>
              Remove this indicator from the portfolio?
            </span>
            <button onClick={doDelete} disabled={deleting}
              style={{ fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: DANGER, color: SURFACE, border: "none",
                borderRadius: 4, padding: "3px 10px" }}>
              {deleting ? "Removing…" : "Yes, remove"}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 12, cursor: "pointer", background: "none",
                border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3px 8px",
                color: TEXT_SUB }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: TEXT_MUTED, padding: 0, textDecoration: "underline" }}>
            Remove from portfolio
          </button>
        )}
      </div>
    </div>
  );
}

function InlineEditIndicator({ indicator, onSave, onCancel, onDeleted, user, isPortfolio }) {
  // For linked portfolio indicators, use the simplified targets-only form
  if (isPortfolio && indicator.bow_indicator_id) {
    return <InlineEditIndicatorLinked indicator={indicator} onSave={onSave}
      onCancel={onCancel} onDeleted={onDeleted} user={user} />;
  }

  const [iname, setIname]         = useState(indicator.name || "");
  const [itext, setItext]         = useState(indicator.text || "");
  const [purpose, setPurpose]     = useState(indicator.purpose || "");
  const [measureLevel, setML]     = useState(indicator.measurement_level || "");
  const [indStatus, setStatus]      = useState(indicator.status || "active");
  const [qualityNotes, setQN]       = useState(indicator.data_quality_notes || "");
  const [trackingNotes, setTN]  = useState(indicator.tracking_notes || "");
  const [sourceId, setSourceId] = useState(indicator.source_id || null);
  const [unit, setUnit]           = useState(indicator.unit || "");
  const [freq, setFreq]           = useState(indicator.collection_frequency || "");
  const [baseline, setBase]       = useState(String(indicator.baseline ?? ""));
  const [targets, setTargets]     = useState(
    TARGET_YEARS.reduce((a, y) => ({ ...a, [y]: String(indicator[`target_${y}`] ?? "") }), {})
  );
  const [rationale, setRationale]       = useState("");
  const [revReason, setRevReason]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const nameChanged    = iname !== (indicator.name || "");
  const textChanged    = itext !== (indicator.text || "");
  const targetsChanged = TARGET_YEARS.some(y => targets[y] !== String(indicator[`target_${y}`] ?? ""));
  const majorChanged   = nameChanged || textChanged;
  const canSave = (iname.trim() || itext.trim())
    && (!majorChanged   || rationale.trim())
    && (!targetsChanged || revReason);

  const save = async () => {
    setSaving(true); setError(null);
    const endpoint = isPortfolio
      ? `/api/portfolio-indicators/${indicator.indicator_id}`
      : `/api/bow-indicators/${indicator.indicator_id}`;
    const body = {
      name: iname || null,
      text: itext, purpose: purpose || null,
      measurement_level: measureLevel || null,
      status: indStatus,
      data_quality_notes: qualityNotes || null,
      tracking_notes: trackingNotes || null,
      source_id: sourceId || null,
      unit, collection_frequency: freq, baseline: baseline || null,
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

  const doDelete = async () => {
    setDeleting(true);
    const endpoint = isPortfolio
      ? `/api/portfolio-indicators/${indicator.indicator_id}`
      : `/api/bow-indicators/${indicator.indicator_id}`;
    await api(endpoint, { method: "DELETE" });
    setDeleting(false);
    if (onDeleted) onDeleted();
  };

  const SectionHead = ({ label }) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase",
      letterSpacing: 0.6, marginBottom: 8, marginTop: 16, paddingTop: 12,
      borderTop: `1px solid ${BORDER}` }}>{label}</p>
  );

  return (
    <div className="fade-in" style={{ padding: "16px 20px", background: SURFACE,
      border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 8 }}>

      {/* ── Core identification ── */}
      <Field label="Indicator name" required
        helper="Short, clear name used to identify this indicator across the platform.">
        <input type="text" value={iname} onChange={e => setIname(e.target.value)}
          placeholder="e.g. % of grantees with AI-ready data infrastructure" style={inputStyle} />
      </Field>
      <Field label="Description"
        helper="What exactly is being measured — full definition, methodology, scope.">
        <textarea value={itext} onChange={e => setItext(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Purpose"
        helper="Why this indicator matters — what decision or learning it informs.">
        <textarea value={purpose} onChange={e => setPurpose(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      {/* ── Source ── */}
      <Field label="Source">
        <SourcePickerInline sourceId={sourceId} roundId={null}
          onChange={(sid) => setSourceId(sid)}
          user={user} />
      </Field>

      {/* ── Classification ── */}
      <SectionHead label="Classification" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Field label="Measurement level">
          <select value={measureLevel} onChange={e => setML(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            <option value="">Select…</option>
            {MEASUREMENT_LEVELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={indStatus} onChange={e => setStatus(e.target.value)}
            style={{ ...inputStyle, appearance: "auto" }}>
            {INDICATOR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Data ── */}
      <SectionHead label="Unit & Collection" />
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
            <option value="">Select…</option>
            {Object.keys(PERIOD_OPTIONS).map(f =>
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8 }}>Baseline & Targets</p>
      <div style={{ display: "grid",
        gridTemplateColumns: `repeat(${TARGET_YEARS.length + 1}, 1fr)`, gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
            display: "block", marginBottom: 3 }}>Baseline</label>
          <input type="number" value={baseline} onChange={e => setBase(e.target.value)}
            style={{ ...inputStyle, textAlign: "right" }} />
        </div>
        {TARGET_YEARS.map(y => (
          <div key={y}>
            <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
              display: "block", marginBottom: 3 }}>{y}</label>
            <input type="number" value={targets[y]}
              onChange={e => setTargets(t => ({ ...t, [y]: e.target.value }))}
              style={{ ...inputStyle, textAlign: "right" }} />
          </div>
        ))}
      </div>

      {/* ── Notes ── */}
      <SectionHead label="Notes" />
      <Field label="Data quality notes" helper="Known limitations, caveats, or gaps with this indicator's data.">
        <textarea value={qualityNotes} onChange={e => setQN(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Tracking details" helper="How and where this indicator is tracked, any context for the team.">
        <textarea value={trackingNotes} onChange={e => setTN(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      {/* ── Change rationale (conditional) ── */}
      {majorChanged && (
        <Field label="Rationale for change" required>
          <textarea value={rationale} onChange={e => setRationale(e.target.value)}
            placeholder="Why is the indicator name or description changing?"
            rows={2} style={{ ...inputStyle, resize: "vertical", borderColor: ACCENT }} />
        </Field>
      )}
      {targetsChanged && (
        <Field label="Reason for target revision" required>
          <select value={revReason} onChange={e => setRevReason(e.target.value)}
            style={{ ...inputStyle, appearance: "auto", borderColor: ACCENT }}>
            <option value="">Select reason…</option>
            {REVISION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      )}

      {error && <p style={{ color: DANGER, fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
        <Btn size="sm" onClick={save} disabled={!canSave || saving}>
          {saving ? "Saving…" : "Save indicator"}
        </Btn>
      </div>

      {/* ── Delete ── */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
        {confirmDelete ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: DANGER, flexGrow: 1 }}>
              Permanently remove this indicator?
            </span>
            <button onClick={doDelete} disabled={deleting}
              style={{ fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: DANGER, color: SURFACE, border: "none",
                borderRadius: 4, padding: "3px 10px" }}>
              {deleting ? "Removing…" : "Yes, remove"}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 12, cursor: "pointer", background: "none",
                border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3px 8px",
                color: TEXT_SUB }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: TEXT_MUTED, padding: 0, textDecoration: "underline" }}>
            Remove indicator
          </button>
        )}
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
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [addingIndFor, setAddingIndFor] = useState(null); // outcome_id
  const [addingTargetFor, setAddingTargetFor] = useState(null); // {outcome_id, year}
  const [confirmDelOut, setConfirmDelOut]     = useState(null);
  const [confirmDelTarget, setConfirmDelTarget] = useState(null);

  // Group execution targets by outcome_id → year → [targets]
  const tByOY = {};
  executionTargets.forEach(t => {
    const oid = t.outcome_id || "__";
    if (!tByOY[oid]) tByOY[oid] = {};
    if (!tByOY[oid][t.year]) tByOY[oid][t.year] = [];
    tByOY[oid][t.year].push(t);
  });

  // Return targets for this outcome+year cell.
  // Also include targets with no outcome_id (stored under "__") so they're
  // never invisible just because they weren't linked to a specific outcome.
  const cellTargets = (oid, year) => {
    const specific = (tByOY[oid] || {})[year] || [];
    const unlinked = oid ? ((tByOY["__"] || {})[year] || []) : [];
    const seen = new Set();
    return [...specific, ...unlinked].filter(t => {
      if (seen.has(t.target_id)) return false;
      seen.add(t.target_id); return true;
    });
  };

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
                                O{out.displayNumber ?? (i + 1)}
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
                                    <span style={{ color: TEXT, fontWeight: 700,
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
                                      {confirmDelTarget === t.target_id ? (
                                        <>
                                          <button onClick={async () => {
                                            await api(`/api/execution-targets/${t.target_id}`,
                                              { method: "DELETE" });
                                            setConfirmDelTarget(null); onRefresh();
                                          }} style={{ background: "none", border: "none",
                                            cursor: "pointer", fontSize: 10,
                                            color: DANGER, fontWeight: 700, padding: "0 3px" }}>
                                            ✓
                                          </button>
                                          <button onClick={() => setConfirmDelTarget(null)}
                                            style={{ background: "none", border: "none",
                                              cursor: "pointer", fontSize: 10,
                                              color: TEXT_MUTED, padding: "0 3px" }}>✕</button>
                                        </>
                                      ) : (
                                        <button onClick={() => setConfirmDelTarget(t.target_id)}
                                          style={{ background: "none", border: "none",
                                            cursor: "pointer", fontSize: 10,
                                            color: TEXT_MUTED, padding: "0 3px" }}
                                          title="Remove">✕</button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {isAddingHere ? (
                              <AddTargetInline
                                bow={bow} outcomeId={out.outcome_id} year={year} user={user}
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
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Impact Indicators</SectionLabel>
        </div>

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
                        return (
                          <React.Fragment key={ind.indicator_id}>
                            <tr>
                              {/* Left cell — indicator name */}
                              <td style={{ ...tdStyle,
                                background: p?.light || ACCENT_LIGHT,
                                borderRight: `2px solid ${BORDER}` }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: p?.dark || BRAND,
                                  lineHeight: 1.4, marginBottom: 5 }}>
                                  {ind.name || ind.text}
                                </p>
                                {ind.baseline != null && (
                                  <p style={{ fontSize: 11, color: TEXT_MUTED }}>
                                    Baseline: {ind.baseline}
                                    {ind.unit ? ` ${ind.unit}` : ""}
                                  </p>
                                )}
                                <div style={{ marginTop: 6 }}>
                                  <button
                                    onClick={() => setEditIndId(
                                      editIndId === ind.indicator_id ? null : ind.indicator_id)}
                                    style={{ fontSize: 11, fontWeight: 600, cursor: "pointer",
                                      background: SURFACE, color: TEXT_SUB,
                                      border: `1px solid ${BORDER}`,
                                      borderRadius: 4, padding: "3px 8px" }}>
                                    Edit Indicator
                                  </button>
                                </div>
                              </td>

                              {/* Year cells — T: target, A: actual(s) */}
                              {TARGET_YEARS.map(year => {
                                const tval = ind[`target_${year}`];
                                // All approved actuals for this year, sorted by period
                                const yearActuals = (ind.actuals || [])
                                  .filter(a => a.year === year)
                                  .sort((a, b) => (a.period || "").localeCompare(b.period || ""));
                                return (
                                  <td key={year} style={{ ...tdStyle, textAlign: "center",
                                    background: SURFACE }}>
                                    {tval != null ? (
                                      <div style={{ marginBottom: yearActuals.length ? 4 : 0 }}>
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
                                    {yearActuals.map((a, ai) => (
                                      <div key={ai} style={{ marginTop: ai === 0 ? 0 : 3 }}>
                                        {a.period && (
                                          <span style={{ fontSize: 10, fontWeight: 700,
                                            color: TEXT_MUTED, display: "block" }}>
                                            {a.period}
                                          </span>
                                        )}
                                        <span style={{ fontSize: 10, fontWeight: 700,
                                          color: SUCCESS }}>A: </span>
                                        <span style={{ fontSize: 13, fontWeight: 700,
                                          color: SUCCESS }}>
                                          {a.actual_value}{ind.unit ? ` ${ind.unit}` : ""}
                                        </span>
                                      </div>
                                    ))}
                                  </td>
                                );
                              })}
                            </tr>

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
                                      onDeleted={() => { setEditIndId(null); onRefresh(); }}
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

function AddTargetInline({ bow, outcomeId, year, user, onSaved, onCancel }) {
  const [text, setText]     = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await api("/api/execution-targets", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, outcome_id: outcomeId, year, text,
        edited_by: user?.email }),
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
  const [name, setName]     = useState("");
  const [text, setText]     = useState("");
  const [unit, setUnit]     = useState("");
  const [freq, setFreq]     = useState("");
  const [sourceId, setSId]  = useState(null);
  const [roundId, setRId]   = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await api("/api/bow-indicators", {
      method: "POST",
      body: JSON.stringify({ bow_id: bow.bow_id, outcome_id: outcomeId,
        name, text: text || null, unit: unit || null,
        collection_frequency: freq || null, source_id: sourceId || null,
        edited_by: user?.email }),
    });
    if (!res.error) onSaved();
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        <Field label="Indicator name" required>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Short name, e.g. % grantees with AI-ready data" style={inputStyle} />
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
            <option value="">Select…</option>
            {Object.keys(PERIOD_OPTIONS).map(f =>
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description" helper="Optional — full definition can be filled in after saving.">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="What exactly is being measured…"
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Source">
        <SourcePickerInline sourceId={sourceId} roundId={roundId}
          onChange={(sid, rid) => { setSId(sid); setRId(rid); }} user={user} />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn size="sm" onClick={save} disabled={!name.trim() || saving}>
          {saving ? "Adding…" : "Add indicator"}
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── BOW Panel ─────────────────────────────────────────────────────────────────
function BowPanel({ bow, user, onBack }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [outcomes, setOutcomes]   = useState([]);
  const [activeOId, setActiveOId] = useState(null);
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft,   setDescDraft]   = useState("");
  const [descSaving,  setDescSaving]  = useState(false);

  const load = () => {
    setLoading(true);
    api(`/api/bow/${bow.bow_id}/full`)
      .then(d => {
        const outs = d.outcomes || [];
        setData(d);
        setOutcomes(outs);
        // Set first tab on initial load only
        setActiveOId(prev => prev || (outs[0]?.outcome_id ?? null));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bow.bow_id]);

  const p = PORT_COLORS[bow.portfolio_id];

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 0" }}>
      <Skeleton height={40} /><Skeleton height={300} /><Skeleton height={300} />
    </div>
  );

  // Resolve active outcome (fall back to first)
  const activeOutcome = outcomes.find(o => o.outcome_id === activeOId) || outcomes[0] || null;
  // Pass only the active outcome to the content table so it renders one at a time.
  // Attach displayNumber so BowContentTable can show the correct O-badge (not always O1).
  const activeIdx = activeOutcome ? outcomes.findIndex(o => o.outcome_id === activeOutcome.outcome_id) : -1;
  const visibleOutcomes = activeOutcome
    ? [{ ...activeOutcome, displayNumber: activeIdx + 1 }]
    : [];
  // Include targets that belong to the active outcome OR have no outcome_id set
  // (targets without outcome_id are shown in every tab so they're never hidden)
  const visibleTargets   = (data?.execution_targets || []).filter(
    t => !activeOutcome || !t.outcome_id || t.outcome_id === activeOutcome.outcome_id
  );

  const tabBase = {
    padding: "9px 18px",
    fontSize: 13,
    border: "none",
    cursor: "pointer",
    borderRadius: "6px 6px 0 0",
    marginBottom: -2,
    transition: "color 0.12s, background 0.12s",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
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

      {/* ── BOW Description ── */}
      {(() => {
        const desc = data?.bow?.description ?? bow.description ?? "";
        const saveDesc = () => {
          setDescSaving(true);
          api(`/api/bows/${bow.bow_id}/description`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: descDraft, edited_by: user?.email }),
          })
            .then(() => { load(); setDescEditing(false); })
            .finally(() => setDescSaving(false));
        };
        return (
          <div style={{ marginBottom: 20 }}>
            {descEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", fontSize: 13, padding: "8px 10px",
                    border: `1px solid ${BORDER}`, borderRadius: 6,
                    fontFamily: "inherit", resize: "vertical", color: TEXT,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" onClick={saveDesc} disabled={descSaving}>
                    {descSaving ? "Saving…" : "Save"}
                  </Btn>
                  <Btn variant="secondary" size="sm" onClick={() => setDescEditing(false)}>
                    Cancel
                  </Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <p style={{
                  fontSize: 13, color: desc ? TEXT : TEXT_MUTED,
                  fontStyle: desc ? "normal" : "italic", lineHeight: 1.6, flex: 1,
                }}>
                  {desc || "No description yet."}
                </p>
                <button
                  title="Edit description"
                  onClick={() => { setDescDraft(desc); setDescEditing(true); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: TEXT_MUTED, fontSize: 15, flexShrink: 0, padding: "0 2px",
                  }}>
                  ✎
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Outcome tabs ── */}
      {outcomes.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2,
          borderBottom: `2px solid ${BORDER}`, marginBottom: 24, flexWrap: "wrap" }}>
          {outcomes.map((out, i) => {
            const isActive = out.outcome_id === (activeOutcome?.outcome_id);
            return (
              <button key={out.outcome_id}
                onClick={() => setActiveOId(out.outcome_id)}
                style={{
                  ...tabBase,
                  fontWeight: isActive ? 700 : 500,
                  color:      isActive ? (p?.dark || ACCENT) : TEXT_MUTED,
                  background: isActive ? (p?.light || ACCENT_LIGHT) : "transparent",
                  borderBottom: isActive
                    ? `2px solid ${p?.color || ACCENT}`
                    : "2px solid transparent",
                }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                  background: isActive ? (p?.color || ACCENT) : BORDER,
                  color: isActive ? "#fff" : TEXT_MUTED,
                  borderRadius: 3, padding: "1px 5px",
                }}>
                  O{i + 1}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {out.short_title || out.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {outcomes.length === 0 && (
        <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 24 }}>
          No outcomes yet. Use the button below to add one.
        </p>
      )}

      {/* ── Content for active outcome ── */}
      <BowContentTable
        outcomes={visibleOutcomes}
        executionTargets={visibleTargets}
        bow={bow} user={user}
        onRefresh={load}
      />
    </div>
  );
}

// ─── Theory of Action — shared color tokens ───────────────────────────────────
const TC = {
  bg:"#ffffff", off:"#f5f7fb",
  navy:"#17243d", teal:"#0b7575", tealBd:"#9acece", tealPale:"#e2f3f3",
  gold:"#a05000", goldMid:"#cc7000", goldBd:"#e0b050", goldPale:"#fdf0dc",
  slate:"#455878", slatePale:"#e8edf5", slateBd:"#b8c8de",
  text:"#17243d", textMid:"#364870", textSub:"#556088", textDim:"#8898b8",
  bd:"#cdd8ec",
};

// ─── Theory of Action — shared UI helpers ─────────────────────────────────────
function ToaStageHead({ num, label, sub, color }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
      <div style={{ width:26, height:26, borderRadius:"50%", background:color||TC.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", boxShadow:`0 2px 6px ${color||TC.navy}40` }}>{num}</div>
      <div style={{ fontSize:11, fontWeight:800, color:color||TC.navy, letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"center", lineHeight:1.2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:TC.textDim, fontStyle:"italic", textAlign:"center" }}>{sub}</div>}
    </div>
  );
}
function ToaConnector() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingTop:4 }}>
      <div style={{ width:2, height:40, background:`linear-gradient(to bottom, ${TC.bd}, ${TC.gold})` }} />
      <svg width="18" height="18" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" fill={`${TC.gold}25`} stroke={TC.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={TC.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
    </div>
  );
}
function ToaImpactPanel({ children }) {
  return (
    <div style={{ background:TC.goldPale, border:`1.5px solid ${TC.goldBd}`, borderLeft:`4px solid ${TC.gold}`, borderRadius:10, padding:"14px 16px", display:"flex", flexDirection:"column", gap:12, minWidth:0 }}>
      {children}
    </div>
  );
}
function ToaBiDivider() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:1, background:TC.goldBd }} />
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M13 7l3 3-3 3M7 7l-3 3 3 3" stroke={TC.goldMid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <div style={{ flex:1, height:1, background:TC.goldBd }} />
    </div>
  );
}
function ToaAmb45Buckets({ buckets }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {buckets.map(bucket => {
        const isOpen = expanded === bucket.label;
        const bc = bucket.color || TC.slate;
        return (
          <div key={bucket.label}>
            <button onClick={() => setExpanded(isOpen ? null : bucket.label)}
              style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:`${bc}12`, border:`1px solid ${bc}40`, borderLeft:`3px solid ${bc}`, borderRadius:isOpen?"6px 6px 0 0":6, padding:"7px 10px", cursor:"pointer", fontFamily:"inherit" }}>
              <div style={{ fontSize:12, fontWeight:700, color:bc }}>{bucket.label}</div>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:isOpen?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.18s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={bc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {isOpen && (
              <div style={{ background:"#fff", border:`1px solid ${bc}30`, borderTop:"none", borderRadius:"0 0 6px 6px", padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
                {bucket.contribution && <div style={{ fontSize:12, color:TC.textSub, lineHeight:1.5, fontStyle:"italic" }}>{bucket.contribution}</div>}
                {(bucket.priorities||[]).map(p => (
                  <div key={p.n} style={{ display:"flex", gap:8, alignItems:"flex-start", paddingBottom:6, borderBottom:`1px solid ${TC.bd}` }}>
                    <div style={{ fontSize:10, fontWeight:800, color:bc, background:`${bc}15`, borderRadius:4, padding:"2px 6px", flexShrink:0 }}>{p.n}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:TC.navy }}>{p.title}</div>
                      {p.t1 && <div style={{ fontSize:11, color:TC.textDim }}>{p.t1}{p.t2?` · ${p.t2}`:""}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function ToaEditField({ value, onChange, multiline, placeholder, style={} }) {
  const base = { width:"100%", border:`1.5px solid ${TC.tealBd}`, borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:TC.text, background:"#fff", outline:"none", resize:multiline?"vertical":"none", minHeight:multiline?52:"auto", lineHeight:1.5, ...style };
  return multiline
    ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>
    : <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...base,height:28}}/>;
}
function ToaEditList({ items, onChange, accent }) {
  const ac = accent || TC.teal;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      {items.map((item,i) => (
        <div key={i} style={{ display:"flex", gap:4, alignItems:"flex-start" }}>
          <textarea value={item} rows={2} onChange={e=>{ const n=[...items]; n[i]=e.target.value; onChange(n); }}
            style={{ flex:1, border:`1px solid ${TC.bd}`, borderRadius:5, padding:"4px 7px", fontSize:11, fontFamily:"inherit", color:TC.text, background:"#fff", resize:"vertical", outline:"none", lineHeight:1.45 }} />
          <button onClick={()=>onChange(items.filter((_,j)=>j!==i))}
            style={{ flexShrink:0, background:"none", border:"1px solid #f8a0a0", borderRadius:5, width:24, height:24, cursor:"pointer", color:"#c04040", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", marginTop:2 }}>✕</button>
        </div>
      ))}
      <button onClick={()=>onChange([...items,""])}
        style={{ alignSelf:"flex-start", background:"none", border:`1px solid ${ac}50`, borderRadius:5, padding:"3px 10px", fontSize:11, color:ac, cursor:"pointer", fontFamily:"inherit" }}>+ Add</button>
    </div>
  );
}

// ─── Theory of Action — portal edit view ──────────────────────────────────────
function PortalToaView({ portfolioId, portColor }) {
  const [toaData, setToaData]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [editState, setEditState]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState(null);
  const [activeLane, setActiveLane] = useState(null);
  const [expandedInds, setExpandedInds] = useState({});

  const accent = portColor?.color || TC.teal;

  const fetchToa = () => {
    setLoading(true);
    return api(`/api/toa/${portfolioId}`)
      .then(d => { setToaData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { setEditMode(false); setEditState(null); fetchToa(); }, [portfolioId]);

  const enterEdit = () => {
    if (!toaData) return;
    const { toa, lanes } = toaData;
    setEditState({
      toa: { ...toa },
      crossInds: toa.cross_indicators_json ? JSON.parse(toa.cross_indicators_json) : [],
      lanes: lanes.map(l => ({ ...l, activities: (l.activities||[]).map(a=>({...a})), indicators: (l.indicators||[]).map(i=>({...i})) }))
    });
    setEditMode(true); setSaveError(null);
  };
  const cancelEdit = () => { setEditMode(false); setEditState(null); setSaveError(null); };
  const setToaField = (f,v) => setEditState(s=>({...s, toa:{...s.toa,[f]:v}}));
  const setCrossInds = inds => setEditState(s=>({...s, crossInds:inds}));
  const setLaneField = (lid,f,v) => setEditState(s=>({...s, lanes:s.lanes.map(l=>l.lane_id===lid?{...l,[f]:v}:l)}));
  const setLaneActivities = (lid,acts) => setEditState(s=>({...s, lanes:s.lanes.map(l=>l.lane_id===lid?{...l,activities:acts}:l)}));
  const setLaneIndicators = (lid,inds) => setEditState(s=>({...s, lanes:s.lanes.map(l=>l.lane_id===lid?{...l,indicators:inds}:l)}));

  const saveAll = async () => {
    setSaving(true); setSaveError(null);
    const orig = toaData;
    try {
      const promises = [];
      const toaChanged = {};
      ["problem_statement","col1_label","col2_label","cross_indicators_label","amb45_intro_text","amb45_label","amb45_full_text","amb45_buckets_json"].forEach(f => {
        if (editState.toa[f] !== orig.toa[f]) toaChanged[f] = editState.toa[f];
      });
      const newCrossJson = JSON.stringify(editState.crossInds);
      if (newCrossJson !== orig.toa.cross_indicators_json) toaChanged.cross_indicators_json = newCrossJson;
      if (Object.keys(toaChanged).length)
        promises.push(api(`/api/toa/${portfolioId}`, { method:"PATCH", body:JSON.stringify(toaChanged) }));

      editState.lanes.forEach((lane, li) => {
        const origLane = orig.lanes[li] || {};
        const laneChanged = {};
        ["label","outcome_text","icon","color"].forEach(f => { if (lane[f] !== origLane[f]) laneChanged[f] = lane[f]; });
        if (Object.keys(laneChanged).length)
          promises.push(api(`/api/toa/lanes/${lane.lane_id}`, { method:"PATCH", body:JSON.stringify(laneChanged) }));

        const origActIds = new Set((origLane.activities||[]).map(a=>a.activity_id));
        const editActIds = new Set(lane.activities.filter(a=>!a._isNew).map(a=>a.activity_id));
        (origLane.activities||[]).forEach(a => { if (!editActIds.has(a.activity_id)) promises.push(api(`/api/toa/activities/${a.activity_id}`, { method:"DELETE" })); });
        lane.activities.filter(a=>a._isNew && a.activity_text?.trim()).forEach((a,ai) => promises.push(api("/api/toa/activities", { method:"POST", body:JSON.stringify({ lane_id:lane.lane_id, portfolio_id:portfolioId, activity_text:a.activity_text.trim(), sort_order:100+ai }) })));
        lane.activities.filter(a=>!a._isNew && origActIds.has(a.activity_id)).forEach(a => {
          const origA = (origLane.activities||[]).find(oa=>oa.activity_id===a.activity_id);
          if (origA && a.activity_text !== origA.activity_text) promises.push(api(`/api/toa/activities/${a.activity_id}`, { method:"PATCH", body:JSON.stringify({ activity_text:a.activity_text }) }));
        });

        const origIndIds = new Set((origLane.indicators||[]).map(i=>i.indicator_id));
        const editIndIds = new Set(lane.indicators.filter(i=>!i._isNew).map(i=>i.indicator_id));
        (origLane.indicators||[]).forEach(i => { if (!editIndIds.has(i.indicator_id)) promises.push(api(`/api/toa/lane-indicators/${i.indicator_id}`, { method:"DELETE" })); });
        lane.indicators.filter(i=>i._isNew && i.indicator_text?.trim()).forEach((i,ii) => promises.push(api("/api/toa/lane-indicators", { method:"POST", body:JSON.stringify({ lane_id:lane.lane_id, portfolio_id:portfolioId, indicator_text:i.indicator_text.trim(), sort_order:100+ii }) })));
        lane.indicators.filter(i=>!i._isNew && origIndIds.has(i.indicator_id)).forEach(i => {
          const origI = (origLane.indicators||[]).find(oi=>oi.indicator_id===i.indicator_id);
          if (origI && i.indicator_text !== origI.indicator_text) promises.push(api(`/api/toa/lane-indicators/${i.indicator_id}`, { method:"PATCH", body:JSON.stringify({ indicator_text:i.indicator_text }) }));
        });
      });

      await Promise.all(promises);
      await fetchToa();
      setEditMode(false); setEditState(null);
    } catch(e) {
      setSaveError("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding:32, textAlign:"center", color:TEXT_MUTED, fontSize:14 }}>Loading…</div>;
  if (!toaData?.toa) return <div style={{ padding:32, textAlign:"center", color:TEXT_MUTED, fontSize:14 }}>No Theory of Action data found for this portfolio.</div>;

  const { toa, lanes } = toaData;
  const col1Label = toa.col1_label || "Service Lines";
  const col2Label = toa.col2_label || "Core Activities";
  const crossLabel = toa.cross_indicators_label || "2030 Impact Goals";
  const crossIndicators = toa.cross_indicators_json ? JSON.parse(toa.cross_indicators_json) : [];
  const amb45Buckets = toa.amb45_buckets_json ? JSON.parse(toa.amb45_buckets_json) : null;
  const toggleLane = id => setActiveLane(p=>p===id?null:id);
  const toggleInd = (id,e) => { e.stopPropagation(); setExpandedInds(p=>({...p,[id]:!p[id]})); };

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editMode && editState) {
    const es = editState;
    const eCol1 = es.toa.col1_label || "Service Lines";
    const eCol2 = es.toa.col2_label || "Core Activities";
    return (
      <div style={{ background:TC.bg, color:TC.text }}>
        {/* Edit bar */}
        <div style={{ padding:"10px 0 10px", borderBottom:`1px solid ${BORDER}`, background:`${accent}0a`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:ACCENT }} />
            <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>Editing Theory of Action</span>
            <span style={{ fontSize:11, color:TEXT_MUTED }}>— changes save when you click Save</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {saveError && <span style={{ fontSize:12, color:DANGER }}>{saveError}</span>}
            <Btn variant="secondary" size="sm" onClick={cancelEdit}>Cancel</Btn>
            <Btn size="sm" onClick={saveAll} disabled={saving}>{saving?"Saving…":"Save Changes"}</Btn>
          </div>
        </div>

        {/* Problem statement */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, color:TEXT_SUB, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 }}>Problem / Gap Statement</label>
          <ToaEditField value={es.toa.problem_statement} onChange={v=>setToaField("problem_statement",v)} multiline placeholder="Describe the problem or gap this portfolio addresses…" />
        </div>

        {/* Col label editors */}
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center", padding:"8px 12px", background:TC.slatePale, borderRadius:8, border:`1px solid ${TC.slateBd}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:TC.textDim }}>Column labels:</span>
          {[["col1_label",TC.slate,"Col 1","e.g. Service Lines"],["col2_label",TC.teal,"Col 2","e.g. Core Activities"],["cross_indicators_label",TC.gold,"Impact Label","e.g. 2030 Impact Goals"]].map(([f,c,lbl,ph])=>(
            <div key={f} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:11, color:c, fontWeight:700 }}>{lbl}</span>
              <input value={es.toa[f]||""} onChange={e=>setToaField(f,e.target.value)} placeholder={ph}
                style={{ border:`1px solid ${c}50`, borderRadius:5, padding:"3px 8px", fontSize:11, fontFamily:"inherit", width:160, outline:"none", color:TC.text }} />
            </div>
          ))}
        </div>

        {/* Grid header */}
        <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 32px 380px", gap:6, alignItems:"end", marginBottom:4 }}>
          <ToaStageHead num="1" label={eCol1} color={TC.slate} />
          <ToaStageHead num="2" label={eCol2} color={TC.teal} />
          <ToaStageHead num="3" label="Enabling Outcomes" sub="What changes as a result?" color={TC.teal} />
          <div/>
          <ToaStageHead num="4" label="Impact Achieved" sub="What does this make possible?" color={TC.gold} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 32px 380px", gap:6, alignItems:"center", marginBottom:10 }}>
          <div style={{ height:2, background:`linear-gradient(90deg,${TC.slate}60,${TC.teal})`, borderRadius:2 }}/>
          <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:TC.teal }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.teal}/></svg></div>
          <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg,${TC.teal},${TC.slate})` }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.slate}/></svg></div>
          <div/>
          <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg,${TC.slate},${TC.gold})`, borderRadius:2 }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.gold}/></svg></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 32px 380px", gap:0, alignItems:"start" }}>
          {/* Lanes edit grid */}
          <div style={{ borderRight:`2px solid ${TC.bd}`, paddingRight:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr", gap:4, alignItems:"stretch" }}>
              {es.lanes.map((lane,li) => {
                const lc = lane.color || TC.teal;
                return (
                  <div key={lane.lane_id} style={{ display:"contents" }}>
                    {/* Col 1 — label */}
                    <div style={{ borderRadius:8, background:`${lc}10`, border:`1px solid ${lc}35`, borderLeft:`4px solid ${lc}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:6, gridRow:li+1 }}>
                      <input value={lane.label||""} onChange={e=>setLaneField(lane.lane_id,"label",e.target.value)}
                        style={{ border:`1px solid ${lc}60`, borderRadius:5, padding:"4px 7px", fontSize:12, fontWeight:700, fontFamily:"inherit", color:lc, background:`${lc}08`, outline:"none", width:"100%" }}/>
                      {lane.is_tbd && <span style={{ fontSize:9, background:`${lc}20`, border:`1px solid ${lc}40`, borderRadius:3, padding:"1px 6px", color:lc, fontWeight:700, width:"fit-content" }}>TBD</span>}
                      {lane.is_multiplier && <span style={{ background:`${lc}30`, border:`1px solid ${lc}60`, borderRadius:4, padding:"2px 6px", fontSize:9, color:lc, fontWeight:800, textAlign:"center", letterSpacing:"0.08em", textTransform:"uppercase" }}>× Multiplier</span>}
                    </div>
                    {/* Col 2 — activities */}
                    <div style={{ borderRadius:8, background:`${lc}04`, border:`1.5px solid ${TC.bd}`, padding:"9px 10px", gridRow:li+1 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>{eCol2}</div>
                      <ToaEditList accent={lc}
                        items={lane.activities.map(a=>a.activity_text)}
                        onChange={newTexts => setLaneActivities(lane.lane_id, newTexts.map((t,i) => {
                          const ex = lane.activities[i];
                          return ex ? {...ex, activity_text:t} : {activity_id:null, activity_text:t, _isNew:true};
                        }).concat(lane.activities.slice(newTexts.length).map(a=>({...a,_deleted:true}))))}
                      />
                    </div>
                    {/* Col 3 — outcome + indicators */}
                    <div style={{ borderRadius:8, background:`${TC.teal}06`, border:`1.5px solid ${TC.teal}30`, padding:"9px 12px", gridRow:li+1, display:"flex", flexDirection:"column", gap:8 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Outcome {li+1}</div>
                        <ToaEditField value={lane.outcome_text} onChange={v=>setLaneField(lane.lane_id,"outcome_text",v)} multiline placeholder="Describe the enabling outcome…" style={{ fontSize:12, minHeight:64 }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:4 }}>Leading Indicators</div>
                        <ToaEditList accent={lc}
                          items={lane.indicators.map(i=>i.indicator_text)}
                          onChange={newTexts => setLaneIndicators(lane.lane_id, newTexts.map((t,i) => {
                            const ex = lane.indicators[i];
                            return ex ? {...ex, indicator_text:t} : {indicator_id:null, indicator_text:t, _isNew:true};
                          }).concat(lane.indicators.slice(newTexts.length).map(i=>({...i,_deleted:true}))))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <ToaConnector/>
          {/* Impact panel edit */}
          <ToaImpactPanel>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:TC.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{es.toa.cross_indicators_label || "2030 Impact Goals"}</div>
              <ToaEditList items={es.crossInds} accent={TC.gold} onChange={setCrossInds}/>
            </div>
            <div style={{ height:1, background:TC.goldBd }}/>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:TC.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Impact Enabled · Ambition 2045</div>
              {amb45Buckets ? (
                <div>
                  <div style={{ fontSize:11, color:TC.textDim, marginBottom:6 }}>This portfolio uses structured bucket data. Edit the JSON below:</div>
                  <textarea value={es.toa.amb45_buckets_json||""} onChange={e=>setToaField("amb45_buckets_json",e.target.value)}
                    style={{ width:"100%", minHeight:160, border:`1.5px solid ${TC.goldBd}`, borderRadius:6, padding:"6px 8px", fontSize:11, fontFamily:"monospace", color:TC.text, background:"#fff", outline:"none", resize:"vertical" }}/>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[["amb45_intro_text","Intro text (italic)","Optional intro paragraph…",true],["amb45_label","Box label","e.g. Division Enablement",false],["amb45_full_text","Box body text","Describe how this portfolio enables Ambition 2045…",true]].map(([f,lbl,ph,ml])=>(
                    <div key={f}>
                      <div style={{ fontSize:10, color:TC.textDim, marginBottom:3 }}>{lbl}</div>
                      <ToaEditField value={es.toa[f]} onChange={v=>setToaField(f,v)} multiline={ml} placeholder={ph} style={{ fontSize:11, minHeight:ml?70:"auto" }}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ToaImpactPanel>
        </div>
      </div>
    );
  }

  // ── Read mode ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background:TC.bg, color:TC.text }}>
      {/* Edit button */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
        <Btn variant="secondary" size="sm" onClick={enterEdit}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight:5 }}><path d="M11.5 1.5a1.41 1.41 0 012 2L5 12H3v-2L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          Edit Theory of Action
        </Btn>
      </div>

      {toa.problem_statement && (
        <div style={{ background:TC.slatePale, border:`1px solid ${TC.slateBd}`, borderLeft:`4px solid ${accent}`, borderRadius:8, padding:"12px 16px", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
            <div style={{ flexShrink:0, background:TC.navy, color:"#fff", fontSize:9, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 8px", borderRadius:4, marginTop:1 }}>Problem / Gap</div>
            <div style={{ fontSize:12, color:TC.textSub, lineHeight:1.65, fontStyle:"italic" }}>{toa.problem_statement}</div>
          </div>
        </div>
      )}

      {/* Grid header */}
      <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 32px 380px", gap:6, alignItems:"end", marginBottom:4 }}>
        <ToaStageHead num="1" label={col1Label} color={TC.slate}/>
        <ToaStageHead num="2" label={col2Label} color={TC.teal}/>
        <ToaStageHead num="3" label="Enabling Outcomes" sub="What changes as a result?" color={TC.teal}/>
        <div/>
        <ToaStageHead num="4" label="Impact Achieved" sub="What does this make possible?" color={TC.gold}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr 32px 380px", gap:6, alignItems:"center", marginBottom:8 }}>
        <div style={{ height:2, background:`linear-gradient(90deg,${TC.slate}60,${TC.teal})`, borderRadius:2 }}/>
        <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:TC.teal }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.teal}/></svg></div>
        <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg,${TC.teal},${TC.slate})` }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.slate}/></svg></div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
          <div style={{ flex:"0 0 20px", width:2, background:`linear-gradient(to bottom,${TC.bd},${TC.gold})`, borderRadius:1 }}/>
          <svg width="18" height="18" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" fill={`${TC.gold}25`} stroke={TC.gold} strokeWidth="2"/><path d="M10 13 L15 18 L20 13" stroke={TC.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </div>
        <div style={{ display:"flex", alignItems:"center" }}><div style={{ flex:1, height:2, background:`linear-gradient(90deg,${TC.slate},${TC.gold})`, borderRadius:2 }}/><svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" fill={TC.gold}/></svg></div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 32px 380px", gap:0, alignItems:"start" }}>
        <div style={{ borderRight:`2px solid ${TC.bd}`, paddingRight:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"140px 0.8fr 1fr", gap:4, alignItems:"stretch" }}>
            {lanes.map((lane,li) => {
              const isActive = activeLane===lane.lane_id;
              const isDimmed = activeLane && !isActive;
              const lc = lane.color || TC.teal;
              const hasInds = (lane.indicators||[]).length>0;
              return (
                <div key={lane.lane_id} style={{ display:"contents" }}>
                  <div onClick={()=>toggleLane(lane.lane_id)} style={{ borderRadius:8, background:isActive?`${lc}18`:`${lc}10`, border:`1px solid ${isActive?lc:`${lc}35`}`, borderLeft:`4px solid ${lc}`, padding:"10px 10px", display:"flex", flexDirection:"column", gap:4, justifyContent:"center", cursor:"pointer", opacity:isDimmed?0.4:1, transition:"all 0.15s", boxShadow:isActive?`0 2px 16px ${lc}30`:"0 1px 3px rgba(0,0,0,0.08)", gridRow:li+1 }}>
                    {lane.icon && <div style={{ fontSize:18, color:lc, lineHeight:1 }}>{lane.icon}</div>}
                    <div style={{ fontSize:13, fontWeight:800, color:lc, lineHeight:1.3 }}>{lane.label}</div>
                    {lane.is_tbd && <div style={{ fontSize:9, background:`${lc}20`, border:`1px solid ${lc}40`, borderRadius:3, padding:"1px 6px", color:lc, fontWeight:700, width:"fit-content" }}>TBD</div>}
                    {lane.is_multiplier && <div style={{ background:`${lc}30`, border:`1px solid ${lc}60`, borderRadius:4, padding:"2px 6px", fontSize:9, color:lc, fontWeight:800, textAlign:"center", letterSpacing:"0.08em", textTransform:"uppercase" }}>× Multiplier</div>}
                  </div>
                  <div style={{ borderRadius:8, background:`${lc}04`, border:`1.5px solid ${isActive?lc:TC.bd}`, padding:"9px 10px", opacity:isDimmed?0.4:1, transition:"all 0.15s", gridRow:li+1 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{col2Label}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {(lane.activities||[]).map((act,i) => (
                        <div key={i} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                          <div style={{ width:4, height:4, borderRadius:"50%", background:lc, marginTop:6, flexShrink:0, opacity:0.7 }}/>
                          <div style={{ fontSize:12, color:TC.textMid, lineHeight:1.5 }}>{act.activity_text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridRow:li+1, display:"flex", gap:0, opacity:isDimmed?0.4:1, transition:"all 0.15s" }}>
                    <div onClick={()=>toggleLane(lane.lane_id)} style={{ flex:1, borderRadius:expandedInds[lane.lane_id]?"8px 0 0 8px":8, background:isActive?`${lc}10`:`${TC.teal}06`, border:`1.5px solid ${isActive?lc:`${TC.teal}30`}`, borderRight:expandedInds[lane.lane_id]?`1.5px solid ${lc}30`:undefined, padding:"9px 12px", cursor:"pointer", transition:"all 0.15s", display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:18, height:18, borderRadius:"50%", background:lc, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", flexShrink:0 }}>{li+1}</div>
                          <div style={{ fontSize:11, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase" }}>Outcome {li+1}</div>
                        </div>
                        {hasInds && (
                          <button onClick={e=>toggleInd(lane.lane_id,e)} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, background:"none", border:`1px solid ${lc}40`, borderRadius:5, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.06em", textTransform:"uppercase" }}>Indicators</div>
                            <div style={{ background:`${lc}15`, borderRadius:8, padding:"1px 5px", fontSize:10, fontWeight:700, color:lc }}>{lane.indicators.length}</div>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ transform:expandedInds[lane.lane_id]?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", flexShrink:0 }}><path d="M3 5 L7 9 L11 5" stroke={lc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:TC.navy, lineHeight:1.5, paddingRight:expandedInds[lane.lane_id]?0:100 }}>{lane.outcome_text}</div>
                    </div>
                    {expandedInds[lane.lane_id] && (
                      <div style={{ width:200, flexShrink:0, borderRadius:"0 8px 8px 0", background:`${lc}07`, border:`1.5px solid ${lc}40`, borderLeft:"none", padding:"9px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                        <div style={{ fontSize:10, fontWeight:800, color:lc, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Indicators</div>
                        {(lane.indicators||[]).map((ind,i) => (
                          <div key={i} style={{ display:"flex", gap:5, alignItems:"flex-start", paddingBottom:4, borderBottom:i<lane.indicators.length-1?`1px solid ${lc}15`:"none" }}>
                            <div style={{ width:4, height:4, borderRadius:"50%", background:lc, marginTop:5, flexShrink:0, opacity:0.6 }}/>
                            <div style={{ fontSize:12, color:TC.textMid, lineHeight:1.45 }}>{ind.indicator_text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {activeLane && <div style={{ textAlign:"center", marginTop:6 }}><button onClick={()=>setActiveLane(null)} style={{ background:"none", border:`1px solid ${TC.bd}`, borderRadius:5, padding:"4px 14px", fontSize:12, color:TC.textDim, cursor:"pointer" }}>Clear filter ✕</button></div>}
        </div>
        <ToaConnector/>
        <ToaImpactPanel>
          {crossIndicators.length>0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:TC.gold, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>{crossLabel}</div>
              <div style={{ fontSize:10, color:TC.textDim, fontStyle:"italic", marginBottom:8 }}>Portfolio-level impact signals</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {crossIndicators.map((ind,i) => (
                  <div key={i} style={{ background:TC.off, border:`1px solid ${TC.goldBd}60`, borderLeft:`3px solid ${TC.gold}`, borderRadius:"0 7px 7px 0", padding:"8px 12px" }}>
                    <div style={{ fontSize:12, color:TC.textMid, lineHeight:1.55 }}>{ind}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {crossIndicators.length>0 && (toa.amb45_full_text||amb45Buckets) && <div style={{ height:1, background:TC.bd }}/>}
          {toa.amb45_intro_text && <div style={{ fontSize:12, color:TC.textMid, lineHeight:1.6, fontStyle:"italic" }}>{toa.amb45_intro_text}</div>}
          {(toa.amb45_full_text||amb45Buckets) && <ToaBiDivider/>}
          {(toa.amb45_full_text||amb45Buckets) && (
            <div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:6, marginBottom:8 }}>
                <div style={{ width:3, borderRadius:2, background:TC.goldMid, alignSelf:"stretch", minHeight:24, flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:TC.goldMid, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:1 }}>Impact Enabled</div>
                  <div style={{ fontSize:13, fontWeight:800, color:TC.navy, lineHeight:1.2 }}>Ambition 2045</div>
                </div>
              </div>
              {amb45Buckets ? (
                <ToaAmb45Buckets buckets={amb45Buckets}/>
              ) : (
                <div style={{ background:`${TC.teal}06`, border:`1px solid ${TC.tealBd}`, borderLeft:`3px solid ${TC.teal}`, borderRadius:"0 7px 7px 0", padding:"10px 12px" }}>
                  {toa.amb45_label && <div style={{ fontSize:10, fontWeight:800, color:TC.teal, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{toa.amb45_label}</div>}
                  <div style={{ fontSize:12, color:TC.textMid, lineHeight:1.6 }}>{toa.amb45_full_text}</div>
                </div>
              )}
            </div>
          )}
        </ToaImpactPanel>
      </div>
    </div>
  );
}

// ─── Portfolio Panel ────────────────────────────────────────────────────────────
// ─── Portfolio Content Table ───────────────────────────────────────────────────
const PORT_TABLE_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
const yearColW = `${Math.floor(72 / PORT_TABLE_YEARS.length)}%`;

// ─── Portfolio Outcome Pane (single outcome, shown when tab is active) ──────────
function PortfolioOutcomePane({ outcome, portfolio, user, toaLane, onRefresh, onOutcomeChange, onDeleted }) {
  const p = PORT_COLORS[portfolio.portfolio_id];
  const [editingOutcome,  setEditingOutcome]  = useState(false);
  const [editingII,       setEditingII]       = useState(false);
  const [iiDraft,         setIIDraft]         = useState(outcome.investments_inputs || "");
  const [iiSaving,        setIISaving]        = useState(false);
  const [editIndId,       setEditIndId]       = useState(null);
  const [addingInd,       setAddingInd]       = useState(false);
  const [confirmDel,      setConfirmDel]      = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  const thStyle = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
    textTransform: "uppercase", letterSpacing: "0.06em", background: BG,
    borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`,
    textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 12px", borderBottom: `1px solid ${BORDER}`,
    borderRight: `1px solid ${BORDER}`, verticalAlign: "top" };
  const yearColW = `${Math.floor(70 / PORT_TABLE_YEARS.length)}%`;

  const saveII = async () => {
    setIISaving(true);
    await api(`/api/portfolio-outcomes/${outcome.outcome_id}`, {
      method: "PATCH",
      body: JSON.stringify({ investments_inputs: iiDraft, edited_by: user?.email }),
    });
    onOutcomeChange({ ...outcome, investments_inputs: iiDraft });
    setEditingII(false);
    setIISaving(false);
  };

  const deleteOutcome = async () => {
    setDeleting(true);
    await api(`/api/portfolio-outcomes/${outcome.outcome_id}`, { method: "DELETE" });
    setDeleting(false);
    if (onDeleted) onDeleted(outcome.outcome_id);
  };

  const inds = outcome.indicators || [];

  return (
    <div className="fade-in">

      {/* ── Outcome title + text ── */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
        {editingOutcome ? (
          <InlineEditOutcome outcome={outcome} user={user} isPortfolio
            onSave={updated => { onOutcomeChange({ ...outcome, ...updated }); setEditingOutcome(false); }}
            onCancel={() => setEditingOutcome(false)} />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6, lineHeight: 1.4 }}>
                {outcome.title || outcome.short_title || <span style={{ color: TEXT_MUTED, fontStyle: "italic", fontWeight: 400 }}>No title set</span>}
              </h3>
              {outcome.short_title && outcome.short_title !== outcome.title && (
                <p style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>
                  Short title: {outcome.short_title}
                </p>
              )}
              {outcome.text ? (
                <p style={{ fontSize: 13, color: TEXT_SUB, lineHeight: 1.7 }}>
                  {outcome.text}
                </p>
              ) : (
                <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
                  No description yet.
                </p>
              )}
            </div>
            <button onClick={() => setEditingOutcome(true)}
              title="Edit title and description"
              style={{ background: "none", border: "none", cursor: "pointer",
                color: TEXT_MUTED, fontSize: 15, flexShrink: 0, padding: "0 2px" }}>✎</button>
          </div>
        )}
      </div>

      {/* ── Investments & Inputs ── */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
        <SectionLabel style={{ marginBottom: 10 }}>Investments & Inputs</SectionLabel>

        {/* TOA activities (read-only, sourced from Theory of Action) */}
        {toaLane && (toaLane.activities || []).length > 0 && (
          <div style={{ marginBottom: outcome.investments_inputs || editingII ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              From Theory of Action
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
              {(toaLane.activities || []).map(a => (
                <li key={a.activity_id}
                  style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
                  {a.activity_text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!toaLane && !outcome.investments_inputs && !editingII && (
          <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic", marginBottom: 8 }}>
            No investments & inputs content yet.
          </p>
        )}

        {/* Editable additional notes */}
        <div style={{ marginTop: toaLane && (toaLane.activities || []).length > 0 ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
              textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Additional Notes
            </span>
            {!editingII && (
              <button onClick={() => { setIIDraft(outcome.investments_inputs || ""); setEditingII(true); }}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: TEXT_MUTED, fontSize: 15, padding: "0 2px" }}>✎</button>
            )}
          </div>
          {editingII ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={iiDraft} onChange={e => setIIDraft(e.target.value)} rows={3}
                autoFocus style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Add supplemental notes or context…" />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" onClick={saveII} disabled={iiSaving}>{iiSaving ? "Saving…" : "Save"}</Btn>
                <Btn variant="secondary" size="sm" onClick={() => setEditingII(false)}>Cancel</Btn>
              </div>
            </div>
          ) : outcome.investments_inputs ? (
            <p style={{ fontSize: 13, lineHeight: 1.7, color: TEXT }}>
              {outcome.investments_inputs}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
              No additional notes.
            </p>
          )}
        </div>
      </div>

      {/* ── Impact Indicators ── */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>Impact Indicators</SectionLabel>
        <button onClick={() => setAddingInd(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: ACCENT, fontWeight: 700 }}>
          {addingInd ? "Cancel" : "+ Add indicator"}
        </button>
      </div>

      {addingInd && (
        <div style={{ marginBottom: 12, padding: "14px 16px", background: BG,
          border: `1px solid ${BORDER}`, borderRadius: 6 }}>
          <AddPortfolioIndicatorInline portfolio={portfolio} outcomeId={outcome.outcome_id}
            user={user}
            onSaved={() => { setAddingInd(false); onRefresh(); }}
            onCancel={() => setAddingInd(false)} />
        </div>
      )}

      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse",
          border: `1px solid ${BORDER}`, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            {PORT_TABLE_YEARS.map(y => <col key={y} style={{ width: yearColW }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Indicator</th>
              {PORT_TABLE_YEARS.map(y => (
                <th key={y} style={{ ...thStyle, textAlign: "center" }}>{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inds.length === 0 && !addingInd && (
              <tr>
                <td colSpan={PORT_TABLE_YEARS.length + 1}
                  style={{ ...tdStyle, color: TEXT_MUTED, fontStyle: "italic",
                    textAlign: "center", borderRight: "none" }}>
                  No indicators yet.
                </td>
              </tr>
            )}
            {inds.map(ind => {
              const isEditing = editIndId === ind.indicator_id;
              return (
                <React.Fragment key={ind.indicator_id}>
                  <tr>
                    <td style={{ ...tdStyle, background: p?.light || ACCENT_LIGHT,
                      borderRight: `2px solid ${BORDER}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: p?.dark || BRAND,
                        lineHeight: 1.4, marginBottom: 5 }}>
                        {ind.name || ind.text}
                      </p>
                      {ind.baseline != null && (
                        <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 5 }}>
                          Baseline: {ind.baseline}{ind.unit ? ` ${ind.unit}` : ""}
                        </p>
                      )}
                      <button onClick={() => setEditIndId(isEditing ? null : ind.indicator_id)}
                        style={{ fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: SURFACE, color: TEXT_SUB,
                          border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3px 8px" }}>
                        {isEditing ? "Cancel" : "Edit Indicator"}
                      </button>
                    </td>
                    {PORT_TABLE_YEARS.map(year => {
                      const tval = ind[`target_${year}`];
                      const yearActuals = (ind.actuals || [])
                        .filter(a => a.year === year)
                        .sort((a, b) => (a.period || "").localeCompare(b.period || ""));
                      return (
                        <td key={year} style={{ ...tdStyle, textAlign: "center", background: SURFACE }}>
                          {tval != null ? (
                            <div style={{ marginBottom: yearActuals.length ? 4 : 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED }}>T: </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                                {tval}{ind.unit ? ` ${ind.unit}` : ""}
                              </span>
                            </div>
                          ) : <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>}
                          {yearActuals.map((a, ai) => (
                            <div key={ai} style={{ marginTop: ai === 0 ? 0 : 3 }}>
                              {a.period && (
                                <span style={{ fontSize: 10, fontWeight: 700,
                                  color: TEXT_MUTED, display: "block" }}>{a.period}</span>
                              )}
                              <span style={{ fontSize: 10, fontWeight: 700, color: SUCCESS }}>A: </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: SUCCESS }}>
                                {a.actual_value}{ind.unit ? ` ${ind.unit}` : ""}
                              </span>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={PORT_TABLE_YEARS.length + 1}
                        style={{ padding: 0, borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ padding: "16px 20px", background: BG }}>
                          <InlineEditIndicator indicator={ind} user={user} isPortfolio
                            onSave={updated => {
                              onOutcomeChange({ ...outcome, indicators: inds.map(i =>
                                i.indicator_id === ind.indicator_id ? { ...i, ...updated } : i) });
                              setEditIndId(null);
                            }}
                            onCancel={() => setEditIndId(null)}
                            onDeleted={() => {
                              onOutcomeChange({ ...outcome,
                                indicators: inds.filter(i => i.indicator_id !== ind.indicator_id) });
                              setEditIndId(null);
                            }} />
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

      {/* ── Remove outcome ── */}
      <div style={{ paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
        {confirmDel ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: DANGER, flex: 1 }}>
              Remove this outcome and all its indicators?
            </span>
            <Btn size="sm" onClick={deleteOutcome} disabled={deleting}
              style={{ background: DANGER, color: "#fff", border: "none" }}>
              {deleting ? "Removing…" : "✓ Remove"}
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => setConfirmDel(false)}>✕ Cancel</Btn>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: TEXT_MUTED, padding: 0, textDecoration: "underline" }}>
            Remove outcome
          </button>
        )}
      </div>
    </div>
  );
}

// Legacy name kept so any remaining references don't break at parse time
function PortfolioContentTable({ outcomes, portfolio, user, onRefresh, onOutcomesChange }) {

  return (
    <div style={{ marginBottom: 32 }}>

      {/* ── Outcomes table ───────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>Portfolio Outcomes</SectionLabel>
        <Btn variant="ghost" size="sm" onClick={() => setAddingOut(v => !v)}
          style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>
          {addingOut ? "Cancel" : "+ Add outcome"}
        </Btn>
      </div>

      {addingOut && (
        <Card className="fade-in" style={{ border: `1px dashed ${BORDER}`, marginBottom: 14 }}>
          <Field label="Outcome title" required>
            <input type="text" value={newOutTitle} onChange={e => setNewOutTitle(e.target.value)}
              placeholder="e.g. Improved data system access…" style={inputStyle} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" size="sm" onClick={() => { setAddingOut(false); setNewOutTitle(""); }}>Cancel</Btn>
            <Btn size="sm" onClick={addOutcome} disabled={!newOutTitle.trim() || saving}>
              {saving ? "Adding…" : "Add outcome"}
            </Btn>
          </div>
        </Card>
      )}

      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "55%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Short Title</th>
              <th style={thStyle}>Outcome Text</th>
              <th style={{ ...thStyle, borderRight: "none" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", borderRight: "none" }}>No outcomes yet.</td></tr>
            )}
            {outcomes.map((out, i) => (
              <React.Fragment key={out.outcome_id}>
                <tr style={{ background: editOutId === out.outcome_id ? BG : SURFACE }}>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: p?.light || ACCENT_LIGHT,
                      color: p?.dark || ACCENT, borderRadius: 4, padding: "2px 7px" }}>
                      PO{i + 1}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, fontSize: 13, color: TEXT }}>
                    {out.short_title || out.title}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13, color: TEXT_SUB, lineHeight: 1.5 }}>
                    {out.outcome || out.title}
                  </td>
                  <td style={{ ...tdStyle, borderRight: "none" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="secondary" size="sm"
                        onClick={() => setEditOutId(editOutId === out.outcome_id ? null : out.outcome_id)}>
                        {editOutId === out.outcome_id ? "Cancel" : "Edit"}
                      </Btn>
                      {confirmDelOut === out.outcome_id ? (
                        <>
                          <Btn size="sm" onClick={async () => {
                            await api(`/api/portfolio-outcomes/${out.outcome_id}`, { method: "DELETE" });
                            onOutcomesChange(prev => prev.filter(o => o.outcome_id !== out.outcome_id));
                            setConfirmDelOut(null);
                          }} style={{ background: DANGER, color: "#fff", border: "none" }}>✓ Remove</Btn>
                          <Btn variant="secondary" size="sm" onClick={() => setConfirmDelOut(null)}>✕</Btn>
                        </>
                      ) : (
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDelOut(out.outcome_id)}
                          style={{ color: DANGER }}>Remove</Btn>
                      )}
                    </div>
                  </td>
                </tr>
                {editOutId === out.outcome_id && (
                  <tr>
                    <td colSpan={4} style={{ padding: "16px 20px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
                      <InlineEditOutcome
                        outcome={out} user={user} isPortfolio
                        onSave={updated => {
                          onOutcomesChange(prev => prev.map(o =>
                            o.outcome_id === out.outcome_id ? { ...o, ...updated } : o));
                          setEditOutId(null);
                        }}
                        onCancel={() => setEditOutId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Indicators table ─────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>Impact Indicators</SectionLabel>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "22%" }} />
            {PORT_TABLE_YEARS.map(y => <col key={y} style={{ width: yearColW }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>Indicator</th>
              {PORT_TABLE_YEARS.map(y => <th key={y} style={{ ...thStyle, textAlign: "center" }}>{y}</th>)}
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
                    <td colSpan={PORT_TABLE_YEARS.length + 1}
                      style={{ ...tdStyle, background: BG, padding: "6px 14px", borderRight: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
                          textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {out.short_title || out.title}
                        </span>
                        <button onClick={() => setAddingIndFor(addingIndFor === out.outcome_id ? null : out.outcome_id)}
                          style={{ background: "none", border: "none", cursor: "pointer",
                            fontSize: 11, color: ACCENT, fontWeight: 700, padding: "2px 0" }}>
                          + Add indicator
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Add indicator form */}
                  {addingIndFor === out.outcome_id && (
                    <tr>
                      <td colSpan={PORT_TABLE_YEARS.length + 1}
                        style={{ padding: "14px 16px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
                        <AddPortfolioIndicatorInline
                          portfolio={portfolio} outcomeId={out.outcome_id} user={user}
                          onSaved={() => { onRefresh(); setAddingIndFor(null); }}
                          onCancel={() => setAddingIndFor(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {/* Indicator rows */}
                  {inds.map(ind => {
                    const isEditing = editIndId === ind.indicator_id;
                    return (
                      <React.Fragment key={ind.indicator_id}>
                        <tr>
                          <td style={{ ...tdStyle, background: p?.light || ACCENT_LIGHT, borderRight: `2px solid ${BORDER}` }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: p?.dark || BRAND, lineHeight: 1.4, marginBottom: 5 }}>
                              {ind.name || ind.text}
                            </p>
                            {ind.baseline != null && (
                              <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 5 }}>
                                Baseline: {ind.baseline}{ind.unit ? ` ${ind.unit}` : ""}
                              </p>
                            )}
                            <button onClick={() => setEditIndId(isEditing ? null : ind.indicator_id)}
                              style={{ fontSize: 11, fontWeight: 600, cursor: "pointer", background: SURFACE,
                                color: TEXT_SUB, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3px 8px" }}>
                              Edit Indicator
                            </button>
                          </td>
                          {PORT_TABLE_YEARS.map(year => {
                            const tval = ind[`target_${year}`];
                            const yearActuals = (ind.actuals || [])
                              .filter(a => a.year === year)
                              .sort((a, b) => (a.period || "").localeCompare(b.period || ""));
                            return (
                              <td key={year} style={{ ...tdStyle, textAlign: "center", background: SURFACE }}>
                                {tval != null ? (
                                  <div style={{ marginBottom: yearActuals.length ? 4 : 0 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED }}>T: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                                      {tval}{ind.unit ? ` ${ind.unit}` : ""}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>—</span>
                                )}
                                {yearActuals.map((a, ai) => (
                                  <div key={ai} style={{ marginTop: ai === 0 ? 0 : 3 }}>
                                    {a.period && <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_MUTED, display: "block" }}>{a.period}</span>}
                                    <span style={{ fontSize: 10, fontWeight: 700, color: SUCCESS }}>A: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: SUCCESS }}>
                                      {a.actual_value}{ind.unit ? ` ${ind.unit}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                        {isEditing && (
                          <tr>
                            <td colSpan={PORT_TABLE_YEARS.length + 1}
                              style={{ padding: 0, borderBottom: `1px solid ${BORDER}` }}>
                              <div style={{ padding: "16px 20px", background: BG }}>
                                <InlineEditIndicator
                                  indicator={ind} user={user} isPortfolio
                                  onSave={updated => {
                                    onOutcomesChange(prev => prev.map(o =>
                                      o.outcome_id === out.outcome_id
                                        ? { ...o, indicators: o.indicators.map(i =>
                                            i.indicator_id === ind.indicator_id ? { ...i, ...updated } : i) }
                                        : o));
                                    setEditIndId(null);
                                  }}
                                  onCancel={() => setEditIndId(null)}
                                  onDeleted={() => {
                                    onOutcomesChange(prev => prev.map(o =>
                                      o.outcome_id === out.outcome_id
                                        ? { ...o, indicators: o.indicators.filter(i => i.indicator_id !== ind.indicator_id) }
                                        : o));
                                    setEditIndId(null);
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {outcomes.every(o => (o.indicators||[]).length === 0) && !outcomes.some(o => addingIndFor === o.outcome_id) && (
              <tr><td colSpan={PORT_TABLE_YEARS.length + 1} style={{ ...tdStyle, color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", borderRight: "none" }}>No indicators yet. Use "+ Add indicator" on an outcome above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── BOW Indicator Picker (for linking to portfolio) ───────────────────────────
function BowIndicatorPicker({ portfolioId, onSelect, onCancel }) {
  const [all, setAll]       = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/indicators/all")
      .then(d => {
        const rows = Array.isArray(d) ? d : [];
        setAll(rows.filter(r => r.portfolio_id === portfolioId));
      })
      .finally(() => setLoading(false));
  }, [portfolioId]);

  const filtered = all.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name || r.text || "").toLowerCase().includes(q)
      || (r.bow_title || "").toLowerCase().includes(q)
      || (r.outcome_title || "").toLowerCase().includes(q);
  });

  // Group by bow_title
  const grouped = filtered.reduce((acc, r) => {
    const key = r.bow_title || "Unknown BOW";
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search BOW indicators…" autoFocus
        style={{ ...inputStyle, marginBottom: 8 }} />
      {loading && <p style={{ fontSize: 12, color: TEXT_MUTED }}>Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ fontSize: 12, color: TEXT_MUTED }}>No indicators found.</p>
      )}
      <div style={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${BORDER}`,
        borderRadius: 6, background: SURFACE }}>
        {Object.entries(grouped).map(([bowTitle, inds]) => (
          <div key={bowTitle}>
            <div style={{ padding: "6px 12px", background: BG, fontSize: 10,
              fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase",
              letterSpacing: 0.6, borderBottom: `1px solid ${BORDER}` }}>
              {bowTitle}
            </div>
            {inds.map(ind => (
              <button key={ind.indicator_id} onClick={() => onSelect(ind)}
                style={{ display: "block", width: "100%", textAlign: "left",
                  padding: "8px 12px", border: "none", borderBottom: `1px solid ${BORDER}`,
                  background: "none", cursor: "pointer", fontSize: 13 }}
                onMouseOver={e => e.currentTarget.style.background = BG}
                onMouseOut={e => e.currentTarget.style.background = "none"}>
                <span style={{ fontWeight: 600, color: TEXT }}>
                  {ind.name || ind.text}
                </span>
                {ind.outcome_title && (
                  <span style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 6 }}>
                    — {ind.outcome_title}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function AddPortfolioIndicatorInline({ portfolio, outcomeId, user, onSaved, onCancel }) {
  const [mode, setMode]         = useState("pick"); // "pick" | "standalone"
  const [selected, setSelected] = useState(null);   // chosen BOW indicator
  const [saving, setSaving]     = useState(false);

  // Standalone fields
  const [name, setName]   = useState("");
  const [text, setText]   = useState("");
  const [unit, setUnit]   = useState("");
  const [freq, setFreq]   = useState("");
  const [sourceId, setSId] = useState(null);

  const saveLinked = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await api("/api/portfolio-indicators", {
      method: "POST",
      body: JSON.stringify({ portfolio_id: portfolio.portfolio_id, outcome_id: outcomeId,
        bow_indicator_id: selected.indicator_id, edited_by: user?.email }),
    });
    if (!res.error) onSaved();
    setSaving(false);
  };

  const saveStandalone = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await api("/api/portfolio-indicators", {
      method: "POST",
      body: JSON.stringify({ portfolio_id: portfolio.portfolio_id, outcome_id: outcomeId,
        name, text: text || null, unit: unit || null,
        collection_frequency: freq || null, source_id: sourceId || null,
        edited_by: user?.email }),
    });
    if (!res.error) onSaved();
    setSaving(false);
  };

  if (mode === "pick" && !selected) {
    return (
      <div>
        <p style={{ fontSize: 12, color: TEXT_SUB, marginBottom: 8 }}>
          Select a BOW indicator to include in this portfolio view.
          <button onClick={() => setMode("standalone")}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: ACCENT, marginLeft: 6, textDecoration: "underline" }}>
            Add standalone indicator instead
          </button>
        </p>
        <BowIndicatorPicker portfolioId={portfolio.portfolio_id}
          onSelect={ind => setSelected(ind)} onCancel={onCancel} />
      </div>
    );
  }

  if (mode === "pick" && selected) {
    return (
      <div>
        <div style={{ padding: "10px 14px", background: BG, border: `1px solid ${BORDER}`,
          borderRadius: 6, marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            Selected BOW indicator
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 2 }}>
            {selected.name || selected.text}
          </p>
          {selected.bow_title && (
            <p style={{ fontSize: 11, color: TEXT_MUTED }}>{selected.bow_title}
              {selected.outcome_title ? ` — ${selected.outcome_title}` : ""}
            </p>
          )}
          <button onClick={() => setSelected(null)}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: TEXT_MUTED, padding: 0, marginTop: 4,
              textDecoration: "underline" }}>
            Choose different indicator
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" onClick={saveLinked} disabled={saving}>
            {saving ? "Adding…" : "Add to portfolio"}
          </Btn>
          <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
        </div>
      </div>
    );
  }

  // Standalone mode
  return (
    <div>
      <p style={{ fontSize: 12, color: TEXT_SUB, marginBottom: 8 }}>
        Standalone indicator (no BOW counterpart).
        <button onClick={() => setMode("pick")}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: ACCENT, marginLeft: 6, textDecoration: "underline" }}>
          Link to a BOW indicator instead
        </button>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        <Field label="Indicator name" required>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Short name" style={inputStyle} />
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
            <option value="">Select…</option>
            {Object.keys(PERIOD_OPTIONS).map(f =>
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea value={text} onChange={e => setText(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Source">
        <SourcePickerInline sourceId={sourceId} roundId={null}
          onChange={(sid) => setSId(sid)} user={user} />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn size="sm" onClick={saveStandalone} disabled={!name.trim() || saving}>
          {saving ? "Adding…" : "Add indicator"}
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function PortfolioPanel({ portfolio, user, onBack }) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [outcomes, setOutcomes]     = useState([]);
  const [toaLanes, setToaLanes]     = useState([]);
  const [activeOId, setActiveOId]   = useState(null);
  const [activeTab, setActiveTab]   = useState("toa");
  const [addingOut, setAddingOut]   = useState(false);
  const [newOutTitle, setNewOutTitle] = useState("");
  const [saving, setSaving]         = useState(false);

  const p = PORT_COLORS[portfolio.portfolio_id];

  const load = () => {
    setLoading(true);
    Promise.all([
      api(`/api/portfolio/${portfolio.portfolio_id}/full`),
      api(`/api/toa/${portfolio.portfolio_id}`),
    ]).then(([d, toa]) => {
      const outs = d.outcomes || [];
      setData(d);
      setOutcomes(outs);
      setToaLanes(toa?.lanes || []);
      setActiveOId(prev => prev || (outs[0]?.outcome_id ?? null));
    }).finally(() => setLoading(false));
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

  const activeOutcome = outcomes.find(o => o.outcome_id === activeOId) || outcomes[0] || null;

  const tabBase = {
    padding: "9px 18px",
    fontSize: 13,
    border: "none",
    cursor: "pointer",
    borderRadius: "6px 6px 0 0",
    marginBottom: -2,
    transition: "color 0.12s, background 0.12s",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: TEXT_MUTED, fontWeight: 600, padding: 0,
            textDecoration: "underline" }}>
          ← All portfolios
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>
            {p?.label || portfolio.title}
          </h2>
          {p && <span style={{ width: 10, height: 10, borderRadius: "50%",
            background: p.color, display: "inline-block" }} />}
        </div>
      </div>

      {/* ── Tab strip: TOA + outcome tabs ── */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2,
        borderBottom: `2px solid ${BORDER}`, marginBottom: 24, flexWrap: "wrap" }}>

        {/* Theory of Action tab */}
        {(() => {
          const isActive = activeTab === "toa";
          return (
            <button
              onClick={() => setActiveTab("toa")}
              style={{
                ...tabBase,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? (p?.dark || ACCENT) : TEXT_MUTED,
                background: isActive ? (p?.light || ACCENT_LIGHT) : "transparent",
                borderBottom: isActive
                  ? `2px solid ${p?.color || ACCENT}`
                  : "2px solid transparent",
              }}>
              Theory of Action
            </button>
          );
        })()}

        {/* Outcome tabs */}
        {outcomes.map((out, i) => {
          const isActive = activeTab === "outcome" && out.outcome_id === activeOutcome?.outcome_id;
          return (
            <button key={out.outcome_id}
              onClick={() => { setActiveTab("outcome"); setActiveOId(out.outcome_id); }}
              style={{
                ...tabBase,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? (p?.dark || ACCENT) : TEXT_MUTED,
                background: isActive ? (p?.light || ACCENT_LIGHT) : "transparent",
                borderBottom: isActive
                  ? `2px solid ${p?.color || ACCENT}`
                  : "2px solid transparent",
              }}>
              <span style={{
                fontSize: 10, fontWeight: 800, flexShrink: 0,
                background: isActive ? (p?.color || ACCENT) : BORDER,
                color: isActive ? "#fff" : TEXT_MUTED,
                borderRadius: 3, padding: "1px 5px",
              }}>
                PO{i + 1}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {out.short_title || out.title}
              </span>
            </button>
          );
        })}

        {/* Add outcome */}
        {addingOut ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px" }}>
            <input
              autoFocus
              value={newOutTitle}
              onChange={e => setNewOutTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addOutcome(); if (e.key === "Escape") { setAddingOut(false); setNewOutTitle(""); } }}
              placeholder="Outcome title…"
              style={{ fontSize: 13, padding: "4px 8px", border: `1px solid ${BORDER}`,
                borderRadius: 5, fontFamily: "inherit", width: 200 }}
            />
            <Btn size="sm" onClick={addOutcome} disabled={saving}>
              {saving ? "…" : "Add"}
            </Btn>
            <Btn variant="secondary" size="sm" onClick={() => { setAddingOut(false); setNewOutTitle(""); }}>
              Cancel
            </Btn>
          </div>
        ) : (
          <button
            onClick={() => setAddingOut(true)}
            style={{ ...tabBase, color: TEXT_MUTED, background: "transparent",
              borderBottom: "2px solid transparent", fontSize: 12 }}>
            + Add outcome
          </button>
        )}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "toa" && (
        <div style={{ overflowX: "auto" }}>
          <PortalToaView portfolioId={portfolio.portfolio_id} portColor={p} />
        </div>
      )}

      {activeTab === "outcome" && activeOutcome && (
        <PortfolioOutcomePane
          key={activeOutcome.outcome_id}
          outcome={activeOutcome}
          portfolio={portfolio}
          user={user}
          toaLane={toaLanes.find(l => l.lane_id === activeOutcome.outcome_id) || null}
          onRefresh={load}
          onOutcomeChange={updated => setOutcomes(prev =>
            prev.map(o => o.outcome_id === updated.outcome_id ? updated : o)
          )}
          onDeleted={() => {
            const remaining = outcomes.filter(o => o.outcome_id !== activeOutcome.outcome_id);
            setOutcomes(remaining);
            setActiveOId(remaining[0]?.outcome_id ?? null);
            if (remaining.length === 0) setActiveTab("toa");
          }}
        />
      )}

      {activeTab === "outcome" && !activeOutcome && outcomes.length === 0 && (
        <p style={{ fontSize: 13, color: TEXT_MUTED, fontStyle: "italic" }}>
          No outcomes yet. Use "+ Add outcome" above to get started.
        </p>
      )}
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
                                        {ind.name || ind.text}
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
function ReviewQueue({ queue, loading, onRefresh, onRemove, indicators, bows, user, showToast }) {
  const canAct = user?.permission_level === "MLE";
  const indicatorMap = Object.fromEntries((indicators || []).map(i => [i.indicator_id, i]));
  const bowMap       = Object.fromEntries((bows || []).map(b => [b.bow_id, b]));
  const [rejectId, setRejectId]       = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editId, setEditId]           = useState(null);
  const [editValue, setEditValue]     = useState("");
  const [working, setWorking]         = useState(false);
  const [actionError, setActionError] = useState(null);
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
    onRemove(id);   // disappear immediately
    try {
      const res = await api(`/api/pending-actuals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ reviewed_value: val ? parseFloat(val) : undefined }),
      });
      if (res?.error) {
        setActionError(res.error);
      } else {
        const label = res.decision === "approved with edit" ? "Approved with edit" : "Approved";
        showToast?.(`✓ ${label} — value recorded successfully`);
      }
    } catch (e) {
      setActionError("Approval failed — please refresh and try again.");
    } finally {
      setWorking(false); setEditId(null); onRefresh();
    }
  };

  const reject = async () => {
    if (!rejectNotes.trim()) return;
    const id = rejectId;
    setWorking(true);
    onRemove(id);   // disappear immediately
    setRejectId(null); setRejectNotes("");
    try {
      const res = await api(`/api/pending-actuals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reviewer_notes: rejectNotes }),
      });
      if (res?.error) {
        setActionError(res.error);
      } else {
        showToast?.("Submission rejected and submitter notified", "error");
      }
    } catch (e) {
      setActionError("Rejection failed — please refresh and try again.");
    } finally {
      setWorking(false); onRefresh();
    }
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
      {/* Action error banner */}
      {actionError && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8,
          background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B",
          fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 16, color: "#991B1B", lineHeight: 1 }}>×</button>
        </div>
      )}
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
  const [toast, setToast]                       = useState(null); // { message, variant }
  const toastTimer = useRef(null);

  const showToast = (message, variant = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

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

  // Optimistic removal — drop the acted-on item immediately so the queue
  // updates without waiting for a server round-trip.
  const removeFromQueue = (pendingId) => {
    setQueue(prev => prev.filter(s => s.pending_id !== pendingId));
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

      {/* Toast notification */}
      {toast && (
        <div className="fade-up" style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.variant === "success" ? "#059669" : "#DC2626",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "center", gap: 10,
          maxWidth: 360,
        }}>
          <span>{toast.variant === "success" ? "✓" : "✕"}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: "#fff", fontSize: 16, lineHeight: 1, opacity: 0.7 }}>×</button>
        </div>
      )}

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

      {/* Page content — full width for portfolio ToA, wider for BOW panels */}
      <div style={{ padding: "36px 32px", maxWidth: selectedPortfolio ? 1600 : 980, margin: "0 auto" }}>

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
              onRefresh={loadQueue} onRemove={removeFromQueue}
              indicators={indicators} bows={bows} user={user}
              showToast={showToast} />
          </>
        )}
      </div>
    </div>
  );
}
