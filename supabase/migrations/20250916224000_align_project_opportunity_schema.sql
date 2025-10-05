-- Ensure projects table supports Notion sync fields
alter table if exists public.projects
  add column if not exists end_date date;

-- Opportunities archived flag
alter table if exists public.opportunities
  add column if not exists archived boolean default false;

-- Organizations collaboration areas multi-select
alter table if exists public.organizations
  add column if not exists collaboration_areas text[];

-- Index for faster filtered queries
create index if not exists projects_end_date_idx on public.projects (end_date);
create index if not exists opportunities_archived_idx on public.opportunities (archived);
