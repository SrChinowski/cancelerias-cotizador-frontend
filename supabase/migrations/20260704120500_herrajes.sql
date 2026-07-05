create table herrajes_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  origen origen_enum not null,
  costo_proveedor numeric not null default 0,
  unidad_venta unidad_venta_enum not null -- explícito, ya no se infiere del nombre
);

create table herrajes_por_serie (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  herraje_id uuid references herrajes_catalogo(id), -- null si es precio manual
  nombre_manual text,
  precio_manual numeric,
  formula_cantidad jsonb not null
);

-- Puramente de presentación: el motor de costeo NUNCA consulta esta tabla.
-- El precio del servicio sustituto ya absorbe el costo base del herraje
-- que reemplaza (confirmado con negocio). Solo la afecta cómo se ve
-- el nombre en la Orden de Taller.
create table sustituciones_herraje (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id),
  herraje_original_id uuid not null references herrajes_catalogo(id),
  texto_sustituto text not null
);
