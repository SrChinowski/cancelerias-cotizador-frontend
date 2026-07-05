import { describe, it, expect } from "vitest";
import { costoCorteAluminio, type PerfilAluminio, type PrecioAcabado } from "../aluminio.js";

describe("costoCorteAluminio", () => {
  it('reproduce exacto el ejemplo trabajado a mano: Poste 2", Nacional, 142cm -> $57.51', () => {
    const perfil: PerfilAluminio = {
      id: "poste-2p",
      descripcion: "Poste 2 Pulgadas",
      longitudTramoM: 6,
      origen: "Nacional",
    };
    const precioAcabado: PrecioAcabado = {
      perfilId: "poste-2p",
      acabado: "Blanco",
      costoProveedor: 180,
    };
    const factoresBase = { AluNacional: 1.35, AluEspanol: 2.5 };

    const costo = costoCorteAluminio(142, perfil, precioAcabado, factoresBase);

    // 180 * 1.35 = 243 (tramo completo)
    // 243 / 6 = 40.5 (por metro)
    // 40.5 * 1.42 = 57.51
    expect(costo).toBeCloseTo(57.51, 2);
  });

  it("perfil Español usa el factor AluEspanol, no AluNacional", () => {
    const perfil: PerfilAluminio = {
      id: "riel-esp",
      descripcion: "Riel Español",
      longitudTramoM: 6,
      origen: "Español",
    };
    const precioAcabado: PrecioAcabado = { perfilId: "riel-esp", acabado: "Natural", costoProveedor: 100 };
    const factoresBase = { AluNacional: 2.5, AluEspanol: 2.2 };

    const costo = costoCorteAluminio(100, perfil, precioAcabado, factoresBase);
    // 100 * 2.2 = 220 ; 220/6 = 36.67 ; * 1m = 36.67
    expect(costo).toBeCloseTo(36.666, 2);
  });

  it("truena claro si falta el factor_base del origen, no calcula silenciosamente en $0", () => {
    const perfil: PerfilAluminio = { id: "x", descripcion: "x", longitudTramoM: 6, origen: "Nacional" };
    const precioAcabado: PrecioAcabado = { perfilId: "x", acabado: "Natural", costoProveedor: 100 };
    expect(() => costoCorteAluminio(100, perfil, precioAcabado, {})).toThrow();
  });
});
