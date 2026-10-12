create extension if not exists pgcrypto with schema extensions;

-- ENUMS
create type public.app_role as enum ('super_admin','manager','membership_manager','support');
create type public.membership_status as enum ('ACTIVE','SUSPENDED','CANCELLED','EXPIRED');
create type public.card_status as enum ('AVAILABLE','ACTIVE','LOST','CANCELLED');
create type public.record_status as enum ('ACTIVE','INACTIVE');
create type public.partner_status as enum ('ACTIVE','INACTIVE','SUSPENDED');
create type public.discount_type as enum ('PERCENTAGE','FIXED');
create type public.usage_limit_type as enum ('UNLIMITED');
create type public.session_status as enum ('ACTIVE','EXPIRED','CANCELLED');

-- updated_at helper
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- random PEN-XXXX-XXXX code (crypto secure)
create or replace function public.gen_pen_code() returns text language plpgsql volatile set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; out text := ''; i int;
begin
  b := extensions.gen_random_bytes(8);
  for i in 0..7 loop
    out := out || substr(alphabet, (get_byte(b,i) % 32) + 1, 1);
  end loop;
  return 'PEN-' || substr(out,1,4) || '-' || substr(out,5,4);
end $$;

-- PROFILES
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  mobile text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_upd before update on public.profiles for each row execute function public.touch_updated_at();

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;
create or replace function public.is_admin(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- PLANS
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  duration_days int not null check (duration_days > 0),
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_plans_upd before update on public.membership_plans for each row execute function public.touch_updated_at();

-- MEMBERSHIPS
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  membership_number text not null unique default public.gen_pen_code(),
  start_date date not null default current_date,
  expiry_date date not null,
  status public.membership_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_memberships_user on public.memberships(user_id);
create trigger trg_memberships_upd before update on public.memberships for each row execute function public.touch_updated_at();

-- PHYSICAL CARDS
create table public.physical_cards (
  id uuid primary key default gen_random_uuid(),
  card_number text not null unique default public.gen_pen_code(),
  membership_id uuid references public.memberships(id) on delete set null,
  status public.card_status not null default 'AVAILABLE',
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cards_membership on public.physical_cards(membership_id);
create index idx_cards_status on public.physical_cards(status);
create trigger trg_cards_upd before update on public.physical_cards for each row execute function public.touch_updated_at();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_upd before update on public.categories for each row execute function public.touch_updated_at();

-- PARTNERS
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  logo_url text,
  cover_image_url text,
  phone text, email text, website text,
  address text, city text,
  latitude double precision, longitude double precision,
  business_hours text,
  status public.partner_status not null default 'ACTIVE',
  featured boolean not null default false,
  qr_created_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_partners_category on public.partners(category_id);
create trigger trg_partners_upd before update on public.partners for each row execute function public.touch_updated_at();

-- OFFERS
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  title text not null,
  description text,
  discount_type public.discount_type not null default 'PERCENTAGE',
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_discount numeric(10,2),
  minimum_bill numeric(10,2) not null default 0,
  valid_from date,
  valid_until date,
  valid_days int[] not null default '{0,1,2,3,4,5,6}',
  terms_conditions text,
  usage_limit_type public.usage_limit_type not null default 'UNLIMITED',
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_offers_partner on public.offers(partner_id);
create index idx_offers_status on public.offers(status);
create trigger trg_offers_upd before update on public.offers for each row execute function public.touch_updated_at();

-- VERIFICATION SESSIONS
create table public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  bill_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null,
  final_amount numeric(12,2) not null,
  status public.session_status not null default 'ACTIVE',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_vs_user on public.verification_sessions(user_id);
create index idx_vs_partner on public.verification_sessions(partner_id);
create index idx_vs_created on public.verification_sessions(created_at);

-- VERIFICATION LOGS
create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  verification_session_id uuid references public.verification_sessions(id) on delete set null,
  user_id uuid not null,
  membership_id uuid references public.memberships(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  bill_amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null,
  final_amount numeric(12,2) not null,
  status text not null default 'VERIFIED',
  created_at timestamptz not null default now()
);
create index idx_vl_partner on public.verification_logs(partner_id);
create index idx_vl_created on public.verification_logs(created_at);
create index idx_vl_user on public.verification_logs(user_id);

-- AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs(created_at);

-- GRANTS
grant select, update on public.profiles to authenticated;
grant insert, delete on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant insert, delete on public.user_roles to authenticated;
grant select on public.membership_plans, public.categories, public.partners, public.offers to anon, authenticated;
grant insert, update, delete on public.membership_plans, public.categories, public.partners, public.offers to authenticated;
grant select, insert, update, delete on public.memberships, public.physical_cards to authenticated;
grant select on public.verification_sessions, public.verification_logs to authenticated;
grant update on public.verification_sessions to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant all on public.profiles, public.user_roles, public.membership_plans, public.memberships, public.physical_cards, public.categories, public.partners, public.offers, public.verification_sessions, public.verification_logs, public.audit_logs to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.physical_cards enable row level security;
alter table public.categories enable row level security;
alter table public.partners enable row level security;
alter table public.offers enable row level security;
alter table public.verification_sessions enable row level security;
alter table public.verification_logs enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "own profile read" on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_any_role(auth.uid(), '{super_admin,manager,membership_manager,support}')) with check (true);

-- roles
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "super admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'super_admin'));
create policy "super admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'super_admin'));

-- plans / categories / partners / offers: public sees ACTIVE, admins see all
create policy "public active plans" on public.membership_plans for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin(auth.uid()));
create policy "admin write plans" on public.membership_plans for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager}'));

create policy "public active categories" on public.categories for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin(auth.uid()));
create policy "admin write categories" on public.categories for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager}'));

create policy "public active partners" on public.partners for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin(auth.uid()));
create policy "admin write partners" on public.partners for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager}'));

create policy "public active offers" on public.offers for select to anon, authenticated using (
  (status = 'ACTIVE' and exists (select 1 from public.partners p where p.id = partner_id and p.status = 'ACTIVE')) or public.is_admin(auth.uid()));
create policy "admin write offers" on public.offers for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager}'));

-- memberships & cards
create policy "own memberships" on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "admin write memberships" on public.memberships for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager,membership_manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager,membership_manager}'));

create policy "own cards" on public.physical_cards for select to authenticated using (
  public.is_admin(auth.uid()) or exists (select 1 from public.memberships m where m.id = membership_id and m.user_id = auth.uid()));
create policy "admin write cards" on public.physical_cards for all to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager,membership_manager}')) with check (public.has_any_role(auth.uid(),'{super_admin,manager,membership_manager}'));

-- sessions/logs
create policy "own sessions" on public.verification_sessions for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "cancel own sessions" on public.verification_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'CANCELLED');
create policy "own logs" on public.verification_logs for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- audit
create policy "admin read audit" on public.audit_logs for select to authenticated using (public.has_any_role(auth.uid(),'{super_admin,manager}'));
create policy "admin insert audit" on public.audit_logs for insert to authenticated with check (public.is_admin(auth.uid()) and admin_user_id = auth.uid());

-- signup -> profile
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, mobile, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'mobile', new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Bootstrap: first signed-in user may claim super_admin only if none exists
create or replace function public.claim_first_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'super_admin') then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'super_admin');
  insert into public.audit_logs(admin_user_id, action, target_type, target_id) values (auth.uid(), 'Claimed initial super admin', 'user', auth.uid()::text);
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon;

create or replace function public.admin_exists() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'super_admin')
$$;

-- CORE: create verification (all checks server-side, generic errors)
create or replace function public.create_verification(_partner_slug text, _bill numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m public.memberships%rowtype;
  p public.partners%rowtype;
  o public.offers%rowtype;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  dow int := extract(dow from (now() at time zone 'Asia/Kolkata'))::int;
  disc numeric; fin numeric; sid uuid; exp timestamptz;
begin
  if uid is null then return jsonb_build_object('ok',false,'code','AUTH','message','Please log in to use your PennyGrade membership.'); end if;
  if _bill is null or _bill <= 0 or _bill > 10000000 then
    return jsonb_build_object('ok',false,'code','BILL','message','Please enter a valid bill amount.'); end if;
  if (select count(*) from public.verification_sessions where user_id = uid and created_at > now() - interval '1 minute') >= 6 then
    return jsonb_build_object('ok',false,'code','RATE','message','Too many verification attempts. Please wait a minute and try again.'); end if;

  select * into p from public.partners where slug = _partner_slug and status = 'ACTIVE';
  if not found then return jsonb_build_object('ok',false,'code','PARTNER','message','This PennyGrade partner could not be found.'); end if;

  select * into m from public.memberships where user_id = uid and status = 'ACTIVE' order by expiry_date desc limit 1;
  if not found then
    return jsonb_build_object('ok',false,'code','MEMBERSHIP','message','You don''t currently have an active PennyGrade membership.'); end if;
  if m.expiry_date < today then
    update public.memberships set status = 'EXPIRED' where id = m.id;
    return jsonb_build_object('ok',false,'code','EXPIRED','message','Your PennyGrade membership has expired. Please contact PennyGrade support to renew it.'); end if;

  select * into o from public.offers where partner_id = p.id and status = 'ACTIVE'
    and (valid_from is null or valid_from <= today) and (valid_until is null or valid_until >= today)
    order by created_at desc limit 1;
  if not found then return jsonb_build_object('ok',false,'code','OFFER','message','This offer is currently unavailable.'); end if;
  if not (dow = any(o.valid_days)) then return jsonb_build_object('ok',false,'code','DAY','message','This offer is not valid today.'); end if;
  if _bill < o.minimum_bill then
    return jsonb_build_object('ok',false,'code','MINBILL','message','This offer requires a minimum bill of ₹' || trim(to_char(o.minimum_bill,'FM99,99,99,990')) || '.'); end if;

  if o.discount_type = 'PERCENTAGE' then disc := round(_bill * o.discount_value / 100, 2);
  else disc := o.discount_value; end if;
  if o.max_discount is not null and disc > o.max_discount then disc := o.max_discount; end if;
  if disc > _bill then disc := _bill; end if;
  fin := _bill - disc;
  exp := now() + interval '5 minutes';

  insert into public.verification_sessions(user_id, membership_id, partner_id, offer_id, bill_amount, discount_amount, final_amount, expires_at)
  values (uid, m.id, p.id, o.id, round(_bill,2), disc, fin, exp) returning id into sid;
  insert into public.verification_logs(verification_session_id, user_id, membership_id, partner_id, offer_id, bill_amount, discount_amount, final_amount)
  values (sid, uid, m.id, p.id, o.id, round(_bill,2), disc, fin);

  return jsonb_build_object('ok',true,'session_id',sid);
end $$;
revoke execute on function public.create_verification(text, numeric) from anon;

-- SEED (demo data — remove rows with business_name in demo list to clear)
insert into public.membership_plans(name, description, price, duration_days) values
 ('PennyGrade 6-Month Membership','Full access to every PennyGrade partner benefit for 6 months.',500,180);

insert into public.categories(name, slug, icon, sort_order) values
 ('Cafés','cafes','Coffee',1),('Restaurants','restaurants','UtensilsCrossed',2),('Hotels','hotels','BedDouble',3),
 ('Salons','salons','Scissors',4),('Fitness','fitness','Dumbbell',5),('Shopping','shopping','ShoppingBag',6),
 ('Entertainment','entertainment','Clapperboard',7),('Travel','travel','Plane',8);

insert into public.partners(business_name, slug, category_id, description, cover_image_url, phone, email, address, city, business_hours, featured) values
 ('ABC Café','abc-cafe',(select id from public.categories where slug='cafes'),'Neighbourhood specialty coffee, fresh bakes and all-day breakfast in a calm, sunlit space.','https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70','+91 98200 11111','hello@abccafe.in','12 Hill Road, Bandra West','Mumbai','Mon–Sun · 8:00 AM – 11:00 PM',true),
 ('Urban Brew','urban-brew',(select id from public.categories where slug='cafes'),'Small-batch roasts, cold brews and a quiet corner to work from.','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=70','+91 98200 22222','team@urbanbrew.in','4 Indiranagar 100ft Road','Bengaluru','Mon–Sun · 7:30 AM – 10:00 PM',true),
 ('The Grand Stay','the-grand-stay',(select id from public.categories where slug='hotels'),'Boutique rooms, rooftop dining and warm hospitality in the heart of the city.','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=70','+91 98200 33333','stay@grandstay.in','88 MG Road','Pune','Open 24 hours',true),
 ('Glow Salon','glow-salon',(select id from public.categories where slug='salons'),'Hair, skin and grooming by experienced stylists using premium products.','https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=70','+91 98200 44444','book@glowsalon.in','21 Park Street','Kolkata','Tue–Sun · 10:00 AM – 9:00 PM',false),
 ('FitZone','fitzone',(select id from public.categories where slug='fitness'),'Strength, cardio and group classes with certified coaches.','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=70','+91 98200 55555','join@fitzone.in','7 Sector 29','Gurugram','Mon–Sat · 5:30 AM – 11:00 PM',true),
 ('Saffron Table','saffron-table',(select id from public.categories where slug='restaurants'),'Modern Indian cuisine with a seasonal tasting menu.','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=70','+91 98200 66666','reserve@saffrontable.in','3 Khan Market','New Delhi','Mon–Sun · 12:00 PM – 11:30 PM',false);

insert into public.offers(partner_id, title, description, discount_type, discount_value, max_discount, minimum_bill, terms_conditions) values
 ((select id from public.partners where slug='abc-cafe'),'10% Off','10% off your total bill','PERCENTAGE',10,500,500,'Valid on dine-in bills only. Cannot be combined with other offers.'),
 ((select id from public.partners where slug='urban-brew'),'15% Off','15% off on all beverages and food','PERCENTAGE',15,300,300,'Valid on dine-in and takeaway. Cannot be combined with other offers.'),
 ((select id from public.partners where slug='the-grand-stay'),'20% Off Stays','20% off room tariff','PERCENTAGE',20,3000,2000,'Valid on direct walk-in bookings. Subject to availability.'),
 ((select id from public.partners where slug='glow-salon'),'₹300 Off','Flat ₹300 off on services','FIXED',300,null,1000,'Valid on salon services only, not on retail products.'),
 ((select id from public.partners where slug='fitzone'),'12% Off Memberships','12% off on gym plans','PERCENTAGE',12,2000,1500,'Valid on new and renewal plans.'),
 ((select id from public.partners where slug='saffron-table'),'10% Off','10% off on food','PERCENTAGE',10,750,1000,'Not valid on alcoholic beverages.');
