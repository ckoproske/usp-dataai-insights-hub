# USP Data & AI Insights Hub — Claude Instructions

## Schema is the source of truth

`schema.dbml` is the authoritative definition of every table and column in the
database. **Read it before writing any SQL or referencing any field in `api.py`
or `portal.jsx`.** Do not guess column names — verify them in the DBML first.

### When to read schema.dbml
- Before writing a SQL query (SELECT, INSERT, UPDATE, DELETE)
- Before adding or changing a field reference in `portal.jsx`
- Before adding a table or column to `DM_TABLES` / `DM_GROUPS` in `dashboard.jsx`
- Whenever uncertain whether a column exists or what it is named

### When to update schema.dbml
Update `schema.dbml` **in the same commit** as any change that adds, removes, or
renames a table or column. This includes:
- New tables added to the Databricks schema
- New columns added to existing tables
- Columns removed or renamed
- Ref (foreign key) changes

After updating `schema.dbml`, also check whether `DM_TABLES` and `DM_GROUPS` in
`dashboard.jsx` need corresponding updates (the Data Model Explorer must stay in
sync with the live schema).

---

## Key files and their roles

| File | Purpose |
|---|---|
| `schema.dbml` | Source-of-truth schema for all Databricks Delta Lake tables |
| `api.py` | Flask backend — all SQL queries and data mutations live here |
| `portal.jsx` | React frontend — portfolio/BOW edit pages, indicators, assumptions |
| `dashboard.jsx` | React frontend — strategy dashboard, Data Model Explorer |

---

## api.py conventions

- `query(sql, params)` — opens a fresh connection, returns list of dicts
- `execute(sql, params)` — opens a fresh connection, runs a write (no return)
- `_qc(cursor, sql, params)` — runs on an existing cursor (used inside `get_bow_full` to avoid multiple round-trips)
- `get_connection()` — reads the Databricks access token from the `X-Forwarded-Access-Token` header injected by the Databricks App proxy; never hardcode credentials
- `_log_edit(entity_type, entity_id, bow_id, portfolio_id, changes, rationale, revision_reason, edited_by)` — writes an audit entry to `content_edit_log`; returns `True` on success, `False` on failure (failure is printed to server log but never kills the parent write)
- `_build_changes(old_row, new_data, allowed_fields)` — returns `{field: {old, new}}` for fields that actually changed; returns `{}` if nothing changed
- `_actor(body)` — resolves the acting user from `X-Forwarded-Email` header → `edited_by` in request body → `"unknown"`
- `new_id()` — generates a UUID string for new primary keys

### Edit endpoints pattern
Every PATCH endpoint should:
1. Fetch the current row with `query()`
2. Call `_build_changes()` and return `{"status": "no_change"}` if empty
3. Validate required fields (rationale, etc.)
4. Run the `execute()` UPDATE — **also set `last_updated = current_timestamp()` and `updated_by = ?` if those columns exist on the table**
5. Call `_log_edit()` for the audit trail
6. Return `{"status": "ok"}` (include `"log_warning": True` if `_log_edit` returned `False`)

---

## portal.jsx / dashboard.jsx conventions

- `api(path, opts)` — thin fetch wrapper; always returns a parsed object (never throws)
- Response handling in save handlers must distinguish three cases:
  - `res.error` → show inline error, keep form open
  - `res.status === "no_change"` → close via `onCancel()` (nothing was saved)
  - otherwise → call `onSave()` / `onRefresh()` to trigger a data reload
- `formatLastEdited(by, at)` — formats passive timestamps ("Updated today by Name")
- `LastEdited` component — renders the formatted string inline next to section headers
- Passive timestamps for the "Outcomes & Execution Targets" section read from
  `editSummary.outcomes_targets` (sourced from `content_edit_log` + direct
  `execution_targets.last_updated` fallback via `/api/bow/<id>/edit-summary`)

---

## Data Model Explorer (dashboard.jsx)

`DM_TABLES`, `DM_GROUPS`, `DM_TABLE_POS`, and `DM_GROUP_RECTS` are hardcoded
constants that drive the Data Model Explorer diagram and browse view.

**When schema.dbml changes, update these constants to match:**
- `DM_TABLES` — one entry per table with `cols` (column name + type + pk/fk flags)
- `DM_GROUPS` — logical groupings of tables (Strategy Structure, Execution, etc.)
- `DM_TABLE_POS` — x/y positions for diagram layout
- `DM_GROUP_RECTS` — bounding box coordinates for group labels

Always read `schema.dbml` when editing these — do not guess column names or types.

---

## Commit hygiene

- Schema changes and their corresponding `schema.dbml` updates go in the **same commit**
- Data Model Explorer (`DM_TABLES` / `DM_GROUPS`) updates go in the same commit as the schema.dbml update
- Include the affected table names in the commit message
