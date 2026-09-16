/**
 * Lo que la recepción anotó, visto sobre el vehículo.
 *
 * ── Por qué no hay una tabla nueva ─────────────────────────────────────────
 *
 * Porque el dato ya existe. La recepción guarda daños por zona
 * (`DamageMark`) y las fotos por punto viven en su propia ranura de
 * evidencia. Crear «puntos de inspección» como entidad aparte obligaría a
 * mantener dos versiones de la misma verdad, y la segunda siempre es la que
 * se queda vieja.
 *
 * Este módulo TRADUCE: coge lo anotado y lo coloca sobre las vistas. Si mañana
 * el diagnóstico quiere pintar sus propios puntos, aporta sus hotspots y el
 * visor los pinta igual —no sabe de dónde vienen—.
 *
 * ── Ausencia de marca no es «conforme» ─────────────────────────────────────
 *
 * Una zona sin daño puede significar dos cosas MUY distintas: que se revisó y
 * está bien, o que nadie la miró. Solo se puede decir la primera si la
 * recepción llegó a cerrarse. Pintar en verde lo que nadie revisó es
 * justamente la mentira que un checklist existe para evitar.
 *
 * Dominio PURO.
 */

import {
  kindInfo,
  type DamageMark,
  type ZoneId,
} from '@/features/reception/services/damage-map';
import { PLACEMENTS } from './placement';
import type { Hotspot, InspectionStatus } from './hotspots';

/** Un rayón pide una mirada; una rotura es un problema. */
export function statusForDamage(mark: DamageMark): InspectionStatus {
  return kindInfo(mark.kind).severity === 'grave' ? 'problema' : 'revisar';
}

export interface InspectionInput {
  readonly damage: readonly DamageMark[];
  /**
   * `true` cuando la recepción se cerró: entonces «sin marca» significa
   * revisado y conforme. Mientras siga abierta, significa sin mirar.
   */
  readonly reviewed: boolean;
  /** Fotos por punto, por identificador. */
  readonly photos?: Readonly<Record<string, number>>;
  readonly videos?: Readonly<Record<string, number>>;
  /** Observación escrita, por identificador. */
  readonly notes?: Readonly<Record<string, string>>;
  readonly by?: string;
  readonly at?: string;
  /** A dónde lleva «Ver diagnóstico». Sin destino, el botón no se pinta. */
  readonly hrefFor?: (id: string) => string | undefined;
}

/**
 * Construye los puntos de TODAS las vistas.
 *
 * Una zona que sale en dos vistas —el capó, arriba y de frente— produce dos
 * puntos con el MISMO `id`. Es correcto: son el mismo hecho dibujado dos
 * veces, y por eso los dos llevan el mismo estado y la misma observación.
 */
export function buildHotspots(input: InspectionInput): readonly Hotspot[] {
  const porZona = new Map<ZoneId, DamageMark>();
  for (const m of input.damage) porZona.set(m.zone, m);

  return PLACEMENTS.map((p): Hotspot => {
    const marca = p.zone === undefined ? undefined : porZona.get(p.zone);
    const status = resolveStatus(marca, input.reviewed);
    const note = input.notes?.[p.id] ?? (marca === undefined ? undefined : kindInfo(marca.kind).label);
    const href = input.hrefFor?.(p.id);

    return {
      id: p.id,
      view: p.view,
      x: p.x,
      y: p.y,
      label: p.label,
      status,
      ...(note === undefined ? {} : { note }),
      ...(input.photos?.[p.id] === undefined ? {} : { photos: input.photos[p.id] }),
      ...(input.videos?.[p.id] === undefined ? {} : { videos: input.videos[p.id] }),
      ...(input.by === undefined ? {} : { by: input.by }),
      ...(input.at === undefined ? {} : { at: input.at }),
      ...(href === undefined ? {} : { href }),
    };
  });
}

function resolveStatus(marca: DamageMark | undefined, reviewed: boolean): InspectionStatus {
  if (marca !== undefined) return statusForDamage(marca);
  return reviewed ? 'ok' : 'pendiente';
}

/**
 * Las fotos de la recepción, por zona.
 *
 * La ranura la decide la recepción y aquí solo se reexporta, para que quien
 * pinta la inspección no tenga que saber cómo se arma el nombre —ni volver a
 * equivocarse con el guion de la placa—.
 */
export { partPhotoAnchor as damagePhotoAnchor } from '@/features/reception/services/slots';
