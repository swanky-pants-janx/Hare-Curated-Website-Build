-- ============================================================
-- Hare Curated — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── BLOGS ────────────────────────────────────────────────────────────────────

create table if not exists blogs (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text unique not null,
  excerpt        text,
  body           text,
  cover_image_url text,
  published      boolean default false,
  published_at   timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table blogs enable row level security;

create policy "public: read published blogs"
  on blogs for select
  using (published = true);

create policy "admin: full access blogs"
  on blogs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── PRODUCTS ─────────────────────────────────────────────────────────────────

create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  price_from      numeric(10,2),
  category        text,
  cover_image_url text,
  visible         boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table products enable row level security;

create policy "public: read visible products"
  on products for select
  using (visible = true);

create policy "admin: full access products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── BANNERS ──────────────────────────────────────────────────────────────────

create table if not exists banners (
  id           uuid primary key default gen_random_uuid(),
  text         text,
  button_label text,
  button_url   text,
  image_url    text,
  active       boolean default false,
  sort_order   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table banners enable row level security;

create policy "public: read active banners"
  on banners for select
  using (active = true);

create policy "admin: full access banners"
  on banners for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── PITCH DECKS ──────────────────────────────────────────────────────────────

create table if not exists pitch_decks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  pdf_url    text not null,
  created_at timestamptz default now()
);

alter table pitch_decks enable row level security;

create policy "admin: full access pitch_decks"
  on pitch_decks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── PITCH DECK RULES ─────────────────────────────────────────────────────────
-- Maps a set of questionnaire answer conditions (JSON) to a pitch deck.

create table if not exists pitch_deck_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  conditions    jsonb not null default '{}',
  pitch_deck_id uuid references pitch_decks(id) on delete cascade,
  created_at    timestamptz default now()
);

alter table pitch_deck_rules enable row level security;

create policy "admin: full access pitch_deck_rules"
  on pitch_deck_rules for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── QUOTE SETTINGS ───────────────────────────────────────────────────────────
-- Single-row config table for the Get a Quote wizard.
-- id is always 1 (upserted by the admin).

create table if not exists quote_settings (
  id           int primary key default 1,
  event_types  jsonb not null default '[]',
  guests       jsonb not null default '{}',
  budget       jsonb not null default '{}',
  updated_at   timestamptz default now()
);

alter table quote_settings enable row level security;

-- Public visitors may read settings (to populate the wizard).
create policy "public: read quote settings"
  on quote_settings for select
  using (true);

-- Only admin may write settings.
create policy "admin: full access quote settings"
  on quote_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ── QUOTE INQUIRIES ──────────────────────────────────────────────────────────

create table if not exists quote_inquiries (
  id             uuid primary key default gen_random_uuid(),
  visitor_email  text not null,
  visitor_name   text,
  responses      jsonb not null default '{}',
  pitch_deck_url text,
  created_at     timestamptz default now()
);

alter table quote_inquiries enable row level security;

-- Anyone can submit an inquiry (no auth required for INSERT).
create policy "public: insert inquiries"
  on quote_inquiries for insert
  with check (true);

-- Only admin can read inquiries.
create policy "admin: read inquiries"
  on quote_inquiries for select
  using (auth.role() = 'authenticated');


-- ── STORAGE BUCKETS ──────────────────────────────────────────────────────────
-- Run these separately in the Supabase Dashboard → Storage → New Bucket,
-- OR run via the SQL editor using the storage schema.

-- Blog cover images (public read)
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict do nothing;

-- Product cover images (public read)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

-- Banner images (public read)
insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict do nothing;

-- Pitch deck PDFs (public read so visitors can open them)
insert into storage.buckets (id, name, public)
values ('pitch-decks', 'pitch-decks', true)
on conflict do nothing;


-- Storage policies: authenticated users can upload; public can read.

create policy "admin: upload blog images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images');

create policy "public: read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

create policy "admin: upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "public: read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "admin: upload banner images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'banner-images');

create policy "public: read banner images"
  on storage.objects for select
  using (bucket_id = 'banner-images');

create policy "admin: upload pitch decks"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pitch-decks');

create policy "public: read pitch decks"
  on storage.objects for select
  using (bucket_id = 'pitch-decks');

create policy "admin: delete storage objects"
  on storage.objects for delete
  to authenticated
  using (true);
