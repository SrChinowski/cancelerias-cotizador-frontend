-- Bill of cuts por serie. Sin eval: la regla de descuento es una secuencia
-- de operaciones estructuradas (ver DATA_MODEL.md sección 3 para ejemplos
-- de traducción de las fórmulas de texto originales).
create table componentes_corte (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  pieza text not null,
  perfil_aluminio_id uuid references aluminio_perfiles(id),
  medida_base medida_base_enum not null,
  cantidad_regla jsonb not null,   -- ej: {"tipo":"fija","valor":2} | {"tipo":"por_tramo","piezas_por_tramo":1}
  descuento_regla jsonb not null,  -- ej: {"operaciones":[{"tipo":"restar_constante","referencia":"zoclo_alto"}]}
  orden int default 0
);
