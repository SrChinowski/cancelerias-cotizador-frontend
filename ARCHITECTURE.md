# Arquitectura — Cancelerías Cotizador

## Stack

- **Frontend**: Next.js, `output: 'export'` (estático puro — no hay servidor Node en producción, se despliega en cPanel como HTML/JS/CSS).
- **UI**: shadcn/ui sobre Base UI (no Radix — Base UI es el default recomendado para proyectos nuevos), preset Nova.
- **Backend/datos**: Supabase (Postgres + Auth + RLS). No hay API propia — el cliente le pega directo a Supabase vía `supabase-js`, con RLS como única capa de seguridad real (no hay secretos de servidor que proteger, todo corre en el navegador).
- **Motor de costeo**: TypeScript puro en `/lib/costeo`, sin dependencias de UI ni de red — recibe datos ya fetcheados y regresa números. Corre 100% en el cliente.
- **Testing**: Vitest para el motor de costeo. Cualquier cambio a `operaciones.ts`/`cantidadRegla.ts` debe traer su test contra un caso real documentado en `DATA_MODEL.md`.

## Por qué export estático (implicaciones que no son obvias)

- No existen API routes ni middleware de Next — todo lo que en otro proyecto sería "backend" vive en RLS de Postgres o en funciones puras de TypeScript que corren en el navegador.
- Las env vars `NEXT_PUBLIC_*` se hornean en el bundle en build time — son públicas por diseño, la seguridad real está en las políticas RLS, no en ocultar la key.
- El PDF de la cotización final se genera 100% en cliente (librería tipo `@react-pdf/renderer`), no hay servicio de generación server-side.
- Sin servidor propio, `secret`/`service_role` key de Supabase nunca se usa en este proyecto salvo en scripts de seed/migración que corren fuera del navegador (CLI local, nunca en el bundle).

## Estructura de carpetas

```
/app                    — rutas de Next
/components             — componentes UI (shadcn/ui + custom)
/lib
  /supabase             — cliente supabase-js, tipos generados
  /costeo               — motor de costeo, funciones puras, con __tests__
/supabase
  /migrations            — schema, solo-agregar, nunca se edita una ya corrida
  seed.sql               — catálogos reales sembrados
  seed-pendientes.md     — todo lo que sigue sin resolver del seed
```

## Flujo de datos de una cotización

1. **Configurador**: el asesor elige serie/categoría → fetch de `componentes_corte` + `series_constantes` + `herrajes_por_serie` de esa serie (5-15 filas, no el catálogo completo).
2. **Cálculo en memoria**: cada cambio de medida corre el motor de costeo local, sin roundtrip a la DB — así se logra la sensación de "cotización rápida" fluida.
3. **Partida al carrito**: el resultado del motor se congela como `costo_snapshot` (jsonb) en la fila de `partidas`. Congelado *suave* mientras la cotización esté en `draft`/`sent` (se puede refrescar contra catálogos actuales), congelado *duro* e inmutable (por trigger de DB) al pasar a `won`.
4. **Orden de Taller**: vista derivada de `costo_snapshot` + `componentes_corte`/`herrajes_por_serie` — nunca recalcula sobre una partida confirmada.

## Motor de costeo — resumen (detalle completo en DATA_MODEL.md sec. 3)

Reemplaza el `eval()`/`new Function()` del HTML original con reglas JSON estructuradas:

- `descuento_regla`: secuencia de `operaciones` (`restar_valor`, `sumar_valor`, `restar_constante`, `dividir_entre`) aplicadas sobre la medida base.
- `cantidad_regla`: 4 variantes (`fija`, `por_tramo`, `por_intermedios`, `formula` con `redondeo` explícito).
- Aluminio: precio por corte = (costo_proveedor × factor_base) ÷ longitud_tramo × corte_real.
- Cristal: dos cortes 1D (Largo + Alto de la misma hoja) se emparejan en área real, precio = área × (costo_hoja ÷ área_catálogo).
- Herrajes: `formula_cantidad` (mismo vocabulario) × costo del catálogo o precio manual.

⚠️ Supuesto pendiente de confirmar con negocio: Herrajes no tiene `factor_base` propio (el panel "Factores Base" del HTML original solo cubre Aluminio/Cristal/Persianas) — el motor asume que `costo_proveedor` de herrajes ya es precio final.

## Roles y RLS (baseline, sujeto a afinar)

`admin` | `ventas` | `construccion`. Baseline actual: catálogos de solo-lectura para cualquier staff autenticado, escritura solo admin; `cotizaciones`/`partidas` editables por ventas+admin, solo-lectura para construcción. Ver `DATA_MODEL.md` sec. "Decisiones de negocio" punto 6 — el detalle fino de accesos cruzados sigue abierto.

## Convenciones de código

- Tablas: snake_case plural. PKs: `uuid default gen_random_uuid()`.
- Todo cambio de schema es una migración nueva, nunca un `ALTER` a mano fuera de `supabase/migrations/`.
- El motor de costeo no importa nada de Supabase ni de React — recibe datos ya resueltos, regresa números. Esto es a propósito: se puede testear sin mockear una base de datos.
