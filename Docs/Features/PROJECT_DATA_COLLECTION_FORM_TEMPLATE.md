# ACT Project Infrastructure Data Collection Form

**Use this template to create a Google Form or Typeform for project leads**

Copy/paste sections into your form builder. Mark required fields with asterisks.

---

## Form Header

**Title:** ACT Project Impact Data - [PROJECT NAME]

**Description:**
> We're making the community impact of ACT projects more visible on our dashboard and in funding applications. This quick form helps us capture what's already happened with your project.
>
> **Please only answer what you know.** Estimates are totally fine. Blanks are fine too.
>
> This should take 10-15 minutes max.

---

## Section 1: Project Basics

### What's the project name? *
- Short text field
- Pre-fill if sending personalized links

### Your name *
- Short text field

### Your role in this project *
- Radio buttons:
  - Project Lead
  - Co-lead
  - Community Partner
  - Other: _____

### Project status right now *
- Radio buttons:
  - Active - in delivery
  - Planning - getting ready to launch
  - Paused - on hold for now
  - Complete - delivered and wrapped
  - Other: _____

---

## Section 2: What Type of Project Is This?

**Help us understand what kind of work this is** (choose primary type)

### Project Type *
- Radio buttons:
  - **Infrastructure Building** - We built something physical with community (space, asset, etc.)
  - **Justice Innovation** - We're disrupting the justice pipeline or reducing recidivism
  - **Storytelling Platform** - We're amplifying community voices and cultural narratives
  - **Community Enterprise** - We're creating market-based solutions owned by community
  - **Mixed** - It's a combination of the above
  - **Other**: _____

---

## Section 3: Community Participation

**Who was involved in doing the work?**

### About how many young people (under 25) participated? *
- Short text field
- Placeholder: "Just a rough number is fine, e.g., '12' or 'about 15'"

### Total hours they contributed (rough estimate):
- Short text field
- Placeholder: "e.g., 'About 3 Saturdays' or '200 hours'"

### About how many community members (all ages) participated?
- Short text field
- Placeholder: "Total number of people who did hands-on work"

### Total hours from community members (estimate):
- Short text field

### How many people with lived experience were involved?
- Short text field
- Help text: "People with direct experience of the issue (e.g., justice involvement, housing insecurity, disability)"

### What kind of lived experience?
- Long text field
- Placeholder: "e.g., 'Previously incarcerated', 'Experience with homelessness'"

### Hours from people with lived experience:
- Short text field

---

## Section 4: Skills & Employment

### What skills got transferred to community members?
- Long text field
- Placeholder: "List any skills people learned (formal or informal)"

### How many people learned these skills?
- Short text field

### Did anyone earn certifications or credentials?
- Radio buttons:
  - Yes
  - No
  - Not sure

### If yes, how many people got certified?
- Short text field
- Show if previous answer is "Yes"

### Did this project lead to any employment?
- Radio buttons:
  - Yes - people got jobs
  - Yes - people started businesses
  - Both
  - No
  - Not sure yet

### Tell us about employment outcomes:
- Long text field
- Placeholder: "e.g., '3 people got construction jobs', '2 started their own cleaning business'"
- Show if previous answer includes "Yes"

---

## Section 5: Value Created

**Let's understand the economic value of community participation**

### If you'd hired contractors to do this work, what would it have cost?
- Short text field
- Placeholder: "Rough estimate in dollars, e.g., '$50,000'"
- Help text: "Think about: What would a construction crew / consultants / agencies charge for this?"

### What did it actually cost you?
- Short text field
- Placeholder: "Actual spend on materials, paid labor, etc."

### Community value created
- Auto-calculated (if using Typeform/similar)
- Help text: "Contractor cost minus actual cost = value created by community participation"

---

## Section 6: Physical Outcomes

### What got built or created? (if applicable)
- Long text field
- Placeholder: "List physical things: 'A covered gathering space', 'Seating for 30', '40 household items produced'"

### How many of each thing?
- Long text field
- Placeholder: "e.g., '1 covered space', '30 seats', '40 items'"

---

## Section 7: Storytelling Scale

**Who's sharing this story?**

### How many people are actively storytelling about this project?
- Short text field
- Help text: "People regularly posting on social media, talking about it in community, sharing with partners"

### What's their combined social media reach?
- Short text field
- Placeholder: "Rough total followers across all platforms, e.g., '5,000' or 'not sure'"

### If more people told this story, what's the potential reach?
- Short text field
- Help text: "Think about: community members who care but aren't actively sharing yet"

### How many total stories have been captured?
- Short text field
- Help text: "Photos, videos, social posts, articles - anything documenting the work"

---

## Section 8: Funding Journey

**Understanding the path from grants to market revenue**

### Total grant funding for this project:
- Short text field
- Placeholder: "Total dollars from grants/donations, e.g., '$80,000'"

### Total market revenue (if any):
- Short text field
- Placeholder: "Money earned from sales, services, contracts, e.g., '$15,000'"
- Help text: "This could be $0 if it's not revenue-generating yet"

### What's your target date to be 50/50 grant/market?
- Date field
- Help text: "When do you hope to have half the funding from market revenue? (Leave blank if not applicable)"

### What's your target grant dependency percentage?
- Short text field
- Placeholder: "Target % of funding from grants, e.g., '25%'"
- Help text: "What % of funding should come from grants at steady state? (Leave blank if fully grant-dependent by design)"

---

## Section 9: Anything Else?

### Is there anything important we're missing?
- Long text field
- Placeholder: "Stories, context, nuance - anything that helps us tell this story right"

### Can we follow up with you if we have questions?
- Radio buttons:
  - Yes - email is fine
  - Yes - but please call/text instead
  - No - the data above is all I have

### Contact info for follow-up
- Email field
- Show if previous answer is "Yes"

---

## Form Footer

**Thank you!**

> This data helps us:
> - Show funders the real infrastructure we're building
> - Celebrate community participation publicly
> - Track our journey from grants to market independence
> - Make better decisions about where to invest time/money
>
> Your project's impact card will be added to the dashboard soon.
> You'll get a link to share it with your community!

---

## Google Forms Setup Instructions

1. Go to [forms.google.com](https://forms.google.com)
2. Click "Blank form"
3. Copy/paste sections above
4. Set up:
   - Section breaks between major sections
   - Mark required fields with asterisks (*)
   - Add help text for clarity
   - Use conditional logic (e.g., show "how many certified" only if they said yes)
5. In Settings:
   - Turn ON "Collect email addresses"
   - Turn ON "Limit to 1 response"
   - Turn ON "Allow response editing"
6. Get shareable link
7. Send personalized emails to project leads with pre-filled project name

## Notion Integration

After responses come in, use Zapier or Google Apps Script to:
1. Parse form responses
2. Format as JSON for Notion fields
3. Update respective project pages in Notion
4. Notify you of new submissions

Or export to spreadsheet and manually update Notion (for first round).

---

## Email Template to Send Form

**Subject:** Quick request: Share [PROJECT NAME] impact data

Hi [Name],

We're making ACT project impacts more visible - both on our dashboard and in funding applications.

Could you take 10-15 mins to fill this quick form about [PROJECT NAME]? It's totally fine to estimate numbers or leave blanks.

👉 [FORM LINK]

What this helps with:
- Better funding applications (data = stronger cases)
- Public celebration of community participation
- Showing communities their impact visualized

Your project will get a beautiful impact card you can share.

Thanks for building real infrastructure with us!

[Your name]

---

## Tips for Better Responses

1. **Pre-fill project name** in personalized links
2. **Send in batches** - test with 2-3 projects first
3. **Follow up after 1 week** with friendly reminder
4. **Offer to do it together** via Zoom if they prefer
5. **Share completed impact cards** publicly to build excitement
6. **Celebrate data completion** - make it rewarding, not a chore
