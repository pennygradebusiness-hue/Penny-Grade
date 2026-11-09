-- Align the membership plan with the product actually offered and archive the
-- placeholder partners seeded for local development (Mumbai etc.), preserving
-- historical verification and offer records.
UPDATE public.membership_plans
SET description = 'Six-month physical membership providing access to PennyGrade participating local businesses and their listed member benefits.',
    benefits = ARRAY[
      'Six-month access to the PennyGrade participating local business network',
      'One physical membership card with a unique membership identifier',
      'View current partner offers and their eligibility conditions',
      'Online membership verification where supported by the partner',
      'Card delivery currently available in Daltonganj, Jharkhand'
    ]
WHERE name = 'PennyGrade 6-Month Membership';

ALTER TABLE public.membership_plans
  ALTER COLUMN benefits SET DEFAULT ARRAY[
    'Six-month access to the PennyGrade participating local business network',
    'One physical membership card with a unique membership identifier',
    'View current partner offers and their eligibility conditions',
    'Online membership verification where supported by the partner',
    'Card delivery currently available in Daltonganj, Jharkhand'
  ];

UPDATE public.offers
SET status = 'INACTIVE', updated_at = now()
WHERE status = 'ACTIVE'
  AND partner_id IN (
    SELECT id FROM public.partners
    WHERE slug IN ('abc-cafe', 'urban-brew', 'the-grand-stay', 'glow-salon', 'fitzone', 'saffron-table')
  );

UPDATE public.partners
SET status = 'INACTIVE', featured = false, updated_at = now()
WHERE status = 'ACTIVE'
  AND slug IN ('abc-cafe', 'urban-brew', 'the-grand-stay', 'glow-salon', 'fitzone', 'saffron-table');
