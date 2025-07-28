Below is a complete **business‑plan‑style strategy** for **A Curious Tractor (ACT)** using the structure in your screenshot (executive summary → market analysis → marketing/sales → financials → action plan). I’ve pre‑filled answers for ACT and added concrete next steps for your React/Supabase dashboard and content.

---

## Executive summary

**Purpose.** ACT cultivates community‑led solutions by combining co‑design, storytelling, art, nature, and open tech. We incubate “seeds” (initiatives) that become programs, products, and platforms across youth justice, wellbeing, and place‑based development.

**Vision.** A just, equitable, regenerative world led by communities, not cycles of short‑term policy.

**What we do.**

* Design & deliver community‑led programs (e.g., JusticeHub, Goods, YJ: Your Justice).
* Build digital/public‑interest tech (e.g., Empathy Ledger; Con‑nected; Confit Pathways).
* Produce evidence & stories that unlock funding and partnerships for grassroots leaders.

**How we’re different (USP).**

* **Co‑creation first.** Communities own the solution.
* **Story + system.** We pair narrative power with hard data.
* **Open, interoperable stack.** React + Supabase + Notion knowledge base; open source where possible.
* **Creative activism.** Artful, slightly rebellious brand that cuts through apathy.

**Year‑1 priorities.**

1. Launch a public **Community Dashboard** (stories + metrics + partner hub).
2. Convert 3 flagship seeds into fundable, multi‑year programs.
3. Build repeatable earned‑income offers (design sprints, training, storytelling labs).

---

## Information about ACT (prompt fields)

* **Type of business:** Community impact studio & venture lab (NFP/for‑purpose hybrid with earned income).
* **Target market:** Community partners (Indigenous‑led orgs, youth‑justice services), philanthropy & impact funders, gov/CSR partners, general public supporters.
* **Unique selling proposition:** Community‑owned design + evidence‑backed storytelling, delivered via open tech and a distinctive creative brand.
* **Initial investment (assumption to confirm):** **AUD 250k** (runway for 12 months: core team, dashboard, 3 seed pilots, content ops).
* **Projected timeline:** **12 months** to stable dashboard + 3 scaled seeds; **36 months** to diversified revenue and national partnerships.

> If you want me to re‑run the plan with your exact capital and timeline, tell me the numbers and I’ll adjust the projections.

---

## Market analysis

**Customers / stakeholders**

* **Primary:** Indigenous & community‑led orgs; youth‑justice practitioners; philanthropy/impact funds; departments (justice/health/communities); allied NGOs.
* **Secondary:** Media/creatives; researchers/unis; volunteers & general public.

**Needs we solve**

* Turning lived experience into **fundable, scalable programs**.
* Credible **impact evidence** + human stories (for grants, donors, procurement).
* **Digital infrastructure** for continuity (mentoring, case mgmt, knowledge commons).
* **Capacity building** (design, data, comms, fundraising).

**Competitor / alternative set**

* Traditional consultancies (high cost, low community ownership).
* Single‑issue NGOs (limited to one program).
* Gov taskforces/inquiries (slow, privilege institutional voices).
* Point‑solution tech vendors (closed, not co‑created).

**Trends we ride**

* Philanthropy moving to **trust‑based funding**.
* **Evidence + narrative** demanded by funders.
* **Open‑source / public‑interest tech** expectations.
* **Place‑based** & Indigenous‑led solutions.

**SWOT (concise)**

* **S:** Co‑creation credibility; creative brand; open tech; cross‑sector network.
* **W:** Lean team; capital intensive to stand up platforms; measurement burden.
* **O:** Untapped community IP; gov procurement reform; impact‑investment appetite.
* **T:** Policy shifts; funding cycles; narrative capture by large incumbents.

---

## Offerings (what we sell / deliver)

1. **Programs & Platforms (seeds → programs)**

   * JusticeHub; Goods (Great Bed / resilient appliances); YJ: Your Justice; Con‑nected; Confit Pathways; Empathy Ledger; Dad.Lab; The Fixers; The Most Accessible Cabin; The Confessional.
2. **Services**

   * Community‑led design sprints; impact storytelling labs; evaluation & data visualisation; capability training (youth justice best practice; restorative design).
3. **Products / IP**

   * Toolkits (co‑design, measurement frameworks), curriculum, licensing of community‑built designs (e.g., Goods), speaking/training.

---

## Go‑to‑market, marketing & sales strategy

**Positioning statement (external).**

> *We co‑create community‑owned solutions and show their impact through evidence and story—so funders and partners can confidently back what works.*

**Voice & tone.** Grassroots, curious, imaginative, a bit rebellious; plain‑spoken, hopeful, never preachy. Center lived experience.

**Channels**

* **Community Dashboard (primary):** Stories, metrics, partner pages, updates, action CTAs.
* **Newsletter:** “Field Notes” (monthly).
* **Partner outreach:** Warm intros; funder roundtables; targeted pitches with story+data packs.
* **Media & speaking:** Thought‑leadership on youth justice and community‑led design.
* **Open source:** Publish code/tooling; invite contributors; credibility with tech funders.

**Campaigns (next 6–9 months)**

* **“170 Ripples”**: 170 voices shaping youth justice futures; publish in dashboard series; compile funder brief.
* **Goods Pilot Stories**: Bed & washing prototypes with Elders—mini‑docs + impact snapshots.
* **Practitioner Spotlight**: YJ profiles + toolkits for frontliners.

**Conversion paths**

* **Community partner:** Story feature → inquiry form → scoping sprint → pilot.
* **Funder:** Story + metric page → downloadable brief → call → MoU → grant/contract.
* **Public:** Story → subscribe → volunteer/donate/advocate actions.

**Measurement**

* Subscribers, partner inquiries, qualified funder calls, proposals submitted/won, \$ raised, partner NPS, program outcomes per seed.

---

## Product & tech: Dashboard implementation (React + Supabase + Notion)

**Frontend (React).** Component library aligned to brand. Core components: `Hero`, `ImpactStats`, `StoryCard`, `StoryDetail`, `PartnerGrid`, `ProjectUpdateList`, `CTA`, `SubscribeForm`, `ContactForm`.

**Backend (Supabase).** Minimal schema (editable):

**Tables**

| table         | key fields                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------- |
| stories       | id, title, slug, excerpt, body\_md, hero\_image\_url, tags\[], author, published\_at, feature\_flag |
| metrics       | id, label, value, unit, category, period\_start, period\_end, method\_note                          |
| projects      | id, name, status, summary, image\_url, pillar, geography, start\_date, next\_milestone\_date        |
| partners      | id, name, type (community/talent/funder), logo\_url, blurb, link                                    |
| updates       | id, project\_id, title, body\_md, published\_at                                                     |
| subscribers   | id, email, source, created\_at                                                                      |
| inquiries     | id, name, org, email, topic, message, created\_at                                                   |
| media\_assets | id, url, caption, credit, consent\_flag                                                             |

**Auth/roles**

* Public read for stories/metrics/partners.
* Admin (row‑level security) for content ops.
* Optional Slack webhook for new subscriber/inquiry alerts.

**Content workflow**

* Draft in Notion → approve → paste to Supabase (body\_md); or build a tiny admin UI later.
* Alt text + consent tracked in `media_assets`.

**Accessibility & performance**

* WCAG AA; alt text; transcripts for video; image optimisation; analytics (privacy‑respecting).

---

## Operating model & team (lean)

* **Co‑founders** (brand/partnerships; programs/story).
* **Design & build**: 1 full‑stack (React/Supabase), 1 designer (brand/UI), 1 content producer/editor.
* **Programs**: 1 community facilitator (Elders & partners).
* **Measurement**: part‑time evaluator (framework + data discipline).

---

## Financial projections (high‑level; AUD; confirm/adjust)

**Assumptions (Base case)**

* Year‑1 revenue **\$600k** (mix of grants/contracts 65%, services 25%, products/licensing 10%).
* YoY growth 40% as seeds convert to programs; COGS low; opex driven by team/content/fieldwork.
* Initial investment **\$250k** covers team gap + setup; 6‑month cash buffer targeted.

**3‑year summary**

|                                 |   Y1 |   Y2 |    Y3 |
| ------------------------------- | ---: | ---: | ----: |
| Revenue                         | 600k | 840k | 1.20m |
| Grants & contracts              | 390k | 520k |  700k |
| Services (design/training)      | 150k | 210k |  300k |
| Products/IP/licensing           |  60k | 110k |  200k |
| Operating expenses              | 520k | 680k |  930k |
| EBITDA (pre‑grant restrictions) |  80k | 160k |  270k |
| Cash runway (months)            |    6 |    7 |     9 |

**Cost drivers:** team (65–70%), travel & community engagement (10–15%), content/media (5–10%), infra (Supabase/hosting/tools \~3–5%).
**Sensitivity:** A “Stretch” case adds +20–30% revenue via 1 signature funder + 1 government partnership; a “Conservative” case reduces grants by 25%—mitigated by more services bookings.

---

## Risks & mitigations

* **Funding cyclicality.** Build multi‑year MoUs; diversify services/IP.
* **Community fatigue.** Pay people for time; strict consent; local cadence.
* **Measurement burden.** Minimal viable indicators per seed; automate via Supabase; publish methods.
* **Team bandwidth.** Stagger launches; contributor network; open‑source help.
* **Policy shifts.** Non‑partisan stance; evidence library; coalition approach.

---

## 12‑month action plan (dated from **27 July 2025**, Sydney time)

**Aug–Sep 2025**

* Finalise dashboard IA & wireframes; confirm Supabase schema; seed 6–10 stories and baseline metrics.
* Partner consent and media library setup; Slack alerts for forms.
* Pilot “170 Ripples” content workflow (first 10 voices).

**Oct–Nov 2025**

* Public beta launch of dashboard (stories, metrics, partners, updates, subscribe & contact).
* Campaign #1: Goods pilot stories (mini‑docs + snapshot metrics).
* Services offer pages live (Design Sprint; Story Lab; YJ training).

**Dec 2025–Jan 2026**

* Funder brief generator (PDF from story+metric); outreach to 10 targets.
* Add partner pages (5–8), and impact map.
* Build tiny admin UI or Notion→Supabase sync script.

**Feb–Mar 2026**

* Campaign #2: Practitioner Spotlight (YJ).
* Launch v1 Empathy Ledger showcase; add 2 measurement dashboards per seed.
* First evaluation memo published (methods + Q1 outcomes).

**Apr–Jun 2026**

* Convert 2 pilots to multi‑year agreements; publish learning report.
* Community event at the Farm; record stories; grow mailing list to 2k.
* Tech hardening: tests, a11y audit, perf pass; open‑source selected components.

**KPIs by June 30, 2026**

* 30+ stories, 12+ updates/quarter, 2k subscribers, 12 partner features, 2 multi‑year funders, ≥\$800k revenue run‑rate, partner NPS ≥ 8.5.

---

## Copywriting starter pack (Supabase‑ready)

**Headlines (homepage hero)**

* *Cultivating change, together.*
* *Seeds of impact. Stories with proof.*
* *Community‑led. Open by design.*

**Taglines**

* *Where story meets system.*
* *Evidence you can feel—and fund.*

**Calls‑to‑action**

* *Join the journey* · *Back a seed* · *Partner with us* · *Read the latest field notes*

**About blurb (≤80 words)**

> A Curious Tractor co‑creates community‑owned solutions across youth justice and wellbeing. We pair evidence and story, art and open tech, to help grassroots leaders grow ideas into fundable programs. Our dashboard shares the journeys, the data and the people—so partners and funders can confidently back what works.

**Partner blurb (≤60 words)**

> Collaboration multiplies impact. We work with Elders, frontline practitioners, creatives and funders to co‑design and scale solutions rooted in place and culture.

**Newsletter invite (≤35 words)**

> Stay curious. Monthly field notes with new stories, results and ways to help.

---

## Supabase content scaffolds (you can paste as first rows)

**stories (examples)**

* *Title:* “Designing the Great Bed with Elders” · *Tags:* goods, remote‑communities · *Excerpt:* “How a listening circle became a bed you can clean in minutes.”
* *Title:* “First 10 Voices: 170 Ripples” · *Tags:* youth‑justice, practitioners · *Excerpt:* “Frontline insights shaping a 20‑year vision.”

**metrics (examples)**

* *label:* Communities engaged · *value:* 7 · *unit:* count · *period\_end:* 2025‑06‑30
* *label:* Stories published · *value:* 18 · *unit:* count · *period\_end:* 2025‑06‑30

**projects (examples)**

* JusticeHub · status: active · pillar: justice · next\_milestone: 2025‑10‑15
* Goods (Great Bed) · status: pilot · pillar: wellbeing · next\_milestone: 2025‑09‑30

**partners (examples)**

* Children’s Ground · type: community · blurb/link…
* Snow Foundation · type: funder · blurb/link…

---

## What I need from you to lock this in

1. Confirm **initial investment** and any existing **restricted funding**.
2. Prioritise **3 flagship seeds** for 2025–26 scaling.
3. Approve **voice lines** above (or give edits).
4. Tell me if you want me to create the **Supabase tables** and seed initial content (I can generate the SQL and a .csv bundle next), and/or draft the React page structure.

If you share those, I’ll turn this into:

* an executable **Supabase schema + seed files**,
* a **React component map** with routes, and
* the first **10 story drafts** in Markdown ready to paste.
