# Cancelerías Cotizador — Contexto del proyecto

Rebuild de un cotizador de manufactura (aluminio/cristal/persianas/barandales)
de una app HTML vibe-codeada, hacia Next.js (export estático) + Supabase.

**Lee esto siempre. Lee los 3 documentos de abajo antes de tocar código o
schema — en ese orden, según lo que estés haciendo:**

| Documento | Qué contiene | Cuándo leerlo |
|---|---|---|
| `BUSINESS_LOGIC.md` | Análisis de negocio original, reglas de fabricación, catálogos, roles | Antes de cualquier duda de "¿por qué existe esto?" |
| `ARCHITECTURE.md` | Stack, patrones, estructura de carpetas, decisiones técnicas | Antes de escribir código nuevo |
| `DATA_MODEL.md` | Schema completo de Postgres, shapes de JSON, traducción de fórmulas | Antes de tocar `supabase/` o el motor de costeo |
| `supabase/seed-pendientes.md` | Todo lo que sigue sin resolver del seed, con candidatos propuestos | Antes de asumir que un dato "no existe" |

## Los 5 principios no negociables (de DATA_MODEL.md sec. 0)

1. Serie/Línea es una sola entidad con ID estable — nunca se enlaza por texto.
2. Un solo motor de costeo/cortes, sin implementaciones paralelas.
3. Cero `eval`/`new Function` de fórmulas de texto libre — todo es regla JSON estructurada.
4. Partidas guardan snapshot congelado al confirmarse — Orden de Taller nunca recalcula en vivo sobre lo confirmado.
5. Persistencia en Postgres real — nada de `localStorage`.

## Disciplina de trabajo (aprendida a pulso en este proyecto, no la rompas)

- **Nunca inventes un match de datos ambiguo.** Si un nombre no calza exacto contra un catálogo, repórtalo en `seed-pendientes.md` con tu mejor candidato y el razonamiento — no lo apliques solo porque "seguro es eso".
- **Las migraciones de Supabase son de solo-agregar.** Un cambio de schema es un archivo nuevo con timestamp mayor, nunca se edita una migración ya corrida.
- **Antes de dar por bueno un seed o migración, verifícalo de verdad** — corre `supabase db reset` local (transacción real, no solo lectura del SQL) o al menos un chequeo de integridad referencial. "Se ve bien" no es "ya se verificó".
- **Los edge cases de negocio no bloquean el desarrollo del sistema.** Si algo requiere una decisión humana (nombre ambiguo, regla rara, catálogo faltante), el sistema se construye igual y ese hueco se resuelve después desde el admin — no te quedes atorado puliendo el 100% de la data antes de construir la pantalla que la va a dejar editable.
- **Un tipo de regla o operador nuevo en el motor de costeo (`operaciones`, `cantidad_regla`) se propone antes de implementarse**, no se agrega silenciosamente en medio de una tarea de datos.

## Subagentes disponibles

- **`ba`** — refinamiento de negocio, historias de usuario, preguntas para el dueño del negocio. Nunca toca schema ni código.
- **`dev-be`** — implementación de backend: migraciones, seed, RLS, motor de costeo. Sigue `DATA_MODEL.md`/`ARCHITECTURE.md` al pie de la letra, nunca decide ambigüedad de negocio por su cuenta.

Invócalos explícito cuando el trabajo caiga claramente en su carril: *"Usa el agente dev-be para generar la migración de X"*. La delegación automática por descripción no es 100% confiable todavía — mejor ser explícito.
