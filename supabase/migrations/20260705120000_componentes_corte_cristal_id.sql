-- Corrección de arquitectura: no todo componente de corte es de aluminio.
-- Los datos reales mostraron piezas de cristal (ej. "Cristal templado 6mm")
-- que también necesitan medida_base + descuento_regla, pero su costo sale
-- de cristales_catalogo, no de aluminio_perfiles. Mismo patrón que
-- partidas.cristal_id/persiana_id: referencia opcional, mutuamente
-- excluyente con perfil_aluminio_id.
alter table componentes_corte
  add column cristal_id uuid references cristales_catalogo(id);
