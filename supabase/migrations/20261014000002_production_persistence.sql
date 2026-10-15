-- ============================================================
-- PENNYGRADE PRODUCTION PERSISTENCE & HARDENING MIGRATION
-- ============================================================
-- 1. Makes memberships.user_id nullable so offline/admin memberships
--    can be created safely without requiring customer Supabase Auth logins.
-- 2. Adds full_name, mobile, email, card_number to memberships.
-- 3. Seeds existing physical cards and active membership into PostgreSQL
--    with ON CONFLICT safety (non-destructive).
-- 4. Provides atomic SECURITY DEFINER functions for:
--    - generate_physical_cards(batch_count)
--    - admin_create_member(...)
--    - admin_assign_card(...)
--    - admin_delete_member(...)
--    - get_all_physical_cards()
--    - get_all_memberships()
--    - get_dashboard_stats()
-- ============================================================

-- Step 1: Schema adjustments for memberships
ALTER TABLE public.memberships ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS card_number text;

-- Step 2: Seed existing active member (Samir Pandey)
-- The initial schema seeded this plan with a generated UUID, while older
-- persistence code assumed a fixed UUID. Resolve an existing plan by name;
-- if none exists, create it with the stable ID used by application defaults.
INSERT INTO public.membership_plans (id, name, description, price, duration_days, status)
SELECT
  'fd6de953-c15d-4b7f-aae4-b97b6d21b043'::uuid,
  'PennyGrade 6-Month Membership',
  'Full access to every PennyGrade partner benefit for 6 months.',
  500,
  180,
  'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_plans WHERE name = 'PennyGrade 6-Month Membership'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memberships (
  id, plan_id, membership_number, start_date, expiry_date, status, full_name, mobile, email, card_number, created_at, updated_at
) SELECT
  '608d1bb0-f63f-4812-a755-55ee853ac891',
  p.id,
  'PEN-7X4P-92LM',
  '2026-10-13',
  '2027-04-11',
  'ACTIVE',
  'Samir Pandey',
  '9876543210',
  'samirjee187@gmail.com',
  'PEN-7X4P-92LM',
  '2026-10-13T22:55:21.252Z',
  '2026-10-13T22:55:21.252Z'
FROM public.membership_plans p
WHERE p.id = 'fd6de953-c15d-4b7f-aae4-b97b6d21b043'::uuid
   OR p.name = 'PennyGrade 6-Month Membership'
ORDER BY (p.id = 'fd6de953-c15d-4b7f-aae4-b97b6d21b043'::uuid) DESC, p.created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Step 3: Seed 127 physical cards
INSERT INTO public.physical_cards (id, card_number, membership_id, status, issued_at, created_at, updated_at)
VALUES
(gen_random_uuid(), 'PEN-7X4P-92LM', '608d1bb0-f63f-4812-a755-55ee853ac891'::uuid, 'ACTIVE', '2026-10-13T22:55:21.252Z'::timestamptz, '2026-10-12T10:23:54.846Z'::timestamptz, '2026-10-12T10:23:54.846Z'::timestamptz),
(gen_random_uuid(), 'PEN-4723-4RP7', NULL, 'AVAILABLE', '2026-10-13T21:56:17.846Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-BTXK-W6BS', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-NJBR-A6EF', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-DVLD-S54W', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-3VP8-22MQ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-VTVL-BF97', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-HDKT-BVCJ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-3SGD-M8NY', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-WLJ7-8FFY', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-CF3A-J5L2', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-9GJX-BQ3J', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-PRBQ-VWSR', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-HQJE-LAGX', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-K5MU-P3Q5', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-EB9H-7DPR', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-WNHG-TAU7', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-EZCT-RE3A', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-6YEK-NEFN', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-LT99-6FZW', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-LW49-GH5R', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-BQ4G-B47R', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-HMBC-NEMC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-LDKG-M2QW', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-QZG3-PB55', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
(gen_random_uuid(), 'PEN-ZT4L-5YDQ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:23:54.847Z'::timestamptz, '2026-10-12T10:23:54.847Z'::timestamptz),
('0582d240-0415-41d8-972f-d1007fd61b5f'::uuid, 'PEN-WLTW-MEGE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('be6f22b8-a903-4aba-b921-3135d55f6f1f'::uuid, 'PEN-L8YQ-LJBC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('4aa735d6-de83-444e-8ac4-2718f90d1868'::uuid, 'PEN-83DG-LAQY', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f1d18684-ad96-4160-8821-ae07d74e8c23'::uuid, 'PEN-AGLK-6KZV', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('60991da0-4c46-44cd-be68-82b772a262e5'::uuid, 'PEN-TFEB-V9WN', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('1c942e43-f4e5-4507-a06e-52b71ab38fca'::uuid, 'PEN-5JWB-2NPV', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('1f04413c-338d-45ae-b4ea-3ae2c9635ae9'::uuid, 'PEN-X22R-DWVU', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('cdd77151-9f7e-4086-a0c3-2bc14aae142d'::uuid, 'PEN-WGWC-Y99K', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('6b754408-d020-440c-ad05-907b576fdbd2'::uuid, 'PEN-GM3D-BRWZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('29e6e5c4-c2f9-4288-b32f-1b252d9df41d'::uuid, 'PEN-FLKG-98WZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('bdaa9882-ffdd-4e19-b398-27536696d4b2'::uuid, 'PEN-ZHUK-JZ6V', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('49ccdb0b-af06-4030-af1e-c445af511962'::uuid, 'PEN-UGVM-BJTU', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('78e12044-34ef-4570-a10b-a3b3bc819e27'::uuid, 'PEN-LRLP-3W83', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('0cf9c52d-78ba-4aef-bab6-d90d7e1eae35'::uuid, 'PEN-KHJ2-XE4R', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('80c602c5-0411-4203-9205-209f1f80f527'::uuid, 'PEN-BCJX-6BA3', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('412d1253-e1d1-416a-b317-35cfa00fbf43'::uuid, 'PEN-ZFNK-67AJ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('419544d0-8131-419a-9a36-d593a4ed891b'::uuid, 'PEN-733L-QVES', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('176d0b36-8474-4bf9-8e17-5e16cd181ae4'::uuid, 'PEN-92PD-8A8D', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('436e787d-f2dc-42a8-aa84-1352ebcd6522'::uuid, 'PEN-5M94-7X4N', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f1e976ba-e07d-4915-979a-756dd4203a91'::uuid, 'PEN-ANKQ-4LUU', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('06612244-fbec-4ff3-9d96-e92d2ff13e73'::uuid, 'PEN-FHMD-BGHN', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('76fbc95e-53af-48fa-b058-983445fd5414'::uuid, 'PEN-SM99-GKUJ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('63d2db20-8e84-405a-9d76-a776b0857362'::uuid, 'PEN-MUSV-UV57', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('d7b20cf1-b055-43d3-87f0-e1b5ee9dee61'::uuid, 'PEN-RDEK-FN4S', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('28dfdb52-9f13-4d28-974a-f943c9a1c597'::uuid, 'PEN-7REV-B5MH', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('d9d60d10-f924-43a7-9ca7-51a4ce0c8fa2'::uuid, 'PEN-7SFP-UBP6', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('99e4eded-fcb8-4058-8a86-8f4ba87bdf53'::uuid, 'PEN-XGRA-U8RZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('e03cd532-568c-463b-98ef-0381d67ca9f3'::uuid, 'PEN-WDVX-BZDA', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('5c3debc2-bded-4da1-ab92-40cd842ce05d'::uuid, 'PEN-RU8Q-2RNQ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('7f3cb3da-46f1-44b0-ac3f-d354eee2c68a'::uuid, 'PEN-CN9M-N4FM', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('bbdfbb85-0578-4e16-baa0-33fcbd80a0f9'::uuid, 'PEN-GH7Z-6L3A', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('d89831bc-6b49-46bf-93c1-77e6cc9d955f'::uuid, 'PEN-B5HP-UQNJ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f6a08ea5-af40-4c7d-bd11-2b6d818231aa'::uuid, 'PEN-NJZZ-CVFE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('b59a3334-8da0-47a3-9cf3-a898457f6911'::uuid, 'PEN-C2CY-26MQ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('a6515e9d-ce1b-4e4c-8476-413b6a7dcd5d'::uuid, 'PEN-THBK-9HVB', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('7ccc884e-fa4e-4cc2-82f4-1e804181e0b2'::uuid, 'PEN-SCRE-NS4C', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f5bdaa04-8aee-4571-9e86-4e35a62b5441'::uuid, 'PEN-VQ2S-DZ5N', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('ab18776a-8808-44c8-88ca-4d0f1c824f93'::uuid, 'PEN-3V8Q-KCX6', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f72a6b24-675f-43c3-9dbd-d3b1e8213358'::uuid, 'PEN-Q46Z-W59Z', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('d8400dff-945d-4cff-9db6-c95df606a310'::uuid, 'PEN-YJBE-R2W9', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('3e24436d-84c4-4b6b-9300-34603aa25463'::uuid, 'PEN-7Q9M-GPLP', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('8bd494c0-4573-48e3-a3b8-938378c83570'::uuid, 'PEN-2YBT-JDK6', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('52f7708b-467b-4b6f-9ac8-390bf6baa335'::uuid, 'PEN-S885-JD9E', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('68230a99-384f-4d34-827f-1602c6ffb432'::uuid, 'PEN-9W6B-AYHZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('10d2461b-7edd-49c1-8552-b5de24fb26c1'::uuid, 'PEN-AP7F-DACP', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('8a7ff08d-f4e4-44dd-8bf7-e8259cb44e5f'::uuid, 'PEN-RVYS-C82Y', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('03f275b2-8c30-4b78-8c49-b68a93d8a851'::uuid, 'PEN-YMGK-UJUN', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('5efdbe7d-a2b2-44b0-a9de-2b29cfcc369e'::uuid, 'PEN-HCHX-Y3M8', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('2d7904d6-ab8b-4767-9395-cf7a81d9084f'::uuid, 'PEN-FVHF-PHUP', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('7425dafb-d671-42b3-aaaa-1619dab9f1f9'::uuid, 'PEN-NDJ5-4HYD', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('566450e6-1c4a-4eed-a53a-8dd9a2f34373'::uuid, 'PEN-N2B3-PJRT', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('86d96420-43b3-4be0-88d7-a7e8e1c5ef45'::uuid, 'PEN-WUW4-7FUZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('18002de4-2101-4500-b823-e61859a5a79f'::uuid, 'PEN-UUB2-QYG2', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('2d1fc4d0-8a23-402c-ba91-220a97671c2a'::uuid, 'PEN-VC5D-ABPH', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('3521dd65-420c-4ff7-b20c-5f941cb421b8'::uuid, 'PEN-U4HN-KBC7', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('c37fc16e-5073-4a0c-85a0-07a5d606fae0'::uuid, 'PEN-KFCT-PEY9', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('c9750a77-bea6-4377-8503-f5634cad9ba0'::uuid, 'PEN-Z949-JJM2', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('d30ff2b9-9380-4081-a9d3-9e23cb980e26'::uuid, 'PEN-PWC4-6DJF', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('ca012b9d-30aa-40d9-9e99-4ba07ab015c3'::uuid, 'PEN-4RV2-FEVE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('117a6a4c-37bd-4d67-98b6-d0c5387b2234'::uuid, 'PEN-35V7-PADR', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('020a97e0-965c-45e4-ae0b-b7b5db28d24e'::uuid, 'PEN-EENG-KFEU', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('837421f6-fc7f-46e4-8a32-a9180aff2295'::uuid, 'PEN-T6X2-5Z5D', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('9c1deaa0-784b-4e4f-b97a-6c730c6dc1c9'::uuid, 'PEN-YRR8-PEKZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('b43cebcf-056b-4ad7-a718-374c3104358e'::uuid, 'PEN-WH3N-RFY6', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('9ecb5e62-57c6-46b5-b2e2-b178c964fe1c'::uuid, 'PEN-GAPZ-6C3P', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('5a8aebde-2a8d-451c-b28c-3c123f36411b'::uuid, 'PEN-TZFA-UNBY', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('272fda1e-a872-4b9e-953f-0d3339810a61'::uuid, 'PEN-Q86K-KVQ9', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('335e35ef-ce55-4c2f-a4a8-a59bdb99b49d'::uuid, 'PEN-SS3U-655D', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('6610b09b-c432-4854-9442-8c7599df8b47'::uuid, 'PEN-8SFH-TX3L', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('15ea3444-f888-4f04-ae23-e26e6089a435'::uuid, 'PEN-VFFN-J5T9', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('485168ad-537a-4fdd-9a0a-a2cbef3983e0'::uuid, 'PEN-SDKV-CMVL', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('a76805bd-d2b8-4abd-ae59-615b9cc81111'::uuid, 'PEN-WB99-BSRZ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('904917b2-c2fd-4ef1-9ef9-a8d6a9e3992c'::uuid, 'PEN-EMLN-LSFW', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('8f0d773c-1804-49f4-b84e-8ac7670f4ef4'::uuid, 'PEN-MXM9-TWLG', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('54e9ef4d-915e-469b-8ba6-14c4432f278d'::uuid, 'PEN-ZXSY-2VLG', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('0f34cc06-492a-4b19-9f32-71b9b464d6ab'::uuid, 'PEN-B57J-7SMK', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('e3d7495c-6a80-4132-975a-81ee61a08009'::uuid, 'PEN-KLRH-BWYY', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('366ccdf1-5b41-42c4-92b3-7baf66eb6cfd'::uuid, 'PEN-4LYH-58UE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('7b5bba42-d66c-42f7-9765-c9113915c187'::uuid, 'PEN-9DHL-FEKP', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('1fcbcad5-00f6-4969-900c-c06e6b01668c'::uuid, 'PEN-PLBS-NPSC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('a5692c8b-2626-4b5b-930a-cc525a5735f5'::uuid, 'PEN-FCDX-DZNT', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('e58c9e27-9c30-4c59-b9f9-bfb029cc961d'::uuid, 'PEN-ABRA-PKAE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f5160b3f-c6c2-47bd-a8d2-22950ebf3c7c'::uuid, 'PEN-SZ6U-F8YE', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('89851bf0-67a8-4f37-a3d6-a0c97ff5f070'::uuid, 'PEN-6VWZ-M33K', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('bcf8fcc8-75b7-4fe9-bc78-1d7a5a89e4a8'::uuid, 'PEN-KLZ5-H9J5', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('ba56d6d4-7c00-4305-9a8a-d77d7feec123'::uuid, 'PEN-KF73-XCCT', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('3e4bcf5a-08fe-4485-85e8-8bb9bd323d43'::uuid, 'PEN-JGT3-HP9G', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('5aa94aec-b1b7-4358-bb14-9e92e7f4b189'::uuid, 'PEN-ZY46-NC4E', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('5243ee69-b063-449f-aff9-611278ebc5a2'::uuid, 'PEN-QZZG-FCDC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('c72725fe-416d-470f-a597-3140d47af3bb'::uuid, 'PEN-MF2F-25PP', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('975a5f0b-d3a5-443f-9e7e-7a798c9a2605'::uuid, 'PEN-ZBRL-KKN9', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('48778305-c7e3-40a5-9c65-f768ae85c297'::uuid, 'PEN-NVU5-M5XB', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('9c48f2bb-99ea-40ac-8d88-62a06b69d028'::uuid, 'PEN-UU28-RAR3', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('8720f5c7-c8be-4bae-bbc4-887ed4e2f11a'::uuid, 'PEN-ETV3-5M7E', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('61811181-7bbb-4778-ab3a-d511a0a7f432'::uuid, 'PEN-TBGM-PE3G', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('1888eb43-d286-4522-a853-fb62a16cd23c'::uuid, 'PEN-32QD-RBKC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('f34a66a1-e769-43ac-b6b1-51034112b253'::uuid, 'PEN-GQPM-RE8X', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('a64dce0f-49d0-45d3-9976-16e00306ca9c'::uuid, 'PEN-V3XY-AVPC', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('80e0ce80-7ee1-4031-ab58-b62183518594'::uuid, 'PEN-5R7N-2SLQ', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
('07cc2286-f9eb-42b2-98c2-15017256883d'::uuid, 'PEN-HCY8-B4MD', NULL, 'AVAILABLE', NULL, '2026-10-12T10:40:00.436Z'::timestamptz, '2026-10-12T10:40:00.436Z'::timestamptz),
(gen_random_uuid(), 'PEN-DEL1-TEST', NULL, 'AVAILABLE', '2026-10-14T06:58:37.858Z'::timestamptz, '2026-10-14T06:58:37.858Z'::timestamptz, '2026-10-14T06:58:37.858Z'::timestamptz)
ON CONFLICT (card_number) DO NOTHING;

-- Ensure Samir's card is linked and ACTIVE
UPDATE public.physical_cards
SET membership_id = '608d1bb0-f63f-4812-a755-55ee853ac891',
    status = 'ACTIVE',
    issued_at = '2026-10-13T22:55:21.252Z'
WHERE card_number = 'PEN-7X4P-92LM';

-- Step 4: Atomic Batch Card Generation
CREATE OR REPLACE FUNCTION public.generate_physical_cards(p_count int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_inserted int := 0;
  v_card_number text;
  v_attempts int;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 2000 THEN
    RAISE EXCEPTION 'Count must be between 1 and 2000';
  END IF;

  WHILE v_inserted < p_count LOOP
    v_attempts := 0;
    LOOP
      v_card_number := public.gen_pen_code();
      v_attempts := v_attempts + 1;
      BEGIN
        INSERT INTO public.physical_cards (card_number, status)
        VALUES (v_card_number, 'AVAILABLE');
        v_inserted := v_inserted + 1;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempts > 50 THEN
          RAISE EXCEPTION 'Too many collision attempts generating unique card codes';
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'count', v_inserted);
END;
$$;

-- Step 5: Admin Create Member & Link Card
CREATE OR REPLACE FUNCTION public.admin_create_member(
  p_full_name text,
  p_mobile text,
  p_email text,
  p_plan_id uuid,
  p_start_date date,
  p_expiry_date date,
  p_card_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_membership_id uuid := gen_random_uuid();
  v_membership_number text := public.gen_pen_code();
  v_card_id uuid := p_card_id;
  v_card_number text := NULL;
  v_now timestamptz := now();
BEGIN
  -- If card_id was provided, verify it is AVAILABLE
  IF v_card_id IS NOT NULL THEN
    SELECT card_number INTO v_card_number
    FROM public.physical_cards
    WHERE id = v_card_id AND status = 'AVAILABLE';
    
    IF v_card_number IS NULL THEN
      RAISE EXCEPTION 'Selected card is not available or does not exist';
    END IF;
  ELSE
    -- Find first available card
    SELECT id, card_number INTO v_card_id, v_card_number
    FROM public.physical_cards
    WHERE status = 'AVAILABLE'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  -- Insert membership
  INSERT INTO public.memberships (
    id, plan_id, membership_number, start_date, expiry_date, status, full_name, mobile, email, card_number, created_at, updated_at
  ) VALUES (
    v_membership_id, p_plan_id, v_membership_number, p_start_date, p_expiry_date, 'ACTIVE', p_full_name, p_mobile, p_email, COALESCE(v_card_number, v_membership_number), v_now, v_now
  );

  -- If card was found/assigned, update physical_cards
  IF v_card_id IS NOT NULL THEN
    UPDATE public.physical_cards
    SET membership_id = v_membership_id, status = 'ACTIVE', issued_at = v_now, updated_at = v_now
    WHERE id = v_card_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_membership_id,
    'membership_number', v_membership_number,
    'card_number', COALESCE(v_card_number, v_membership_number),
    'card_id', v_card_id
  );
END;
$$;

-- Step 6: Admin Assign / Replace Card
CREATE OR REPLACE FUNCTION public.admin_assign_card(
  p_member_id uuid,
  p_card_id uuid,
  p_old_card_status text DEFAULT 'LOST'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_card_number text;
  v_old_card_id uuid;
  v_now timestamptz := now();
BEGIN
  -- Check new card
  SELECT card_number INTO v_card_number
  FROM public.physical_cards
  WHERE id = p_card_id AND status = 'AVAILABLE'
  FOR UPDATE;

  IF v_card_number IS NULL THEN
    RAISE EXCEPTION 'Selected card is not available';
  END IF;

  -- Find and mark previous card if any
  SELECT id INTO v_old_card_id
  FROM public.physical_cards
  WHERE membership_id = p_member_id AND status = 'ACTIVE';

  IF v_old_card_id IS NOT NULL THEN
    UPDATE public.physical_cards
    SET status = CASE WHEN p_old_card_status = 'CANCELLED' THEN 'CANCELLED'::public.card_status ELSE 'LOST'::public.card_status END,
        updated_at = v_now
    WHERE id = v_old_card_id;
  END IF;

  -- Assign new card
  UPDATE public.physical_cards
  SET membership_id = p_member_id,
      status = 'ACTIVE',
      issued_at = v_now,
      updated_at = v_now
  WHERE id = p_card_id;

  -- Update membership
  UPDATE public.memberships
  SET card_number = v_card_number,
      updated_at = v_now
  WHERE id = p_member_id;

  RETURN jsonb_build_object('ok', true, 'card_number', v_card_number);
END;
$$;

-- Step 7: Admin Delete Member
CREATE OR REPLACE FUNCTION public.admin_delete_member(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Release card
  UPDATE public.physical_cards
  SET membership_id = NULL,
      status = 'AVAILABLE',
      updated_at = v_now
  WHERE membership_id = p_member_id;

  -- Delete verification sessions & logs
  DELETE FROM public.verification_logs WHERE membership_id = p_member_id;
  DELETE FROM public.verification_sessions WHERE membership_id = p_member_id;

  -- Delete membership
  DELETE FROM public.memberships WHERE id = p_member_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Step 8: Authoritative query functions
CREATE OR REPLACE FUNCTION public.get_all_physical_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'card_number', c.card_number,
      'membership_id', c.membership_id,
      'status', c.status,
      'issued_at', c.issued_at,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'member', m.full_name,
      'membership_number', m.membership_number
    ) ORDER BY c.created_at DESC
  ), '[]'::jsonb) INTO v_res
  FROM public.physical_cards c
  LEFT JOIN public.memberships m ON m.id = c.membership_id;
  
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_memberships()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'membership_number', m.membership_number,
      'full_name', m.full_name,
      'mobile', m.mobile,
      'email', m.email,
      'plan_id', m.plan_id,
      'plan_name', COALESCE(p.name, 'PennyGrade 6-Month Membership'),
      'start_date', m.start_date,
      'expiry_date', m.expiry_date,
      'status', m.status,
      'created_at', m.created_at,
      'updated_at', m.updated_at,
      'card_number', COALESCE(m.card_number, m.membership_number),
      'card_id', (SELECT id FROM public.physical_cards c WHERE c.membership_id = m.id LIMIT 1)
    ) ORDER BY m.created_at DESC
  ), '[]'::jsonb) INTO v_res
  FROM public.memberships m
  LEFT JOIN public.membership_plans p ON p.id = m.plan_id;
  
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_total_members int;
  v_active_members int;
  v_expired_members int;
  v_available_cards int;
  v_active_partners int;
  v_active_offers int;
  v_today_verifications int;
  v_monthly_verifications int;
  v_estimated_discount numeric;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Kolkata');
BEGIN
  SELECT count(*) INTO v_total_members FROM public.memberships;
  SELECT count(*) INTO v_active_members FROM public.memberships WHERE status = 'ACTIVE' AND expiry_date >= v_today;
  SELECT count(*) INTO v_expired_members FROM public.memberships WHERE status = 'EXPIRED' OR expiry_date < v_today;
  SELECT count(*) INTO v_available_cards FROM public.physical_cards WHERE status = 'AVAILABLE';
  SELECT count(*) INTO v_active_partners FROM public.partners WHERE status = 'ACTIVE';
  SELECT count(*) INTO v_active_offers FROM public.offers WHERE status = 'ACTIVE';
  
  SELECT count(*), coalesce(sum(discount_amount), 0)
  INTO v_today_verifications, v_estimated_discount
  FROM public.verification_logs
  WHERE (created_at at time zone 'Asia/Kolkata')::date = v_today;

  SELECT count(*) INTO v_monthly_verifications
  FROM public.verification_logs
  WHERE created_at >= v_month_start;

  RETURN jsonb_build_object(
    'total_members', v_total_members,
    'active_members', v_active_members,
    'expired_members', v_expired_members,
    'available_cards', v_available_cards,
    'active_partners', v_active_partners,
    'active_offers', v_active_offers,
    'today_verifications', v_today_verifications,
    'monthly_verifications', v_monthly_verifications,
    'estimated_discount', v_estimated_discount
  );
END;
$$;

-- Step 9: Grant execution privileges
GRANT EXECUTE ON FUNCTION public.generate_physical_cards(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_member(text, text, text, uuid, date, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_card(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_physical_cards() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_memberships() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;
