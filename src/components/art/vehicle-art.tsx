import { cn } from '@/lib/utils/cn';

/**
 * Ilustración del vehículo.
 *
 * Dibujada, no fotografiada. Tres razones, en orden de peso:
 *
 * 1. Un taller no tiene banco de fotos de cada modelo, y la foto real del
 *    vehículo del cliente se toma en recepción —llega DESPUÉS de esta
 *    pantalla, no antes—.
 * 2. Escala sin pixelarse: la misma pieza sirve a 52 px en una fila y a 300
 *    en la cabecera.
 * 3. Pesa menos de 2 KB y no hace una petición.
 *
 * La silueta se elige por CARROCERÍA, no por marca: dibujar un Hilux
 * distinguible de un L200 sería falso —son la misma foto para cualquiera que
 * no mire la parrilla— y además obligaría a un dibujo nuevo por cada modelo
 * que entre al taller.
 */

export type BodyStyle = 'pickup' | 'suv' | 'sedan' | 'maquinaria';

/** Deduce la carrocería del nombre del modelo. */
export function bodyStyleOf(vehicle: string, kind: 'vehiculo' | 'maquinaria'): BodyStyle {
  if (kind === 'maquinaria') return 'maquinaria';
  const v = vehicle.toLowerCase();
  if (/hilux|l200|frontier|ranger|amarok|d-?max/u.test(v)) return 'pickup';
  if (/tucson|sportage|zs|x-?trail|rav|duster|tracker|creta/u.test(v)) return 'suv';
  return 'sedan';
}

export function VehicleArt({
  vehicle,
  kind = 'vehiculo',
  fit = 'contain',
  className,
}: {
  readonly vehicle: string;
  readonly kind?: 'vehiculo' | 'maquinaria';
  /**
   * `cover` recorta los márgenes y llena la caja, como haría una fotografía
   * encuadrada. En una miniatura cuadrada, `contain` deja el vehículo del
   * tamaño de una hormiga rodeado de aire.
   */
  readonly fit?: 'contain' | 'cover';
  readonly className?: string;
}) {
  const body = bodyStyleOf(vehicle, kind);

  return (
    <svg
      viewBox="0 0 320 150"
      preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
      role="img"
      aria-label={vehicle}
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={`body-${body}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`glass-${body}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Sombra de apoyo: sin ella el vehículo flota. */}
      <ellipse cx="160" cy="132" rx="126" ry="8" fill="#0f172a" opacity="0.07" />

      {body === 'pickup' && <Pickup />}
      {body === 'suv' && <Suv />}
      {body === 'sedan' && <Sedan />}
      {body === 'maquinaria' && <Excavator />}

      {body !== 'maquinaria' && <Wheels front={92} rear={232} />}
    </svg>
  );
}

function Wheels({ front, rear }: { readonly front: number; readonly rear: number }) {
  return (
    <>
      {[front, rear].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={118} r="20" fill="#1e293b" />
          <circle cx={cx} cy={118} r="11" fill="#94a3b8" />
          <circle cx={cx} cy={118} r="4.5" fill="#475569" />
        </g>
      ))}
    </>
  );
}

function Pickup() {
  return (
    <g>
      {/*
        Lo que hace pickup a una pickup es el ESCALÓN: la tolva arranca muy por
        debajo del techo de la cabina. Sin ese salto el dibujo se lee como
        familiar, que es lo que pasaba antes.
      */}
      {/* Cabina */}
      <path
        d="M28 118V90c0-6 4-11 10-12l22-3 24-28c4-5 10-7 16-7h50c7 0 13 3 17 9l18 26v43z"
        fill="url(#body-pickup)"
      />
      {/* Tolva, con el borde superior a 86 y la pared exterior marcada */}
      <path d="M185 86h104c5 0 9 4 9 9v23h-113z" fill="url(#body-pickup)" />
      <rect x="185" y="86" width="113" height="7" rx="3" fill="#94a3b8" opacity="0.55" />
      <rect x="196" y="97" width="92" height="3" rx="1.5" fill="#94a3b8" opacity="0.35" />
      {/* Lunas: parabrisas inclinado y ventanilla recta */}
      <path d="M104 50h38v26H82z" fill="url(#glass-pickup)" opacity="0.92" />
      <path d="M150 50h28c4 0 7 2 9 6l13 20h-50z" fill="url(#glass-pickup)" opacity="0.92" />
      <rect x="24" y="94" width="14" height="10" rx="4" fill="#fbbf24" />
      <rect x="290" y="96" width="9" height="9" rx="3" fill="#ef4444" opacity="0.85" />
    </g>
  );
}

function Suv() {
  return (
    <g>
      <path
        d="M32 118V90c0-7 5-12 12-13l22-3 28-30c5-5 11-8 18-8h62c8 0 15 4 19 11l19 30 26 4c8 1 14 7 14 15v22z"
        fill="url(#body-suv)"
      />
      <path d="M112 50h42v26H88z" fill="url(#glass-suv)" opacity="0.9" />
      <path d="M162 50h34c5 0 9 2 11 7l11 19h-56z" fill="url(#glass-suv)" opacity="0.9" />
      <path d="M228 58h12c4 0 7 2 9 6l6 12h-27z" fill="url(#glass-suv)" opacity="0.9" />
      <rect x="28" y="94" width="14" height="9" rx="4" fill="#fbbf24" />
      <rect x="248" y="94" width="10" height="9" rx="3" fill="#ef4444" opacity="0.8" />
    </g>
  );
}

function Sedan() {
  return (
    <g>
      <path
        d="M34 118V96c0-7 5-12 12-13l26-4 30-26c5-4 11-6 17-6h56c8 0 15 3 20 9l22 23 28 4c8 1 13 7 13 14v21z"
        fill="url(#body-sedan)"
      />
      <path d="M118 56h40v25H96z" fill="url(#glass-sedan)" opacity="0.9" />
      <path d="M166 56h30c4 0 8 2 11 5l18 20h-59z" fill="url(#glass-sedan)" opacity="0.9" />
      <rect x="30" y="98" width="14" height="8" rx="4" fill="#fbbf24" />
      <rect x="252" y="98" width="10" height="8" rx="3" fill="#ef4444" opacity="0.8" />
    </g>
  );
}

function Excavator() {
  return (
    <g>
      {/* Oruga, torreta y pluma: los tres rasgos que la hacen reconocible. */}
      <rect x="54" y="104" width="180" height="26" rx="13" fill="#334155" />
      <circle cx="76" cy="117" r="9" fill="#64748b" />
      <circle cx="212" cy="117" r="9" fill="#64748b" />
      {[104, 132, 160, 188].map((cx) => (
        <circle key={cx} cx={cx} cy="122" r="6" fill="#64748b" />
      ))}
      <path d="M84 104V78c0-5 4-9 9-9h108c5 0 9 4 9 9v26z" fill="url(#body-maquinaria)" />
      <path d="M104 74h44v26h-52z" fill="url(#glass-maquinaria)" opacity="0.9" />
      <path
        d="M200 76 268 38l10 14-52 34z"
        fill="url(#body-maquinaria)"
      />
      <path d="M262 48l26 30-16 16-24-28z" fill="#94a3b8" />
      <path d="M246 70l30 32-8 8-30-30z" fill="#64748b" />
    </g>
  );
}
