-- RotateAI Production Schema
-- Run this in your Supabase SQL Editor at supabase.com/dashboard

-- ── ORGANIZATIONS (franchise groups like 23 Restaurant Services) ─────────────
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now()
);

-- ── LOCATIONS (individual restaurants) ───────────────────────────────────────
create table locations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) on delete cascade,
  name            text not null,
  address         text,
  city            text,
  state           text,
  timezone        text default 'America/New_York',
  pos_system      text default 'toast',
  pos_location_id text,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ── USER PROFILES (extends Supabase auth.users) ───────────────────────────────
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id),
  role        text not null check (role in ('gm','owner','corporate','admin')),
  full_name   text,
  created_at  timestamptz default now()
);

-- ── USER <-> LOCATION ACCESS ──────────────────────────────────────────────────
create table user_locations (
  user_id     uuid references user_profiles(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  primary key (user_id, location_id)
);

-- ── INVENTORY ITEMS (product master) ─────────────────────────────────────────
create table inventory_items (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  name        text not null,
  category    text not null,
  unit        text not null,
  par_level   numeric not null default 0,
  daily_use   numeric not null default 0,
  shelf_life  integer,
  vendor      text,
  fifo_risk   boolean default false,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ── INVENTORY BATCHES (FIFO tracking) ────────────────────────────────────────
create table inventory_batches (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid references inventory_items(id) on delete cascade,
  location_id   uuid references locations(id) on delete cascade,
  quantity      numeric not null,
  received_date date not null default current_date,
  expiry_date   date,
  used          boolean default false,
  created_at    timestamptz default now()
);

-- ── KEGS ──────────────────────────────────────────────────────────────────────
create table kegs (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid references locations(id) on delete cascade,
  name            text not null,
  brewery         text,
  style           text,
  size_oz         numeric not null,
  oz_remaining    numeric not null,
  daily_oz        numeric not null default 0,
  cost_per_keg    numeric,
  sell_per_pint   numeric,
  tapped_date     date,
  rotating        boolean default false,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ── WASTE LOG ─────────────────────────────────────────────────────────────────
create table waste_logs (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  item_name   text not null,
  category    text not null,
  quantity    numeric not null,
  unit        text,
  cost        numeric,
  cause       text,
  logged_by   uuid references user_profiles(id),
  log_date    date not null default current_date,
  created_at  timestamptz default now()
);

-- ── VENDOR ORDERS ─────────────────────────────────────────────────────────────
create table vendor_orders (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid references locations(id) on delete cascade,
  vendor       text not null,
  status       text default 'pending' check (status in ('pending','submitted','delivered','cancelled')),
  total        numeric,
  submitted_by uuid references user_profiles(id),
  order_date   date not null default current_date,
  delivery_date date,
  created_at   timestamptz default now()
);

create table vendor_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references vendor_orders(id) on delete cascade,
  item_name   text not null,
  quantity    numeric not null,
  unit        text,
  unit_price  numeric,
  subtotal    numeric,
  notes       text
);

-- ── ALERTS (persisted toasts/notifications) ───────────────────────────────────
create table alerts (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  type        text not null,
  message     text not null,
  color       text default '#f08200',
  icon        text,
  tab         text,
  dismissed   boolean default false,
  created_at  timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — users only see their own location data
-- ════════════════════════════════════════════════════════════

alter table organizations      enable row level security;
alter table locations          enable row level security;
alter table user_profiles      enable row level security;
alter table user_locations     enable row level security;
alter table inventory_items    enable row level security;
alter table inventory_batches  enable row level security;
alter table kegs               enable row level security;
alter table waste_logs         enable row level security;
alter table vendor_orders      enable row level security;
alter table vendor_order_items enable row level security;
alter table alerts             enable row level security;

-- Helper: get all location IDs this user can access
create or replace function user_location_ids()
returns setof uuid language sql security definer as $$
  select location_id from user_locations where user_id = auth.uid()
$$;

-- Helper: get user role
create or replace function user_role()
returns text language sql security definer as $$
  select role from user_profiles where id = auth.uid()
$$;

-- Locations: GM sees their locations, corporate/admin sees all in org
create policy "locations_select" on locations for select using (
  id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);

-- Inventory items: location-scoped
create policy "inventory_items_select" on inventory_items for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "inventory_items_insert" on inventory_items for insert with check (
  location_id in (select * from user_location_ids())
);
create policy "inventory_items_update" on inventory_items for update using (
  location_id in (select * from user_location_ids())
);

-- Batches
create policy "batches_select" on inventory_batches for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "batches_insert" on inventory_batches for insert with check (
  location_id in (select * from user_location_ids())
);

-- Kegs
create policy "kegs_select" on kegs for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "kegs_all" on kegs for all using (
  location_id in (select * from user_location_ids())
);

-- Waste logs
create policy "waste_select" on waste_logs for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "waste_insert" on waste_logs for insert with check (
  location_id in (select * from user_location_ids())
);

-- Orders
create policy "orders_select" on vendor_orders for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "orders_all" on vendor_orders for all using (
  location_id in (select * from user_location_ids())
);

-- Order items (via parent order)
create policy "order_items_select" on vendor_order_items for select using (
  order_id in (select id from vendor_orders where location_id in (select * from user_location_ids()))
);

-- Alerts
create policy "alerts_select" on alerts for select using (
  location_id in (select * from user_location_ids())
  or user_role() in ('corporate','admin')
);
create policy "alerts_update" on alerts for update using (
  location_id in (select * from user_location_ids())
);

-- User profiles: users see own profile
create policy "profiles_select" on user_profiles for select using (
  id = auth.uid() or user_role() in ('corporate','admin')
);
create policy "profiles_insert" on user_profiles for insert with check (id = auth.uid());
create policy "profiles_update" on user_profiles for update using (id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- SEED DATA — Phil's Backyard Grill demo location
-- Run AFTER creating your first user via Supabase Auth
-- Replace 'YOUR-USER-UUID' with your actual user ID from Auth > Users
-- ════════════════════════════════════════════════════════════

-- Organization
insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Expert Incubators LLC', 'expert-incubators');

-- Demo location
insert into locations (id, org_id, name, city, state) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 
   'Phil''s Backyard Grill', 'Nowhere', 'FL');

-- Demo inventory items
insert into inventory_items (location_id, name, category, unit, par_level, daily_use, shelf_life, vendor, fifo_risk) values
  ('00000000-0000-0000-0000-000000000002', 'Black Angus Ground Beef (80/20)', 'Protein', 'lbs', 120, 38, 4, 'Sysco', true),
  ('00000000-0000-0000-0000-000000000002', 'Brioche Burger Buns', 'Bakery', 'units', 600, 180, 3, 'Sysco', true),
  ('00000000-0000-0000-0000-000000000002', 'Atlantic Salmon Filets', 'Protein', 'lbs', 60, 12, 3, 'US Foods', false),
  ('00000000-0000-0000-0000-000000000002', 'Sharp Cheddar (Sliced)', 'Dairy', 'lbs', 80, 14, 14, 'Sysco', false),
  ('00000000-0000-0000-0000-000000000002', 'Applewood Smoked Bacon', 'Protein', 'lbs', 90, 16, 10, 'Sysco', false),
  ('00000000-0000-0000-0000-000000000002', 'Russet Potatoes (Fry Cut)', 'Produce', 'lbs', 300, 48, 7, 'US Foods', false),
  ('00000000-0000-0000-0000-000000000002', 'Romaine Lettuce', 'Produce', 'heads', 60, 8, 5, 'US Foods', true),
  ('00000000-0000-0000-0000-000000000002', 'Avocado (Fresh)', 'Produce', 'each', 80, 18, 3, 'US Foods', true),
  ('00000000-0000-0000-0000-000000000002', 'Sweet Potato (Fry Cut)', 'Produce', 'lbs', 200, 22, 6, 'Sysco', false);

-- Demo kegs
insert into kegs (location_id, name, brewery, style, size_oz, oz_remaining, daily_oz, cost_per_keg, sell_per_pint, rotating) values
  ('00000000-0000-0000-0000-000000000002', 'Jai Alai IPA', 'Cigar City Brewing', 'IPA', 1984, 310, 248, 185, 7.50, true),
  ('00000000-0000-0000-0000-000000000002', 'Free Dive IPA', 'Coppertail Brewing', 'Hazy IPA', 1984, 820, 180, 172, 7.50, true),
  ('00000000-0000-0000-0000-000000000002', 'The Magistrate Stout', 'Angry Chair Brewing', 'Imperial Stout', 661, 480, 55, 95, 8.00, true),
  ('00000000-0000-0000-0000-000000000002', 'Bud Light', 'Anheuser-Busch', 'Domestic Lager', 1984, 960, 310, 128, 5.00, false),
  ('00000000-0000-0000-0000-000000000002', 'Miller Lite', 'Molson Coors', 'Domestic Lager', 1984, 1450, 220, 122, 5.00, false),
  ('00000000-0000-0000-0000-000000000002', 'Corona Extra', 'Constellation', 'Mexican Lager', 992, 720, 124, 110, 6.00, false);

-- USER SETUP (run this after creating user in Supabase Auth > Users):
-- insert into user_profiles (id, org_id, role, full_name) values
--   ('YOUR-USER-UUID', '00000000-0000-0000-0000-000000000001', 'admin', 'Phil Siefke');
-- insert into user_locations (user_id, location_id) values
--   ('YOUR-USER-UUID', '00000000-0000-0000-0000-000000000002');

