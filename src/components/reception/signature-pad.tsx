'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import { MIN_SIGNATURE_POINTS } from '@/features/reception/services/acta';
import { cn } from '@/lib/utils/cn';

/**
 * Donde firma el cliente.
 *
 * ── Por qué eventos de puntero y no de ratón ni de tacto ───────────────────
 *
 * Porque es la MISMA firma con el dedo en una tablet, con el lápiz y con el
 * ratón en el mostrador, y `pointerdown/move/up` cubre los tres sin escribir
 * tres veces lo mismo ni tener que decidir en qué aparato está uno.
 *
 * `touch-action: none` no es cosmético: sin él, el primer trazo hacia abajo
 * lo interpreta el navegador como «desplazar la página» y la firma sale
 * cortada, que es justo el momento en que quien firma pierde la confianza.
 *
 * ── Por qué el lienzo se dimensiona a mano ─────────────────────────────────
 *
 * Un `<canvas>` estirado por CSS dibuja borroso: su resolución interna no
 * cambia con el tamaño en pantalla. Se fija contra `devicePixelRatio` para
 * que el trazo salga nítido en la tablet, que es donde se va a firmar.
 */
export function SignaturePad({
  onChange,
  disabled = false,
}: {
  /** Devuelve el PNG, o `null` si el lienzo quedó vacío. */
  readonly onChange: (dataUrl: string | null) => void;
  readonly disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const puntos = useRef(0);
  const [hayTrazo, setHayTrazo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#151719';
  }, []);

  const posicion = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const empezar = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx === undefined || ctx === null) return;
    /* Capturar el puntero: sin esto, salirse del lienzo a media firma deja el
       trazo colgado y el siguiente toque lo continúa desde donde se fue. */
    e.currentTarget.setPointerCapture(e.pointerId);
    dibujando.current = true;
    const { x, y } = posicion(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!dibujando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx === undefined || ctx === null) return;
    const { x, y } = posicion(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    puntos.current += 1;
    if (!hayTrazo && puntos.current >= MIN_SIGNATURE_POINTS) setHayTrazo(true);
  };

  const terminar = (): void => {
    if (!dibujando.current) return;
    dibujando.current = false;
    /* Un trazo de cuatro puntos no es una firma: es un dedo apoyado sin
       querer, y darlo por bueno deja actas firmadas con una mancha. */
    onChange(puntos.current >= MIN_SIGNATURE_POINTS ? (canvasRef.current?.toDataURL('image/png') ?? null) : null);
  };

  const borrar = (): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas == null || ctx == null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    puntos.current = 0;
    setHayTrazo(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative rounded-panel border-2 border-dashed bg-surface',
          hayTrazo ? 'border-ok-500/50' : 'border-border-strong',
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          className={cn(
            'block h-44 w-full rounded-panel',
            /* Sin esto el primer trazo hacia abajo desplaza la página y la
               firma sale cortada. */
            'touch-none',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair',
          )}
        />

        {!hayTrazo && (
          <p className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-sm text-fg-subtle">
            <PenLine aria-hidden className="size-5" />
            Firma aquí con el dedo o el ratón
          </p>
        )}

        {/* La raya sobre la que se firma, como en el papel. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-9 border-b border-border-strong"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-subtle">
          Al firmar, el cliente acepta el estado en que se recibe el vehículo.
        </p>
        <button
          type="button"
          onClick={borrar}
          disabled={!hayTrazo}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium',
            'transition-colors duration-150',
            hayTrazo
              ? 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
              : 'cursor-not-allowed text-fg-subtle',
          )}
        >
          <Eraser aria-hidden className="size-3.5" />
          Borrar y repetir
        </button>
      </div>
    </div>
  );
}
