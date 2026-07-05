# Seed — Pendientes de revisión manual

Generado junto con `supabase/seed.sql`. Todo lo listado aquí NO bloquea el resto
del seed, pero necesita una decisión humana antes de darse por bueno.

## 1. Líneas sin match de serie (aun con normalización lowercase+trim+espacios)

**⚠️ Conflicto con el schema actual:** la instrucción original pedía insertar estos
registros igual, con `serie_id = NULL`. Pero `componentes_corte.serie_id` y
`herrajes_por_serie.serie_id` están declaradas `not null` en las migraciones ya
corridas (`20260704120300_componentes_corte.sql`, `20260704120500_herrajes.sql`).
Insertar con NULL viola esa constraint, así que estos registros **NO se insertaron**
en `seed.sql` — quedan documentados aquí para decidir entre (a) resolver el match a
mano y agregarlos después, o (b) volver nullable la columna si de verdad se necesitan
partidas sin serie resuelta.

- **"cancel para baño 6mm180° 2 hojas corredizas"** (5 registros en dbDesglosesTaller, con y sin prefijo "Herrajes ") — candidato más cercano en dbLineas: "cancel para baño 6mm 90° 2 Hojas corredizas 2 hojas fijas"

## 2. Fórmulas de `descuento_regla` no reconocidas (componentes_corte excluidos del seed)

✅ **Resuelto — "Intermedio 3 pulgadas" (Puerta 3 Pulgadas):** el string
`"alto del poste 5.5 del contramarco-M_ZOCLO-M_INTERMEDIO"` normaliza a
`ALTO_C-M_ZOCLO-M_INTERMEDIO` — es exactamente la regla hardcodeada que ya tenía el
HTML original (`f.replace(/ALTO DEL POSTE.*?CONTRAMARCO/g, "ALTO_C")` en
`window.parseDescuento`), replicada tal cual en el parser. `"intermedio"` ya era una
clave válida de `series_constantes`, solo no se había usado — mismo `restar_constante`
que ya se usa para `zoclo_alto`/`zoclo_cabezal`, sin operador nuevo. Ya está en el seed.

🔴 **1 registro sigue sin resolver:**

```json
{
  "linea": "V S4600 Fijo",
  "perfil": "Junquillo S4600",
  "ubicacion": "contramarco",
  "pzas": "2",
  "pos": "alto",
  "desc": "5.4-3.4",
  "tabla": "componentes_corte"
}
```

`"5.4-3.4"` (resta de dos números literales, sin referencia a constante ni a medida) no
calza con ningún patrón documentado en DATA_MODEL.md sec. 3 — no se le inventó
interpretación. Sigue fuera del seed.

## 3. Fórmulas de `cantidad_regla` / `formula_cantidad` no reconocidas

✅ **60 de 60 resueltos.** Los 59 casos de conteo manual (`INT_FIJO_L`/`INT_FIJO_A`/
`INT_CORR_L`/`INT_CORR_A`, con o sin multiplicador) ya estaban resueltos con
`cantidad_regla.tipo="por_intermedios"` (ver DATA_MODEL.md sec. 3). El último caso,
**"Duela lisa 5 Pulgadas"** (Puerta 3 Pulgadas, ubicación "Duela Alta"), quedó
resuelto con el nuevo tipo `"formula"`:

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

Su `descuento_regla` (`"alto/2"`) no necesitó ningún cambio — ya calzaba con el patrón
`dividir_entre` existente (`{"operaciones":[{"tipo":"dividir_entre","valor":2}]}`). El
"12cm" de la fórmula original es el divisor de la cuenta de piezas, no el descuento de
corte — el descuento real es partir el alto entre 2, sin resta previa. `"redondeo":
"arriba"` fue confirmado por Carlos como default (pendiente de validar con su papá a
futuro, pero autorizado para el seed ya). Este componente también tiene
`perfil_aluminio_id` resuelto (matchea "Duela lisa 5 Pulgadas" en `aluminio_perfiles`).

Esta sección ya no tiene pendientes — se deja el histórico arriba como referencia de
diseño para el motor de reglas (nuevo operador `sumar_valor`, nuevo tipo `"formula"`
con `redondeo`).

## 4. Piezas de tramo extra L2/L3 (componentes_corte excluidos del seed)

8 registros excluidos. DATA_MODEL.md sec. 3 documenta que las piezas extra de tramo (L2/L3) se generan vía `cantidad_regla.tipo="por_tramo"` ligado a `series.tramos_soportados`, pero definir *qué* componente usa ese tipo y con qué `piezas_por_tramo` es una decisión de negocio por componente que no estaba entre las reglas de transformación — se deja fuera para no inventar esa asignación:

```json
{
  "linea": "Cancel Baño Aluminio 90°",
  "perfil": "Marco semilujo",
  "ubicacion": "Hoja corrediza Largo2",
  "pzas": "2",
  "pos": "Largo2",
  "desc": "-3.5/2",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "Cancel Baño Aluminio 90°",
  "perfil": "Marco semilujo",
  "ubicacion": "Hoja Fija Largo2",
  "pzas": "2",
  "pos": "Largo2",
  "desc": "-3.5/2",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "cancel para baño 6mm 90° 2 Hojas corredizas 2 hojas fijas",
  "perfil": "Riel",
  "ubicacion": "Contramarco",
  "pzas": "2",
  "pos": "Largo2",
  "desc": "0",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "cancel para baño 6mm 90° 2 Hojas corredizas 2 hojas fijas",
  "perfil": "Guia",
  "ubicacion": "Contramarco",
  "pzas": "2",
  "pos": "Largo2",
  "desc": ".8",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "cancel para baño 6mm 90° 2 Hojas corredizas 2 hojas fijas",
  "perfil": "Cristal templado 6mm",
  "ubicacion": "Hoja (X)",
  "pzas": "1",
  "pos": "Largo2",
  "desc": "-2.5/2",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "cancel para baño 6mm 90° 2 Hojas corredizas 2 hojas fijas",
  "perfil": "Cristal templado 6mm",
  "ubicacion": "Hoja (O)",
  "pzas": "1",
  "pos": "Largo2",
  "desc": "-2.5/2",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "Cancel abatible 90° 9.5mm",
  "perfil": "Cristal templado 9.5mm",
  "ubicacion": "Hoja (O)",
  "pzas": "1",
  "pos": "Largo2",
  "desc": "0",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```
```json
{
  "linea": "Cancel abatible 135° 9.5mm",
  "perfil": "Cristal templado 9.5mm",
  "ubicacion": "Hoja (O)",
  "pzas": "1",
  "pos": "Largo2",
  "desc": "0",
  "motivo": "pos=\"Largo2\" representa pieza extra de tramo (L2/L3); requiere semántica cantidad_regla.tipo=\"por_tramo\" de DATA_MODEL.md sec.3 que no se puede derivar automáticamente sin definir series.tramos_soportados y piezas_por_tramo por componente — se deja fuera del seed para revisión manual."
}
```

## 5. `perfil_aluminio_id` / `cristal_id` sin match en `componentes_corte`

**Estado tras esta pasada:** `componentes_corte` tiene 256 filas totales (255 del
INSERT principal + 1 de "Angulo 1 Pulgada" ya reclasificada). De esas:

- **213 (83%) con `perfil_aluminio_id` resuelto.**
- **5 con `cristal_id` resuelto** ("Cristal templado 6mm" → único candidato posible en
  `cristales_catalogo`, "Templado Claro 6mm" — se referenció con un `select id from
  cristales_catalogo where descripcion = '...'` inline en el INSERT, porque
  `cristales_catalogo` se sembró sin ids deterministas explícitos, a diferencia de
  `aluminio_perfiles`/`herrajes_catalogo`).
- **38 filas sin ninguno de los dos** (ni aluminio ni cristal), repartidas en:

**8 filas — "Cristal templado 9.5mm": ambiguo, 3 candidatos posibles, no se eligió ninguno:**
"Templado Claro 9.5mm", "Templado Filtrasol 9.5mm", "Templado Tintex 9.5mm" — el dato
original no especifica cuál de los 3 tipos de templado corresponde. A diferencia de
"Cristal templado 6mm" (que solo tiene una variante en el catálogo), aquí no hay forma
de decidir sin información adicional — se deja `cristal_id = NULL` en las 8 filas.

**30 filas (10 nombres de `perfil` distintos) sin match en `aluminio_perfiles`,** con mi
mejor candidato revisando el registro crudo completo (línea + ubicación), no solo
coincidencia de palabras sueltas:

- **"Zoclo 3 Pulgadas"** x2 (línea "V 3 Pulgadas Corredizo...") — candidato: **"Zoclo Alto 3  Pulgadas corrediza"** (misma familia V 3 Pulgadas Corredizo; el catálogo trae doble espacio antes de "Pulgadas", así que ni con la normalización actual calza — requeriría además contemplar la palabra "Alto"/"corrediza" faltante en el nombre corto).
- **"Junquillo Ancho"** x6 (línea "V S1400...") — candidato: **"Junquillo Ancho (para uso en Cerco,hoja, Pilastra puerta y ventana)"** (línea Ventana S1400) — el nombre corto es literalmente un prefijo del nombre del catálogo.
- **"Zoclo 2 venas"** x1 (línea "Puerta 3 Pulgadas") — candidato: **"Zoclo 2 venas 3 Pulgadas"** (misma línea Puerta 3 Pulgadas, el catálogo solo agrega el sufijo "3 Pulgadas").
- **"Junquillo ancho"** x4 (línea "Puerta S1400...", minúscula) — mismo candidato que "Junquillo Ancho": **"Junquillo Ancho (para uso en Cerco,hoja, Pilastra puerta y ventana)"**.
- **"Riel baño de lujo"** x4 (línea "Cancel Baño Aluminio...") — candidato: **"Riel baño"** (línea Cancel Baño Aluminio) — probable que el catálogo simplemente omita "de lujo".
- **"Tubo de 3x1"** x2 (línea "Puerta 4 Pulgadas") — candidato: **"Tubo 3x1"** (misma línea, solo sobra la palabra "de").
- **"Tubo de 4 x 1 3/4"** x2 (línea "Puerta 4 Pulgadas") — candidato: **"Tubo rectangular 4x1 3/4"** (misma línea, misma medida).
- **"Riel"** x3 (línea "cancel para baño 6mm...") — candidato tentativo: **"Riel baño"** (línea Cancel Baño Aluminio — línea de catálogo distinta a la de origen, pero mismo tema "baño"; no tan seguro como los anteriores).
- **"Guia"** x3 (línea "cancel para baño 6mm...") — candidato: **"Guia baño inferior"** (línea Cancel Baño Aluminio).
- **"Jambas"** x3 (línea "cancel para baño 6mm...") — candidato: **"Jamba lateral baño Semilujo"** (línea Cancel Baño Aluminio).

Ninguno de estos candidatos se aplicó automáticamente — todos quedaron con
`perfil_aluminio_id = NULL` / `cristal_id = NULL`, esperando confirmación manual.

## 6. Herrajes sin match en el catálogo maestro

✅ **5 de 6 resueltos:** era un problema de singular/plural, no falta
de dato — "Tornillos 10x1" → `herraje_id` real de "Tornillo 10x1"
(75abcce2-f2f7-47f4-a80f-ad5c6babbf69), "Tornillos 8x1.5" → `herraje_id` real de
"Tornillo 8x1.5" (ebf1c213-043a-4bb9-a713-809b296751b3). Precio real ya cargado
en `herrajes_catalogo`, no se necesitó dummy.

✅ **1 resuelto — "Angulo 1 Pulgada":** reclasificado de `herrajes_por_serie`
a `componentes_corte` (era en realidad un perfil de aluminio, confirmado por Carlos), con
`perfil_aluminio_id` apuntando a `aluminio_perfiles` id `0ecb0a95-f56e-454d-a578-f093c7e3ac18`.
El registro crudo original (línea "Herrajes Cancel Baño Aluminio 90°", ubicación "Hoja
corrediza Largo2", pzas=1, pos=Alto, desc=4.8) ya está reflejado en el INSERT dedicado que
vive justo antes de la sección 12 en `seed.sql`. El dummy con `precio_manual = 999999` ya
no existe.

## 7. Conflictos entre dbServicios y dbServicios_master (se usó el valor del master)

Ninguno — no hubo conflictos de precio/tipo_cobro entre ambos catálogos para los conceptos en común.

## 8. Otras observaciones

- ✅ **Resuelto:** "Goma rígida" y "Gomas" confirmados como `unidad_venta = 'pieza'` — Carlos confirmó la regla general: gomas se venden por pieza, viniles por metro. El default que ya traía el seed era correcto, cero cambios.
- Cristal "laminado tintex+claro": no se pudo derivar espesor_mm de la descripción, se usó default 6mm — revisar.

## 9. Catálogos sin datos fuente en /seed-source (no incluidos en el seed)

- ✅ **Resuelto — `factores_base`:** no había `dbFactoresBase.json` porque no era parte de `loadDefaultDBs()`, pero Carlos lo capturó directo del panel del HTML original (screenshot). Insertado en `seed.sql` sección 13: AluEspanol 2.20, AluNacional 2.50, Cristal 2.50 (el HTML le dice "Crudo"), Templados 2.20, Persianas 2.00.
- `sustituciones_herraje` — la regla "Jaladeras Embutidas sustituye a Perico" vive como lógica hardcodeada en el HTML original, no como catálogo; no hay fuente para poblarla automáticamente.
- `ajustes_empresa` — configuración de instancia única (encabezado, políticas, etc.), no extraída como catálogo.
- `sepomex_catalogo` — según DATA_MODEL.md se puebla desde el CSV oficial de Correos de México, no desde /seed-source.

## 10. Revisión de catálogos pequeños (regla #8)

Se revisaron dbCategorias (4), dbRegimenes (6), dbUsoCFDI (5), dbPagos (6) y dbAsesores (3) — todos con shape consistente, sin campos faltantes ni filas vacías detectadas.
