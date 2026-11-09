create table if not exists public.prebooking_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null check (length(trim(summary)) between 10 and 400),
  description text not null check (length(trim(description)) between 10 and 10000),
  benefits text[] not null default '{}',
  amount numeric(10,2) not null check (amount > 0),
  booking_opens_at timestamptz not null,
  booking_closes_at timestamptz not null,
  benefit_starts_at timestamptz,
  benefit_ends_at timestamptz,
  terms_and_refunds text not null check (length(trim(terms_and_refunds)) >= 20),
  popup_enabled boolean not null default false,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (booking_closes_at > booking_opens_at),
  check (status <> 'ACTIVE' or cardinality(benefits) > 0),
  check (benefit_ends_at is null or benefit_starts_at is null or benefit_ends_at > benefit_starts_at)
);

create table if not exists public.prebooking_orders (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  campaign_id uuid not null references public.prebooking_campaigns(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','FAILED','REFUND_REVIEW')),
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  terms_accepted_at timestamptz not null default now(),
  terms_snapshot text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prebooking_orders_campaign_idx on public.prebooking_orders(campaign_id, created_at desc);
create index if not exists prebooking_campaigns_public_idx on public.prebooking_campaigns(status, booking_opens_at, booking_closes_at);

alter table public.prebooking_campaigns enable row level security;
alter table public.prebooking_orders enable row level security;

drop policy if exists "Public can read active prebooking campaigns" on public.prebooking_campaigns;
create policy "Public can read active prebooking campaigns" on public.prebooking_campaigns
  for select to anon, authenticated using (status = 'ACTIVE');

revoke all on public.prebooking_campaigns from anon, authenticated;
grant select on public.prebooking_campaigns to anon, authenticated;
revoke all on public.prebooking_orders from anon, authenticated;

create or replace function public.create_prebooking_order(
  p_id uuid,
  p_reservation_number text,
  p_campaign_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_amount numeric,
  p_razorpay_order_id text,
  p_terms_accepted boolean
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.prebooking_campaigns%rowtype;
begin
  select * into c from public.prebooking_campaigns where id = p_campaign_id for share;
  if not found or c.status <> 'ACTIVE' or now() < c.booking_opens_at or now() >= c.booking_closes_at then
    raise exception 'This prebooking campaign is not accepting bookings';
  end if;
  if c.amount <> p_amount then raise exception 'Prebooking price changed; refresh and retry'; end if;
  if p_terms_accepted is distinct from true then raise exception 'Campaign terms must be accepted'; end if;
  insert into public.prebooking_orders(id,reservation_number,campaign_id,customer_name,customer_email,customer_phone,amount,razorpay_order_id,terms_accepted_at,terms_snapshot)
  values (p_id,p_reservation_number,p_campaign_id,trim(p_customer_name),lower(trim(p_customer_email)),trim(p_customer_phone),p_amount,p_razorpay_order_id,now(),c.terms_and_refunds);
  return jsonb_build_object('ok',true,'id',p_id,'reservation_number',p_reservation_number);
end $$;
revoke all on function public.create_prebooking_order(uuid,text,uuid,text,text,text,numeric,text,boolean) from public, anon, authenticated;
grant execute on function public.create_prebooking_order(uuid,text,uuid,text,text,text,numeric,text,boolean) to service_role;

create or replace function public.complete_prebooking_order(p_razorpay_order_id text,p_razorpay_payment_id text,p_razorpay_signature text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.prebooking_orders%rowtype;
begin
  select * into o from public.prebooking_orders where razorpay_order_id=p_razorpay_order_id for update;
  if not found then return jsonb_build_object('ok',false,'code','ORDER_NOT_FOUND'); end if;
  if o.payment_status='PAID' then
    if o.razorpay_payment_id=p_razorpay_payment_id then return jsonb_build_object('ok',true,'already_processed',true,'reservation_number',o.reservation_number); end if;
    update public.prebooking_orders set payment_status='REFUND_REVIEW',updated_at=now() where id=o.id;
    return jsonb_build_object('ok',false,'code','SECOND_PAYMENT_REVIEW');
  end if;
  update public.prebooking_orders set payment_status='PAID',razorpay_payment_id=p_razorpay_payment_id,razorpay_signature=p_razorpay_signature,updated_at=now() where id=o.id;
  return jsonb_build_object('ok',true,'reservation_number',o.reservation_number,'already_processed',false);
end $$;
revoke all on function public.complete_prebooking_order(text,text,text) from public, anon, authenticated;
grant execute on function public.complete_prebooking_order(text,text,text) to service_role;
