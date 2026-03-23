create table if not exists public.stock_items (
  id text primary key,
  name text not null,
  category text not null,
  spec text not null default '',
  unit text not null,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  location text not null default '',
  is_hazardous boolean not null default false,
  hazard_type text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id text primary key,
  item_id text not null,
  item_name text not null,
  type text not null,
  quantity numeric not null default 0,
  unit text not null,
  operator_name text not null default '',
  date text not null,
  remark text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_usage_records (
  id text primary key,
  device_name text not null,
  user_name text not null,
  purpose text not null,
  start_time text not null,
  end_time text not null,
  status text not null,
  remark text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.instrument_usage_records (
  id text primary key,
  instrument_name text not null,
  user_name text not null,
  project text not null,
  date text not null,
  duration text not null,
  remark text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reagent_usage_records (
  id text primary key,
  reagent_name text not null,
  amount numeric not null default 0,
  unit text not null,
  user_name text not null,
  date text not null,
  purpose text not null,
  is_hazardous boolean not null default false,
  hazard_type text not null default '',
  remark text not null default '',
  created_at timestamptz not null default now()
);
