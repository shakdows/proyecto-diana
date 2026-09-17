import { bodyStyleOf, type BodyStyle } from '@/components/art/vehicle-art';
import type { ViewId } from '@/features/inspection/services/views';
import { cn } from '@/lib/utils/cn';

/**
 * La silueta del vehículo, ahora de RESPALDO.
 *
 * ── Por qué sigue existiendo ───────────────────────────────────────────────
 *
 * La inspección usa fotografías (`InspectionCanvas`), y para un automóvil son
 * mucho mejores: se ve la puerta de verdad y no un rectángulo que la
 * representa. Pero las fotos son de un sedán, y una retroexcavadora no es un
 * sedán: enseñarle al operario un coche donde hay una máquina, con puntos
 * señalando piezas que ese equipo no tiene, sería peor que el dibujo.
 *
 * Así que el dibujo se queda para `maquinaria`, que es genérico a propósito.
 * Es el mismo criterio de `AssetImage`: la foto cuando existe y sirve; el
 * dibujo cuando no.
 *
 * ── El dibujo NO es el dato ────────────────────────────────────────────────
 *
 * Los puntos de inspección no se pintan aquí dentro: van encima, en HTML,
 * colocados por porcentaje. Si mañana se rehace esta silueta, los puntos
 * siguen donde tienen que estar y no se mueve ningún registro.
 */

const VIEWBOX: Readonly<Record<ViewId, string>> = {
  superior: '0 0 220 460',
  'lateral-i': '0 0 420 200',
  'lateral-d': '0 0 420 200',
  frontal: '0 0 300 220',
  posterior: '0 0 300 220',
};

export function InspectionArt({
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
  const body = bodyStyleOf(vehicle, equipmentKind);

  return (
    <svg
      viewBox={VIEWBOX[view]}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${vehicle}, vista ${view}`}
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={`chapa-${view}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="60%" stopColor="#dde5ee" />
          <stop offset="100%" stopColor="#c3cedb" />
        </linearGradient>
        <linearGradient id={`cristal-${view}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {view === 'superior' && <Superior body={body} />}
      {/*
        El costado derecho es el mismo dibujo visto desde el otro lado: se
        espeja. Dibujar dos siluetas casi idénticas garantiza que dentro de un
        mes se corrija una y no la otra.
      */}
      {(view === 'lateral-i' || view === 'lateral-d') && (
        <g transform={view === 'lateral-d' ? 'translate(420,0) scale(-1,1)' : undefined}>
          <Lateral body={body} />
        </g>
      )}
      {view === 'frontal' && <Frontal body={body} />}
      {view === 'posterior' && <Posterior body={body} />}
    </svg>
  );
}

/** Trazo común: la chapa de cada vista usa su propio degradado por identificador. */
function chapa(view: ViewId) {
  return { fill: `url(#chapa-${view})`, stroke: '#94a3b8', strokeWidth: 2 } as const;
}

function cristal(view: ViewId) {
  return { fill: `url(#cristal-${view})`, stroke: '#475569', strokeWidth: 1.5 } as const;
}

/* ------------------------------------------------------------------ *
 * Superior — el mismo lienzo de 220 × 460 del diagrama de daños
 * ------------------------------------------------------------------ */

function Superior({ body }: { readonly body: BodyStyle }) {
  const v: ViewId = 'superior';
  const caja = body === 'pickup';

  return (
    <g>
      {/* Carrocería vista desde arriba, morro arriba. */}
      <rect x="28" y="12" width="164" height="436" rx="46" {...chapa(v)} />

      {/* Parabrisas y luneta: los dos cristales grandes. */}
      <path d="M62 160 L158 160 L150 124 L70 124 Z" {...cristal(v)} />
      <path d="M62 284 L158 284 L150 320 L70 320 Z" {...cristal(v)} />

      {/* Techo o caja de carga, según la carrocería. */}
      {caja ? (
        <rect x="58" y="284" width="104" height="120" rx="8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      ) : (
        <rect x="62" y="164" width="96" height="116" rx="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      )}

      {/* Separación de las puertas: es lo que hace legible el costado. */}
      <line x1="30" y1="132" x2="58" y2="132" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="30" y1="222" x2="58" y2="222" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="30" y1="312" x2="58" y2="312" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="162" y1="132" x2="190" y2="132" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="162" y1="222" x2="190" y2="222" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="162" y1="312" x2="190" y2="312" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Espejos. */}
      <rect x="18" y="140" width="14" height="10" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="188" y="140" width="14" height="10" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Paragolpes. */}
      <rect x="46" y="14" width="128" height="16" rx="8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="46" y="416" width="128" height="16" rx="8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Lateral — costado izquierdo, morro a la izquierda
 * ------------------------------------------------------------------ */

function Lateral({ body }: { readonly body: BodyStyle }) {
  const v: ViewId = 'lateral-i';

  const perfil =
    body === 'pickup'
      ? 'M18 132 L30 96 L118 92 L146 52 L246 52 L252 92 L392 96 L400 132 Z'
      : body === 'suv'
        ? 'M18 134 L30 96 L104 92 L150 46 L280 46 L330 94 L400 100 L402 134 Z'
        : 'M18 136 L34 104 L112 100 L164 52 L268 52 L320 100 L398 106 L400 136 Z';

  return (
    <g>
      <path d={perfil} {...chapa(v)} />

      {/* Cristales: parabrisas, laterales y luneta. */}
      {body === 'pickup' ? (
        <>
          <path d="M124 90 L150 58 L192 58 L192 90 Z" {...cristal(v)} />
          <path d="M200 58 L242 58 L246 90 L200 90 Z" {...cristal(v)} />
          <rect x="256" y="58" width="128" height="34" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M112 96 L154 52 L196 52 L196 96 Z" {...cristal(v)} />
          <path d="M204 52 L248 52 L252 96 L204 96 Z" {...cristal(v)} />
          <path d="M260 52 L292 52 L322 96 L260 96 Z" {...cristal(v)} />
        </>
      )}

      {/* Corte de las puertas. */}
      <line x1="198" y1="56" x2="198" y2="130" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="254" y1="56" x2="254" y2="130" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Ruedas. Van al final para quedar por encima de la chapa. */}
      <circle cx="104" cy="140" r="30" fill="#334155" stroke="#1e293b" strokeWidth="3" />
      <circle cx="104" cy="140" r="13" fill="#94a3b8" />
      <circle cx="314" cy="140" r="30" fill="#334155" stroke="#1e293b" strokeWidth="3" />
      <circle cx="314" cy="140" r="13" fill="#94a3b8" />

      {/* Espejo. */}
      <path d="M140 88 L128 84 L128 94 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Frontal
 * ------------------------------------------------------------------ */

function Frontal({ body }: { readonly body: BodyStyle }) {
  const v: ViewId = 'frontal';
  const alto = body === 'pickup' || body === 'suv';

  return (
    <g>
      <rect x="34" y={alto ? 30 : 42} width="232" height={alto ? 156 : 142} rx="18" {...chapa(v)} />

      {/* Parabrisas. */}
      <path d="M62 78 L238 78 L224 42 L76 42 Z" {...cristal(v)} />

      {/* Rejilla. */}
      <rect x="96" y="118" width="108" height="26" rx="6" fill="#475569" stroke="#334155" strokeWidth="2" />
      <line x1="96" y1="131" x2="204" y2="131" stroke="#64748b" strokeWidth="2" />

      {/* Faros. El izquierdo es el del VEHÍCULO: cae a la derecha. */}
      <rect x="44" y="112" width="44" height="22" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <rect x="212" y="112" width="44" height="22" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />

      {/* Paragolpes y placa. */}
      <rect x="34" y="156" width="232" height="30" rx="10" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      <rect x="122" y="162" width="56" height="18" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Espejos. */}
      <rect x="18" y="76" width="20" height="12" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="262" y="76" width="20" height="12" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Posterior
 * ------------------------------------------------------------------ */

function Posterior({ body }: { readonly body: BodyStyle }) {
  const v: ViewId = 'posterior';
  const caja = body === 'pickup';

  return (
    <g>
      <rect x="34" y="34" width="232" height="152" rx="16" {...chapa(v)} />

      {/* Luneta, o el testero de la caja en una camioneta. */}
      {caja ? (
        <rect x="58" y="52" width="184" height="36" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      ) : (
        <path d="M66 86 L234 86 L222 48 L78 48 Z" {...cristal(v)} />
      )}

      {/* Portón. */}
      <rect x="58" y="96" width="184" height="54" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />

      {/* Faroles. Por detrás, el izquierdo del vehículo cae a la izquierda. */}
      <rect x="44" y="100" width="40" height="26" rx="5" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" />
      <rect x="216" y="100" width="40" height="26" rx="5" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" />

      {/* Paragolpes, placa y escape. */}
      <rect x="34" y="156" width="232" height="30" rx="10" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      <rect x="122" y="162" width="56" height="18" rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="86" y="188" width="26" height="10" rx="5" fill="#64748b" />
    </g>
  );
}
