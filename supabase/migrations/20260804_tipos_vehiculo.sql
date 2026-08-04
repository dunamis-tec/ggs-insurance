-- Catalog of vehicle types per tenant (1.8)
create table if not exists tipos_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references configuracion_empresa(id) on delete cascade,
  nombre      text not null,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table tipos_vehiculo enable row level security;

create policy "tenant_isolation" on tipos_vehiculo
  using (empresa_id = (select id from configuracion_empresa limit 1))
  with check (empresa_id = (select id from configuracion_empresa limit 1));
