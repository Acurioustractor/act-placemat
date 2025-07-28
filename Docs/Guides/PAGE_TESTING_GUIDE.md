# ACT Placemat - Page Testing Guide 🚀

## Development Server Status ✅
- **Backend**: http://localhost:5001 (running)
- **Frontend**: http://localhost:5178 (running)
- **Database**: All 5 Notion databases connected

## Page Testing Checklist

### 1. **Dashboard Page** 📊
**URL**: http://localhost:5178/

**Test Areas**:
- [ ] Overall layout and navigation
- [ ] KPI cards display correctly
- [ ] Charts load and show data (projects by theme, opportunities pipeline)
- [ ] Real-time data updates
- [ ] Responsive design on different screen sizes
- [ ] Loading states and error handling

**Expected Data**:
- 50 Projects total, 30 active
- 29 Opportunities in pipeline
- 46 Organizations in network
- Charts showing theme distribution and revenue metrics

---

### 2. **Projects Page** 🏗️
**URL**: http://localhost:5178/projects

**Test Areas**:
- [ ] Project grid/list view toggle
- [ ] Search functionality (type "Justice" to test)
- [ ] Filter panel (Status, Theme, Location, Revenue Range)
- [ ] Sort options (Name, Date, Revenue)
- [ ] Project cards display all key information
- [ ] Pagination/loading for large datasets
- [ ] Project detail navigation

**Expected Data**:
- 50 total projects
- 30 with "Active 🔥" status
- 9 Youth Justice themed projects
- Revenue data for top projects ($50k+ range)

---

### 3. **Opportunities Page** 💰
**URL**: http://localhost:5178/opportunities

**Test Areas**:
- [ ] Pipeline stage visualization
- [ ] Opportunity cards with probability, amount, deadline
- [ ] Stage-based filtering (Discovery, Applied, Negotiation, Closed Won/Lost)
- [ ] Amount range filtering
- [ ] Probability filtering (10%, 25%, 50%, 75%, 90%)
- [ ] Sort by amount, probability, deadline
- [ ] Pipeline metrics and conversion rates

**Expected Data**:
- 29 total opportunities
- 10 closed won deals
- 9 in negotiation stage
- 3 high-probability deals (75%+)

---

### 4. **Organizations Page** 🏢
**URL**: http://localhost:5178/organizations

**Test Areas**:
- [ ] Organization grid with contact information
- [ ] Relationship status indicators
- [ ] Filter by status, industry, location
- [ ] Contact links (website, LinkedIn, Twitter)
- [ ] Active projects count (rollup field)
- [ ] Organization detail views
- [ ] Contact management integration

**Expected Data**:
- 46 total organizations
- 16 with active opportunities
- Contact information and social links
- Project relationship mapping

---

### 5. **People Page** 👥
**URL**: http://localhost:5178/people

**Test Areas**:
- [ ] Contact cards with photos/avatars
- [ ] Company affiliations and roles
- [ ] Contact information (email, phone, LinkedIn)
- [ ] Meeting status and follow-up flags
- [ ] Filter by company, role, location, status
- [ ] Last contact date tracking
- [ ] Connection strength indicators
- [ ] Contact activity history

**Expected Data**:
- 50 people in CRM
- 7 with active meeting status
- 100+ company options
- Role classifications and themes
- Contact activity tracking

---

### 6. **Artifacts Page** 📄
**URL**: http://localhost:5178/artifacts

**Test Areas**:
- [ ] Document grid with thumbnails
- [ ] File type categorization
- [ ] Search and filter functionality
- [ ] Document preview capabilities
- [ ] Related project/opportunity links
- [ ] Access level permissions
- [ ] Download/view functionality

**Expected Data**:
- Document management system
- File categorization by type and purpose
- Project and opportunity associations

---

## Testing Instructions

### For Each Page:
1. **Navigate to the URL**
2. **Check initial load time** (should be <3 seconds)
3. **Test all interactive elements** (buttons, filters, search)
4. **Verify data accuracy** against backend test results
5. **Test responsive design** (resize browser window)
6. **Check error handling** (try invalid searches, empty states)
7. **Test performance** with filters and large datasets

### Provide Feedback On:
- **Visual Design**: Layout, colors, spacing, typography
- **User Experience**: Navigation, filtering, search usability
- **Performance**: Load times, responsiveness, lag issues
- **Data Accuracy**: Does displayed data match expectations?
- **Functionality**: Do all buttons/links work as expected?
- **Mobile Experience**: How does it look/work on smaller screens?

### Common Issues to Watch For:
- Loading spinners that don't disappear
- Filters that don't update results
- Search that's too slow (>2 seconds)
- Missing or incorrect data
- Broken layouts on mobile
- Navigation issues between pages

## Testing Results Format

For each page, please provide:

### Page: [Page Name]
**Overall Rating**: ⭐⭐⭐⭐⭐ (1-5 stars)

**What Works Well**:
- [List positive aspects]

**Issues Found**:
- [List problems, bugs, or improvements needed]

**Suggested Improvements**:
- [UI/UX suggestions]

**Priority**: High/Medium/Low

---

## Quick Test Commands

If you want to verify backend data while testing:

```bash
# Test projects
curl "http://localhost:5001/api/notion/query" -X POST -H "Content-Type: application/json" -d '{"databaseId":"177ebcf981cf80dd9514f1ec32f3314c"}'

# Test opportunities  
curl "http://localhost:5001/api/notion/query" -X POST -H "Content-Type: application/json" -d '{"databaseId":"234ebcf981cf804e873ff352f03c36da"}'

# Test config
curl "http://localhost:5001/api/config"
```

## Ready to Start Testing! 🎯

The system is fully operational with:
- ✅ All databases connected and tested
- ✅ Backend API responding quickly
- ✅ Frontend development server running
- ✅ Most TypeScript errors resolved
- ✅ Data flows validated

**Start with the Dashboard** at http://localhost:5178/ and work through each page systematically. I'll be here to implement any fixes or improvements based on your feedback!