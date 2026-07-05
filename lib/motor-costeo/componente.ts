import type {
  ComponenteCorte,
  MedidasPartida,
  SerieConstantes,
} from "../types/types.js";
import { aplicarOperaciones } from "./operaciones.js";
import { resolverCantidad } from "./cantidadRegla.js";

export interface CorteResuelto {
  componenteId: string;
  pieza: string;
  medidaBase: "Largo" | "Alto";
  corteCm: number; // largo final de CADA pieza, ya con descuento aplicado
  cantidad: number; // cuántas piezas de ese corte
  perfilAluminioId: string | null;
  cristalId: string | null;
}

/**
 * Toma L1 del sistema correspondiente como medida base. Es una
 * simplificación intencional: hoy la mayoría de los componentes reales
 * usan L1 (ver seed-pendientes.md sec.4 — los casos de L2/L3 puros siguen
 * pendientes de asignación de negocio). Cuando esa asignación exista,
 * este es el único punto del motor que hay que tocar.
 */
function medidaBaseDe(medidas: MedidasPartida, medidaBase: "Largo" | "Alto"): number {
  return medidaBase === "Alto" ? medidas.medidas.alto : medidas.medidas.L1 ?? 0;
}

export function resolverComponente(
  componente: ComponenteCorte,
  medidas: MedidasPartida,
  constantes: SerieConstantes
): CorteResuelto {
  const medidaBaseValor = medidaBaseDe(medidas, componente.medidaBase);

  const corteCm = aplicarOperaciones(
    medidaBaseValor,
    componente.descuentoRegla.operaciones,
    constantes
  );

  const cantidad = resolverCantidad(
    componente.cantidadRegla,
    medidaBaseValor,
    medidas,
    constantes
  );

  return {
    componenteId: componente.id,
    pieza: componente.pieza,
    medidaBase: componente.medidaBase,
    corteCm,
    cantidad,
    perfilAluminioId: componente.perfilAluminioId,
    cristalId: componente.cristalId,
  };
}
