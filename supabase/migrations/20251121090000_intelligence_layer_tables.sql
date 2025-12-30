-- Intelligence Layer schema
create table if not exists public.intelligence_briefings (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  summary text not null,
  highlights jsonb default '[]'::jsonb,
  metrics jsonb default '{}'::jsonb,
  created_by text default 'synthesis-agent',
  metadata jsonb default '{}'::jsonb
);

create index if not exists intelligence_briefings_generated_at_idx
  on public.intelligence_briefings (generated_at desc);

create table if not exists public.intelligence_geo_alerts (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  stage text,
  severity text default 'medium',
  projects jsonb default '[]'::jsonb,
  recommendation text,
  triggered_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists intelligence_geo_alerts_region_idx
  on public.intelligence_geo_alerts (region);

create table if not exists public.project_pairings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  partner_project_id uuid not null,
  reason text,
  similarity numeric,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists project_pairings_project_idx
  on public.project_pairings (project_id);

create index if not exists project_pairings_partner_idx
  on public.project_pairings (partner_project_id);

create table if not exists public.project_research (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  source text not null,
  url text,
  summary text,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists project_research_project_idx
  on public.project_research (project_id, created_at desc);

create table if not exists public.intelligence_refusals (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  prompt text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists intelligence_refusals_agent_idx
  on public.intelligence_refusals (agent);
