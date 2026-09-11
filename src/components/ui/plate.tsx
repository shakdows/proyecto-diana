import { displayPlate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Placa del vehículo, o código de flota en maquinaria.
 *
 * Es el identificador por el que se habla del trabajo en el taller: nadie dice
 * «la orden 154», dicen «la ABC-123». Por eso tiene tratamiento propio y no es
 * una celda de texto más.
 *
 * Fondo grafito y texto claro, como una matrícula real: en una tabla de ocho
 * filas el ojo salta de placa en placa sin leer nada más, que es exactamente
 * cómo se busca un vehículo en una lista. Monoespaciada y con separación entre
 * letras porque es un código de ancho fijo que se compara carácter a carácter
 * con lo que hay pintado en la chapa.
 */
export function Plate({
  value,
  size = 'md',
  className,
}: {
  readonly value: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-chip',
        'bg-graphite-900 font-mono font-semibold tracking-[0.08em] text-graphite-50',
        'ring-1 ring-inset ring-white/10',
        size === 'sm' && 'px-1.5 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        size === 'lg' && 'px-3.5 py-1.5 text-lg tracking-[0.12em]',
        className,
      )}
    >
      {displayPlate(value)}
    </span>
  );
}

/** Código de orden, cotización u OC. Se cita, no se reconoce: pesa menos. */
export function Code({
  value,
  className,
}: {
  readonly value: string;
  readonly className?: string;
}) {
  return (
    <span className={cn('font-mono text-xs tracking-tight text-fg-subtle', className)}>
      {value}
    </span>
  );
}

/**
 * Cliente corporativo.
 *
 * Una flota de BBVA o de Mitsui se gestiona distinto que el coche de un
 * particular —facturación, autorizaciones, informes—, así que el asesor
 * necesita verlo sin abrir la orden. Es una marca discreta, no un logotipo:
 * el diseño del sistema no cambia por empresa (§clientes corporativos).
 */
export function CorporateBadge({
  name,
  className,
}: {
  readonly name: string;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-chip border border-border',
        'bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase',
        'tracking-[0.06em] text-fg-muted',
        className,
      )}
    >
      {name}
    </span>
  );
}
