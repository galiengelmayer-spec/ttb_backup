create table requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  time_slot text not null,
  note text,
  created_at timestamptz not null default now()
);

create index requests_date_idx on requests(date);
create index requests_client_id_idx on requests(client_id);
