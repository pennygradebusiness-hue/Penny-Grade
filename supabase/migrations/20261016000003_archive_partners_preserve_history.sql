-- Archive partners instead of deleting them so historical verifications retain
-- their partner relationship and remain readable in admin reports.
CREATE OR REPLACE FUNCTION public.admin_archive_partner(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = p_partner_id) THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  -- Disable current offers so reactivating the partner later does not silently
  -- reactivate benefits that were active before the collaboration ended.
  UPDATE public.offers
  SET status = 'INACTIVE', updated_at = now()
  WHERE partner_id = p_partner_id AND status = 'ACTIVE';

  UPDATE public.partners
  SET status = 'INACTIVE', featured = false, updated_at = now()
  WHERE id = p_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_partner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_partner(uuid) TO service_role;
