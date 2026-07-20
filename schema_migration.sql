-- =========================================================================
-- DATABASE NORMALIZATION MIGRATION FOR MISEMAP
-- Paste this script into Supabase Dashboard -> SQL Editor and click RUN
-- =========================================================================

-- 1. Create Raw Materials table (individual ingredients)
create table if not exists raw_materials (
  id text primary key, -- client-side generated UUIDs/strings
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  category text,
  sub_category text,
  food_type text check (food_type in ('Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Eggetarian')),
  buy_unit text default 'kg',
  pack_cost numeric(12, 2) default 0.00,
  pack_qty numeric(12, 4) default 1.0000,
  usage_unit text default 'g',
  conversion numeric(12, 4) default 1000.0000,
  
  -- Nutritional values
  calories numeric(10, 4) default 0.0,
  carbs numeric(10, 4) default 0.0,
  protein numeric(10, 4) default 0.0,
  fats numeric(10, 4) default 0.0,
  fiber numeric(10, 4) default 0.0,
  sugar numeric(10, 4) default 0.0,
  caffeine numeric(10, 4) default 0.0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for raw_materials
alter table raw_materials enable row level security;

create policy "Users can read raw materials in their org" on raw_materials
  for select using (org_id = (select org_id from profiles where id = auth.uid()));

create policy "Users can manage raw materials in their org" on raw_materials
  for all using (org_id = (select org_id from profiles where id = auth.uid()));


-- 2. Create Intermediates table (preps, sauces, stocks)
create table if not exists intermediates (
  id text primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  category text,
  yield_qty numeric(12, 4) default 1.0000,
  yield_unit text default 'g',
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for intermediates
alter table intermediates enable row level security;

create policy "Users can read intermediates in their org" on intermediates
  for select using (org_id = (select org_id from profiles where id = auth.uid()));

create policy "Users can manage intermediates in their org" on intermediates
  for all using (org_id = (select org_id from profiles where id = auth.uid()));


-- 3. Create Menu Items table
create table if not exists menu_items (
  id text primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  category text,
  sub_category text,
  food_type text check (food_type in ('Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Eggetarian')),
  
  -- Pricing configuration overrides (nullable, falls back to global default)
  sp_multiplier_override numeric(5, 2),
  packaging_cost_override numeric(10, 2),
  delivery_markup_override numeric(5, 2),
  
  selling_price_override numeric(10, 2),
  takeaway_price_override numeric(10, 2),
  delivery_price_override numeric(10, 2),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for menu_items
alter table menu_items enable row level security;

create policy "Users can read menu items in their org" on menu_items
  for select using (org_id = (select org_id from profiles where id = auth.uid()));

create policy "Users can manage menu items in their org" on menu_items
  for all using (org_id = (select org_id from profiles where id = auth.uid()));


-- 4. Create Ingredient Mapping table for Intermediates (relational recipe map)
create table if not exists intermediate_ingredients (
  id uuid primary key default gen_random_uuid(),
  intermediate_id text references intermediates(id) on delete cascade not null,
  ingredient_id text not null, -- can link to raw_material or another intermediate
  ingredient_type text check (ingredient_type in ('raw', 'intermediate')),
  qty numeric(12, 4) default 0.0000,
  unit text default 'g'
);

-- Enable RLS for intermediate_ingredients
alter table intermediate_ingredients enable row level security;

create policy "Users can read intermediate ingredients in their org" on intermediate_ingredients
  for select using (
    intermediate_id in (select id from intermediates where org_id = (select org_id from profiles where id = auth.uid()))
  );

create policy "Users can manage intermediate ingredients in their org" on intermediate_ingredients
  for all using (
    intermediate_id in (select id from intermediates where org_id = (select org_id from profiles where id = auth.uid()))
  );


-- 5. Create Ingredient Mapping table for Menu Items (relational recipe map)
create table if not exists menu_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_item_id text references menu_items(id) on delete cascade not null,
  ingredient_id text not null, -- can link to raw_material or intermediate
  ingredient_type text check (ingredient_type in ('raw', 'intermediate')),
  qty numeric(12, 4) default 0.0000,
  unit text default 'g'
);

-- Enable RLS for menu_item_ingredients
alter table menu_item_ingredients enable row level security;

create policy "Users can read menu item ingredients in their org" on menu_item_ingredients
  for select using (
    menu_item_id in (select id from menu_items where org_id = (select org_id from profiles where id = auth.uid()))
  );

create policy "Users can manage menu item ingredients in their org" on menu_item_ingredients
  for all using (
    menu_item_id in (select id from menu_items where org_id = (select org_id from profiles where id = auth.uid()))
  );
