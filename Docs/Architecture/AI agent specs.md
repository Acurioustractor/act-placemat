Below is a **single, implementation‑ready spec** you can hand to your engineering team to wire our entire conversation into your existing AI tool (you said it already has APIs to all of your data). I’ve written it as a practical build doc: components, endpoints, data models, agent logic, guardrails, testing, and a 90‑day execution plan.

> Scope: ACT Pty Ltd as the operating company, optional property SPVs, optional CLG (charity). Xero is the ledger of record; Dext for receipts; Thriday (via Regional Australia Bank) for banking & auto‑allocations feeding Xero. AI agents do the prep; humans sign statutory items (BAS, RDTI, payroll).

---

## 0) Outcomes to hit

* ≤10 minutes/week founder time on routine finance.
* ≥95% auto‑coded bank transactions; <3% exception rate.
* Continuous BAS readiness (draft at any time), zero late lodgements.
* 13‑week cash forecast with ±10% accuracy at 30/60 days.
* R&D Tax Incentive registration prep and evidence capture running continuously.
* Full APPs (privacy) alignment and immutable audit logs.

---

## 1) System architecture (how to implement inside your tool)

**Core services (in your app):**

1. **Event Ingestor** — receives webhooks / pollers from Xero, your doc stores, VCS, calendar/tasks.
2. **Agent Orchestrator** — routes events to agents using a rules engine + policy store.
3. **Agents** (stateless functions with memory via feature store):

   * Receipt & Coding, eInvoice Intake, Bank Reco, AR & Collections, BAS Prep & Check, Cashflow & Forecast, R&D & Grants, Spend Guard, Decision Journal/Board Pack.
4. **Policy Store** (YAML) — thresholds, approvals, entity list, tracking dictionary, privacy.
5. **Finance Data Lake** — nightly snapshots of Xero/Dext (CSV/JSON) + immutable append‑only event store.
6. **Notification Bus** — Slack/Email for approvals, exceptions, and digests.
7. **Audit & Metrics** — structured logs + metrics pipeline (agent actions, exception rate, cycle time).

**External systems (sources of truth):**

* **Xero** (ledger, bills, invoices, bank transactions, tracking categories).
* **Dext** (capture to Xero; we read results from Xero).
* **Thriday/RAB** (banking) → **Xero bank feeds** (we don’t need a Thriday API).
* **Peppol e‑Invoicing** (Xero receives draft bills).
* **Doc & Code** for R&D evidence (Git, Drive/Notion/Docs, Calendar/Meet).

---

## 2) Connectors & authentication

* **Xero OAuth 2.0**: request scopes for accounting (read/write where needed), offline access (refresh tokens). Persist tenantId and token pairs per entity (ACT Pty Ltd; each SPV; CLG).
* **Dext**: no dependency on a Dext API; rely on Xero bills/attachments that Dext publishes.
* **Thriday**: treat as bank accounts surfaced through **Xero bank transactions**.
* **Docs/Code**: Git (webhooks on push), Drive/Notion APIs, Calendar (events/recordings metadata).

---

## 3) Event triggers (what wakes agents)

* **Xero → /events/xero/bank_transaction_created**
* **Xero → /events/xero/bill_created** (Dext or eInvoice creates draft bill)
* **Xero → /events/xero/invoice_created/updated** (for AR)
* **Scheduler → /jobs/daily** (BAS delta, forecasts, exceptions, nudges)
* **Scheduler → /jobs/month_end** (board pack)
* **Code/Docs → /events/rd/evidence_added** (commit pushed, doc uploaded, meeting held)

---

## 4) API surface (implement these in your tool)

### 4.1 Inbound event endpoints

```
POST /events/xero/bank_transaction_created
POST /events/xero/bill_created
POST /events/xero/invoice_updated
POST /events/rd/evidence_added
POST /events/policy/updated
POST /events/user/approval_callback   # Approve/Reject buttons route here
```

**Expected payload (example: bank transaction):**

```json
{
  "entity": "ACT_PTY_LTD",
  "bankTransactionId": "uuid",
  "date": "2025-09-25",
  "amount": -132.40,
  "description": "Auto Allocation GST Transfer",
  "reference": "Thriday Allocation",
  "status": "unreconciled",
  "bankAccount": "Thriday Main",
  "attachments": []
}
```

### 4.2 Outbound to users (notifications)

* Slack/Email with action links: `Approve`, `Reject`, `Open in Xero`, `Explain`.

### 4.3 Reports

```
GET /reports/bas_pack?entity=ACT_PTY_LTD&period=2025Q1
GET /reports/board_pack?entity=ACT_PTY_LTD&month=2025-09
GET /reports/rdti_register?yearEnd=2025-06-30
```

Returns a zipped HTML/PDF + CSV bundle with drill‑through links to Xero items.

---

## 5) Agent specs (logic, states, and acceptance criteria)

### A) Receipt & Coding Agent

**Trigger:** bill_created (draft) from Xero (Dext or eInvoice).
**Logic:**

1. Read supplier, amount, tax code, date, line items, attachments.
2. Apply **deterministic rules** from policy (vendor → account/tax/tracking).
3. If confidence ≥ policy.thresholds.auto_post: **Publish bill to Xero**; else route to approval.
4. Persist a **learning feature** (supplier+memo → account) to improve future coding.

**Accept:** 90–95% bills auto‑coded; exceptions <10% and decreasing.

### B) eInvoice Intake Agent

**Trigger:** Xero draft bill with `source=eInvoice`.
**Logic:** Same as above, but with higher auto‑post confidence threshold (data quality is better).

### C) Bank Reco Agent

**Trigger:** bank_transaction_created.
**Logic:**

* If description contains any **Thriday Auto Allocation** keywords → propose **Transfer** between Thriday accounts (source→target) rather than expense.
* Else try 1) exact match invoice/bill; 2) amount+date window match; 3) narration ML.
* If match confidence < threshold → push exception with top‑3 suggestions.

**Accept:** ≥95% auto‑match; exceptions cleared <48h.

### D) AR & Collections Agent

**Trigger:** invoice_updated (due soon/overdue) or daily job.
**Logic:** reminder cadence, payment plans proposals; stop on payment or dispute flag.

**Accept:** DSO trending down, friendly tone templates.

### E) BAS Prep & Check Agent

**Trigger:** daily job; also on policy updates and large postings.
**Logic:**

* Build **live BAS draft** (GST collected/paid, PAYG W), show deltas vs prior periods.
* Run **variance rules** (+/‑ thresholds), list **risky transactions** (unusual GST codes, large adjustments, missing ABNs).
* Generate **BAS pack** (CSV of lines; PDF summary; exception list) and route for human review.
* **Never lodge** — your BAS/tax agent lodges after review (or switch to a single chosen lodgement path if that’s your policy).

**Accept:** Pack accurate to Xero; zero late lodgements.

### F) Cashflow & Forecast Agent

**Trigger:** daily job.
**Logic:**

* 13‑week rolling forecast from invoices, bills, payroll cycles, loans; scenario toggles (best/base/worst).
* Flag runway dips, debtor slippage, supplier bunching; send nudges.

**Accept:** ±10% 30/60‑day accuracy.

### G) R&D & Grants Agent

**Trigger:** events/rd/evidence_added + monthly reminder.
**Logic:**

* Maintain **RDTI register**: activities (core/supporting), hypotheses, uncertainties, experiments.
* Link artifacts (commits, notes, test logs, invoices, timesheets).
* Tag eligible costs in Xero (salaries/contractors/consumables/apportioned overhead).
* Generate **DISR registration draft** (plain‑English reasoning + evidence index).
* Maintain **deadline ticker** (10 months after YE).
* Output **cash benefit estimate** into forecast.

**Accept:** Complete pack ready for specialist review; clear trail.

### H) Spend Guard & Policy Agent

**Trigger:** on draft bills/expenses creation; policy updates.
**Logic:** enforce spend limits; block/flag out‑of‑policy drafts; keep APPs rules.

### I) Decision Journal & Board Pack Agent

**Trigger:** month_end job.
**Output:** one‑pager (KPIs, runway, variances, BAS status, R&D progress, decisions taken vs planned) + drill‑through.

---

## 6) Policy (paste into your Policy Store)

```yaml
version: 1
entities:
  - code: ACT_PTY_LTD
    xero_tenant_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    bank_accounts:
      - name: "Thriday Main"
      - name: "Thriday GST"
      - name: "Thriday Tax"
      - name: "Thriday Profit"
      - name: "Thriday Opex"
    tracking:
      project_property: ["Seed House Witta", "JusticeHub", "ACT Core", "Property SPV 1"]
      line_of_business: ["Consulting", "Grants_Programs", "Property_Ops", "Digital_Products"]
thresholds:
  auto_post_bill_confidence: 0.85
  auto_match_bank_confidence: 0.90
  variance_alert_pct: 0.20
  payment_duedays_warning: 5
approvals:
  auto:
    - rule: "bill.amount < 250 and vendor in known"
    - rule: "bank.transfer and description contains 'Allocation'"
  propose_only:
    - rule: "bill.amount >= 250"
    - rule: "new_bank_rule"
    - rule: "payment.amount >= 2000"
  human_signoff:
    - "BAS_lodgement"
    - "RDTI_registration"
    - "payroll_finalisation"
vendor_rules:
  - vendor: "Telstra"
    account: "Telephone & Internet"
    tax_code: "GST on Expenses"
    tracking:
      line_of_business: "ACT Core"
privacy:
  data_minimisation: true
  retention_months: 84   # keep finance docs 7 years
  pii_access_roles: ["FinanceAdmin", "Director"]
bas:
  lodgement_path: "via_registered_agent"  # or "thriday" if you switch later
  frequency: "quarterly"
rdti:
  year_end: "2025-06-30"
  registration_deadline: "2026-04-30"
  advisor_required: true
notifications:
  slack_channel: "#finance"
  digest_times: ["09:00"]
```

---

## 7) Data models (internal)

**TransactionMemory**

```json
{ "key": "supplier|memo", "account": "Printing & Stationery", "taxCode": "GST on Expenses", "confidence": 0.92, "updatedAt": "2025-09-25" }
```

**RDActivity**

```json
{
  "id": "rd-001",
  "title": "JusticeHub matchmaking engine",
  "type": "core",
  "hypothesis": "Algorithm improves match precision by 20%",
  "uncertainty": "Feasibility of on-country knowledge signals",
  "experiments": ["exp-01","exp-02"],
  "evidence": [
    {"type": "commit", "ref": "abc123", "link": "..."},
    {"type": "doc", "ref": "Design Note v2", "link": "..."},
    {"type": "meeting", "ref": "2025-09-10 workshop", "link":"..."}
  ],
  "cost_tags": {"payroll_hours": 120, "contractor_cost": 5000, "consumables": 800}
}
```

**BASPack** (zip with): `summary.json`, `exceptions.csv`, `gst_collected.csv`, `gst_paid.csv`, `payg.csv`, `notes.md`.

---

## 8) Thriday ↔ Xero implementation rules

* Treat any bank txn where `description` or `reference` contains **“Allocation”** / **“Transfer”** (or your Thriday strings) as **Transfer** between Thriday accounts (not an expense).
* Map each Thriday sub‑account to a Xero bank account; reconcile daily.
* Keep **Xero as the ledger of record**; Thriday is banking/allocations.
* BAS: choose **one** lodgement path (default: registered agent via Xero). Your agent prepares; human signs.

---

## 9) R&D process automation

* **Evidence ingest adapters**:

  * Git: on push, parse commit messages for `R&D:` tags; attach diffs to activities.
  * Docs: when a “R&D” folder file changes, attach to activity.
  * Calendar: when event title contains `[R&D]`, store notes/links.
* **Eligibility heuristics**: novelty/uncertainty present? systematic experiment present? direct cost nexus?
* **Register builder**: composes DISR text with footnoted evidence links; outputs Word/PDF + CSV cost schedule.
* **Deadline ticker**: alert 60/30/10 days before the 10‑month deadline.

---

## 10) Security, privacy, audit

* Secrets in a vault; Xero tokens encrypted at rest.
* APPs alignment: data minimisation, purpose limitation, access controls, incident log.
* **Immutable append‑only** event log; monthly **Agent SOC** report: actions, exceptions, overrides.

---

## 11) Automation‑vs‑Art rubric (baked into agent decisions)

Represent as a scoring function; if score ≥18/30, auto; else propose or keep human‑crafted.

```json
{
  "criteria": [
    "mission_culture",
    "safety_compliance",
    "community_impact",
    "distinctive_value",
    "hours_saved",
    "data_quality"
  ],
  "threshold": 18
}
```

Expose `/decisions/rubric/score` endpoint to score any proposed automation.

---

## 12) Test plan (what to verify before you trust it)

**Unit tests**

* Vendor rules precedence; GST code derivation.
* Thriday allocation detection → Transfer, not expense.
* BAS variance detection (simulate +/- 25%).
* RDTI register builder: produces sections + evidence index.

**Integration tests**

* Xero sandbox: create draft bills (Dext/eInvoice), bank txns, invoices; verify agents’ end‑to‑end behaviour.
* Slack/Email approval loop works; rejections loop back cleanly.

**User acceptance**

* 2‑week parallel run: human vs agent coding; measure agreement rate.
* 1 quarter “shadow BAS” cross‑check (if you want to test a second view).

**SLOs**

* 95% bank auto‑match; exceptions <48h resolution.
* Monthly board pack delivered by T+2 business days.

---

## 13) 90‑day implementation plan (do this)

**Weeks 1–2**

* Wire Xero OAuth + webhooks/pollers.
* Stand up Event Ingestor, Policy Store, Data Lake.
* Implement **Receipt & Coding**, **Bank Reco** agents.
* Thriday account mapping + transfer detection.

**Weeks 3–4**

* Implement **AR & Collections**, **BAS Prep & Check**.
* Slack/Email approval workflow.
* Initial policy.yaml; set Tracking Categories; seed vendor rules.

**Weeks 5–6**

* **Cashflow & Forecast** agent; alerting.
* Nightly snapshots; audit log dashboards.

**Weeks 7–8**

* **R&D & Grants** agent (adapters: Git, Docs, Calendar).
* Generate first RDTI register draft (for one project).

**Weeks 9–10**

* **Decision Journal/Board Pack** agent; export bundle.
* Shadow BAS cross‑check run; reconcile any rule gaps.

**Weeks 11–12**

* Harden privacy controls; incident runbook.
* Metrics & Agent SOC monthly report; handover.

---

## 14) Paste‑ready runbooks & templates

### 14.1 Thriday ↔ Xero mapping (bank rules)

* If description matches `(?i)(allocation|thriday.*transfer|auto.*allocation)` → classify as **Bank Transfer** from source to target Thriday accounts.
* Otherwise, normal coding. Maintain a whitelist of source→target account names.

### 14.2 Tracking dictionary (Xero)

```
Tracking 1 (Project/Property): Seed House Witta | JusticeHub | ACT Core | Property SPV 1
Tracking 2 (Line of Business): Consulting | Grants_Programs | Property_Ops | Digital_Products
```

### 14.3 R&D evidence checklist

* For each activity: Hypothesis, Uncertainty, Experiment design, Results, Next steps.
* Evidence artefacts: code diffs, design notes, test logs, meeting minutes, invoices, timesheets.
* Cost tagging fields in Xero: `rd_core`, `rd_supporting`, `non_rd`.
* Deadline fields: `year_end`, `registration_deadline`.

### 14.4 Approvals & delegations (human‑in‑loop)

* Auto: bills < $250 known vendor; bank allocations; AR reminders.
* Propose: new vendor, bank rule change, payments ≥ $2,000, BAS numbers.
* Human sign‑off: BAS lodgement, RDTI registration/claim, payroll finalisation.

---

## 15) $200k Year‑1 flow (sample numeric frame inside the tool)

* **Operating Float:** $120k
* **Directors’ Payroll:** $50k (e.g., $25k each over 6–12 months; PAYG + super)
* **Reserves:** $30k (Thriday auto‑allocations: GST 10%, Tax 20–30%, Profit 5%)

Represent in policy:

```yaml
allocations:
  gst_pct: 10
  tax_pct: 25
  profit_pct: 5
  opex_pct: 60
payroll:
  directors:
    - name: "Director A"
      annual_gross: 50000
    - name: "Director B"
      annual_gross: 50000
```

(Numbers are placeholders; adjust to your targets.)

---

## 16) Multi‑entity support (SPVs, CLG)

* Duplicate **entity blocks** in policy for each SPV and the CLG (own Xero tenantId, bank accounts).
* Intercompany invoices automated via AR/AP agent with fixed transfer pricing rules.
* Board pack aggregates **consolidated view** + **per‑entity view**.

---

### Hand‑off checklist for the dev team (TL;DR)

1. Add Xero OAuth + webhooks; persist tokens per entity.
2. Implement Event Ingestor + Policy Store (YAML as above).
3. Build agents A–I with the exact triggers, logic, and accept criteria.
4. Implement Thriday transfer detection via bank txn strings; map accounts.
5. Produce `/reports/bas_pack`, `/reports/board_pack`, `/reports/rdti_register`.
6. Lock maker‑checker: agents prepare; humans sign BAS/RDTI/payroll.
7. Ship the test plan and run 2‑week parallel + one quarter shadow BAS.

---

If you want, I can **generate the initial `policy.yaml` and a set of stubbed JSON payloads** (one per endpoint) tailored to your current entity names and Slack channel so your engineers can start wiring immediately.
