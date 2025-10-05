-- Ensure each contact/source pair has a single insight record
ALTER TABLE public.contact_intelligence_insights
  ADD CONSTRAINT contact_intelligence_insights_contact_source_unique UNIQUE (contact_id, source);
