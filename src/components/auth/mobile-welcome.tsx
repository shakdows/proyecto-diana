'use client';

import { useState, type ReactNode } from 'react';
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
 * ── Qué hay ────────────────────────────────────────────────────────────────
 *
 * En móvil, primero la portada a sangre con un botón «Entrar»; al tocarlo
 * aparece el acceso. De `lg` para arriba NO cambia nada: las dos columnas de
 * siempre, y esta portada no llega a existir.
 *
 * ── Sin logotipo encima ────────────────────────────────────────────────────
 *
 * El rótulo y el lema YA ESTÁN en la pared de la fotografía. Superponer el
 * logotipo y «Más que un taller, tu aliado en el camino» sería decir dos veces
 * lo mismo, una encima de la otra, y taparía justo la parte de la imagen que
 * lo dice mejor. Es la misma razón por la que la columna de escritorio
 * tampoco lo lleva.
 */
export function MobileWelcome({ children }: { readonly children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/*
        `lg:hidden` la saca del flujo en escritorio, así que la rejilla de dos
        columnas del contenedor sigue teniendo exactamente dos hijos visibles.
      */}
      {!abierto && <Portada onEnter={() => setAbierto(true)} />}

      <div className={cn('lg:contents', !abierto && 'hidden')}>{children}</div>
    </>
  );
}

function Portada({ onEnter }: { readonly onEnter: () => void }) {
  return (
    <section className="relative isolate flex min-h-dvh flex-col justify-end overflow-hidden bg-graphite-950 lg:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- fondo local ya
          recortado y comprimido; el optimizador no aporta y añade una petición. */}
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden
        /*
         * En vertical el recorte se lleva el ANCHO, no el alto: de una foto
         * apaisada en una pantalla de 390 × 844 sobrevive una franja estrecha.
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
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(7_8_10/0.90)_0%,rgb(7_8_10/0.66)_32%,rgb(7_8_10/0.20)_64%,rgb(7_8_10/0.04)_100%)]"
      />

      {/* `pb-[max(...)]` respeta la barra de gestos del iPhone: sin ella, el
          botón queda debajo del indicador y se falla al pulsarlo. */}
      <div className="px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10">
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
          className="mt-4 text-[0.9375rem] leading-[1.55]"
          style={{ color: 'rgb(248 244 236 / 0.82)' }}
        >
          Gestiona cada vehículo desde la recepción hasta la entrega, con
          trazabilidad completa.
        </p>

        <button
          type="button"
          onClick={onEnter}
          className={cn(
            'mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-control',
            'bg-romero-600 text-base font-semibold text-white',
            'transition-colors duration-150 ease-snap hover:bg-romero-700 active:scale-[0.99]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
          )}
        >
          Entrar
          <ArrowRight aria-hidden className="size-5" />
        </button>

        <p
          className="mt-6 flex items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.28em]"
          style={{ color: 'rgb(248 244 236 / 0.55)' }}
        >
          <span aria-hidden className="h-px w-6 bg-romero-500" />
          El movimiento nos conecta
        </p>
      </div>
    </section>
  );
}
