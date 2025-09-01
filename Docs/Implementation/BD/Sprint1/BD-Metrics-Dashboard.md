## BD Metrics Dashboard (Sprint 1)

Owner: Ben  
Due: End of Week 2  
Related Task: 14.14 — BD metrics dashboard

Purpose
- Weekly visibility for pipeline health, activity, conversion, and forecast. Supports Mon plan / Fri review.

Core KPIs (definitions)
- Leads created (wk): count of new `Lead` stage entries this week
- Meetings booked (wk): discovery or proposal meetings scheduled this week
- Proposals sent (wk): number moved to `Proposal` this week
- Win rate (last 90d): Closed Won / (Closed Won + Lost)
- Cycle time (median): days from `Qualified` → `Closed Won`
- Pipeline $ by stage: sum of Deal Size per stage
- Forecast (this + next 2 months): weighted by Probability

Inputs & sources
- CRM Notion DB (`CRM Deals`): properties per CRM-Pipeline.md
- Calendar (optional): meeting count for BD activities
- Finance summary (optional): cash/runway context, AR/AP status flags

Views (Notion v1)
- Weekly Review: table filtered to last 7d changes; shows Leads, Meetings, Proposals
- Pipeline Board: Kanban by `Stage` with Deal Size, Next Action Date
- Conversion & Velocity: rollups or formulas for win rate and cycle time
- Forecast: group by close month, show sum and weighted sum by Probability

Update cadence
- Monday: plan targets (leads, meetings, proposals); identify stuck deals
- Friday: review actuals vs plan; update next actions and forecast

Alerts & thresholds (to operationalize later)
- No `Next Action Date` within 5 business days → follow-up task
- Deals >30 days in stage without movement → flag
- Forecast drop >20% week-over-week → review

Deliverables
- Notion dashboard page with the views above
- KPI glossary embedded on the page
- Checklist for weekly Mon/Fri ritual

