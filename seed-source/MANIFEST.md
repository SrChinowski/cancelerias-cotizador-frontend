# MANIFEST — Extracción de catálogos

Fuente única encontrada en el repo: `draft/Cancelerias Cotizador ERP30_con cp.html`
(único archivo `.html` fuera de `node_modules`, un solo bloque `<script>` en la línea 595).

Extracción hecha evaluando cada literal de JS tal cual aparece en el archivo
(sin renombrar campos, sin cambiar tipos, sin interpretar fórmulas), usando
un `vm` de Node para parsear el literal y volcarlo a JSON con `JSON.stringify`.
El HTML original no fue modificado.

## Archivos generados

| Archivo JSON | Variable origen | Línea(s) en el HTML | Registros |
|---|---|---|---|
| `dbDesglosesTaller.json` | `window.dbDesglosesTaller` | 616–1356 | 555 |
| `dbLineas.json` | `dbLineas` (dentro de `loadDefaultDBs()`) | 1364–1401 | 36 |
| `dbCristales.json` | `dbCristales` (dentro de `loadDefaultDBs()`) | 1403–1422 | 31 |
| `dbAluminio.json` | `dbAluminio` (dentro de `loadDefaultDBs()`) | 1424–1483 | 58 |
| `dbHerrajes.json` | `dbHerrajes` (dentro de `loadDefaultDBs()`) | 1485–1544 | 58 |
| `dbServicios.json` | `dbServicios` (dentro de `loadDefaultDBs()`) | 1546–1562 | 15 |
| `dbPersianas.json` | `dbPersianas` (dentro de `loadDefaultDBs()`) | 1566–1611 | 37 |
| `dbCategorias.json` | `dbCategorias` (dentro de `loadDefaultDBs()`) | 1360 | 4 |
| `dbRegimenes.json` | `dbRegimenes` (dentro de `loadDefaultDBs()`) | 1361 | 6 |
| `dbUsoCFDI.json` | `dbUsoCFDI` (dentro de `loadDefaultDBs()`) | 1362 | 5 |
| `dbPagos.json` | `dbPagos` (dentro de `loadDefaultDBs()`) | 1564 | 6 |
| `dbAsesores.json` | `dbAsesores` (dentro de `loadDefaultDBs()`) | 1565 | 3 |
| `dbServicios_master.json` | `dbServicios` (dentro de `window.inyectarServicios()`, botón de "recuperar catálogo maestro") | 2082–2103 | 20 |

**Nota sobre `dbServicios` vs `dbServicios_master`:** son dos literales distintos
asignados a la misma variable `dbServicios` en dos funciones diferentes.
`loadDefaultDBs()` es el catálogo que carga al iniciar la app (15 registros).
`window.inyectarServicios()` es una acción de botón que "recupera la lista
maestra de servicios" (20 registros). No son iguales:
- Solo en el default: `Ángulo de Aluminio`, `Jaladera Tipo C`, `Envio`.
- Solo en el maestro: `Galleta Sky Line`, `Braquets doble en escuadra`,
  `Instalación Cancel`, `Ángulo de Aluminio (Remate)`, `Braquets doble en linea`,
  `Control Remoto RF 15 Canales`, `Motor Alámbrico`, `Instalación Persiana`.
- Se extrajeron ambos, sin fusionar ni decidir cuál es "la buena" — eso se
  resuelve en la siguiente sesión.

## Catálogos mencionados en el código pero NO extraídos (no son literales estáticos)

- **`appData.series`** (línea 1632): no es un literal, se genera en runtime con
  `dbLineas.map(...)`. Es un catálogo derivado, no una fuente de datos propia.
- **`window.logic.db`** (línea 1987): se inicializa como objeto vacío `{}` y se
  llena dinámicamente en `window.logic.init()` cruzando `dbLineas` contra
  `window.dbDesglosesTaller` (filtrando renglones cuyo campo `linea` contiene
  "herraje"). No hay literal que extraer; es lógica derivada, no catálogo fuente.
- **`carrito`** (línea 613): inicia como `[]`, es el carrito de la sesión en
  curso, no un catálogo maestro.

Ningún catálogo esperado apareció vacío o ausente — todas las variables
declaradas en `var dbAluminio, dbCristales, dbServicios, dbPagos, dbLineas,
dbAsesores, dbPersianas, dbCategorias, dbRegimenes, dbUsoCFDI, dbHerrajes;`
(línea 612) tienen al menos un literal fuente en `loadDefaultDBs()`.

## Nota sobre archivo preexistente `draft/desglosesTaller.json`

Ya existía un archivo `draft/desglosesTaller.json` en el repo (126 KB) con
contenido similar a `window.dbDesglosesTaller`, pero con los campos
renombrados: `noPiezas` en vez de `pzas`, `posicion` en vez de `pos`,
`descripcion` en vez de `desc`. Como esta pasada es de extracción pura
("no renombres campos"), **no se usó esa fuente** — `dbDesglosesTaller.json`
en `/seed-source/` se generó directamente del HTML con los nombres de campo
originales (`linea`, `perfil`, `ubicacion`, `pzas`, `pos`, `desc`). Vale la
pena revisar en la próxima sesión si ese archivo preexistente ya tiene
transformaciones/limpieza que se quieran conservar.

## Inconsistencias detectadas (solo reporte, no se corrigieron)

1. **`dbDesglosesTaller` — campo `linea` mezcla dos convenciones.** 264 filas
   usan el nombre de línea tal cual aparece en `dbLineas.f` (para calcular
   cortes de perfil), y 291 filas usan el prefijo `"Herrajes " + nombre de línea`
   (para el desglose de herrajes, filtrado en `window.logic.init()` buscando
   `.includes("herraje")`). No hay un campo separado tipo `tipo: "corte"` vs
   `tipo: "herraje"` — la distinción vive implícita en el string.

2. **`dbDesglosesTaller` — campo `pos` con casing inconsistente y valores
   basura.** Valores encontrados: `Alto`, `Largo1`, `Largo2`, `Largo3`, pero
   también `alto` (minúscula) y la literal string `"nan"` (probablemente
   arrastrada de una importación desde Excel/pandas con celdas vacías).

3. **`dbDesglosesTaller` — campo `ubicacion` muy poco normalizado.** Ejemplos
   de variantes para conceptos similares: `"Hoja Corrediza (X)"`,
   `"Hoja corrediza"`, `"hoja corrediza"`, `"Hoja (X)"`, `"Hoja (X, O)"`,
   `"Hoja Fija (O)"`, `"Hoja Fija(O)"` (sin espacio antes del paréntesis),
   más varias variantes de "Intermedio...". También aparecen los valores
   sueltos `"Remache 56"` y `"nan"` en este campo, que no describen una
   ubicación real.

4. **32 nombres de línea en `dbDesglosesTaller.linea`** (con o sin prefijo
   `"Herrajes "`) **no calzan exactamente contra ningún `dbLineas[].f`** —
   ejemplos: `"Herrajes Puerta S1400 1 Hoja"` vs `dbLineas` tiene
   `"Puerta S1400 1 hoja"` (diferencia de mayúscula en "Hoja"); dobles
   espacios como `"Herrajes Cancel Baño Aluminio 180°  1 hojas..."`. El
   emparejamiento en el código (`window.logic.init()`) se hace por
   coincidencia de palabras sueltas, no por igualdad exacta de string, así
   que el sistema "tolera" estas variantes — pero un join estricto por
   nombre fallaría.

5. **Campos numéricos con decimales inconsistentes** (ej. `dbCristales.c`,
   `dbAluminio.n/neg/b/mad`, `dbHerrajes.c`, `dbPersianas.max`, `dbPagos.tasa`):
   en JS todos son del mismo tipo `number`, pero algunos valores están escritos
   con decimales (`1024.92`) y otros como enteros (`650`). Esto es normal en
   JS/JSON (no hay tipos int/float separados) — se menciona solo para que quede
   registrado, no es una inconsistencia real de esquema.

6. **`dbHerrajes` y `dbAluminio` — campo `t` (tipo) es un string libre** con
   solo dos valores vistos: `"Nacional"` y `"Española"`. Funciona como enum
   pero no está validado como tal en el HTML.

7. Todos los demás catálogos (`dbLineas`, `dbCristales`, `dbAluminio`,
   `dbHerrajes`, `dbServicios`, `dbServicios_master`, `dbPersianas`,
   `dbPagos`, `dbAsesores`) tienen un esquema de campos consistente
   (mismo keyset) en el 100% de sus registros — no se detectaron objetos
   con campos faltantes o extra dentro del mismo array.
