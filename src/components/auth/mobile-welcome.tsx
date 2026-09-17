'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { HERO_PHOTO, IVORY } from '@/features/brand/hero';
import { cn } from '@/lib/utils/cn';

/**
 * La portada del móvil.
 *
 * ── Qué pasaba ─────────────────────────────────────────────────────────────
 *
 * La fotografía del taller solo existía de `lg` para arriba: en un teléfono se
 * ocultaba entera y lo primero que veía alguien era un formulario de correo y
 * contraseña sobre fondo liso. La mitad que dice de quién es esto —el rótulo
 * pintado en la pared, la promesa— se perdía justo en el aparato desde el que
 * más gente entra.
 *
 * ── Por qué va FIJA y no en el flujo ───────────────────────────────────────
 *
 * Con `min-h-dvh` dentro del documento quedaba una franja clara al pie en
 * Android. No era un fallo de medida: `dvh` es el alto DINÁMICO, y la barra de
 * direcciones de Chrome se retrae al desplazar. El viewport crece unos
 * cincuenta píxeles, la portada se queda con el alto de antes y por debajo
 * asoma el fondo crema del documento.
 *
 * Fijarla lo resuelve de raíz y además dice la verdad sobre lo que es: una
 * pantalla de bienvenida no es contenido que se desplace. De paso desaparece
 * el rebote de arrastrar hacia abajo.
 *
 * ── Sin logotipo encima ────────────────────────────────────────────────────
 *
 * El rótulo y el lema YA ESTÁN en la pared de la fotografía. Superponerlos
 * sería decir dos veces lo mismo, una encima de la otra, y taparía justo la
 * parte de la imagen que lo dice mejor. Es la misma razón por la que la
 * columna de escritorio tampoco lo lleva.
 *
 * De `lg` para arriba NO cambia nada: `lg:contents` disuelve la envoltura y la
 * rejilla de dos columnas queda como estaba. Esta portada no llega a existir.
 */

/** Lo que dura el fundido al entrar. Por debajo de 200 ms se lee como un corte. */
const SALIDA_MS = 260;

export function MobileWelcome({ children }: { readonly children: ReactNode }) {
  const [fase, setFase] = useState<'portada' | 'saliendo' | 'acceso'>('portada');

  const entrar = useCallback((): void => {
    setFase('saliendo');
  }, []);

  useEffect(() => {
    if (fase !== 'saliendo') return undefined;
    const id = setTimeout(() => setFase('acceso'), SALIDA_MS);
    return () => clearTimeout(id);
  }, [fase]);

  /*
   * Mientras la portada cubre la pantalla, el documento de debajo no se
   * desplaza. Sin esto se puede arrastrar el formulario oculto por detrás y el
   * teléfono responde con el rebote, que delata que hay algo más ahí abajo.
   *
   * SOLO en móvil. La portada no existe de `lg` para arriba, así que bloquear
   * el documento allí sería un efecto secundario de una pantalla que no está.
   * Hoy no se notaría —el login de escritorio mide justo la ventana—, y ese es
   * exactamente el tipo de cosa que deja de no notarse el día que la pantalla
   * crece un poco.
   *
   * Se escucha el cambio de consulta porque girar la tablet cruza el corte.
   */
  useEffect(() => {
    if (fase === 'acceso') return undefined;

    const movil = window.matchMedia('(max-width: 1023.98px)');
    const aplicar = (): void => {
      document.body.style.overflow = movil.matches ? 'hidden' : '';
    };

    aplicar();
    movil.addEventListener('change', aplicar);
    return () => {
      movil.removeEventListener('change', aplicar);
      document.body.style.overflow = '';
    };
  }, [fase]);

  return (
    <>
      {fase !== 'acceso' && <Portada onEnter={entrar} saliendo={fase === 'saliendo'} />}

      <div
        className={cn(
          'lg:contents',
          fase === 'portada' && 'hidden',
          /* Entra a la vez que la portada se va: sin el cruce, se ve el fondo
             del documento en blanco durante un cuarto de segundo. */
          fase === 'saliendo' && 'animate-fade-in',
        )}
      >
        {children}
      </div>
    </>
  );
}

function Portada({
  onEnter,
  saliendo,
}: {
  readonly onEnter: () => void;
  readonly saliendo: boolean;
}) {
  return (
    <section
      aria-hidden={saliendo}
      className={cn(
        /* `fixed` y no `min-h-dvh`: ver la explicación de arriba. */
        'fixed inset-0 z-30 flex flex-col justify-end overflow-hidden bg-graphite-950 lg:hidden',
        'transition-opacity ease-snap',
        saliendo ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${SALIDA_MS}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fondo local ya
          recortado y comprimido; el optimizador no aporta y añade una petición. */}
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden
        /* Es lo ÚNICO que se ve al abrir: va antes que nada en la cola. */
        fetchPriority="high"
        decoding="async"
        /*
         * En vertical el recorte se lleva el ANCHO, no el alto: de una foto
         * apaisada en una pantalla de 393 × 852 sobrevive una franja estrecha.
         * Se ancla al 28 % y no al centro porque ahí está el rótulo pintado en
         * la pared; centrarlo dejaría fuera la única parte de la imagen que
         * dice de quién es el taller.
         */
        className="absolute inset-0 -z-20 size-full object-[28%_center] object-cover"
      />

      {/*
        Un solo velo, de abajo arriba y más cargado que el de escritorio: aquí
        el texto y el botón viven en el tercio inferior, sobre el suelo
        reflectante, que es la zona más clara de la fotografía.
      */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(7_8_10/0.92)_0%,rgb(7_8_10/0.70)_30%,rgb(7_8_10/0.22)_62%,rgb(7_8_10/0.04)_100%)]"
      />

      {/* `env(safe-area-inset-bottom)` respeta la barra de gestos: sin ella el
          botón queda debajo del indicador y se falla al pulsarlo. */}
      <div className="px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-10">
        <span aria-hidden className="block h-[3px] w-12 rounded-full bg-romero-500" />

        {/*
          Aquí NO hay salto manual, al revés que en la columna de escritorio.
          Allí la línea mide 34 rem y «Vehículos en buenas manos,» entra
          entera; en un teléfono de 393 px quedan 345, la frase no cabe y el
          salto forzado la partía dejando «manos,» solo en su propio renglón
          —exactamente el desastre que el salto pretendía evitar—.

          `text-balance` reparte las líneas por igual, que es lo que uno haría
          a mano si supiera el ancho de antemano. Y como no se sabe, lo hace el
          navegador.
        */}
        <h1
          className="mt-5 text-balance font-display text-[1.8125rem] font-extrabold leading-[1.08] tracking-[-0.02em] [@media(min-width:26rem)]:text-[2rem]"
          style={{ color: IVORY }}
        >
          Vehículos en buenas manos, negocios en movimiento.
        </h1>

        <p
          className="mt-3.5 text-pretty text-[0.9375rem] leading-[1.5]"
          style={{ color: 'rgb(248 244 236 / 0.80)' }}
        >
          Gestiona cada vehículo desde la recepción hasta la entrega, con
          trazabilidad completa.
        </p>

        <button
          type="button"
          onClick={onEnter}
          className={cn(
            'mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-control',
            'bg-romero-600 text-base font-semibold text-white shadow-overlay',
            'transition-colors duration-150 ease-snap hover:bg-romero-700 active:scale-[0.99]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
          )}
        >
          Entrar
          <ArrowRight aria-hidden className="size-5" />
        </button>

        <p
          className="mt-5 flex items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.28em]"
          style={{ color: 'rgb(248 244 236 / 0.52)' }}
        >
          <span aria-hidden className="h-px w-6 bg-romero-500" />
          El movimiento nos conecta
        </p>
      </div>
    </section>
  );
}
