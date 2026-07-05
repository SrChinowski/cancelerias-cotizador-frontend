import type { ComponenteCorte, MedidasPartida, SerieConstantes } from "../types/types.js";
import { resolverComponente } from "./componente.js";
import { costoCorteAluminio, type PerfilAluminio, type PrecioAcabado, type FactoresBase } from "./aluminio.js";
import { agruparYCostearCristales, type Cristal } from "./cristal.js";
import { costoHerraje, type HerrajePorSerie, type HerrajeCatalogo } from "./herrajes.js";

export interface CatalogosPartida {
  perfiles: Map<string, PerfilAluminio>;
  preciosAcabado: Map<string, PrecioAcabado>; // key: `${perfilId}::${acabado}`
  cristales: Map<string, Cristal>;
  herrajesCatalogo: Map<string, HerrajeCatalogo>;
  factoresBase: FactoresBase;
}

export interface CostoSnapshot {
  aluminio: { pieza: string; corteCm: number; cantidad: number; costo: number }[];
  cristal: { pieza: string; areaM2: number; costo: number }[];
  herrajes: { nombre: string; cantidad: number; precioUnitario: number; costo: number }[];
  subtotalAluminio: number;
  subtotalCristal: number;
  subtotalHerrajes: number;
  subtotal: number;
  calculadoEn: string; // ISO timestamp — mapea a partidas.precios_calculados_en
}

export function calcularCostoSnapshot(
  componentes: ComponenteCorte[],
  herrajesPorSerie: HerrajePorSerie[],
  medidas: MedidasPartida,
  constantes: SerieConstantes,
  acabado: string,
  catalogos: CatalogosPartida
): CostoSnapshot {
  const cortes = componentes.map((c) => resolverComponente(c, medidas, constantes));

  // --- Aluminio ---
  const cortesAluminio = cortes.filter((c) => c.perfilAluminioId !== null);
  const aluminio = cortesAluminio.map((corte) => {
    const perfil = catalogos.perfiles.get(corte.perfilAluminioId!);
    if (!perfil) {
      throw new Error(`Perfil ${corte.perfilAluminioId} no está en el catálogo.`);
    }
    const precioAcabado = catalogos.preciosAcabado.get(`${perfil.id}::${acabado}`);
    if (!precioAcabado) {
      throw new Error(`Sin precio para perfil ${perfil.id} en acabado "${acabado}".`);
    }
    const costoUnitario = costoCorteAluminio(corte.corteCm, perfil, precioAcabado, catalogos.factoresBase);
    return {
      pieza: corte.pieza,
      corteCm: corte.corteCm,
      cantidad: corte.cantidad,
      costo: costoUnitario * corte.cantidad,
    };
  });

  // --- Cristal ---
  const cristal = agruparYCostearCristales(cortes, catalogos.cristales);

  // --- Herrajes ---
  const herrajes = herrajesPorSerie.map((h) =>
    costoHerraje(h, catalogos.herrajesCatalogo, medidas, constantes)
  );

  const subtotalAluminio = aluminio.reduce((s, a) => s + a.costo, 0);
  const subtotalCristal = cristal.reduce((s, c) => s + c.costo, 0);
  const subtotalHerrajes = herrajes.reduce((s, h) => s + h.costo, 0);

  return {
    aluminio,
    cristal,
    herrajes,
    subtotalAluminio,
    subtotalCristal,
    subtotalHerrajes,
    subtotal: subtotalAluminio + subtotalCristal + subtotalHerrajes,
    calculadoEn: new Date().toISOString(),
  };
}
