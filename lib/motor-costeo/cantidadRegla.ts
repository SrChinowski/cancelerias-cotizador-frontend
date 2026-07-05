import type {
  CantidadRegla,
  MedidasPartida,
  SerieConstantes,
  Redondeo,
} from "../types/types.js";
import { aplicarOperaciones } from "./operaciones.js";

function aplicarRedondeo(valor: number, redondeo: Redondeo): number {
  switch (redondeo) {
    case "arriba":
      return Math.ceil(valor);
    case "normal":
      return Math.round(valor);
    case "ninguno":
      return valor;
  }
}

/**
 * Resuelve cuántas piezas de un componente lleva la partida.
 *
 * @param medidaBaseValor - el valor de Largo o Alto ya resuelto para ESTE
 *   componente (L1, L2 o L3 según corresponda — la selección de cuál
 *   segmento usar vive fuera de esta función, en el motor principal).
 */
export function resolverCantidad(
  regla: CantidadRegla,
  medidaBaseValor: number,
  medidas: MedidasPartida,
  constantes: SerieConstantes
): number {
  switch (regla.tipo) {
    case "fija":
      return regla.valor;

    case "por_tramo":
      // Piezas que solo existen cuando el cancel arma en esquina (L2/L3
      // capturados). Cuenta cuántos tramos adicionales a L1 están presentes
      // y multiplica por piezas_por_tramo. Ver DATA_MODEL.md sec.3 — este
      // camino sigue siendo el menos probado contra data real (ver nota en
      // seed-pendientes.md sec.4, pendiente de asignación caso por caso).
      const tramosExtra =
        (medidas.medidas.L2 ? 1 : 0) + (medidas.medidas.L3 ? 1 : 0);
      return regla.piezas_por_tramo * tramosExtra;

    case "por_intermedios": {
      const bloque =
        regla.sistema === "fijo"
          ? medidas.sistemaFijoMedidas
          : medidas.medidas;
      const valor = bloque?.intermedios?.[regla.eje] ?? 0;
      return valor * (regla.multiplicador ?? 1);
    }

    case "formula": {
      const resultado = aplicarOperaciones(
        medidaBaseValor,
        regla.operaciones,
        constantes
      );
      return aplicarRedondeo(resultado, regla.redondeo);
    }
  }
}
