# Supabase Storage Setup for ACT Media Management

## Step 1: Apply Database Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `apply-media-schema.sql` 
4. Click "RUN" to execute the schema

## Step 2: Create Storage Bucket
1. Go to Storage in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it: `media`
4. Set it to **PUBLIC** (for easy CDN access)
5. Click "Create bucket"

## Step 3: Create Folder Structure
In your new `media` bucket, create these folders:
```
media/
├── photos/
│   ├── projects/
│   ├── community/
│   ├── stories/
│   └── impact/
├── videos/
│   ├── story-videos/
│   ├── project-updates/
│   └── community-voices/
├── thumbnails/
└── documents/
```

## Step 4: Set Bucket Policies
In Storage > Policies, add these policies for the `media` bucket:

### Policy 1: Public Read Access
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Target roles: `public`
- Policy definition: `true`

### Policy 2: Authenticated Upload
- Policy name: `Authenticated upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

## Step 5: Update Environment Variables
Add to your `.env` file:
```
# Supabase Storage
SUPABASE_STORAGE_BUCKET=media
SUPABASE_CDN_URL=https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/media/
```

## Step 6: Test the Setup
Once complete, your media management system will be ready for:
- ✅ Photo/video uploads
- ✅ AI-powered tagging
- ✅ Gallery creation
- ✅ Content organization
- ✅ Community submissions

## Next Steps
After setup, we'll build:
1. **Upload Interface** - Drag-drop media uploads with preview
2. **Gallery Components** - Beautiful photo/video displays
3. **Media Dashboard** - Bulk management and organization
4. **AI Integration** - Smart tagging and content suggestions