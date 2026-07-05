# Business Logic — Cancelerías Cotizador

Este documento describe la lógica de negocio de la app original (`draft/Cancelerias Cotizador ERP30_con cp.html`), un "vibe coded" hecho por el papá del usuario, con el fin de guiar la reconstrucción del sistema.

Cada módulo corresponde a un tab de la navegación principal. Se documentará uno por uno.

## Módulos

1. **Configurador** — `configurador`
2. **Visor Precios** — `visor_precios`
3. **Fabricación** — `ing_config`
4. **Config. Herrajes** — `herrajes`
5. **Catálogo Herrajes** — `catalogo_herrajes`
6. **Orden de Taller** — `ing_taller`
7. **Aluminio** — `aluminios`
8. **Cristales** — `cristales`
9. **Persianas** — `persianas_admin`
10. **Líneas y Categorías** — `lineas`
11. **Servicios** — `servicios`
12. **Catálogos y PDF** — `datos_pdf`

---

## Roles de usuario

La app original **no tiene roles ni login**: es un solo HTML sin autenticación donde cualquiera ve y edita tanto el Configurador de venta como los 11 módulos administrativos/de fabricación. Para el rebuild se definieron 3 roles:

| Rol | Acceso |
|---|---|
| **Ventas** | Configurador (crear/editar partidas y cotizaciones, carrito, imprimir PDF de cliente), Visor Precios. |
| **Construcción** | Fabricación, Config. Herrajes, Orden de Taller (desglose de corte, herrajes, impresión de orden de taller). |
| **Admin** | Todo lo anterior + Catálogo Herrajes, Aluminio, Cristales, Persianas, Líneas y Categorías, Servicios, Catálogos y PDF (asesores, catálogos SAT, Factores Base, respaldo/restauración, ajustes de sucursal/PDF). |

Pendiente de afinar caso por caso (ej. si Construcción necesita acceso de solo-lectura a Líneas y Categorías para saber qué series existen, o si Ventas necesita ver Aluminio/Cristales en modo lectura para resolver dudas de catálogo con el cliente) — se revisará al definir las historias de usuario formales de cada módulo.

---

## Detalle por módulo

### 1. Configurador

Pantalla principal de captura: datos del cliente/facturación + armado de una "partida" (línea de cotización) + carrito y cierre de la cotización.

#### Historias de usuario (borrador)

- Como asesor, capturo los datos del cliente y de la obra (nombre, teléfono, correo, dirección, CP con autocompletado de estado/colonia, RFC, régimen fiscal, uso de CFDI) para generar una cotización.
- Como asesor, elijo categoría → línea/familia de producto → color/acabado (o modelo de tela si es persiana) → cristal/vidrio → capturo medidas, para que el sistema calcule el costo de esa partida en vivo.
- Como asesor, indico si la partida lleva mosquitero (No/Corredizo/Fijo) y/o un sistema fijo adicional (antepecho/lienzo extra), reutilizando el mismo bloque de medidas.
- Como asesor, activo servicios adicionales aplicables a la categoría seleccionada (ej. instalación, flete) y el sistema los suma al total de la partida.
- Como asesor, agrego la partida configurada al carrito de la cotización y sigo agregando más partidas.
- Como asesor, aplico un descuento (% o $), configuro el IVA y elijo un esquema de pago (con su cargo financiero) para obtener el total a pagar de la cotización completa.
- Como asesor, imprimo/exporto la cotización en PDF para el cliente, mostrando descripciones y medidas por partida sin exponer el desglose interno de fabricación.

#### Reglas de negocio clave

- **Emparejamiento de series (Corredizo ↔ Fijo ↔ Mosquitero):** al seleccionar una línea principal, el sistema debe sumar automáticamente el costo de su serie "Fijo" asociada (si se capturaron medidas de sistema fijo) y/o su serie "Mosquitero" asociada (si se activó mosquitero).
  - **Decisión:** en la reconstrucción, esta relación debe quedar **explícita en el catálogo de la serie** (ej. `serie_fijo_id`, `serie_mosquitero_id`), no inferida adivinando el nombre por texto como en el original (frágil: renombrar una serie rompía la relación).
- **Cálculo de costo de una partida** = costo de aluminio/perfiles (según lista de cortes de la(s) serie(s) emparejada(s)) + costo de cristal/tela + costo de herrajes + costo de servicios activos, todo multiplicado por la cantidad de piezas.
  - El costo de perfiles depende del color/acabado elegido (Natural/Negro/Blanco/Madera tienen precio propio en el catálogo de Aluminio) y de si el perfil es de origen Nacional o Español (cada uno con su propio Factor Base).
  - El cristal usa una tabla de precio por m² (o costo fijo por persiana según familia/modelo).
- **Lista de cortes (bill of cuts):** cada serie tiene un listado de piezas/componentes; cada componente define cuántas piezas salen y a qué longitud se cortan, en función de las medidas capturadas (L1/L2/L3/Alto) menos un descuento por pieza.
  - **Decisión:** hoy el descuento y la cantidad se capturan como fórmula de texto libre evaluada con `eval` (ej. `"16/2"`, `"ALTO_C/2"`). Se simplifica: se modela como **reglas estructuradas** (medida base + operación fija: resta constante, dividir entre N, medida directa) en vez de texto libre arbitrario. Ver detalle en el módulo Fabricación.
- **Factores Base (multiplicadores):** Alu Español, Alu Nacional, Cristal, Templados, Persianas — factores que convierten costo de compra en precio de venta.
  - **Decisión:** viven como **configuración global** (pantalla de administración/pricing), con posibilidad de **override por cotización** (el asesor puede ajustarlos en una cotización puntual sin afectar el default global ni cotizaciones futuras).
- **Peso estimado del cristal:** heurística simple (área × 15 kg/m² general, área × 1.5 kg/m² para persianas) — no calcula por espesor real de cristal. Pendiente decidir si se conserva como estimado o se precisa por tipo de cristal.
- **Descuento/IVA/Cargo financiero del carrito:** el descuento y el IVA aplican sobre el subtotal de todas las partidas; el cargo financiero se calcula sobre el subtotal-con-IVA usando la tasa del esquema de pago elegido (catálogo de pagos: plazo + tasa %).
- **Autocompletado de CP:** hoy usa una API pública externa (zippopotam.us) sin costo ni key. Pendiente decidir si se conserva la dependencia externa o se sustituye por un catálogo local (SEPOMEX) para no depender de internet/terceros.

#### Clasificación técnica

**Lógica de negocio (lib / dominio, no UI):**
- Cálculo de variables de medida (conversión cm → m², totales por sistema corredizo/fijo).
- Resolución de series emparejadas (corredizo/fijo/mosquitero) vía catálogo explícito.
- Generación de lista de cortes por serie (piezas + longitudes) a partir de reglas estructuradas.
- Cálculo de precio por perfil de aluminio (color + origen Nacional/Español + factor).
- Cálculo de precio de herrajes por serie (catálogo maestro + factor).
- Cálculo de costo total de partida (aluminio + cristal/tela + herrajes + servicios) × cantidad.
- Cálculo de totales de cotización (subtotal, descuento, IVA, cargo financiero, total a pagar).
- Generación del documento imprimible de cotización (vista cliente, sin desglose de fabricación).

**Catálogos / configuración (van a DB, se administran en otros módulos):**
- Categorías (Aluminio, Cristal Templado, Persianas, Barandales).
- Líneas/familias de producto por categoría.
- Series de fabricación con su lista de componentes/cortes y sus relaciones fijo/mosquitero (módulo Fabricación).
- Herrajes por serie (módulo Config. Herrajes) y catálogo maestro de herrajes (módulo Catálogo Herrajes).
- Catálogo de Aluminio (perfiles, precio por color, origen).
- Catálogo de Cristales (precio por m²).
- Catálogo de Persianas (familia/modelo/costo).
- Servicios adicionales por categoría.
- Esquemas de pago (plazo + tasa financiera).
- Asesores/vendedores.
- Catálogos fiscales SAT (regímenes, usos de CFDI).
- Factores Base globales (con override por cotización).

**Pantallas:**
- **Nueva Cotización:** datos de cliente/facturación + configurador de partida (categoría → línea → color/cristal → medidas → mosquitero/fijo → servicios) + preview de costo en vivo + botón "agregar partida al carrito".
- **Carrito / Resumen de cotización:** lista de partidas agregadas, descuento, IVA, esquema de pago, totales, acción de imprimir/exportar PDF.
- Este módulo consume en vivo los catálogos de Fabricación, Config. Herrajes, Aluminio, Cristales, Persianas y Servicios — no puede construirse sin ellos.

---

### 2. Visor Precios

Tab vacía / trivial en la app original — solo un contenedor (`visor-transpuesto`) que se llena vía `renderVisor()` (tabla comparativa de precio total final por línea × tipo de cristal, para las medidas actualmente capturadas en el Configurador). No amerita documentación propia por ahora; se retoma si aparece relevante al ver Config. Herrajes/Aluminio/Cristales.

### 3. Fabricación

Pantalla de "ingeniería": define, por cada serie de producto, la lista de piezas de aluminio que hay que cortar (bill of cuts) a partir de las medidas capturadas en el Configurador. Es el catálogo maestro que impulsa tanto el costeo real (Configurador → carrito) como la Orden de Taller.

#### Historias de usuario (borrador)

- Como ingeniero/administrador, defino para cada serie de producto la lista de componentes de aluminio que la conforman (nombre de pieza, cuántas piezas salen, de qué medida se derivan — Largo o Alto — y qué se le descuenta a esa medida para obtener el corte real).
- Como ingeniero, agrego o elimino componentes de una serie cuando cambia su diseño de fabricación.
- Como ingeniero, configuro por serie las constantes de descuento de corte (Zoclo Alto, Zoclo Cabezal, Poste, Traslape, Intermedio, Descuento Fijo, Descuento Zoclo) que usan las reglas de corte de esa serie.
- Como ingeniero, veo en una auditoría el costo total de aluminio, cristal/tela y peso estimado para la línea y medidas actualmente seleccionadas en el Configurador, antes de confirmarlo con el cliente.
- Como administrador, puedo restaurar el desglose de fabricación a los valores por defecto si se corrompió o quedó vacío.

#### Reglas de negocio clave

- **Regla de corte por componente:** cada componente de una serie define `cantidad` (cuántas piezas salen, según medidas), `medida base` (Largo o Alto capturado en el Configurador) y `descuento` (cuánto se le resta a esa medida base para llegar al corte real, ej. reglas por el ancho de zoclo/poste/traslape).
  - **Decisión (heredada de Configurador):** el descuento deja de ser fórmula de texto libre evaluada con `eval`. Se modela como regla estructurada que puede referenciar, por nombre, las **constantes de la serie**: Zoclo Alto, Zoclo Cabezal, Poste, Traslape, Intermedio, Descuento Fijo, Descuento Zoclo — en vez de escribir texto como `"ALTO_C-M_ZOCLO-M_CABEZAL"`.
  - **Decisión:** estas constantes son **configurables por serie** (no un valor único global) y **deben ser el mismo dato y el mismo motor de cálculo** que usa el costeo real del Configurador — hoy no lo son (ver bug abajo).
- **⚠️ Bug identificado a NO replicar:** en el original, el panel "Ajustes Técnicos de Perfiles" (inputs globales de Zoclo/Cabezal/Poste/Traslape/Intermedio) es decorativo — sus valores se sobreescriben inmediatamente con constantes fijas por serie antes de usarse en la vista previa, y en el cálculo de costo real (el que se cobra al cliente y se agrega al carrito) esas variables **ni siquiera existen** en el contexto de evaluación de fórmulas, por lo que cualquier fórmula de corte que las use devuelve 0 silenciosamente. Resultado: la medida de corte que se **muestra** en Fabricación puede no coincidir con la que realmente se **cobra y se manda a Orden de Taller**. En el rebuild, un único motor de cálculo (con las constantes de la serie siempre presentes en el contexto) debe alimentar tanto la vista previa como el costeo real y la orden de taller — nunca dos implementaciones separadas.
- **Piezas "extra" por segmento (L2/L3) en sistemas de 2/3 tramos:** cuando una serie corrediza de 2 o 3 pulgadas tiene un segundo o tercer tramo de largo (L2/L3), se agregan automáticamente piezas adicionales de poste y zoclo para ese tramo, con un descuento fijo de 16 cm. Esto está hardcodeado por nombre de serie en el original ("2 Pulgadas"/"3 Pulgadas"); en el rebuild debe derivarse de una propiedad explícita de la serie (ej. "número de tramos soportados"), no de coincidencia de texto en el nombre.
- **Auditoría en vivo:** el panel de auditoría muestra, para la línea/cristal/medidas actualmente seleccionadas en el Configurador: tipo de material, área total, costo de cristal/tela (costo proveedor vs. precio de venta), y peso estimado. Es una vista de solo lectura derivada del mismo cálculo del Configurador, filtrada a la serie en edición.
- **Restaurar desgloses:** botón que regenera `appData.series` desde una semilla de datos (`dbDesglosesTaller`, ~555 registros de fábrica) — usado cuando el catálogo se corrompe o se necesita resetear a los valores de fábrica. En el original esta semilla vive embebida en el HTML como array JS; existe además un export estático `draft/desglosesTaller.json` con los mismos datos que **no está conectado a la app** (no se hace `fetch` de él) — es solo un respaldo/origen de los datos, útil como fuente para poblar la base de datos real en el rebuild.

#### Clasificación técnica

**Lógica de negocio (lib / dominio):**
- Motor único de evaluación de reglas de corte (cantidad + medida base + descuento estructurado usando constantes de la serie), compartido por Configurador, Fabricación y Orden de Taller.
- Generación automática de piezas extra por tramo (L2/L3) a partir de una propiedad explícita de la serie, no de su nombre.
- Cálculo de auditoría (costo de material, peso estimado) para la línea/medidas en edición.
- Regeneración de catálogo de fabricación desde datos semilla (para restaurar/poblar por primera vez).

**Catálogos / configuración (van a DB):**
- Serie de fabricación: nombre, lista de componentes (pieza, cantidad, medida base, regla de descuento), y sus constantes de corte (Zoclo Alto, Zoclo Cabezal, Poste, Traslape, Intermedio, Descuento Fijo, Descuento Zoclo).
- Relación serie ↔ serie fijo asociada / serie mosquitero asociada (definida en Configurador, pero vive en el catálogo de series).
- Propiedad "número de tramos soportados" por serie (para generar piezas extra L2/L3 sin depender del nombre).
- Semilla de datos de fabricación de fábrica (para poblar/restaurar el catálogo).

**Pantallas:**
- **Fabricación (admin/ingeniería):** editor de componentes por serie (tabla editable: pieza, cantidad, medida base, descuento, resultado de corte), editor de constantes de la serie, panel de auditoría de la línea en edición, acción de restaurar a valores de fábrica.
- Depende del catálogo de Líneas/Categorías (para saber qué series existen) y retroalimenta a Orden de Taller (que reutiliza el mismo desglose ya calculado) y al Configurador (que consume el resultado del motor de corte para calcular costo).

### 4. Config. Herrajes

Define, por cada serie de fabricación, la lista de herrajes/accesorios que lleva (bisagras, rieles, tornillería, vinil, etc.) y en qué cantidad, en función de las medidas. Es al herraje lo que Fabricación es al aluminio: el "bill of materials" de tornillería por serie.

#### Historias de usuario (borrador)

- Como ingeniero, defino para cada serie qué herrajes lleva, con una fórmula de cantidad basada en las medidas (ej. "2 piezas" fijo, o "según intermedios").
- Como ingeniero, si el herraje ya existe en el Catálogo Maestro de Herrajes, el precio de venta se toma automático de ahí (con su factor Nacional/Español); si no existe, capturo un precio manual para esa línea.
- Como administrador, veo el total de venta de herrajes por serie, filtrado a la línea/medidas actualmente seleccionadas en el Configurador.

#### Reglas de negocio clave

- **Resolución de precio con dos fuentes:** por cada herraje de la serie, el sistema primero busca su nombre en el Catálogo Maestro de Herrajes (por coincidencia de texto); si lo encuentra, usa ese precio con el factor de origen correcto (Nacional/Español). Si no lo encuentra, usa un precio manual capturado directamente en esta pantalla.
  - **Decisión (consistente con Fabricación):** la referencia al catálogo maestro debe ser una **relación explícita** (FK a un herraje del catálogo maestro), no una coincidencia de texto — mismo criterio que la relación entre series.
  - **⚠️ Bug menor a corregir:** cuando se usa el precio manual (no encontrado en el maestro), el original siempre aplica el factor "Nacional", sin importar si ese herraje es de origen Español. Debe respetar el origen declarado también en el precio manual.
- **Fórmula de cantidad:** igual que en Fabricación, hoy es texto libre evaluado con `eval` (puede usar variables como área, mosquitero activo, piezas intermedias). Aplica la misma decisión de simplificarla a reglas estructuradas.
- **Semilla inicial por serie:** al crear una serie nueva, si no se le asigna herraje manualmente, se le pone un ítem genérico de "Tornillería Gral." como placeholder — evita listas vacías pero no debe interpretarse como dato real de fabricación.

#### Clasificación técnica

**Lógica de negocio:** resolución de precio (maestro vs. manual) con motor de fórmulas compartido; cálculo de total de herrajes por serie/partida (ya cubierto como `tHerr` en el motor de costeo del Configurador).

**Catálogos / configuración:** lista de herrajes por serie (referencia a herraje del catálogo maestro o precio manual + origen, y regla de cantidad).

**Pantallas:** editor por serie (tabla: clave, descripción/referencia al maestro, fórmula de cantidad, precio, total). Depende de Líneas/Categorías (para listar series) y del Catálogo Maestro de Herrajes (para el precio automático); alimenta el costeo del Configurador y el desglose de Orden de Taller.

---

### 5. Catálogo Herrajes

Catálogo maestro de herrajes/accesorios (nombre, origen Nacional/Español, costo proveedor) usado como fuente de precio por Config. Herrajes.

#### Reglas de negocio clave

- Precio de venta = costo proveedor × Factor Base (Nacional o Español, según origen del herraje) — mismos Factores Base que en Configurador/Fabricación.
- **Aumento Global (%):** botón para subir el costo proveedor de todo el catálogo en un porcentaje de una sola vez (útil cuando el proveedor anuncia un incremento general).
- **⚠️ Bug importante a NO replicar:** el botón "Forzar Carga" de esta pantalla, pensado para "recargar los precios de herrajes", en realidad ejecuta la función que **reinicia TODOS los catálogos del sistema** a sus valores de fábrica (categorías, líneas, aluminio, cristales, servicios, esquemas de pago, asesores, persianas, regímenes fiscales, uso de CFDI) — no solo herrajes. Es una acción destructiva mal etiquetada, sin advertencia clara de su verdadero alcance. En el rebuild, "restaurar catálogo" debe ser una acción explícita, con confirmación clara de qué se va a borrar, y nunca compartir código entre "refrescar un catálogo" y "resetear todo el sistema".

#### Clasificación técnica

**Catálogos / configuración:** catálogo maestro de herrajes (nombre, origen, costo). **Pantallas:** grilla administrable + acción de incremento global de precios (sin el botón destructivo "Forzar Carga" tal como está).

---

### 6. Orden de Taller

Genera la orden de corte/fabricación para el taller: por cada partida del carrito (y también para la partida que se está configurando ahora mismo, como "vista previa"), agrupa y muestra los cortes de aluminio y los herrajes necesarios, lista para imprimir y llevar al área de producción.

#### Historias de usuario (borrador)

- Como jefe de taller, veo por cada partida de la cotización — agrupada por serie — las medidas capturadas, la lista de cortes (pieza, cantidad, medida de corte, posición, descuento aplicado) y los herrajes agrupados (piezas o centímetros, según el tipo de herraje).
- Como asesor, veo una "vista previa" de la partida que estoy configurando en este momento (aunque no la haya agregado al carrito todavía), para validar el desglose de fabricación antes de comprometerla con el cliente.
- Como jefe de taller, imprimo la orden completa con los datos del cliente, asesor y fecha en el encabezado.

#### Reglas de negocio clave

- **Fuente de datos = snapshot congelado:** los cortes y herrajes que se muestran por partida son los que se calcularon y guardaron al momento de agregar la partida al carrito (Configurador → `addToCart`), no un recálculo en vivo. Si después se cambian los catálogos (precios, fórmulas), las partidas ya en el carrito no se actualizan — es una decisión razonable para no mover el precio ya cotizado al cliente, pero implica que la Orden de Taller **no refleja cambios de catálogo posteriores a la cotización**.
- **Vista previa de la partida en edición:** además de las partidas ya en el carrito, se antepone una partida "virtual" con los datos actualmente en el Configurador (aunque no se haya agregado), recalculada en vivo — se distingue visualmente (color distinto) de las partidas ya confirmadas.
- **Sustitución de nombre de herraje por servicio activo:** si la partida tiene activo el servicio "Jaladeras Embutidas", el herraje "Perico" se muestra en la orden como "Jaladera Embutida (Sustituye Perico)" — una regla de presentación específica del negocio (el herraje físico cambia según si se vendió ese servicio).
- **Agrupación de herrajes por partida+serie:** se suman cantidades del mismo herraje y se etiquetan como "Cms" o "Pzas" según si es un herraje que se vende por longitud (vinil, felpa, fascia) o por pieza — de nuevo, distinguido por coincidencia de texto en el nombre; en el rebuild conviene que el catálogo maestro de herrajes declare explícitamente su unidad de venta (pieza vs. metro lineal) en vez de inferirla del nombre.
- Esta pantalla es una **vista derivada**, no dueña de datos propios: no tiene lógica de costeo, solo presenta lo que Configurador + Fabricación + Config. Herrajes ya calcularon.

#### Clasificación técnica

**Lógica de negocio:** agrupación/formateo de cortes y herrajes por partida y serie para producción; regla de sustitución de nombre por servicio activo; documento imprimible de taller (distinto del PDF de cliente: aquí sí se expone el desglose interno).

**Catálogos:** ninguno propio — consume Fabricación, Config. Herrajes y el carrito de Configurador. Se recomienda que el catálogo maestro de herrajes incluya explícitamente su "unidad de venta" (pieza/metro) para no inferirla del nombre.

**Pantallas:** listado de órdenes por partida con acción de impresión; incluye vista previa de la partida en edición.

---

### 7. Aluminio

Catálogo maestro de perfiles de aluminio: por cada perfil, longitud de tramo/barra, origen (Nacional/Español) y costo proveedor por acabado (Natural, Negro, Blanco, Madera). El precio de venta y el precio por metro lineal se derivan aplicando el Factor Base correspondiente (Español o Nacional).

#### Reglas de negocio clave

- El costo (y por tanto el precio) varía por **4 acabados fijos**: Natural, Negro, Blanco, Madera. El selector de color en el Configurador ofrece más opciones (Gris, Satín, Cromo, Oro) que **no tienen columna de costo propia** en este catálogo — pendiente de definir si esos acabados adicionales solo aplican a herrajes/persianas o si el catálogo de Aluminio debe ampliarse para cubrirlos también.
- Precio de venta por acabado = costo proveedor de ese acabado × Factor Base (Español o Nacional, según el campo "Origen" del perfil).
- Precio por metro lineal de venta = precio de venta ÷ longitud del tramo — es el valor que finalmente usa el motor de costeo del Configurador/Fabricación para valuar cada corte.
- **Inconsistencia notada:** a diferencia de Cristales, Herrajes y Persianas, este catálogo no tiene un botón de "Aumento Global (%)" — cualquier ajuste de precio de aluminio hoy se hace perfil por perfil, o vía los Factores Base (que afectan todo el catálogo de golpe pero no permiten subir solo el costo proveedor). Vale la pena decidir si se agrega el mismo mecanismo de incremento global por consistencia.

#### Clasificación técnica

**Catálogos / configuración:** catálogo de perfiles de aluminio (línea/etiqueta, descripción, longitud de tramo, origen, costo por los 4 acabados). **Pantallas:** grilla administrable con columnas de costo proveedor, precio de venta y precio por metro lineal (estas dos últimas calculadas, de solo lectura).

---

### 8. Cristales

Catálogo de precios de cristal/vidrio por hoja: costo de la hoja completa, sus dimensiones (alto × largo) y el área resultante, para derivar un costo por m².

#### Reglas de negocio clave

- Costo por m² = costo de la hoja ÷ (alto × largo de la hoja). El precio de venta por m² aplica el Factor Base de Cristal (o el de Templados/Persianas si la categoría es esa, según vimos en Configurador).
- El área (m² de la hoja) se recalcula automáticamente si se edita alto o largo — es un campo derivado, no debe ser editable directamente.
- **Aumento Global (%):** igual que Herrajes/Persianas, sube el costo proveedor de todas las hojas de una vez.

#### Clasificación técnica

**Catálogos / configuración:** catálogo de cristales (descripción, costo de hoja, alto, largo, área derivada). **Pantallas:** grilla administrable + incremento global de precios.

---

### 9. Persianas

Catálogo de persianas/telas por familia y modelo, con costo por m² y ancho máximo de fabricación por modelo.

#### Reglas de negocio clave

- Precio de venta por m² = costo proveedor × Factor Base de Persianas.
- **Ancho máximo (m):** cada modelo tiene un ancho máximo de fabricación — en el catálogo se captura pero **no vi que el Configurador valide** que la medida capturada no exceda ese máximo (posible partida mal cotizada si se excede el ancho de fabricación del modelo). Vale la pena decidir si el rebuild debe advertir o bloquear cuando la medida excede el máximo del modelo elegido.
- **Aumento Global (%):** igual que Cristales/Herrajes.
- Existe una función de "recuperar catálogo completo" (semilla de fábrica) para restaurar la lista si se pierde, similar a Fabricación.

#### Clasificación técnica

**Catálogos / configuración:** catálogo de persianas (familia, modelo, ancho máximo, costo). **Pantallas:** grilla administrable + incremento global de precios. Se sugiere agregar validación de ancho máximo al momento de cotizar (Configurador) que hoy no existe.

---

### 10. Líneas y Categorías

Administra las Categorías (Aluminio, Cristal Templado, Persianas, Barandales) y las Líneas/Familias de producto dentro de cada categoría — es el catálogo raíz del que cuelgan Fabricación y Config. Herrajes.

#### Reglas de negocio clave

- **El nombre de la línea es hoy la llave primaria compartida entre tres catálogos distintos:** Líneas y Categorías (`dbLineas`), la serie de Fabricación (`appData.series`) y la lista de herrajes por serie (Config. Herrajes). Renombrar una línea obliga a propagar el cambio de nombre en los otros dos catálogos a la vez (el original lo hace con código ad-hoc en el punto de edición).
  - **Decisión (consistente con lo ya acordado):** en el rebuild, Línea/Serie debe ser **una sola entidad con un ID estable**, no tres catálogos enlazados por texto. Esto también resuelve de raíz el problema de "renombrar rompe todo" y es la base que ya asumimos para el emparejamiento Corredizo/Fijo/Mosquitero y para la referencia a herrajes del catálogo maestro.
- **Categorías nuevas:** se agregan con un diálogo nativo del navegador (`prompt()`) — un patrón de UI a modernizar, no una regla de negocio en sí.
- Al crear una línea nueva, automáticamente se le crea una serie de Fabricación vacía asociada — este comportamiento (crear en cascada) sí es una regla de negocio a preservar: no debe poder existir una línea sin su serie de fabricación correspondiente.

#### Clasificación técnica

**Catálogos / configuración:** Categorías (lista fija administrable) y Líneas/Familias (nombre + categoría), como la raíz de la que cuelgan Fabricación y Config. Herrajes vía relación explícita por ID.

**Pantallas:** administración de categorías y líneas, con creación en cascada de la serie de fabricación vacía correspondiente.

---

### 11. Servicios

Catálogo de servicios adicionales cotizables (instalación, retiro, motores, braquets, etc.), filtrados por categoría y activables por partida desde el Configurador.

#### Reglas de negocio clave

- Cada servicio pertenece a una categoría (solo aplica a esa categoría en el Configurador) y tiene un **tipo de cobro**: Unidades, Metros Lineales, Metros Cuadrados o Perfil — determina qué medida de la partida se usa como base para calcular su costo (ya cubierto en el motor de costeo del Configurador: `costo × cantidad-default × base-según-tipo × piezas`).
- **Columna "Venta Directa" engañosa:** en la grilla administrativa se muestra `costo × cantidad-default`, que en realidad es solo una vista previa a cantidad base 1 — no es el precio real que se cobra en una cotización (que depende del área o largo reales de la partida). Conviene renombrarla/aclararla en el rebuild para no confundir al administrador.
- Existe una función de "recuperar catálogo completo" (semilla de fábrica) para restaurar la lista de servicios si se pierde o se necesita repoblar.

#### Clasificación técnica

**Catálogos / configuración:** catálogo de servicios (categoría, concepto, tipo de cobro, cantidad base, costo unitario). **Pantallas:** grilla administrable. El cálculo real del costo de un servicio en una cotización ya está cubierto en la lógica de negocio del Configurador.

---

### 12. Catálogos y PDF

Pantalla misceláneo de configuración general: asesores comerciales, catálogos fiscales del SAT, respaldo/restauración de todos los datos, y el contenido de texto que se imprime en el PDF de cotización (encabezado de sucursal, políticas, notas de facturación, datos bancarios).

#### Reglas de negocio clave

- **Asesores comerciales:** catálogo simple (nombre, teléfono, correo) — es la fuente del selector "Asesor" en el Configurador y aparece en el PDF impreso.
- **Catálogos fiscales SAT (Régimen Fiscal, Uso de CFDI):** listas planas de texto libre ("clave - descripción"), administrables manualmente en vez de sincronizarse con el catálogo oficial del SAT — válido como catálogo editable simple, pero vale la pena decidir si en el rebuild se preincarga con el catálogo vigente del SAT en vez de partir vacío/con una lista corta.
- **Respaldo y restauración — hallazgo importante de arquitectura:** hoy **toda la persistencia de la app vive en el `localStorage` del navegador** (tres claves: catálogos, series de fabricación, herrajes por serie). El botón "Respaldar Todo" exporta esas tres claves a un archivo JSON descargable; "Cargar Respaldo" las reimporta y **fuerza recargar la página**. Esto es, en esencia, el único mecanismo de backup/portabilidad de datos del sistema completo — y también su mayor riesgo (si se borra el navegador o se usa otro dispositivo, se pierde todo si no hay un respaldo manual reciente). En el rebuild esto se reemplaza por una base de datos real con persistencia del lado servidor; el export/import JSON puede conservarse como función de exportación/migración de datos, no como mecanismo primario de respaldo.
- **Contenido del PDF (sucursal, políticas, tiempo de entrega, notas de facturación, datos bancarios):** son bloques de texto libre que se insertan literalmente en la cotización impresa. Funcionalmente son **configuración de negocio de instancia única** (no una lista/catálogo con múltiples registros), y deberían modelarse como un solo registro de "ajustes de la empresa/sucursal" en vez de inputs sueltos.

#### Clasificación técnica

**Catálogos / configuración:** Asesores; catálogos SAT (Régimen Fiscal, Uso de CFDI); Ajustes de empresa/sucursal como registro único (encabezado, políticas, tiempo de entrega, notas de facturación, datos bancarios).

**Lógica de negocio:** exportación/importación de datos como función de migración (ya no como mecanismo de persistencia primario, al pasar de localStorage a base de datos real).

**Pantallas:** administración de asesores y catálogos SAT; pantalla de ajustes de empresa/sucursal (contenido del PDF); acción de exportar/importar datos.

---

## Notas transversales (aplican a varios módulos)

- **Series como entidad única con ID estable:** Líneas (`dbLineas`), series de Fabricación (`appData.series`) y listas de herrajes por serie (Config. Herrajes) son hoy tres catálogos distintos enlazados por *nombre de texto*. Es la causa raíz de varios de los hallazgos anteriores (relaciones frágiles, cascadas de renombrado). Se unifican en una sola entidad "Serie/Línea de producto" con ID estable, de la que cuelgan: sus componentes de corte, sus constantes de fabricación, su lista de herrajes, y sus relaciones a serie-fijo/serie-mosquitero asociadas.
- **Un solo motor de fórmulas/costeo:** hoy existen implementaciones ligeramente distintas del mismo cálculo (vista previa de Fabricación vs. costeo real del Configurador vs. Config. Herrajes) que pueden dar resultados distintos para el mismo dato. El rebuild debe tener **un único motor de cálculo de costos y cortes**, consumido por todas las pantallas (Configurador, Fabricación, Config. Herrajes, Orden de Taller), nunca reimplementado por pantalla.
- **Fórmulas de texto libre evaluadas con `eval` → reglas estructuradas:** decisión ya tomada para cantidad y descuento de corte en Fabricación y Config. Herrajes; elimina el riesgo de seguridad de `eval` y la inconsistencia entre vistas.
- **Persistencia:** todo el sistema original vive en `localStorage` del navegador, sin backend. El rebuild requiere una base de datos real; el export/import JSON del original se reutiliza solo como utilidad de migración de datos existentes, no como diseño de persistencia.
