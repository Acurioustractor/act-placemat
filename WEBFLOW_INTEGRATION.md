# Webflow Integration Guide for ACT Placemat

## Overview

This document outlines the strategy and implementation plan for integrating Webflow with the ACT Placemat analytics platform.

## Current State

According to your feedback, Webflow functions are already set up but need improvement. This integration will unify:
- **Webflow CMS**: Your public-facing website content
- **Notion Database**: Your internal project management
- **ACT Placemat**: Your analytics intelligence center

## Architecture

### Integration Strategy: Bidirectional Sync

```
┌──────────────┐
│   Webflow    │  ← Public website
│     CMS      │     (Projects, Blog, Portfolio)
└──────┬───────┘
       │
       │ Webflow API
       │ (REST)
       │
┌──────┴───────┐
│   Backend    │  ← Express Server (Port 5001)
│   Sync       │     - Webflow API client
│   Service    │     - Notion API client
└──────┬───────┘     - Sync logic & webhooks
       │
       │ REST API
       │
┌──────┴───────┐
│   Notion     │  ← Source of truth
│  Databases   │     (Internal project data)
└──────┬───────┘
       │
       │ Notion API
       │
┌──────┴───────┐
│   Frontend   │  ← ACT Placemat Dashboard
│   Dashboard  │     (Analytics & Visualization)
└──────────────┘
```

## Use Cases

### 1. Publish to Website
**Flow**: Notion → Backend → Webflow → Website

```
User marks project as "Published" in Notion
  ↓
ACT Placemat detects change
  ↓
Backend transforms Notion data to Webflow format
  ↓
Backend creates/updates Webflow CMS item
  ↓
Website displays updated project
```

### 2. Analytics Overlay
**Flow**: Webflow → Backend → ACT Placemat

```
Website tracks page views (Google Analytics)
  ↓
Backend aggregates analytics data
  ↓
ACT Placemat displays project performance
  ↓
Shows: views, engagement, conversion rates
```

### 3. Content Sync
**Flow**: Bidirectional

```
Content editor updates project in Notion
  ↓
Sync service pushes to Webflow
  ↓
Website updates automatically
```

## Implementation Plan

### Phase 1: Read-Only Webflow Integration (Week 1)

**Goal**: Display Webflow content alongside Notion data

#### Backend Changes
```typescript
// backend/services/webflowService.ts
class WebflowService {
  async getCollections()
  async getCollectionItems(collectionId)
  async getItem(collectionId, itemId)
}
```

#### Frontend Changes
```typescript
// src/services/webflowService.ts
export class WebflowService extends ApiService {
  async getProjects(): Promise<WebflowProject[]> {
    return this.get('/webflow/projects');
  }

  async getProjectById(id: string): Promise<WebflowProject> {
    return this.get(`/webflow/projects/${id}`);
  }
}

// src/types/webflow.ts
export interface WebflowProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  published: boolean;
  lastPublished?: Date;
  viewCount?: number;  // From analytics
  _createdOn: Date;
  _updatedOn: Date;
}

// src/hooks/useWebflowProjects.ts
export function useWebflowProjects() {
  return useQuery({
    queryKey: ['webflow', 'projects'],
    queryFn: () => webflowService.getProjects(),
    staleTime: CACHE_CONFIG.STALE_TIME
  });
}
```

#### UI Components
```typescript
// src/pages/Webflow/WebflowDashboard.tsx
export const WebflowDashboard = () => {
  const { data: webflowProjects } = useWebflowProjects();
  const { data: notionProjects } = useProjects();

  // Show side-by-side comparison
  // Highlight differences
  // Show sync status
};

// src/components/webflow/WebflowProjectCard.tsx
export const WebflowProjectCard = ({ project }: { project: WebflowProject }) => {
  return (
    <Card>
      <img src={project.imageUrl} />
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <Badge>{project.published ? 'Published' : 'Draft'}</Badge>
      <Link to={`https://yoursite.webflow.io/projects/${project.slug}`}>
        View on Website
      </Link>
    </Card>
  );
};
```

**Deliverables**:
- ✅ Backend Webflow API client
- ✅ Frontend Webflow service
- ✅ Webflow dashboard page
- ✅ Display Webflow projects in ACT Placemat
- ✅ Show sync status indicators

---

### Phase 2: Write to Webflow (Week 2)

**Goal**: Publish from Notion/ACT Placemat to Webflow

#### Backend Enhancements
```typescript
// backend/services/webflowService.ts
class WebflowService {
  async createItem(collectionId, data)
  async updateItem(collectionId, itemId, data)
  async publishItem(collectionId, itemId)
  async unpublishItem(collectionId, itemId)

  // Transform Notion → Webflow format
  async transformNotionToWebflow(notionProject)
}

// backend/routes/webflow.ts
router.post('/webflow/publish', async (req, res) => {
  const { notionProjectId } = req.body;

  // 1. Fetch project from Notion
  // 2. Transform to Webflow format
  // 3. Create/Update in Webflow
  // 4. Publish
  // 5. Update Notion with Webflow URL
});
```

#### Frontend Enhancements
```typescript
// src/services/webflowService.ts
export class WebflowService extends ApiService {
  async publishToWebflow(projectId: string): Promise<void> {
    return this.post('/webflow/publish', { notionProjectId: projectId });
  }

  async unpublishFromWebflow(projectId: string): Promise<void> {
    return this.post('/webflow/unpublish', { notionProjectId: projectId });
  }
}

// src/components/projects/PublishToWebflowButton.tsx
export const PublishToWebflowButton = ({ project }: { project: Project }) => {
  const publishMutation = useMutation({
    mutationFn: () => webflowService.publishToWebflow(project.id),
    onSuccess: () => {
      toast.success('Published to Webflow!');
      queryClient.invalidateQueries(['projects']);
    }
  });

  return (
    <Button onClick={() => publishMutation.mutate()}>
      {publishMutation.isLoading ? 'Publishing...' : 'Publish to Website'}
    </Button>
  );
};
```

#### UI Enhancements
- Add "Publish to Webflow" button to project detail page
- Show publication status (draft, published, needs update)
- Display last published date
- Link to live page on website

**Deliverables**:
- ✅ Backend write operations to Webflow
- ✅ Notion → Webflow data transformation
- ✅ Publish/Unpublish UI
- ✅ Sync status tracking
- ✅ Error handling and rollback

---

### Phase 3: Automated Sync & Webhooks (Week 3)

**Goal**: Real-time bidirectional synchronization

#### Webhook Architecture
```typescript
// backend/webhooks/webflow.ts
router.post('/webhooks/webflow', async (req, res) => {
  const { event, payload } = req.body;

  switch (event) {
    case 'collection_item_created':
      await handleWebflowItemCreated(payload);
      break;
    case 'collection_item_changed':
      await handleWebflowItemUpdated(payload);
      break;
    case 'collection_item_deleted':
      await handleWebflowItemDeleted(payload);
      break;
  }

  res.status(200).send('OK');
});

// backend/webhooks/notion.ts
// Poll Notion for changes (Notion doesn't have webhooks yet)
setInterval(async () => {
  const recentlyUpdated = await checkNotionForUpdates();

  for (const project of recentlyUpdated) {
    if (project.publishedToWebflow) {
      await syncToWebflow(project);
    }
  }
}, 60000); // Every minute
```

#### Sync Service
```typescript
// backend/services/syncService.ts
class SyncService {
  async syncNotionToWebflow(projectId: string) {
    const notionProject = await notionService.getProject(projectId);
    const webflowItem = await this.findWebflowItem(notionProject);

    if (webflowItem) {
      await webflowService.updateItem(webflowItem.id, notionProject);
    } else {
      await webflowService.createItem(notionProject);
    }
  }

  async syncWebflowToNotion(webflowItemId: string) {
    const webflowItem = await webflowService.getItem(webflowItemId);
    const notionProject = await this.findNotionProject(webflowItem);

    if (notionProject) {
      await notionService.updateProject(notionProject.id, webflowItem);
    }
  }

  async resolveConflict(notionData, webflowData) {
    // Strategy: Notion is source of truth
    // Or: Most recent edit wins
    // Or: Manual resolution required
  }
}
```

**Deliverables**:
- ✅ Webflow webhook receiver
- ✅ Notion change detection (polling)
- ✅ Bidirectional sync logic
- ✅ Conflict resolution strategy
- ✅ Sync status dashboard in ACT Placemat

---

### Phase 4: Analytics Integration (Week 4)

**Goal**: Track website performance in ACT Placemat

#### Google Analytics Integration
```typescript
// backend/services/analyticsService.ts
class AnalyticsService {
  async getProjectPageViews(slug: string, dateRange: DateRange) {
    // Google Analytics API
  }

  async getProjectEngagement(slug: string) {
    // Time on page, bounce rate, etc.
  }
}

// Backend aggregates analytics data
router.get('/api/projects/:id/analytics', async (req, res) => {
  const project = await notionService.getProject(req.params.id);

  if (project.webflowSlug) {
    const analytics = await analyticsService.getProjectPageViews(
      project.webflowSlug,
      { start: '30daysAgo', end: 'today' }
    );

    res.json(analytics);
  }
});
```

#### Frontend Analytics Display
```typescript
// src/components/projects/ProjectAnalytics.tsx
export const ProjectAnalytics = ({ project }: { project: Project }) => {
  const { data: analytics } = useQuery({
    queryKey: ['project-analytics', project.id],
    queryFn: () => projectService.getAnalytics(project.id),
    enabled: !!project.webflowSlug
  });

  return (
    <Card>
      <h3>Website Performance</h3>
      <Metric label="Page Views" value={analytics?.pageViews} />
      <Metric label="Unique Visitors" value={analytics?.uniqueVisitors} />
      <Metric label="Avg. Time on Page" value={analytics?.avgTimeOnPage} />
      <LineChart data={analytics?.timeSeries} />
    </Card>
  );
};
```

**Deliverables**:
- ✅ Google Analytics integration
- ✅ Project page view tracking
- ✅ Engagement metrics (time on page, bounce rate)
- ✅ Traffic source analysis
- ✅ Analytics dashboard in ACT Placemat

---

## Data Mapping

### Notion → Webflow Field Mapping

| Notion Field | Webflow Field | Transformation |
|--------------|---------------|----------------|
| Name | Name (Title) | Direct |
| Description | Description (Rich Text) | Notion rich text → HTML |
| Status | Status (Option) | Map values |
| Theme | Category (Multi-reference) | Map to Webflow categories |
| Location | Location (Plain Text) | Direct |
| Revenue Actual | - | Don't sync (internal only) |
| Website Links | External URL | Direct |
| Artifacts | Gallery (Images) | Upload images to Webflow |
| Start Date | Date | ISO format |

### Webflow → Notion Field Mapping

| Webflow Field | Notion Field | Transformation |
|---------------|--------------|----------------|
| Name | Name | Direct |
| Description | Description | HTML → Notion rich text |
| Slug | Webflow Slug (New field) | Direct |
| Published | Published to Web (Checkbox) | Boolean |
| _updatedOn | Last Synced | Date |

## Configuration

### Backend Environment Variables

```env
# Webflow Configuration
WEBFLOW_API_KEY=your_webflow_api_key
WEBFLOW_SITE_ID=your_site_id
WEBFLOW_PROJECTS_COLLECTION_ID=collection_id

# Webhook URLs
WEBFLOW_WEBHOOK_SECRET=webhook_secret

# Google Analytics (Optional)
GOOGLE_ANALYTICS_VIEW_ID=view_id
GOOGLE_ANALYTICS_KEY_FILE=path/to/service-account.json

# Sync Configuration
SYNC_INTERVAL_MS=60000  # 1 minute
AUTO_SYNC_ENABLED=true
CONFLICT_RESOLUTION=notion_wins  # notion_wins | webflow_wins | manual
```

### Webflow Setup

1. **Create API Key**:
   - Go to Webflow Account Settings → Integrations → API Access
   - Generate new token
   - Copy to backend `.env`

2. **Set Up Webhooks**:
   - Go to Site Settings → Integrations → Webhooks
   - Add webhook URL: `https://your-backend.com/webhooks/webflow`
   - Select events: Collection Item Created, Changed, Deleted
   - Copy webhook secret to backend `.env`

3. **Configure CMS Collections**:
   - Ensure Projects collection exists
   - Add required fields (Name, Description, Status, etc.)
   - Note collection ID for backend config

### Frontend Configuration

```typescript
// src/constants/webflow.ts
export const WEBFLOW_CONFIG = {
  SITE_URL: 'https://yoursite.webflow.io',
  SYNC_INTERVAL: 60000, // 1 minute
  AUTO_SYNC_ENABLED: true
};

export const WEBFLOW_STATUS_MAP = {
  'Active 🔥': 'active',
  'Ideation 🌀': 'planning',
  'Sunsetting 🌅': 'archived',
  'Transferred ✅': 'completed'
};
```

## Error Handling

### Common Errors

**Rate Limiting**:
```typescript
if (error.status === 429) {
  const retryAfter = error.headers['X-RateLimit-Reset'];
  await sleep(retryAfter);
  return retry();
}
```

**Sync Conflicts**:
```typescript
if (notionUpdatedAt > webflowUpdatedAt) {
  // Notion is newer, push to Webflow
  await syncToWebflow(notionData);
} else {
  // Webflow is newer, pull to Notion (or flag for manual resolution)
  await flagConflict(notionData, webflowData);
}
```

**API Failures**:
```typescript
try {
  await webflowService.updateItem(itemId, data);
} catch (error) {
  // Log error
  logger.error('Webflow sync failed:', error);

  // Update sync status in Notion
  await notionService.updateProject(projectId, {
    syncStatus: 'failed',
    lastSyncError: error.message
  });

  // Notify user
  await notificationService.send({
    type: 'sync_failed',
    project: projectId,
    error: error.message
  });
}
```

## Testing

### Manual Testing Checklist

- [ ] Fetch Webflow projects in ACT Placemat
- [ ] Display Webflow data correctly
- [ ] Publish Notion project to Webflow
- [ ] Verify project appears on website
- [ ] Update Notion project
- [ ] Verify changes sync to Webflow
- [ ] Update Webflow item
- [ ] Verify changes sync to Notion (or flagged)
- [ ] Unpublish from Webflow
- [ ] Verify removal from website
- [ ] Test error scenarios (API down, rate limiting)
- [ ] Test large projects (many images, long descriptions)
- [ ] Test special characters and formatting

### Automated Testing

```typescript
// backend/tests/webflow.test.ts
describe('Webflow Service', () => {
  it('should fetch collections', async () => {
    const collections = await webflowService.getCollections();
    expect(collections).toHaveLength(greaterThan(0));
  });

  it('should transform Notion to Webflow format', () => {
    const notionProject = mockNotionProject();
    const webflowItem = transformNotionToWebflow(notionProject);

    expect(webflowItem.name).toBe(notionProject.name);
    expect(webflowItem.slug).toBeDefined();
  });

  it('should handle sync conflicts', async () => {
    const conflict = await syncService.resolveConflict(
      notionData,
      webflowData,
      'notion_wins'
    );

    expect(conflict.resolution).toBe('notion_wins');
  });
});
```

## Performance Considerations

**Optimization Strategies**:

1. **Batch Operations**: Sync multiple items in parallel
2. **Incremental Sync**: Only sync changed items
3. **Caching**: Cache Webflow data for 5 minutes
4. **Rate Limiting**: Respect Webflow API limits (60 req/min)
5. **Webhook Validation**: Verify webhook signatures
6. **Image Optimization**: Compress before uploading to Webflow

## Security

**Authentication**:
- Store Webflow API key in environment variables (never commit)
- Validate webhook signatures
- Use HTTPS for all API calls

**Authorization**:
- Limit Webflow API permissions to required collections only
- Implement user roles (who can publish?)
- Audit log for publish actions

**Data Privacy**:
- Don't sync sensitive fields (revenue, internal notes)
- Respect Webflow access controls
- GDPR compliance (data portability, deletion)

## Monitoring

**Metrics to Track**:
- Sync success rate
- Sync latency
- API error rate
- Webhook delivery success
- Projects published count
- Website traffic per project

**Alerts**:
- Sync failures
- API rate limit approaching
- Webhook delivery failures
- Data conflicts requiring manual resolution

## Future Enhancements

### Phase 5+: Advanced Features

1. **Multi-Language Support**: Sync translations to Webflow localization
2. **Media Management**: Automatic image optimization and CDN
3. **SEO Optimization**: Auto-generate meta descriptions, alt text
4. **Preview Mode**: Preview changes before publishing
5. **Rollback**: Revert to previous versions
6. **Bulk Operations**: Publish/unpublish multiple projects
7. **Custom Fields**: Flexible field mapping configuration
8. **Workflow**: Approval process before publishing
9. **A/B Testing**: Track multiple versions
10. **Scheduled Publishing**: Publish at specific times

## Questions & Support

**Common Questions**:

Q: What if I delete a project in Notion?
A: By default, it will be unpublished from Webflow but not deleted. Configure in settings.

Q: Can I edit directly in Webflow?
A: Yes, but changes may be overwritten by Notion sync. Use "Lock" feature to prevent.

Q: How often does sync happen?
A: By default, every minute. Configurable via `SYNC_INTERVAL_MS`.

Q: What happens if sync fails?
A: Error is logged, status updated in Notion, and notification sent. Manual retry available.

## Next Steps

To get started with Webflow integration:

1. ✅ Set up Webflow API key and webhooks
2. ✅ Document existing Webflow functions (if any)
3. ✅ Implement Phase 1 (read-only) - Week 1
4. ✅ Test thoroughly before moving to Phase 2
5. ✅ Implement Phase 2 (write) - Week 2
6. ✅ Set up automated sync - Week 3
7. ✅ Integrate analytics - Week 4
8. ✅ Monitor and iterate

**Let me know**:
- Where are your existing Webflow functions located?
- What's working, what needs improvement?
- Any specific requirements or constraints?
