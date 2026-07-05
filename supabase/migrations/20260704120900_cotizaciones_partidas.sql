create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid references asesores(id),
  creado_por uuid references perfiles(id),

  -- datos de cliente: nullable hasta el cierre (cotización rápida no los requiere)
  cliente_nombre text,
  cliente_telefono text,
  cliente_correo text,
  cliente_direccion text,
  cliente_cp text,
  cliente_estado text,
  cliente_colonia text,
  cliente_rfc text,
  regimen_fiscal text,
  uso_cfdi text,

  descuento_tipo text check (descuento_tipo in ('%','$')),
  descuento_valor numeric default 0,
  iva numeric default 16,
  esquema_pago_id uuid references esquemas_pago(id),
  factores_base_override jsonb, -- override puntual, no toca el default global

  -- status='won' es el punto de no retorno: congela costo_snapshot de todas
  -- las partidas y habilita la Orden de Taller. draft/sent = editable.
  status cotizacion_status not null default 'draft',
  confirmada_en timestamptz,
  confirmada_por uuid references perfiles(id),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table partidas (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones(id) on delete cascade,
  categoria_id uuid not null references categorias(id),
  serie_id uuid not null references series(id),

  color_acabado text not null,
  cristal_id uuid references cristales_catalogo(id),
  persiana_id uuid references persianas_catalogo(id),

  medidas jsonb not null, -- {L1, L2, L3, alto}
  mosquitero mosquitero_enum not null default 'No',
  sistema_fijo_medidas jsonb,
  servicios_activos jsonb default '[]',
  cantidad_piezas int not null default 1,

  costo_snapshot jsonb not null, -- recalculable mientras la cotización no esté confirmada
  precios_calculados_en timestamptz not null default now(), -- freshness del snapshot
  orden int default 0,
  created_at timestamptz default now()
);
