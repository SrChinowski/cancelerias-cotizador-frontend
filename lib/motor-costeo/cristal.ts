import type { CorteResuelto } from "./componente.js";

export interface Cristal {
  id: string;
  descripcion: string;
  costoHoja: number;
  areaHojaM2: number; // alto * largo del catálogo (columna generada en DB)
}

/**
 * A diferencia del aluminio (corte lineal, 1 dimensión), el cristal
 * necesita área — por eso en los datos reales cada hoja aparece dos veces:
 * una fila con medidaBase="Largo" y otra con medidaBase="Alto". Esta
 * función las empareja por (cristalId + pieza) y calcula el costo real.
 *
 * Lanza si encuentra un grupo incompleto (falta Largo o Alto) — mejor
 * fallar ruidoso que cobrar mal un cristal.
 */
export function agruparYCostearCristales(
  cortes: CorteResuelto[],
  catalogo: Map<string, Cristal>
): { pieza: string; areaM2: number; costo: number }[] {
  const cortesDeCristal = cortes.filter((c) => c.cristalId !== null);

  const grupos = new Map<string, CorteResuelto[]>();
  for (const corte of cortesDeCristal) {
    const clave = `${corte.cristalId}::${corte.pieza}`;
    const grupo = grupos.get(clave) ?? [];
    grupo.push(corte);
    grupos.set(clave, grupo);
  }

  const resultados: { pieza: string; areaM2: number; costo: number }[] = [];

  for (const [clave, grupo] of grupos) {
    const largo = grupo.find((c) => c.medidaBase === "Largo");
    const alto = grupo.find((c) => c.medidaBase === "Alto");

    if (!largo || !alto) {
      throw new Error(
        `Grupo de cristal incompleto ("${clave}"): se requiere un corte ` +
          `Largo y uno Alto de la misma pieza, se encontraron ${grupo.length}.`
      );
    }

    const cristal = catalogo.get(largo.cristalId!);
    if (!cristal) {
      throw new Error(`Cristal ${largo.cristalId} no está en el catálogo.`);
    }

    const areaM2 = (largo.corteCm / 100) * (alto.corteCm / 100);
    const costoPorM2 = cristal.costoHoja / cristal.areaHojaM2;
    const costo = areaM2 * costoPorM2 * largo.cantidad;

    resultados.push({ pieza: largo.pieza, areaM2, costo });
  }

  return resultados;
}
