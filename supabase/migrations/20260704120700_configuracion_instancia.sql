create table ajustes_empresa (
  id int primary key default 1 check (id = 1), -- fuerza fila única
  encabezado text,
  politicas text,
  tiempo_entrega text,
  notas_facturacion text,
  datos_bancarios text
);

create table asesores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  correo text
);

create table catalogos_sat (
  id uuid primary key default gen_random_uuid(),
  tipo sat_tipo_enum not null,
  clave text not null,
  descripcion text not null
);

-- Reemplaza la dependencia de zippopotam.us. Seed único desde el CSV
-- oficial de Correos de México (~150k filas), no se mantiene a mano.
create table sepomex_catalogo (
  id uuid primary key default gen_random_uuid(),
  cp text not null,
  colonia text not null,
  municipio text not null,
  estado text not null,
  ciudad text
);

create index idx_sepomex_cp on sepomex_catalogo(cp);
