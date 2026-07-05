create table aluminio_perfiles (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  longitud_tramo numeric not null, -- metros
  origen origen_enum not null
);

-- Normalizado por fila (no columnas costo_natural/costo_negro/...) para que
-- agregar un acabado nuevo sea un INSERT, no un ALTER TABLE.
create table aluminio_precios_acabado (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references aluminio_perfiles(id) on delete cascade,
  acabado acabado_enum not null,
  costo_proveedor numeric not null default 0,
  unique (perfil_id, acabado)
);
