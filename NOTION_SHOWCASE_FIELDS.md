# Notion Database Fields for World-Class Showcase

This guide shows what fields to add to your **Projects** database in Notion to support the world-class showcase features.

## 🎬 Media Fields

### Hero Media
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Hero Video URL` | URL | YouTube or Vimeo embed link | `https://www.youtube.com/watch?v=abc123` |
| `Hero Image` | Files & media | Main project hero image | Upload high-res photo (1920x1080) |
| `Hero Caption` | Rich text | Caption for hero media | "Youth participating in mentorship workshop" |

### Gallery
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Gallery Images` | Files & media | Multiple project photos | Upload 5-10 photos |
| `Gallery Videos` | Rich text | URLs to additional videos (comma-separated) | `https://vimeo.com/123,https://youtube.com/abc` |

## 📖 Storytelling Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Challenge Description` | Rich text | The problem you're solving | "Before our program, young people in Canberra faced limited access to..." |
| `Solution Description` | Rich text | How you're solving it | "We partnered with 5 local schools to create a 12-week mentorship program..." |
| `Process Description` | Rich text | Your approach/methodology | "Our approach combines one-on-one mentorship with group workshops..." |

## 📊 Impact Stats Fields

These create the big number displays. Add as separate fields:

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `People Served` | Number | Total people impacted | `500` |
| `Locations Reached` | Number | Number of locations | `12` |
| `Partners Involved` | Number | Partner count | `8` |
| `Success Rate` | Number | Success percentage | `95` |
| `Funding Raised` | Number | Total funding | `250000` |
| `Hours Delivered` | Number | Program hours | `1200` |
| `Impact Summary` | Rich text | Rich text summary | "Over 500 young people participated..." |

## 💬 Testimonial Fields

For each project, you can add 1-3 testimonials:

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Testimonial 1 Quote` | Rich text | The testimonial quote | "This program changed my life. I now have the skills..." |
| `Testimonial 1 Name` | Text | Person's name | "Sarah Johnson" |
| `Testimonial 1 Role` | Text | Their role | "Program Graduate" |
| `Testimonial 1 Photo` | Files & media | Their photo | Upload portrait photo |
| `Testimonial 1 Organization` | Text | Organization | "Canberra High School" |
| `Testimonial 1 Featured` | Checkbox | Highlight this testimonial | ☑️ |

*Repeat for Testimonial 2 and Testimonial 3*

## 🎯 Call-to-Action Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `CTA Link` | URL | Where to send people | `https://donate.org/project` |
| `CTA Text` | Text | Button text | "Support This Project" |
| `CTA Type` | Select | Type of action | Options: Donate, Partner, Volunteer, Learn, Contact |

## 🌍 Geographic Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Latitude` | Number | Latitude coordinate | `-35.2809` |
| `Longitude` | Number | Longitude coordinate | `149.1300` |

## 🔍 SEO & Sharing Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Slug` | Text | URL-friendly identifier | `youth-justice-canberra` |
| `Meta Description` | Rich text | SEO description (155 chars) | "Empowering young people in Canberra through mentorship..." |
| `Social Image` | Files & media | Image for social sharing | Upload 1200x630 image |

## 📸 Attribution Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Photography Credit` | Text | Photo credit | "Photos by Jane Smith" |
| `Videography Credit` | Text | Video credit | "Video by ACT Media Team" |

## 🎚️ Visibility Controls

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Featured on Homepage` | Checkbox | Show in featured carousel | ☑️ |
| `Publicly Visible` | Checkbox | Show on public showcase | ☑️ |
| `Display Order` | Number | Manual ordering (lower = first) | `1` |

---

## 🚀 Quick Start: Essential Fields Only

**If you want to start simple**, add these 10 fields first:

1. ✅ **Hero Video URL** or **Hero Image** - At least one hero media
2. ✅ **Challenge Description** - What problem you're solving
3. ✅ **Solution Description** - What you're doing about it
4. ✅ **People Served** - One impact number
5. ✅ **Testimonial 1 Quote** - One testimonial
6. ✅ **Testimonial 1 Name** - Testimonial attribution
7. ✅ **CTA Link** - Where to send interested people
8. ✅ **CTA Text** - What the button says
9. ✅ **Publicly Visible** - Control what shows
10. ✅ **Slug** - For individual page URLs

---

## 📝 Example: Complete Project Entry

**Project:** Youth Justice Program - Canberra

```
Name: Youth Justice Mentorship Program
Hero Video URL: https://www.youtube.com/watch?v=example123
Hero Caption: Young participants in our weekly mentorship sessions
Gallery Images: [Upload 6 photos of activities, graduations, team]

Challenge Description:
Before our program, young people in Canberra's justice system faced
limited access to positive role models and skill-building opportunities,
leading to high recidivism rates.

Solution Description:
We partnered with 5 local schools and the ACT Government to create a
12-week mentorship program combining one-on-one guidance with group
workshops on life skills, career planning, and community engagement.

Process Description:
Each participant is matched with a trained mentor and attends weekly
sessions covering communication, conflict resolution, goal setting,
and practical job skills.

People Served: 500
Locations Reached: 5
Partners Involved: 8
Success Rate: 95
Funding Raised: 250000
Hours Delivered: 1200

Testimonial 1 Quote: "This program changed my life. I now have the
skills and confidence to pursue my dream career in design."
Testimonial 1 Name: Sarah Johnson
Testimonial 1 Role: Program Graduate, Class of 2024
Testimonial 1 Photo: [Upload portrait]
Testimonial 1 Featured: ☑️

CTA Link: https://act.org/youth-justice/support
CTA Text: Support This Program
CTA Type: Donate

Slug: youth-justice-canberra
Meta Description: Empowering young people in Canberra through mentorship
and life skills training. 95% success rate, 500+ lives changed.
Social Image: [Upload 1200x630 sharing image]

Latitude: -35.2809
Longitude: 149.1300

Photography Credit: Jane Smith Photography
Featured on Homepage: ☑️
Publicly Visible: ☑️
Display Order: 1
```

---

## ⚡ Implementation Timeline

1. **Week 1**: Add essential 10 fields
2. **Week 2**: Add remaining media and testimonial fields
3. **Week 3**: Add SEO and geographic fields
4. **Week 4**: Polish and test

---

## 💡 Tips

- **Hero media**: Use high-quality, emotionally engaging photos/videos showing real people
- **Challenge/Solution**: Keep each to 2-3 paragraphs max
- **Testimonials**: Get permission and use real names (builds trust)
- **Impact stats**: Use round numbers (500 not 487) for clarity
- **CTA**: Make it specific ("Support This Program" vs generic "Learn More")
- **Slugs**: Use project-name-location format for SEO

---

**Need help?** Check `PORTFOLIO_WEBSITE_RESEARCH_2025.md` for more examples from world-class showcases.
