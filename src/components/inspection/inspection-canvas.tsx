import Image from 'next/image';
import { DEFAULT_VIEW, viewById, type ViewId } from '@/features/inspection/services/views';
import { InspectionArt } from './inspection-art';
import { cn } from '@/lib/utils/cn';

/**
 * El vehículo sobre el que se inspecciona: la fotografía de esa vista.
 *
 * ── Foto para vehículos, dibujo para maquinaria ────────────────────────────
 *
 * Las cinco fotografías son de un sedán. Para un automóvil eso es infinitamente
 * mejor que una silueta: se ve la puerta, el faro y el paragolpes de verdad, y
 * quien inspecciona no tiene que traducir un rectángulo. Para una
 * retroexcavadora sería MENTIRA, y de la peor clase: la pantalla enseñaría un
 * coche donde hay una máquina, y los puntos señalarían piezas que ese equipo
 * no tiene. Ahí sigue mandando el dibujo, que es genérico a propósito.
 *
 * Es el mismo criterio de `AssetImage`: la foto cuando existe y sirve; el
 * dibujo como respaldo honesto.
 *
 * ── La foto NO es el dato ──────────────────────────────────────────────────
 *
 * Los puntos no se pintan aquí dentro: van encima, en HTML, colocados por
 * porcentaje. Cambiar la fotografía mueve los puntos en pantalla y no toca ni
 * un registro.
 */
export function InspectionCanvas({
  vehicle,
  view,
  equipmentKind = 'vehiculo',
  className,
}: {
  readonly vehicle: string;
  readonly view: ViewId;
  readonly equipmentKind?: 'vehiculo' | 'maquinaria';
  readonly className?: string;
}) {
  if (equipmentKind === 'maquinaria') {
    return (
      <InspectionArt
        vehicle={vehicle}
        view={view}
        equipmentKind={equipmentKind}
        className={className}
      />
    );
  }

  const v = viewById(view);

  return (
    <Image
      src={v.photo}
      alt={`${vehicle}, vista ${v.label.toLowerCase()}`}
      fill
      /*
       * El marco tiene la MISMA proporción que la foto, así que `contain` no
       * deja banda por ninguno de los dos lados. Se usa `contain` y no `cover`
       * porque si algún día una foto entra con otra proporción, `cover`
       * recortaría el vehículo en silencio y los puntos señalarían al aire;
       * `contain` lo enseña entero y el desajuste se ve enseguida.
       */
      className={cn('object-contain', className)}
      sizes="(max-width: 640px) 100vw, 640px"
      /* La primera vista se ve al abrir: cargarla tarde deja el marco en blanco. */
      priority={view === DEFAULT_VIEW}
    />
  );
}
