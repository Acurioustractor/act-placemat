-- Automatic Person Identity Mapping Trigger
-- Automatically creates/updates person_identity_map when linkedin_contacts are enriched

-- Function to auto-create person identity after enrichment
CREATE OR REPLACE FUNCTION auto_create_person_identity()
RETURNS TRIGGER AS $$
DECLARE
  v_person_id UUID;
BEGIN
  -- Only process if newly enriched and has email
  IF NEW.exa_enriched = TRUE
     AND NEW.email_address IS NOT NULL
     AND (OLD.exa_enriched IS NULL OR OLD.exa_enriched = FALSE)
     AND NEW.exa_confidence_score >= 0.5 THEN

    -- Check if person identity already exists
    SELECT person_id INTO v_person_id
    FROM person_identity_map
    WHERE email = NEW.email_address
    LIMIT 1;

    IF v_person_id IS NOT NULL THEN
      -- Update existing person identity
      UPDATE person_identity_map
      SET
        full_name = COALESCE(NEW.full_name, full_name),
        contact_data = JSONB_SET(
          COALESCE(contact_data, '{}'::jsonb),
          '{exa_enrichment}',
          JSON_BUILD_OBJECT(
            'bio', NEW.bio,
            'linkedin_url', NEW.linkedin_url,
            'current_company', NEW.current_company,
            'current_position', NEW.current_position,
            'location', NEW.location,
            'industries', NEW.industries,
            'confidence_score', NEW.exa_confidence_score,
            'enriched_at', NEW.exa_last_enriched
          )::jsonb
        ),
        updated_at = NOW()
      WHERE person_id = v_person_id;

      -- Link linkedin_contacts to person_identity_map
      NEW.person_id = v_person_id;

      RAISE NOTICE 'Updated existing person_identity_map: %', v_person_id;

    ELSE
      -- Create new person identity
      INSERT INTO person_identity_map (
        full_name,
        email,
        contact_data,
        data_source,
        discovered_via,
        created_at,
        updated_at
      ) VALUES (
        NEW.full_name,
        NEW.email_address,
        JSON_BUILD_OBJECT(
          'exa_enrichment', JSON_BUILD_OBJECT(
            'bio', NEW.bio,
            'linkedin_url', NEW.linkedin_url,
            'current_company', NEW.current_company,
            'current_position', NEW.current_position,
            'location', NEW.location,
            'industries', NEW.industries,
            'confidence_score', NEW.exa_confidence_score,
            'enriched_at', NEW.exa_last_enriched
          )
        )::jsonb,
        'exa_enrichment',
        'auto_trigger',
        NOW(),
        NOW()
      ) RETURNING person_id INTO v_person_id;

      -- Link linkedin_contacts to new person_identity_map
      NEW.person_id = v_person_id;

      RAISE NOTICE 'Created new person_identity_map: %', v_person_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on linkedin_contacts
DROP TRIGGER IF EXISTS trigger_auto_person_identity ON linkedin_contacts;

CREATE TRIGGER trigger_auto_person_identity
  BEFORE UPDATE ON linkedin_contacts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_person_identity();

-- Also create trigger for INSERT (when contacts are created already enriched)
CREATE TRIGGER trigger_auto_person_identity_insert
  BEFORE INSERT ON linkedin_contacts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_person_identity();

COMMENT ON FUNCTION auto_create_person_identity() IS
'Automatically creates or updates person_identity_map when linkedin_contacts are enriched with Exa.
Triggered when exa_enriched changes to TRUE and confidence >= 0.5';

COMMENT ON TRIGGER trigger_auto_person_identity ON linkedin_contacts IS
'Auto-creates person identity mapping after Exa enrichment (UPDATE)';

COMMENT ON TRIGGER trigger_auto_person_identity_insert ON linkedin_contacts IS
'Auto-creates person identity mapping after Exa enrichment (INSERT)';

-- Index to speed up person_identity_map lookups
CREATE INDEX IF NOT EXISTS idx_person_identity_map_email_lookup
  ON person_identity_map (email)
  WHERE email IS NOT NULL;

-- Add discovered_via column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'person_identity_map' AND column_name = 'discovered_via'
  ) THEN
    ALTER TABLE person_identity_map ADD COLUMN discovered_via TEXT;
  END IF;
END $$;

-- View to see auto-mapped contacts
CREATE OR REPLACE VIEW vw_auto_mapped_contacts AS
SELECT
  lc.id AS linkedin_contact_id,
  lc.full_name,
  lc.email_address,
  lc.current_company,
  lc.bio,
  lc.exa_confidence_score,
  lc.exa_last_enriched,
  pim.person_id,
  pim.engagement_priority,
  pim.data_source,
  pim.discovered_via,
  pim.created_at AS person_created_at
FROM linkedin_contacts lc
INNER JOIN person_identity_map pim ON pim.person_id = lc.person_id
WHERE lc.exa_enriched = TRUE
  AND pim.data_source = 'exa_enrichment'
ORDER BY lc.exa_last_enriched DESC;

COMMENT ON VIEW vw_auto_mapped_contacts IS
'Shows linkedin_contacts that were auto-mapped to person_identity_map via Exa enrichment trigger';
