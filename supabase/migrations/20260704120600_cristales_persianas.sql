create table cristales_catalogo (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  costo_hoja numeric not null,
  alto numeric not null,
  largo numeric not null,
  area numeric generated always as (alto * largo) stored, -- derivado, nunca editable directo
  espesor_mm numeric not null default 6,
  peso_kg_m2 numeric not null -- explícito por fila, no fórmula global de densidad
);

create table persianas_catalogo (
  id uuid primary key default gen_random_uuid(),
  familia text not null,
  modelo text not null,
  costo_m2 numeric not null,
  ancho_maximo numeric not null -- validación de UI (advertir, no bloquear), no constraint de DB
);
