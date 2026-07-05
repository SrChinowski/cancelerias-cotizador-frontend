create table servicios (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id),
  concepto text not null,
  tipo_cobro tipo_cobro_enum not null,
  cantidad_base numeric not null default 1,
  costo_unitario numeric not null default 0
);

-- Fila fija por tipo (no un catálogo abierto): el multiplicador costo->precio
create table factores_base (
  tipo factor_tipo_enum primary key,
  valor numeric not null,
  updated_at timestamptz default now()
);

create table esquemas_pago (
  id uuid primary key default gen_random_uuid(),
  plazo text not null,
  tasa numeric not null -- % cargo financiero
);
