import type { Operacion, SerieConstantes } from "../types/types.js";

/**
 * Aplica una secuencia de operaciones sobre un valor inicial.
 * Esto es literalmente lo que reemplaza al `new Function(...)` / `eval()`
 * del HTML original — mismo poder expresivo, cero riesgo de código
 * arbitrario, y cada paso es inspeccionable/testeable por separado.
 */
export function aplicarOperaciones(
  valorInicial: number,
  operaciones: Operacion[],
  constantes: SerieConstantes
): number {
  return operaciones.reduce((valor, op) => {
    switch (op.tipo) {
      case "restar_valor":
        return valor - op.valor;
      case "sumar_valor":
        return valor + op.valor;
      case "restar_constante":
        return valor - (constantes[op.referencia] ?? 0);
      case "dividir_entre":
        return valor / op.valor;
      default: {
        // Exhaustividad: si agregamos un tipo de operación nuevo y
        // olvidamos manejarlo aquí, TypeScript truena en build, no
        // en producción silenciosamente.
        const _exhaustive: never = op;
        throw new Error(`Operación no reconocida: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }, valorInicial);
}
