-- LinkedIn local import schema (MVP, idempotent)

BEGIN;

CREATE TABLE IF NOT EXISTS public.linkedin_imports (
  id BIGSERIAL PRIMARY KEY,
  owner TEXT NOT NULL,           -- e.g., 'Ben', 'Nic'
  type TEXT NOT NULL,            -- 'connections','messages','positions','skills','profile','invitations'
  hash TEXT NOT NULL,            -- sha1 of normalized row
  payload JSONB NOT NULL,        -- original parsed row
  imported_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_linkedin_imports_owner_type_hash
  ON public.linkedin_imports (owner, type, hash);

CREATE INDEX IF NOT EXISTS idx_linkedin_imports_owner_type
  ON public.linkedin_imports (owner, type);

COMMIT;

-- Bulk insert helper with ON CONFLICT DO NOTHING to avoid duplicate update errors
CREATE OR REPLACE FUNCTION public.linkedin_import_bulk(records JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  elem JSONB;
  tmp INTEGER;
  inserted INTEGER := 0;
BEGIN
  FOR elem IN SELECT value FROM jsonb_array_elements(records) AS t(value) LOOP
    INSERT INTO public.linkedin_imports (owner, type, hash, payload)
    VALUES (
      elem->>'owner',
      elem->>'type',
      elem->>'hash',
      elem->'payload'
    )
    ON CONFLICT (owner, type, hash) DO NOTHING;
    GET DIAGNOSTICS tmp = ROW_COUNT;
    inserted := inserted + COALESCE(tmp, 0);
  END LOOP;
  RETURN inserted;
END;
$$;


