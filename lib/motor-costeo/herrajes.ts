import type { CantidadRegla, MedidasPartida, SerieConstantes } from "../types/types.js";
import { resolverCantidad } from "./cantidadRegla.js";

export interface HerrajePorSerie {
  id: string;
  herrajeId: string | null;
  nombreManual: string | null;
  precioManual: number | null;
  formulaCantidad: CantidadRegla;
}

export interface HerrajeCatalogo {
  id: string;
  nombre: string;
  costoProveedor: number;
  unidadVenta: "pieza" | "metro";
}

/**
 * ⚠️ Supuesto pendiente de confirmar: a diferencia de Aluminio/Cristal/
 * Persianas, no existe un factor_base para Herrajes (el panel "Factores
 * Base" del HTML original solo trae 5 valores: AluEsp, AluNac, Crudo,
 * Templados, Persianas — ninguno de Herrajes). Este motor asume que
 * `costo_proveedor` en herrajes_catalogo YA es el precio de venta final,
 * sin markup adicional. Si resulta que sí debía llevar un factor, es un
 * cambio de una sola línea aquí, no una re-arquitectura.
 */
export function costoHerraje(
  herrajePorSerie: HerrajePorSerie,
  catalogo: Map<string, HerrajeCatalogo>,
  medidas: MedidasPartida,
  constantes: SerieConstantes
): { nombre: string; cantidad: number; precioUnitario: number; costo: number } {
  const cantidad = resolverCantidad(
    herrajePorSerie.formulaCantidad,
    0, // los herrajes no tienen medida_base, solo aplica en tipo="formula" (raro en herrajes)
    medidas,
    constantes
  );

  if (herrajePorSerie.herrajeId) {
    const herraje = catalogo.get(herrajePorSerie.herrajeId);
    if (!herraje) {
      throw new Error(`Herraje ${herrajePorSerie.herrajeId} no está en el catálogo.`);
    }
    return {
      nombre: herraje.nombre,
      cantidad,
      precioUnitario: herraje.costoProveedor,
      costo: herraje.costoProveedor * cantidad,
    };
  }

  // Sin match en catálogo maestro: usa precio manual (o el dummy 999999
  // imposible-de-ignorar si tampoco eso se capturó, ver seed-pendientes.md).
  const precioUnitario = herrajePorSerie.precioManual ?? 0;
  return {
    nombre: herrajePorSerie.nombreManual ?? "(sin nombre)",
    cantidad,
    precioUnitario,
    costo: precioUnitario * cantidad,
  };
}
