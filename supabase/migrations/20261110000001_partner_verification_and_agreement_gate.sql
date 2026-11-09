-- Partner publication evidence gate.
-- Drafted for review only: do not apply until the Supabase administrator has
-- reviewed the migration and the account owner has confirmed the rollout.
-- Existing records are preserved. Existing partners without evidence remain
-- stored but are excluded from public listings by the application.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS representative_name text,
  ADD COLUMN IF NOT EXISTS business_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreement_reference text,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS benefit_dispute_contact text;

CREATE OR REPLACE FUNCTION public.enforce_partner_publication_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (
    NULLIF(btrim(NEW.representative_name), '') IS NULL OR
    NEW.business_verified_at IS NULL OR
    NULLIF(btrim(NEW.agreement_reference), '') IS NULL OR
    NEW.agreement_signed_at IS NULL OR
    NULLIF(btrim(NEW.benefit_dispute_contact), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Partner cannot be activated without business verification, signed agreement, authorised representative, and member issue contact';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_publication_evidence ON public.partners;
CREATE TRIGGER trg_partner_publication_evidence
  BEFORE INSERT OR UPDATE OF status, representative_name, business_verified_at,
    agreement_reference, agreement_signed_at, benefit_dispute_contact
  ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_partner_publication_evidence();

CREATE OR REPLACE FUNCTION public.enforce_active_offer_partner_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_partner public.partners%ROWTYPE;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    SELECT * INTO v_partner FROM public.partners WHERE id = NEW.partner_id;
    IF NOT FOUND OR v_partner.status <> 'ACTIVE' OR
      v_partner.business_verified_at IS NULL OR v_partner.agreement_signed_at IS NULL THEN
      RAISE EXCEPTION 'Offer cannot be activated until its partner is active, verified, and has a signed agreement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_active_offer_partner_evidence ON public.offers;
CREATE TRIGGER trg_active_offer_partner_evidence
  BEFORE INSERT OR UPDATE OF status, partner_id
  ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_offer_partner_evidence();
