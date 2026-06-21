create table purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  lessons_count int not null default 10,
  paid boolean not null default true,
  purchased_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index purchases_client_id_idx on purchases(client_id);
