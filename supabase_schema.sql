-- =============================================
-- かき氷屋 予約システム - Supabase スキーマ
-- Supabase ダッシュボード > SQL Editor で実行
-- =============================================

-- 予約テーブル
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text unique not null,
  date date not null,
  time text not null,
  slot_type integer not null check (slot_type in (2, 4)),
  name text not null,
  email text,
  cancelled boolean default false,
  created_at timestamptz default now()
);

-- 枠設定テーブル
create table if not exists slot_settings (
  id uuid primary key default gen_random_uuid(),
  time text not null,
  slot_type integer not null check (slot_type in (2, 4)),
  capacity integer not null default 2 check (capacity >= 0 and capacity <= 10),
  unique(time, slot_type)
);

-- デフォルトの枠設定を挿入
insert into slot_settings (time, slot_type, capacity)
select t.time, s.slot_type, 2
from (values
  ('10:00'),('10:30'),('11:00'),('11:30'),('12:00'),('12:30'),('13:00'),
  ('13:30'),('14:00'),('14:30'),('15:00'),('15:30'),('16:00'),('16:30')
) as t(time)
cross join (values (2),(4)) as s(slot_type)
on conflict (time, slot_type) do nothing;

-- RLS (Row Level Security) の設定
alter table reservations enable row level security;
alter table slot_settings enable row level security;

-- 匿名ユーザーも予約・キャンセルできるようにポリシーを設定
create policy "reservations_select" on reservations for select using (true);
create policy "reservations_insert" on reservations for insert with check (true);
create policy "reservations_update" on reservations for update using (true);

create policy "slot_settings_select" on slot_settings for select using (true);
create policy "slot_settings_update" on slot_settings for update using (true);
