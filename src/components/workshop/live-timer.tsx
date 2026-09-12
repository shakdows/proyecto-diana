'use client';

import { useEffect, useState } from 'react';

/**
 * El cronómetro de la reparación en curso.
 *
 * Solo pinta: el ancla es `startedAt`, una marca del servidor, y los minutos
 * ya trabajados antes de esta sesión llegan en `baseMinutes`. El navegador no
 * acumula nada. Si la tablet cambia de hora, el número salta una vez y vuelve
 * a su sitio en la siguiente carga; lo que NO puede es inflar el tiempo
 * productivo, que es lo que mide §47 y por eso sale de `repair_time_sessions`.
 */
export function LiveTimer({
  startedAt,
  baseMinutes,
  estimatedMinutes,
}: {
  readonly startedAt: Date;
  readonly baseMinutes: number;
  readonly estimatedMinutes: number;
}) {
  const started = startedAt.getTime();

  /* Arranca en el valor del servidor y solo se mueve tras el montaje: partir
     de `Date.now()` en el primer render haría que el servidor y el cliente
     pintaran segundos distintos, que es un error de hidratación. */
  const [seconds, setSeconds] = useState(() => Math.round(baseMinutes * 60));

  useEffect(() => {
    /* `Math.round` sobre la base, no sobre el total: los minutos efectivos
       llegan con un decimal, y sin redondearlos el reloj pintaba
       «01:33:1.9969999999993888». */
    const base = Math.round(baseMinutes * 60);
    const tick = (): void =>
      setSeconds(Math.max(0, base + Math.floor((Date.now() - started) / 1000)));

    /* La primera corrección va por `setTimeout` y no en el cuerpo del efecto:
       así el reloj cuadra con el cliente en el primer fotograma sin provocar
       un render en cascada durante el montaje. */
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [started, baseMinutes]);

  const over = estimatedMinutes > 0 && seconds > estimatedMinutes * 60;

  return (
    <p
      className={`font-mono text-[2.75rem] font-semibold leading-none tabular-nums tracking-tight ${
        over ? 'text-warn-300' : 'text-white'
      }`}
    >
      <time dateTime={`PT${Math.round(seconds)}S`}>{clock(seconds)}</time>
    </p>
  );
}

function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
