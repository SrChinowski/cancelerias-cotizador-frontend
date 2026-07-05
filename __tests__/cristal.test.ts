import { describe, it, expect } from "vitest";
import { agruparYCostearCristales, type Cristal } from "../cristal.js";
import type { CorteResuelto } from "../componente.js";

describe("agruparYCostearCristales", () => {
  const catalogo = new Map<string, Cristal>([
    [
      "cr-6mm",
      { id: "cr-6mm", descripcion: "Templado Claro 6mm", costoHoja: 650, areaHojaM2: 1 },
    ],
  ]);

  it("empareja Largo+Alto de la misma pieza y calcula área x costo/m2", () => {
    const cortes: CorteResuelto[] = [
      {
        componenteId: "c1",
        pieza: "Cristal templado 6mm (Hoja (X))",
        medidaBase: "Largo",
        corteCm: 100,
        cantidad: 1,
        perfilAluminioId: null,
        cristalId: "cr-6mm",
      },
      {
        componenteId: "c2",
        pieza: "Cristal templado 6mm (Hoja (X))",
        medidaBase: "Alto",
        corteCm: 150,
        cantidad: 1,
        perfilAluminioId: null,
        cristalId: "cr-6mm",
      },
    ];

    const [resultado] = agruparYCostearCristales(cortes, catalogo);

    // area = 1m x 1.5m = 1.5 m2 ; costo/m2 = 650/1 = 650 ; costo = 975
    expect(resultado.areaM2).toBeCloseTo(1.5);
    expect(resultado.costo).toBeCloseTo(975);
  });

  it("truena si falta el corte Alto de la pareja (mejor ruidoso que mal cobrado)", () => {
    const cortes: CorteResuelto[] = [
      {
        componenteId: "c1",
        pieza: "Cristal templado 6mm (Hoja (X))",
        medidaBase: "Largo",
        corteCm: 100,
        cantidad: 1,
        perfilAluminioId: null,
        cristalId: "cr-6mm",
      },
    ];
    expect(() => agruparYCostearCristales(cortes, catalogo)).toThrow();
  });

  it("ignora por completo los cortes que no son de cristal", () => {
    const cortes: CorteResuelto[] = [
      {
        componenteId: "c1",
        pieza: "Riel 2 Pulgadas",
        medidaBase: "Largo",
        corteCm: 100,
        cantidad: 1,
        perfilAluminioId: "perfil-1",
        cristalId: null,
      },
    ];
    expect(agruparYCostearCristales(cortes, catalogo)).toEqual([]);
  });
});
