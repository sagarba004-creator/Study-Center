-- Study Center Management Schema
-- Run this in your Supabase SQL Editor

-- Enable RLS
create extension if not exists "uuid-ossp";

-- Seats table
create table if not exists seats (
  id uuid primary key default uuid_generate_v4(),
  block integer not null check (block in (1, 2)),
  seat_number integer not null,
  unique(block, seat_number)
);

-- Students table
create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  exam text not null,
  insider_outsider text not null check (insider_outsider in ('insider', 'outsider')),
  address text not null,
  college text not null,
  duration_months integer not null,
  payment_date date not null,
  amount numeric(10,2) not null,
  account text not null,
  joining_date date not null,
  due_date date not null,
  block integer not null check (block in (1, 2)),
  seat_number integer not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (block, seat_number) references seats(block, seat_number)
);

-- Indexes
create index if not exists idx_students_block_seat on students(block, seat_number);
create index if not exists idx_students_due_date on students(due_date);
create index if not exists idx_students_is_active on students(is_active);
create index if not exists idx_students_payment_date on students(payment_date);

-- Insert all Block 1 seats
insert into seats (block, seat_number) values
-- Outer ring (rows 38/top)
(1,20),(1,21),(1,22),(1,23),(1,24),(1,25),(1,26),(1,27),(1,28),(1,29),(1,30),(1,31),(1,32),(1,33),(1,34),(1,35),(1,36),(1,37),(1,38),
-- Right column
(1,17),(1,18),(1,19),
-- Left column outer
(1,39),(1,40),(1,41),(1,42),(1,43),(1,44),(1,45),(1,46),(1,47),(1,48),(1,49),(1,50),(1,51),(1,52),(1,53),(1,54),
-- Bottom row
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),(1,16),
-- Inner rows - row 41/42
(1,140),(1,141),(1,142),(1,143),(1,144),(1,145),(1,146),(1,147),(1,148),(1,149),(1,150),(1,151),
(1,152),(1,153),(1,154),(1,155),(1,156),(1,157),
(1,139),(1,138),(1,137),(1,136),(1,135),(1,134),(1,133),(1,132),(1,131),(1,130),(1,129),(1,128),
(1,127),(1,126),(1,125),(1,124),(1,123),(1,122),
-- Inner rows - row 45/46
(1,104),(1,105),(1,106),(1,107),(1,108),(1,109),(1,110),(1,111),(1,112),(1,113),(1,114),(1,115),
(1,116),(1,117),(1,118),(1,119),(1,120),(1,121),
(1,103),(1,102),(1,101),(1,100),(1,99),(1,98),(1,97),(1,96),(1,95),(1,94),(1,93),(1,92),
(1,91),(1,90),(1,89),(1,88),(1,87),(1,86),
-- Inner rows - row 49/50
(1,70),(1,71),(1,72),(1,73),(1,74),(1,75),(1,76),(1,77),(1,78),(1,79),(1,80),(1,81),
(1,82),(1,83),(1,84),(1,85),
(1,69),(1,68),(1,67),(1,66),(1,65),(1,64),(1,63),(1,62),(1,61),(1,60),(1,59),(1,58),
(1,57),(1,56),(1,55)
on conflict (block, seat_number) do nothing;

-- Insert all Block 2 seats
insert into seats (block, seat_number) values
-- Top row
(2,1),(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(2,11),
-- Inner rows
(2,12),(2,13),(2,14),(2,15),(2,16),(2,17),(2,18),(2,19),(2,20),(2,21),(2,22),(2,23),(2,24),
(2,37),(2,36),(2,35),(2,34),(2,33),(2,32),(2,31),(2,30),(2,29),(2,28),(2,27),(2,26),(2,25),
(2,38),(2,39),(2,40),(2,41),(2,42),(2,43),(2,44),(2,45),(2,46),(2,47),(2,48),
(2,56),(2,55),(2,54),(2,53),(2,52),(2,51),(2,50),(2,49),
(2,57),(2,58),(2,59),(2,60),(2,61),(2,62),(2,63),(2,64),
-- Right column
(2,65),(2,66),(2,67),(2,68),(2,69),(2,70),(2,71),(2,72),(2,73),(2,74),(2,75),
(2,76),(2,77),(2,78),(2,79),(2,80),(2,81),(2,82),(2,83),(2,84),(2,85),(2,86)
on conflict (block, seat_number) do nothing;

-- RLS Policies
alter table students enable row level security;
alter table seats enable row level security;

-- Allow all authenticated users to read seats
create policy "Seats are viewable by authenticated users"
  on seats for select
  to authenticated
  using (true);

-- Admin role check function
create or replace function is_admin()
returns boolean as $$
begin
  return (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin';
end;
$$ language plpgsql security definer;

-- Students: admins see all, users see limited
create policy "Admins can do everything with students"
  on students for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Users can view student basic info"
  on students for select
  to authenticated
  using (true);

-- Updated at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_students_updated_at
  before update on students
  for each row
  execute function update_updated_at_column();

-- View for aggregates (admin only)
create or replace view student_analytics as
select
  block,
  date_trunc('month', payment_date) as payment_month,
  date_trunc('week', payment_date) as payment_week,
  account,
  count(*) as student_count,
  sum(amount) as total_amount,
  avg(amount) as avg_amount
from students
where is_active = true
group by block, date_trunc('month', payment_date), date_trunc('week', payment_date), account;
