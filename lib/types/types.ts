// ============================================================
// Vocabulario de operaciones — usado tanto en descuento_regla
// como en cantidad_regla.tipo="formula". Un solo lenguaje para
// las dos cosas, como quedó documentado en DATA_MODEL.md sec. 3.
// ============================================================

export type Operacion =
  | { tipo: "restar_valor"; valor: number }
  | { tipo: "sumar_valor"; valor: number }
  | { tipo: "restar_constante"; referencia: string }
  | { tipo: "dividir_entre"; valor: number };

export interface DescuentoRegla {
  operaciones: Operacion[];
}

// ============================================================
// cantidad_regla — cuatro variantes, cada una resuelve "cuántas
// piezas de este componente lleva la partida".
// ============================================================

export interface CantidadReglaFija {
  tipo: "fija";
  valor: number;
}

export interface CantidadReglaPorTramo {
  tipo: "por_tramo";
  piezas_por_tramo: number;
}

export type Eje = "largo1" | "largo2" | "largo3" | "alto";
export type SistemaMedida = "corredizo" | "fijo";

export interface CantidadReglaPorIntermedios {
  tipo: "por_intermedios";
  sistema: SistemaMedida;
  eje: Eje;
  multiplicador?: number; // default 1, cubre "2 * INT_CORR_L"
}

export type Redondeo = "arriba" | "normal" | "ninguno";

export interface CantidadReglaFormula {
  tipo: "formula";
  redondeo: Redondeo;
  operaciones: Operacion[];
}

export type CantidadRegla =
  | CantidadReglaFija
  | CantidadReglaPorTramo
  | CantidadReglaPorIntermedios
  | CantidadReglaFormula;

// ============================================================
// Medidas capturadas en el Configurador (shape de partidas.medidas
// / partidas.sistema_fijo_medidas, DATA_MODEL.md sec. 9)
// ============================================================

export interface Intermedios {
  largo1?: number;
  largo2?: number;
  largo3?: number;
  alto?: number;
}

export interface MedidasSistema {
  L1?: number;
  L2?: number;
  L3?: number;
  alto: number;
  intermedios?: Intermedios;
}

export interface MedidasPartida {
  medidas: MedidasSistema; // sistema Corredizo
  sistemaFijoMedidas?: MedidasSistema | null; // sistema Fijo, nullable
}

// Constantes de una serie (series_constantes: clave -> valor)
export type SerieConstantes = Record<string, number>;

// ============================================================
// Componente de corte (fila de componentes_corte)
// ============================================================

export type MedidaBase = "Largo" | "Alto";

export interface ComponenteCorte {
  id: string;
  pieza: string;
  perfilAluminioId: string | null;
  cristalId: string | null;
  medidaBase: MedidaBase;
  cantidadRegla: CantidadRegla;
  descuentoRegla: DescuentoRegla;
}
