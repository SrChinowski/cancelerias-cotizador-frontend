-- Helper: rol del usuario autenticado actual, leído de perfiles.
create or replace function rol_actual()
returns rol_usuario
language sql stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid();
$$;

-- Habilitar RLS en todas las tablas (sin esto, con RLS de Supabase, cualquier
-- tabla sin policies queda bloqueada por default para roles no-admin de la API,
-- así que esto es obligatorio antes de que el front pueda leer nada).
alter table categorias enable row level security;
alter table series enable row level security;
alter table series_constantes enable row level security;
alter table aluminio_perfiles enable row level security;
alter table aluminio_precios_acabado enable row level security;
alter table componentes_corte enable row level security;
alter table servicios enable row level security;
alter table factores_base enable row level security;
alter table esquemas_pago enable row level security;
alter table herrajes_catalogo enable row level security;
alter table herrajes_por_serie enable row level security;
alter table sustituciones_herraje enable row level security;
alter table cristales_catalogo enable row level security;
alter table persianas_catalogo enable row level security;
alter table ajustes_empresa enable row level security;
alter table asesores enable row level security;
alter table catalogos_sat enable row level security;
alter table sepomex_catalogo enable row level security;
alter table perfiles enable row level security;
alter table cotizaciones enable row level security;
alter table partidas enable row level security;

-- ============================================================
-- CATÁLOGOS MAESTROS
-- Baseline: cualquier staff autenticado puede leer, solo admin escribe.
-- TODO (decisión #6, pendiente de afinar): evaluar si 'construccion'
-- necesita escribir directo en componentes_corte / herrajes_por_serie
-- (el rol "ingeniero" del doc original), en vez de pasar todo por admin.
-- ============================================================

create policy categorias_select on categorias for select to authenticated using (true);
create policy categorias_write_admin on categorias for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy series_select on series for select to authenticated using (true);
create policy series_write_admin on series for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy series_constantes_select on series_constantes for select to authenticated using (true);
create policy series_constantes_write_admin on series_constantes for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy aluminio_perfiles_select on aluminio_perfiles for select to authenticated using (true);
create policy aluminio_perfiles_write_admin on aluminio_perfiles for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy aluminio_precios_acabado_select on aluminio_precios_acabado for select to authenticated using (true);
create policy aluminio_precios_acabado_write_admin on aluminio_precios_acabado for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy componentes_corte_select on componentes_corte for select to authenticated using (true);
create policy componentes_corte_write_admin on componentes_corte for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy servicios_select on servicios for select to authenticated using (true);
create policy servicios_write_admin on servicios for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy factores_base_select on factores_base for select to authenticated using (true);
create policy factores_base_write_admin on factores_base for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy esquemas_pago_select on esquemas_pago for select to authenticated using (true);
create policy esquemas_pago_write_admin on esquemas_pago for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy herrajes_catalogo_select on herrajes_catalogo for select to authenticated using (true);
create policy herrajes_catalogo_write_admin on herrajes_catalogo for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy herrajes_por_serie_select on herrajes_por_serie for select to authenticated using (true);
create policy herrajes_por_serie_write_admin on herrajes_por_serie for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy sustituciones_herraje_select on sustituciones_herraje for select to authenticated using (true);
create policy sustituciones_herraje_write_admin on sustituciones_herraje for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy cristales_catalogo_select on cristales_catalogo for select to authenticated using (true);
create policy cristales_catalogo_write_admin on cristales_catalogo for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy persianas_catalogo_select on persianas_catalogo for select to authenticated using (true);
create policy persianas_catalogo_write_admin on persianas_catalogo for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy ajustes_empresa_select on ajustes_empresa for select to authenticated using (true);
create policy ajustes_empresa_write_admin on ajustes_empresa for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy asesores_select on asesores for select to authenticated using (true);
create policy asesores_write_admin on asesores for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

create policy catalogos_sat_select on catalogos_sat for select to authenticated using (true);
create policy catalogos_sat_write_admin on catalogos_sat for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

-- SEPOMEX: solo lectura, se siembra vía service_role (no hay policy de escritura a propósito)
create policy sepomex_select on sepomex_catalogo for select to authenticated using (true);

-- ============================================================
-- PERFILES: cada quien ve el suyo, admin ve/edita todos
-- ============================================================

create policy perfiles_select_propio on perfiles
  for select to authenticated using (auth.uid() = id or rol_actual() = 'admin');

create policy perfiles_write_admin on perfiles
  for all to authenticated using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

-- ============================================================
-- COTIZACIONES Y PARTIDAS
-- Ventas y Admin: CRUD completo. Construcción: solo lectura (para taller).
-- ============================================================

create policy cotizaciones_select on cotizaciones for select to authenticated using (true);
create policy cotizaciones_write_ventas_admin on cotizaciones
  for all to authenticated
  using (rol_actual() in ('ventas', 'admin'))
  with check (rol_actual() in ('ventas', 'admin'));

create policy partidas_select on partidas for select to authenticated using (true);
create policy partidas_write_ventas_admin on partidas
  for all to authenticated
  using (rol_actual() in ('ventas', 'admin'))
  with check (rol_actual() in ('ventas', 'admin'));
