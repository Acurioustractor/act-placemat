## CRM Pipeline (Sprint 1)

Owner: Ben  
Due: End of Week 2  
Related Task: 14.11 — CRM pipeline setup and stages

Stages (initial)
- Lead → Qualified → Discovery → Proposal → Commit → Closed Won/Lost

Required fields
- Company, Contact, Segment, Source, Pain/Gain notes, Deal size (range), Stage date, Next action date, Owner

Automations (v1)
- Move to Qualified on ICP fit + active interest
- Auto-create discovery checklist and meeting notes template
- Reminder if no next action date within 5 business days
- Auto-generate proposal template at Proposal stage

Reporting views
- Weekly pipeline by stage and amount
- Velocity: stage to stage average days
- Forecast: this/next 2 months

Data sources
- Notion CRM (initial); map to HubSpot later if needed
- Gmail for comms capture; Finance summary for financial context

Checklist to “Done”
- Stages and fields configured
- At least 10 leads entered and moved through at least one stage
- Views for pipeline, velocity, forecast created

Configuration checklist (Notion v1)
- [ ] Database: `CRM Deals` with properties:
  - `Company` (relation or text), `Primary Contact` (relation), `Segment` (select), `Source` (select)
  - `Pain/Gain Notes` (long text), `Deal Size` (number/range), `Stage` (select), `Stage Date` (date)
  - `Next Action` (text), `Next Action Date` (date), `Owner` (person), `Probability` (%)
- [ ] Views:
  - Board by `Stage`; Table with filters for active deals; Forecast view grouping by close month
- [ ] Templates:
  - `Discovery` template with checklist and notes; `Proposal` template with sections and pricing stub
- [ ] Automations:
  - Reminder if `Next Action Date` is empty or past; Auto-set `Stage Date` on stage change
- [ ] Integrations:
  - Link Finance summary URL per account; capture key comms via Gmail labels or notes

Owner workflow
- New lead entry → ICP fit check → move to Qualified → schedule discovery → notes via template → proposal generation → commit → close

