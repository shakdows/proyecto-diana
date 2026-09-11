import { cn } from '@/lib/utils/cn';

/**
 * Avatar por iniciales.
 *
 * Sin fotografías: el taller no tiene un banco de retratos y un icono genérico
 * repetido en cada fila no distingue a un técnico de otro. Dos iniciales sí.
 *
 * El color no es aleatorio ni decorativo: sale de un hash estable del nombre,
 * de modo que Carlos Mendoza es SIEMPRE el mismo tono en todas las pantallas y
 * el ojo aprende a reconocerlo sin leer.
 *
 * Cuadrado redondeado, no círculo: el círculo es la forma por defecto de
 * cualquier plantilla, y aquí convive con chips y placas de esquina suave.
 */

const TONES = [
  'bg-brand-100 text-brand-800',
  'bg-ok-100 text-ok-700',
  'bg-warn-100 text-warn-700',
  'bg-wait-100 text-wait-700',
  'bg-graphite-100 text-graphite-700',
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

/** Hash estable: el mismo nombre da el mismo tono en cada carga y cada máquina. */
function toneOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? TONES[0];
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  readonly name: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-control font-medium',
        size === 'sm' && 'size-6 text-[0.625rem]',
        size === 'md' && 'size-8 text-xs',
        size === 'lg' && 'size-11 text-sm',
        toneOf(name),
        className,
      )}
    >
      <span aria-hidden>{initialsOf(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Varios avatares solapados, con recuento cuando sobran. */
export function AvatarGroup({
  names,
  max = 3,
  className,
}: {
  readonly names: readonly string[];
  readonly max?: number;
  readonly className?: string;
}) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;

  return (
    <span className={cn('flex items-center', className)}>
      {shown.map((name) => (
        <Avatar
          key={name}
          name={name}
          size="sm"
          className="-ml-1.5 ring-2 ring-surface first:ml-0"
        />
      ))}
      {rest > 0 && (
        <span className="-ml-1.5 grid size-6 place-items-center rounded-control bg-graphite-200 text-[0.625rem] font-medium text-graphite-700 ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </span>
  );
}
