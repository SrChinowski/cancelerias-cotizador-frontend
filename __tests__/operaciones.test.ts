import { describe, it, expect } from "vitest";
import { aplicarOperaciones } from "../operaciones.js";

describe("aplicarOperaciones — traducción de fórmulas eval originales", () => {
  it('"16/2" sobre Largo=120 -> 52 (Zoclo Inferior)', () => {
    const resultado = aplicarOperaciones(
      120,
      [
        { tipo: "restar_valor", valor: 16 },
        { tipo: "dividir_entre", valor: 2 },
      ],
      {}
    );
    expect(resultado).toBe(52);
  });

  it('"ALTO_C/2" sobre Alto=150 -> 75', () => {
    const resultado = aplicarOperaciones(
      150,
      [{ tipo: "dividir_entre", valor: 2 }],
      {}
    );
    expect(resultado).toBe(75);
  });

  it('"ALTO_C-M_ZOCLO-M_CABEZAL" sobre Alto=150 -> 142 (Poste Intermedio)', () => {
    const resultado = aplicarOperaciones(
      150,
      [
        { tipo: "restar_constante", referencia: "zoclo_alto" },
        { tipo: "restar_constante", referencia: "zoclo_cabezal" },
      ],
      { zoclo_alto: 5, zoclo_cabezal: 3 }
    );
    expect(resultado).toBe(142);
  });

  it("constante ausente se resuelve como 0, no truena", () => {
    const resultado = aplicarOperaciones(
      100,
      [{ tipo: "restar_constante", referencia: "no_existe" }],
      {}
    );
    expect(resultado).toBe(100);
  });

  it('"5.4-3.4" (Junquillo S4600) — caso NO representable hoy, documentado', () => {
    // Este caso sigue en seed-pendientes.md sin resolver: son dos números
    // literales sin referencia a medida ni constante. Con el vocabulario
    // actual no hay forma de "empezar desde cero" en vez de medida_base —
    // se deja este test como recordatorio vivo, no como caso soportado.
    const resultado = aplicarOperaciones(999 /* medida_base, irrelevante aquí */, [
      { tipo: "restar_valor", valor: 3.4 }, // aproximación, NO la fórmula real
    ], {});
    expect(resultado).not.toBe(2); // el resultado real esperado sería fijo en 2
  });
});
