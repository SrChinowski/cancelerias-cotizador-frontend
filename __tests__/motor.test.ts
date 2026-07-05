import { describe, it, expect } from "vitest";
import { calcularCostoSnapshot, type CatalogosPartida } from "../motor.js";
import type { ComponenteCorte, MedidasPartida } from "../types.js";
import type { HerrajePorSerie } from "../herrajes.js";

describe("calcularCostoSnapshot — integración de punta a punta", () => {
  const medidas: MedidasPartida = {
    medidas: { L1: 120, alto: 150, intermedios: {} },
    sistemaFijoMedidas: null,
  };
  const constantes = { zoclo_alto: 5, zoclo_cabezal: 3 };

  const componentes: ComponenteCorte[] = [
    {
      // Zoclo Inferior: Largo, "16/2" -> 2 piezas de 52cm
      id: "comp-zoclo",
      pieza: "Zoclo Inferior",
      perfilAluminioId: "poste-2p",
      cristalId: null,
      medidaBase: "Largo",
      cantidadRegla: { tipo: "fija", valor: 2 },
      descuentoRegla: {
        operaciones: [
          { tipo: "restar_valor", valor: 16 },
          { tipo: "dividir_entre", valor: 2 },
        ],
      },
    },
    {
      // Cristal: par Largo + Alto de la misma hoja
      id: "comp-cristal-l",
      pieza: "Cristal templado 6mm (Hoja (X))",
      perfilAluminioId: null,
      cristalId: "cr-6mm",
      medidaBase: "Largo",
      cantidadRegla: { tipo: "fija", valor: 1 },
      descuentoRegla: { operaciones: [{ tipo: "restar_valor", valor: 20 }] },
    },
    {
      id: "comp-cristal-a",
      pieza: "Cristal templado 6mm (Hoja (X))",
      perfilAluminioId: null,
      cristalId: "cr-6mm",
      medidaBase: "Alto",
      cantidadRegla: { tipo: "fija", valor: 1 },
      descuentoRegla: { operaciones: [{ tipo: "restar_valor", valor: 10 }] },
    },
  ];

  const herrajesPorSerie: HerrajePorSerie[] = [
    {
      id: "hps-1",
      herrajeId: "tornillo-1",
      nombreManual: null,
      precioManual: null,
      formulaCantidad: { tipo: "fija", valor: 4 },
    },
  ];

  const catalogos: CatalogosPartida = {
    perfiles: new Map([
      ["poste-2p", { id: "poste-2p", descripcion: "Poste 2 Pulgadas", longitudTramoM: 6, origen: "Nacional" }],
    ]),
    preciosAcabado: new Map([
      ["poste-2p::Blanco", { perfilId: "poste-2p", acabado: "Blanco", costoProveedor: 180 }],
    ]),
    cristales: new Map([
      ["cr-6mm", { id: "cr-6mm", descripcion: "Templado Claro 6mm", costoHoja: 650, areaHojaM2: 1 }],
    ]),
    herrajesCatalogo: new Map([
      ["tornillo-1", { id: "tornillo-1", nombre: "Tornillo 10x1", costoProveedor: 0.8, unidadVenta: "pieza" }],
    ]),
    factoresBase: { AluNacional: 1.35, AluEspanol: 2.5 },
  };

  it("calcula subtotales por material y el gran total, sin tronar", () => {
    const snapshot = calcularCostoSnapshot(
      componentes,
      herrajesPorSerie,
      medidas,
      constantes,
      "Blanco",
      catalogos
    );

    // Aluminio: Largo=120, (120-16)/2=52cm, cantidad=2
    // costo unitario: 180*1.35=243; /6=40.5/m; 0.52m*40.5=21.06; x2=42.12
    expect(snapshot.subtotalAluminio).toBeCloseTo(42.12, 1);

    // Cristal: Largo=120-20=100cm=1m, Alto=150-10=140cm=1.4m
    // area=1.4m2; costo/m2=650; costo=910
    expect(snapshot.subtotalCristal).toBeCloseTo(910, 0);

    // Herrajes: 4 tornillos x $0.8 = 3.2
    expect(snapshot.subtotalHerrajes).toBeCloseTo(3.2, 2);

    expect(snapshot.subtotal).toBeCloseTo(
      snapshot.subtotalAluminio + snapshot.subtotalCristal + snapshot.subtotalHerrajes
    );
    expect(snapshot.calculadoEn).toBeTruthy();
  });

  it("truena con mensaje claro si el acabado pedido no tiene precio cargado", () => {
    expect(() =>
      calcularCostoSnapshot(componentes, herrajesPorSerie, medidas, constantes, "Cromo", catalogos)
    ).toThrow(/Cromo/);
  });
});
