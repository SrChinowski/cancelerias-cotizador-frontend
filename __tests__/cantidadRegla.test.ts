import { describe, it, expect } from "vitest";
import { resolverCantidad } from "../cantidadRegla.js";
import type { MedidasPartida } from "../types.js";

const medidasBase: MedidasPartida = {
  medidas: { L1: 120, alto: 250, intermedios: { largo1: 3, alto: 1 } },
  sistemaFijoMedidas: { L1: 100, alto: 220, intermedios: { largo1: 0, alto: 2 } },
};

describe("resolverCantidad", () => {
  it('"fija" ignora todo lo demás', () => {
    expect(resolverCantidad({ tipo: "fija", valor: 4 }, 0, medidasBase, {})).toBe(4);
  });

  it('"por_intermedios" corredizo/largo1 lee medidas.medidas.intermedios.largo1', () => {
    const cantidad = resolverCantidad(
      { tipo: "por_intermedios", sistema: "corredizo", eje: "largo1" },
      0,
      medidasBase,
      {}
    );
    expect(cantidad).toBe(3);
  });

  it('"por_intermedios" con multiplicador cubre "2 * INT_CORR_L"', () => {
    const cantidad = resolverCantidad(
      { tipo: "por_intermedios", sistema: "corredizo", eje: "largo1", multiplicador: 2 },
      0,
      medidasBase,
      {}
    );
    expect(cantidad).toBe(6);
  });

  it('"por_intermedios" sistema="fijo" lee sistemaFijoMedidas, no medidas', () => {
    const cantidad = resolverCantidad(
      { tipo: "por_intermedios", sistema: "fijo", eje: "alto" },
      0,
      medidasBase,
      {}
    );
    expect(cantidad).toBe(2);
  });

  it('"formula" Duela lisa: (250-15-10+1.8)/12 = 18.9 -> redondeo "arriba" = 19', () => {
    const cantidad = resolverCantidad(
      {
        tipo: "formula",
        redondeo: "arriba",
        operaciones: [
          { tipo: "restar_constante", referencia: "zoclo_alto" },
          { tipo: "restar_constante", referencia: "zoclo_cabezal" },
          { tipo: "sumar_valor", valor: 1.8 },
          { tipo: "dividir_entre", valor: 12 },
        ],
      },
      250, // medida_base = Alto
      medidasBase,
      { zoclo_alto: 15, zoclo_cabezal: 10 }
    );
    expect(cantidad).toBe(19);
  });

  it('"formula" con redondeo "ninguno" preserva el fraccionario', () => {
    const cantidad = resolverCantidad(
      {
        tipo: "formula",
        redondeo: "ninguno",
        operaciones: [{ tipo: "dividir_entre", valor: 12 }],
      },
      226.8,
      medidasBase,
      {}
    );
    expect(cantidad).toBeCloseTo(18.9);
  });
});
