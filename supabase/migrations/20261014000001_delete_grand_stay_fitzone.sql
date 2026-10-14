-- ============================================================
-- PERMANENT DELETION: The Grand Stay & FitZone
-- ============================================================
-- These partners were previously deleted via the admin UI but
-- the deletion silently failed because the anonymous/publishable
-- Supabase key is blocked by Row Level Security for DELETE ops.
-- This migration permanently removes them from the database so
-- they can never resurface on serverless cold starts.
-- ============================================================

-- Step 1: Delete verification_logs tied to these partners' offers
DELETE FROM public.verification_logs
WHERE offer_id IN (
  SELECT o.id FROM public.offers o
  INNER JOIN public.partners p ON p.id = o.partner_id
  WHERE p.business_name IN ('The Grand Stay', 'FitZone')
  OR p.slug IN ('the-grand-stay', 'grand-stay', 'fitzone', 'fit-zone')
);

-- Step 2: Delete verification_sessions tied to these partners
DELETE FROM public.verification_sessions
WHERE partner_id IN (
  SELECT id FROM public.partners
  WHERE business_name IN ('The Grand Stay', 'FitZone')
  OR slug IN ('the-grand-stay', 'grand-stay', 'fitzone', 'fit-zone')
);

-- Step 3: Delete all offers belonging to these partners
DELETE FROM public.offers
WHERE partner_id IN (
  SELECT id FROM public.partners
  WHERE business_name IN ('The Grand Stay', 'FitZone')
  OR slug IN ('the-grand-stay', 'grand-stay', 'fitzone', 'fit-zone')
);

-- Step 4: Delete the partners themselves
DELETE FROM public.partners
WHERE business_name IN ('The Grand Stay', 'FitZone')
OR slug IN ('the-grand-stay', 'grand-stay', 'fitzone', 'fit-zone');
