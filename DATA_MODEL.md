# Data Model — Cancelerías Cotizador (Rebuild)

Este documento traduce las decisiones de `BUSINESS_LOGIC.md` a un schema real de Postgres/Supabase. Vive junto a ese doc como contexto para el diseño de US y para los agentes de desarrollo.

Convenciones: tablas en snake_case plural, PKs `uuid` con `default gen_random_uuid()`, timestamps `created_at`/`updated_at` con `default now()` donde aplique.

---

## 0. Principios heredados del análisis (no negociables)

1. **Serie/Línea es una sola entidad con ID estable.** Nunca se enlaza por nombre de texto entre catálogos.
2. **Un solo motor de costeo/cortes**, consumido por Configurador, Fabricación, Config. Herrajes y Orden de Taller. No hay implementaciones paralelas.
3. **Cero `eval` de fórmulas de texto libre.** Todo descuento/cantidad de corte es una regla estructurada (JSON) evaluada por el motor.
4. **Partidas guardan snapshot congelado** al momento de agregarse al carrito. Orden de Taller nunca recalcula en vivo sobre partidas ya confirmadas.
5. **Persistencia en Postgres real**, no `localStorage`. Export/import JSON se conserva solo como utilidad de migración.

---

## 1. Usuarios y roles

```sql
create type rol_usuario as enum ('admin', 'ventas', 'construccion');

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  correo text,
  rol rol_usuario not null default 'ventas',
  created_at timestamptz default now()
);
```

Matriz de acceso (referencia para RLS, se implementa cuando lleguemos ahí):

| Recurso | Ventas | Construcción | Admin |
|---|---|---|---|
| Cotizaciones/Partidas (crear/editar) | ✅ | ❌ (solo lectura para taller) | ✅ |
| Fabricación, Config. Herrajes, Orden de Taller | ❌ (lectura para dudas, pendiente confirmar) | ✅ | ✅ |
| Catálogos maestros (Aluminio, Cristales, Herrajes, Persianas, Líneas, Servicios, SAT, Ajustes) | ❌ | ❌ | ✅ |

---

## 2. Catálogo raíz: Categorías y Series

```sql
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

create table series_constantes (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  clave text not null,   -- 'zoclo_alto', 'zoclo_cabezal', 'poste', 'traslape', 'intermedio', 'descuento_fijo', 'descuento_zoclo', o lo que invente una categoría futura
  valor numeric not null default 0,
  unique (serie_id, clave)
);
```

**Por qué se separó de `series` (corrección sobre la primera versión de este doc):** `categoria_id`/`nombre`/relaciones/`tramos_soportados` son identidad de la serie — aplica a cualquier categoría. Las constantes de corte son vocabulario específico del dominio de aluminio corredizo, y no hay garantía de que una serie de Barandales o Persianas use ese mismo set de nombres. Con `series_constantes` como EAV (clave-valor, todo numérico), agregar una constante nueva para una categoría futura es un `INSERT`, no una migración — y una serie que no necesite ninguna constante de corte simplemente no tiene filas aquí.

**Nota de cascada (regla de negocio a preservar):** crear una `linea` nueva debe crear automáticamente su `serie` de fabricación vacía asociada — en el modelo unificado esto ya no aplica igual porque Línea y Serie **son la misma fila**. La regla se simplifica: no puede existir una serie sin sus componentes de corte definidos (validación de UI, no de DB).

---

## 3. Fabricación: componentes de corte (bill of cuts)

Aquí es donde se elimina el `eval`. Cada componente define su regla de descuento como una secuencia de operaciones estructuradas sobre la medida base.

```sql
create type medida_base_enum as enum ('Largo', 'Alto');

create table componentes_corte (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  pieza text not null,
  perfil_aluminio_id uuid references aluminio_perfiles(id),
  cristal_id uuid references cristales_catalogo(id), -- mutuamente excluyente con perfil_aluminio_id, ver nota abajo
  medida_base medida_base_enum not null,
  cantidad_regla jsonb not null,   -- ej: {"tipo":"fija","valor":2} | {"tipo":"por_tramo","piezas_por_tramo":1}
  descuento_regla jsonb not null,  -- ver ejemplos abajo
  orden int default 0
);
```

**`cristal_id` (migración `20260705120000_componentes_corte_cristal_id.sql`):** no todo
componente de corte es aluminio — la extracción real mostró piezas como "Cristal
templado 6mm" dentro del bill of cuts de una serie (ej. una hoja de cancel de baño que
lleva su propio cristal como "pieza" cortada). Su costo sale de `cristales_catalogo`, no
de `aluminio_perfiles`. Mismo patrón que `partidas.cristal_id`/`persiana_id`: referencia
opcional, y en la práctica una fila de `componentes_corte` trae **uno u otro, no los
dos** (`perfil_aluminio_id` para piezas de aluminio, `cristal_id` para piezas de
cristal) — no hay constraint de DB forzando la exclusión mutua, es una convención de
datos que respeta el motor de costeo.

**Traducción de fórmulas viejas → reglas estructuradas** (ejemplos reales del doc):

| Fórmula original (`eval`) | Regla estructurada |
|---|---|
| `"16/2"` | `{"operaciones":[{"tipo":"restar_valor","valor":16},{"tipo":"dividir_entre","valor":2}]}` |
| `"ALTO_C/2"` | `{"operaciones":[{"tipo":"dividir_entre","valor":2}]}` |
| `"ALTO_C-M_ZOCLO-M_CABEZAL"` | `{"operaciones":[{"tipo":"restar_constante","referencia":"zoclo_alto"},{"tipo":"restar_constante","referencia":"zoclo_cabezal"}]}` |

El motor toma `medida_base` (Largo/Alto capturado en Configurador), aplica las `operaciones` en orden, y las referencias a constantes (`"referencia":"zoclo_alto"`) se resuelven haciendo lookup en `series_constantes` por `(serie_id, clave)` — nunca contra un valor global (ese era el bug del panel decorativo) ni contra columnas fijas (eso es lo que acabamos de corregir en la sección 2).

**Piezas extra por tramo (L2/L3):** se generan cuando `series.tramos_soportados > 1` y el Configurador capturó L2/L3, usando `cantidad_regla.tipo = "por_tramo"` con descuento fijo de 16cm — ya no por coincidencia de nombre de serie.

**Piezas por intermedios manuales (`cantidad_regla.tipo = "por_intermedios"`):** hallazgo de la extracción del HTML — `INT_FIJO_L`/`INT_FIJO_A`/`INT_CORR_L`/`INT_CORR_A` **no son cálculo derivado, son inputs de texto que el asesor teclea a mano** en el Configurador (columna "Intermedios (Pzas)" junto a L1/Alto, una vez para el sistema Corredizo y otra para el Fijo). Cubre 59 de los 60 componentes que habían quedado excluidos del seed inicial.

```json
{"tipo":"por_intermedios","sistema":"corredizo","eje":"largo1","multiplicador":1}
```

- `sistema`: `"corredizo"` | `"fijo"` — selecciona qué **columna** de la partida consultar: `"corredizo"` lee `partidas.medidas`, `"fijo"` lee `partidas.sistema_fijo_medidas`. (Nota: no es una llave dentro de un objeto anidado — son dos columnas jsonb separadas, tal como se definieron en la sección 9.)
- `eje`: `"largo1"` | `"largo2"` | `"largo3"` | `"alto"` — qué conteo leer dentro de `medidas.intermedios`.
- `multiplicador`: opcional, default 1 (cubre el caso `"2 * INT_CORR_L"` con `multiplicador: 2`).

Motor: `cantidad = (sistema === 'fijo' ? partida.sistema_fijo_medidas : partida.medidas).intermedios[eje] * multiplicador`.

Esto implica ampliar el shape de `medidas`/`sistema_fijo_medidas` (documentado en sección 9) con una llave `intermedios: {largo1, largo2, largo3, alto}` — captura directa de lo que el asesor teclea, sin fórmula de por medio.

✅ **Resuelto — se corrige el comportamiento del original, no se replica.** El HTML nunca lee los intermedios de L2/L3 (`c-l2-int`/`c-l3-int` existen en el DOM pero `getGlobalVars()` no los consulta) — decisión de Carlos: **se habilita la opción para los tres segmentos**, no solo L1. Es un caso poco probable (L2/L3 solo existen en canceles de esquina, y la mayoría de esas paredes secundarias no necesitan refuerzo intermedio), pero el shape lo soporta desde ya — el Configurador solo mostraría el input de intermedio para L2/L3 cuando esas medidas ya estén capturadas, sin obligar a nadie a llenarlo. Los componentes de corte que hoy usan `eje: "largo1"` siguen funcionando idéntico; el resto de la superficie queda lista para cuando (si acaso) aparezca un caso real de L2/L3 con intermedio.

**Constante `intermedio` en `descuento_regla`:** algunos componentes intermedios descuentan además el ancho de la constante `intermedio` de `series_constantes` (ej. `"ALTO_C-M_ZOCLO-M_INTERMEDIO"` → `restar_constante(zoclo_alto)` + `restar_constante(intermedio)`), exactamente el mismo mecanismo ya usado para `zoclo_alto`/`zoclo_cabezal`/`poste` — `intermedio` ya estaba contemplada en el diseño original de `series_constantes`, solo no se había usado todavía en ningún `descuento_regla` real.

**Piezas por fórmula real (`cantidad_regla.tipo = "formula"`):** a diferencia de `"por_intermedios"` (conteo manual), algunos componentes sí necesitan una cuenta calculada — ej. "Duela lisa 5 Pulgadas" (Puerta 3 Pulgadas, ubicación "Duela Alta"): cuántas duelas de 12cm caben en el alto disponible.

```json
{
  "tipo": "formula",
  "redondeo": "arriba",
  "operaciones": [
    {"tipo": "restar_constante", "referencia": "zoclo_alto"},
    {"tipo": "restar_constante", "referencia": "zoclo_cabezal"},
    {"tipo": "sumar_valor", "valor": 1.8},
    {"tipo": "dividir_entre", "valor": 12}
  ]
}
```

Reutiliza el mismo motor de `operaciones` de `descuento_regla` (incluye el operador nuevo `sumar_valor`, antes inexistente porque ningún `descuento_regla` real lo necesitaba) aplicado sobre `medida_base`, con un resultado que se redondea según `redondeo` (`"arriba"` es el default confirmado por Carlos — pendiente de validar con su papá a futuro, pero ya autorizado para producción). El `descuento_regla` de este mismo componente (`"alto/2"`) no necesitó ningún cambio — ya calzaba con el patrón `dividir_entre` existente; el "12cm" de la fórmula original es el divisor de la cuenta de piezas, no el descuento de corte.

---

## 4. Aluminio

```sql
create type origen_enum as enum ('Nacional', 'Español');
create type acabado_enum as enum ('Natural', 'Negro', 'Blanco', 'Madera', 'Gris', 'Satín', 'Cromo', 'Oro');

create table aluminio_perfiles (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  longitud_tramo numeric not null, -- metros
  origen origen_enum not null
);

create table aluminio_precios_acabado (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references aluminio_perfiles(id) on delete cascade,
  acabado acabado_enum not null,
  costo_proveedor numeric not null default 0,
  unique (perfil_id, acabado)
);
```

✅ **Resuelto (confirmado):** se amplía a los 8 acabados, cada uno con costo propio — nada de que Gris/Satín/Cromo/Oro hereden el precio de otro acabado por default. Por eso el modelo cambió de columnas fijas a `aluminio_precios_acabado`: agregar un acabado nuevo mañana es un `INSERT` al enum + filas, no una migración de columnas. Bonus: esto también simplifica el "Aumento Global" del punto 5 — con columnas hubiera sido un `UPDATE` feo tocando 8 campos a la vez; con filas es exactamente el mismo `UPDATE costo_proveedor * (1+pct)` que ya usan Cristales/Herrajes/Persianas. Un solo patrón de función reutilizable para los 4 catálogos.

---

## 5. Herrajes

```sql
create type unidad_venta_enum as enum ('pieza', 'metro');

create table herrajes_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  origen origen_enum not null,
  costo_proveedor numeric not null default 0,
  unidad_venta unidad_venta_enum not null -- explícito, ya no se infiere del nombre (vinil/felpa/fascia = metro)
);

create table herrajes_por_serie (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references series(id) on delete cascade,
  herraje_id uuid references herrajes_catalogo(id), -- null si es precio manual
  nombre_manual text,
  precio_manual numeric,
  formula_cantidad jsonb not null -- misma filosofía que cantidad_regla de cortes
);
```

**Regla de sustitución por servicio activo** (Jaladeras Embutidas → sustituye "Perico" en Orden de Taller):

```sql
create table sustituciones_herraje (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id),
  herraje_original_id uuid not null references herrajes_catalogo(id),
  texto_sustituto text not null -- lo que aparece en la Orden de Taller en vez del original
);
```

✅ **Resuelto (confirmado con negocio):** el precio del servicio sustituto (ej. "Jaladeras Embutidas") ya contempla/absorbe el costo base del herraje que reemplaza — no se resta nada del subtotal de herrajes. Esto significa que la sustitución es **puramente de presentación**: el motor de costeo nunca consulta `sustituciones_herraje`, solo lo hace el generador de la Orden de Taller al momento de decidir qué nombre mostrarle al operario. "Perico" se sigue sumando normal en `herrajes_por_serie` para el cálculo de precio; solo su *nombre visible* cambia cuando el servicio que lo sustituye está activo en esa partida.

---

## 6. Cristales y Persianas

```sql
create table cristales_catalogo (
  id uuid primary key default gen_random_uuid(),
  descripcion text not null,
  costo_hoja numeric not null,
  alto numeric not null,
  largo numeric not null,
  area numeric generated always as (alto * largo) stored, -- derivado, nunca editable directo
  espesor_mm numeric not null default 6,
  peso_kg_m2 numeric not null -- explícito por fila, no fórmula global (ver nota abajo)
);

create table persianas_catalogo (
  id uuid primary key default gen_random_uuid(),
  familia text not null,
  modelo text not null,
  costo_m2 numeric not null,
  ancho_maximo numeric not null
);
```

✅ **Resuelto — peso por espesor, no heurística de área:** hoy todo es 6mm, pero dejamos la puerta abierta a 3mm sin tocar schema — solo agregas una fila con otro `espesor_mm` y su `peso_kg_m2`. Dato curioso: la heurística vieja de "15 kg/m² general" no era aleatoria — 15 = 6mm × 2.5 kg/m² por mm de espesor, que es más o menos la densidad real del vidrio flotado estándar. O sea el original ya traía la física correcta escondida, solo que hardcodeada para un solo espesor. Dejé `peso_kg_m2` como campo editable (no columna generada) en vez de forzar `espesor_mm * 2.5` automático, porque un templado o laminado no necesariamente respeta esa densidad exacta — mejor que tu papá lo capture explícito por hoja y no que el sistema asuma física de vidrio genérico.

⚠️ **Pendiente de negocio:** el original no valida que la medida capturada exceda `ancho_maximo` del modelo de persiana. ✅ **Resuelto:** advertir, no bloquear — decisión de UI, sin impacto en este schema.

---

## 7. Servicios, Factores Base, Esquemas de Pago

```sql
create type tipo_cobro_enum as enum ('Unidades', 'MetrosLineales', 'MetrosCuadrados', 'Perfil');

create table servicios (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id),
  concepto text not null,
  tipo_cobro tipo_cobro_enum not null,
  cantidad_base numeric not null default 1,
  costo_unitario numeric not null default 0
);

create type factor_tipo_enum as enum ('AluEspanol', 'AluNacional', 'Cristal', 'Templados', 'Persianas');

create table factores_base (
  tipo factor_tipo_enum primary key,
  valor numeric not null,
  updated_at timestamptz default now()
);

create table esquemas_pago (
  id uuid primary key default gen_random_uuid(),
  plazo text not null,
  tasa numeric not null -- % cargo financiero
);
```

---

## 8. Configuración de instancia única

```sql
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

create type sat_tipo_enum as enum ('RegimenFiscal', 'UsoCFDI');

create table catalogos_sat (
  id uuid primary key default gen_random_uuid(),
  tipo sat_tipo_enum not null,
  clave text not null,
  descripcion text not null
);

create table sepomex_catalogo (
  id uuid primary key default gen_random_uuid(),
  cp text not null,
  colonia text not null,
  municipio text not null,
  estado text not null,
  ciudad text
);

create index idx_sepomex_cp on sepomex_catalogo(cp);
```

✅ **Resuelto:** se cae la dependencia de zippopotam.us y se migra a catálogo SEPOMEX local. El dataset oficial (correos de México) trae ~150k registros y varias colonias por CP — de ahí que sea tabla propia y no un campo suelto en `cotizaciones`. Es de lectura pública (no hay nada sensible en un catálogo de códigos postales), así que la política RLS aquí es la más simple de todo el proyecto: lectura abierta para cualquier rol autenticado, sin necesidad de filtrar por nada. La importación inicial es un seed una sola vez desde el CSV oficial, no algo que se mantenga a mano fila por fila.

---

## 9. Cotización y Partidas (el corazón transaccional)

```sql
create type cotizacion_status as enum ('draft', 'sent', 'won', 'lost');
create type mosquitero_enum as enum ('No', 'Corredizo', 'Fijo');

create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  asesor_id uuid references asesores(id),
  creado_por uuid references perfiles(id),

  -- datos de cliente: nullable hasta el cierre (modo cotización rápida no los requiere)
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

  -- status='won' es el punto de no retorno: ahí se congela el costo_snapshot
  -- de todas las partidas de forma definitiva y se habilita la Orden de Taller.
  -- draft/sent = snapshot editable (se puede refrescar precios cuantas veces haga falta).
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

  medidas jsonb not null, -- {L1, L2, L3, alto, intermedios: {largo1, largo2, largo3, alto}} — intermedios = INT_CORR_* capturados a mano, L2/L3 opcionales (solo canceles de esquina)
  mosquitero mosquitero_enum not null default 'No',
  sistema_fijo_medidas jsonb, -- nullable, mismo shape que medidas — intermedios aquí = INT_FIJO_*
  servicios_activos jsonb default '[]', -- [{servicio_id, ...}]
  cantidad_piezas int not null default 1,

  costo_snapshot jsonb not null, -- cortes, herrajes, costos, precio final (recalculable mientras la cotización no esté confirmada)
  precios_calculados_en timestamptz not null default now(), -- freshness del snapshot, para saber si conviene refrescar
  orden int default 0,
  created_at timestamptz default now()
);
```

**Por qué `costo_snapshot` es jsonb y no tablas normalizadas:** porque tarde o temprano se vuelve un congelado histórico — no le hace join a catálogos que pudieron cambiar. Normalizarlo obligaría a mantener FKs a versiones de catálogo que no existen (no hay versionado de precios). El jsonb es la representación correcta de "esto es lo que se cobró, punto".

**El matiz que agregamos ahora — congelado suave vs. duro:**

- **Mientras `cotizaciones.status` es `draft` o `sent`**: `costo_snapshot` es un "último cálculo conocido", no un congelado real. El botón **"Actualizar precios"** vuelve a correr el mismo motor de costeo contra los catálogos actuales y sobreescribe `costo_snapshot` + `precios_calculados_en`. Útil para cotizaciones que llevan días vivas mientras el asesor sigue negociando con el cliente.
- **UI sugerida:** si `now() - precios_calculados_en` pasa de cierto umbral (ej. 3-5 días, definido por tu papá), mostrar un badge tipo "Precios de hace 6 días — ¿actualizar?" en vez de refrescar solo, para que el asesor decida (un refresh silencioso podría subir el total sin que el asesor se dé cuenta a media negociación).
- **Al pasar `cotizaciones.status` a `won`**: se corre una última actualización de precios automática, se graba `confirmada_en`/`confirmada_por`, y **a partir de ahí `costo_snapshot` es inmutable** — ese es el momento real en que "se crea la orden de taller" en términos de negocio, aunque técnicamente Orden de Taller siga siendo una vista derivada (ver sección 10).

**Blindaje a nivel DB (opcional, pero te lo recomiendo):** que la app respete la regla es una cosa, que sea *imposible* violarla por un bug o un agente que se equivoque es otra. Un trigger simple lo hace innegociable:

```sql
create or replace function bloquear_edicion_partida_confirmada()
returns trigger as $$
begin
  if exists (
    select 1 from cotizaciones
    where id = new.cotizacion_id and status = 'won'
  ) then
    raise exception 'No se puede modificar una partida de una cotización confirmada (won)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_bloquear_edicion_partida
before update on partidas
for each row execute function bloquear_edicion_partida_confirmada();
```

Con esto, ni el botón de refresh, ni un fix rápido, ni un agente developer con prisa pueden tocar una partida ya confirmada. Si algún día necesitan corregir algo post-confirmación, que sea un flujo explícito de "reabrir cotización" que regrese el status a `sent` a propósito — nunca un UPDATE silencioso.

---

## 10. Lo que NO tiene tabla propia

- **Visor Precios**: vista derivada, se calcula en el cliente comparando líneas × cristal para las medidas actuales. No persiste nada.
- **Orden de Taller**: vista derivada de `partidas.costo_snapshot` + `componentes_corte`/`herrajes_por_serie`. Dos modos: preview en vivo (partida en edición, cotización aún no confirmada) y orden real (cotización con `status = 'won'`, snapshot ya inmutable por el trigger). No es dueña de datos en ninguno de los dos casos — solo cambia si puede confiar en que el snapshot ya no se va a mover.

---

## Decisiones de negocio

✅ Resueltas (ya reflejadas en el schema de arriba):

1. Acabados de aluminio → se amplía a 8, catálogo normalizado por fila.
2. Ancho máximo de persianas → advertir, no bloquear (UI).
3. Peso de cristal → por espesor, campo explícito, listo para 3mm a futuro.
4. CP → catálogo SEPOMEX local, se cae la dependencia externa.
5. Aumento Global en Aluminio → sí se agrega, mismo patrón que los otros 3 catálogos (y ahora más fácil gracias a la normalización del punto 1).

🟡 Abierta (no bloquea migraciones, se afina en las US de cada módulo):

6. Acceso de solo-lectura cruzado entre roles — ¿Construcción ve Líneas/Series en modo lectura? ¿Ventas ve Aluminio/Cristales para resolver dudas del cliente? Se decide cuando lleguemos al detalle de RLS por módulo.
