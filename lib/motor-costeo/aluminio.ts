export interface PerfilAluminio {
  id: string;
  descripcion: string;
  longitudTramoM: number; // longitud de la barra completa, en metros
  origen: "Nacional" | "Español";
}

export interface PrecioAcabado {
  perfilId: string;
  acabado: string;
  costoProveedor: number;
}

/**
 * factor_base: AluNacional | AluEspanol según el origen del perfil.
 * Cristal/Templados/Persianas se manejan en sus propios módulos.
 */
export type FactorAluminio = "AluNacional" | "AluEspanol";
export type FactoresBase = Record<string, number>;

export function factorDeOrigen(origen: "Nacional" | "Español"): FactorAluminio {
  return origen === "Nacional" ? "AluNacional" : "AluEspanol";
}

/**
 * Costo de UN corte de aluminio, dado en la misma cadena que trabajamos
 * a mano con el "Poste Intermedio" (142cm, Nacional, barra 6m, $180 base,
 * factor 1.35 -> $57.51).
 */
export function costoCorteAluminio(
  corteCm: number,
  perfil: PerfilAluminio,
  precioAcabado: PrecioAcabado,
  factoresBase: FactoresBase
): number {
  const factor = factoresBase[factorDeOrigen(perfil.origen)];
  if (factor === undefined) {
    throw new Error(
      `Falta factor_base para origen "${perfil.origen}" del perfil ${perfil.id}`
    );
  }

  const precioTramoCompleto = precioAcabado.costoProveedor * factor;
  const precioPorMetro = precioTramoCompleto / perfil.longitudTramoM;
  const corteM = corteCm / 100;

  return precioPorMetro * corteM;
}
