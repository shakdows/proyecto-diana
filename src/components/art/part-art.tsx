import { cn } from '@/lib/utils/cn';

/**
 * Ilustración de la pieza o del hallazgo.
 *
 * Sustituye a la fotografía de evidencia mientras no haya archivos reales. Se
 * dibuja la PIEZA, no una foto genérica de taller: en la cotización, lo que
 * hace que el cliente entienda qué está aprobando es reconocer el disco de
 * freno, no ver una llave inglesa.
 *
 * Fondo oscuro a propósito: así una evidencia dibujada y una fotografía real
 * —que en un taller sale oscura, bajo el vehículo— conviven en la misma
 * cuadrícula sin que una parezca un error.
 */

export type PartKind = 'freno' | 'disco' | 'suspension' | 'filtro' | 'neumatico' | 'motor' | 'generico';

/** Deduce la pieza a partir del texto del hallazgo. */
export function partKindOf(text: string): PartKind {
  const t = text.toLowerCase();
  if (/pastilla|caliper|cáliper/u.test(t)) return 'freno';
  if (/disco/u.test(t)) return 'disco';
  if (/amortiguador|suspensi|rótula|rotula|muelle/u.test(t)) return 'suspension';
  if (/filtro|aceite|lubric/u.test(t)) return 'filtro';
  if (/neumático|neumatico|llanta|alineamiento|balanceo|rueda/u.test(t)) return 'neumatico';
  if (/motor|culata|embrague|turbo|inyector/u.test(t)) return 'motor';
  return 'generico';
}

export function PartArt({
  label,
  kind,
  className,
}: {
  readonly label: string;
  readonly kind?: PartKind;
  readonly className?: string;
}) {
  const resolved = kind ?? partKindOf(label);

  return (
    <svg
      viewBox="0 0 160 120"
      role="img"
      aria-label={label}
      className={cn('h-full w-full', className)}
    >
      <defs>
        <radialGradient id={`lamp-${resolved}`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0b1118" />
        </radialGradient>
        <linearGradient id={`metal-${resolved}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <rect width="160" height="120" fill={`url(#lamp-${resolved})`} />

      {resolved === 'freno' && <Brake />}
      {resolved === 'disco' && <Disc />}
      {resolved === 'suspension' && <Shock />}
      {resolved === 'filtro' && <Filter />}
      {resolved === 'neumatico' && <Tyre />}
      {resolved === 'motor' && <Engine />}
      {resolved === 'generico' && <Generic />}
    </svg>
  );
}

const RADII = [44, 36, 26] as const;

function Disc() {
  return (
    <g transform="translate(80 60)">
      {RADII.map((r, i) => (
        <circle
          key={r}
          r={r}
          fill="none"
          stroke={`url(#metal-disco)`}
          strokeWidth={i === 0 ? 9 : 2}
          opacity={i === 0 ? 1 : 0.55}
        />
      ))}
      <circle r="15" fill="url(#metal-disco)" />
      <circle r="5" fill="#0b1118" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle
          key={deg}
          cx={Math.cos((deg * Math.PI) / 180) * 21}
          cy={Math.sin((deg * Math.PI) / 180) * 21}
          r="3"
          fill="#0b1118"
        />
      ))}
    </g>
  );
}

function Brake() {
  return (
    <g transform="translate(80 60)">
      <circle r="42" fill="none" stroke="url(#metal-freno)" strokeWidth="8" />
      <circle r="30" fill="none" stroke="url(#metal-freno)" strokeWidth="2" opacity="0.5" />
      <circle r="14" fill="url(#metal-freno)" />
      <circle r="4.5" fill="#0b1118" />
      {/* Cáliper montado sobre el disco: es lo que distingue «pastillas». */}
      <path
        d="M30 -26h20c6 0 10 4 10 10v32c0 6-4 10-10 10H30z"
        fill="#334155"
        stroke="#64748b"
        strokeWidth="1.5"
      />
      <rect x="28" y="-18" width="7" height="36" rx="2" fill="#f97316" opacity="0.85" />
    </g>
  );
}

function Shock() {
  return (
    <g transform="translate(80 12)">
      <rect x="-6" y="0" width="12" height="30" rx="6" fill="url(#metal-suspension)" />
      <rect x="-16" y="28" width="32" height="52" rx="10" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      {/* Muelle helicoidal, insinuado con cinco vueltas. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse
          key={i}
          cx="0"
          cy={34 + i * 11}
          rx="26"
          ry="6"
          fill="none"
          stroke="url(#metal-suspension)"
          strokeWidth="5"
          opacity="0.9"
        />
      ))}
      <rect x="-14" y="88" width="28" height="12" rx="5" fill="url(#metal-suspension)" />
    </g>
  );
}

function Filter() {
  return (
    <g transform="translate(80 60)">
      <rect x="-34" y="-34" width="68" height="68" rx="10" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      {/* Plisado: las líneas verticales son la firma visual de un filtro. */}
      {[-26, -18, -10, -2, 6, 14, 22].map((x) => (
        <rect key={x} x={x} y="-26" width="5" height="52" rx="2" fill="url(#metal-filtro)" opacity="0.8" />
      ))}
      <rect x="-34" y="-34" width="68" height="9" rx="4" fill="url(#metal-filtro)" />
      <rect x="-34" y="25" width="68" height="9" rx="4" fill="url(#metal-filtro)" />
    </g>
  );
}

function Tyre() {
  return (
    <g transform="translate(80 60)">
      <circle r="46" fill="#0f172a" stroke="#1e293b" strokeWidth="10" />
      {Array.from({ length: 16 }, (_, i) => i * 22.5).map((deg) => (
        <rect
          key={deg}
          x="-2.5"
          y="-48"
          width="5"
          height="11"
          rx="2"
          fill="#334155"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle r="26" fill="url(#metal-neumatico)" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <path
          key={deg}
          d="M0 -22 6 -6 0 2 -6 -6z"
          fill="#0b1118"
          opacity="0.55"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle r="7" fill="#0b1118" />
    </g>
  );
}

function Engine() {
  return (
    <g transform="translate(80 60)">
      <rect x="-40" y="-22" width="80" height="46" rx="8" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      {[-28, -10, 8, 26].map((x) => (
        <rect key={x} x={x} y="-38" width="14" height="20" rx="3" fill="url(#metal-motor)" />
      ))}
      <rect x="-40" y="-24" width="80" height="7" rx="3" fill="url(#metal-motor)" />
      <circle cx="-22" cy="2" r="7" fill="#0b1118" opacity="0.6" />
      <circle cx="4" cy="2" r="7" fill="#0b1118" opacity="0.6" />
      <circle cx="28" cy="6" r="11" fill="none" stroke="url(#metal-motor)" strokeWidth="4" />
    </g>
  );
}

function Generic() {
  return (
    <g transform="translate(80 60)">
      <circle r="34" fill="none" stroke="url(#metal-generico)" strokeWidth="7" />
      <circle r="12" fill="url(#metal-generico)" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect
          key={deg}
          x="-3"
          y="-34"
          width="6"
          height="13"
          rx="2"
          fill="url(#metal-generico)"
          transform={`rotate(${deg})`}
        />
      ))}
    </g>
  );
}
