create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique -- Aluminio, Cristal Templado, Persianas, Barandales
);

create table series (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id),
  nombre text not null,
  serie_fijo_id uuid references series(id),        -- serie "Fijo" asociada (self-ref)
  serie_mosquitero_id uuid references series(id),  -- serie "Mosquitero" asociada (self-ref)
  tramos_soportados int not null default 1,        -- reemplaza el match por nombre "2 Pulgadas"/"3 Pulgadas"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EAV: constantes de corte por serie. No son columnas fijas porque distintas
-- categorías (Barandales a futuro, por ejemplo) pueden necesitar constantes
-- que hoy ni existen. Agregar una nueva es un INSERT, no una migración.
create table series_constantes (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  clave text not null, -- 'zoclo_alto', 'zoclo_cabezal', 'poste', 'traslape', 'intermedio', 'descuento_fijo', 'descuento_zoclo', ...
  valor numeric not null default 0,
  unique (serie_id, clave)
);
