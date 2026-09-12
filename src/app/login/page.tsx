import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSignature,
  Lock,
  Mail,
  MessageSquareHeart,
  ShieldCheck,
  ShoppingCart,
  User,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { RomeroWordmark } from '@/components/brand/romero-logo';
import type { RoleCode } from '@/lib/auth/permissions';
import { DEMO_AUTH_TOKEN } from '@/features/quotations/demo';
import { DEMO_SURVEY_TOKEN } from '@/features/delivery/demo';
import { clientEnv } from '@/lib/env';
import { enterDemo } from './actions';

export const metadata: Metadata = {
  title: { absolute: 'Entrar · Diana · Romero Motors' },
  description: 'Acceso al centro de operaciones de Romero Motors.',
};

/** Los puestos que se pueden recorrer en la demostración. */
const DEMO_ROLES: readonly {
  role: RoleCode;
  icon: ReactNode;
  /** Etiqueta corta: la oficial («Técnico / mecánico») no cabe en la ficha. */
  label: string;
  hint: string;
}[] = [
  { role: 'admin', icon: <User />, label: 'Administrador', hint: 'Acceso completo' },
  { role: 'asesor', icon: <ClipboardList />, label: 'Asesor', hint: 'Recepción y clientes' },
  { role: 'tecnico', icon: <Wrench />, label: 'Técnico', hint: 'Diagnóstico y reparación' },
  { role: 'compras', icon: <ShoppingCart />, label: 'Compras', hint: 'Repuestos y proveedores' },
  { role: 'calidad', icon: <ShieldCheck />, label: 'Calidad', hint: 'Control de calidad' },
];

/**
 * Las dos pantallas que ve el CLIENTE.
 *
 * Van aparte de los puestos y no como una sexta ficha, porque no son lo
 * mismo. Un puesto elige un rol, deja una cookie y entra al taller; el cliente
 * no tiene cuenta, no entra a ninguna aplicación y llega por un enlace que le
 * mandaron al móvil. Ponerlos en la misma fila enseñaría que «cliente» es un
 * puesto más del taller, y de ahí a que alguien pida «el usuario cliente» hay
 * un paso.
 *
 * Sin esto no había forma de llegar: las dos pantallas existen desde la Fase 9
 * y solo se alcanzaban por enlaces escondidos dentro de la propia aplicación.
 */
const VISTAS_CLIENTE = [
  {
    href: `/autorizacion/${DEMO_AUTH_TOKEN}`,
    icon: <FileSignature />,
    label: 'Aprobar una cotización',
    hint: 'Lo que recibe por WhatsApp',
  },
  {
    href: `/encuesta/${DEMO_SURVEY_TOKEN}`,
    icon: <MessageSquareHeart />,
    label: 'Responder la encuesta',
    hint: 'Después de recoger el vehículo',
  },
] as const;

/**
 * La entrada.
 *
 * Es la única pantalla que alguien ve antes de decidir si este sistema le
 * parece serio, y la única donde la empresa firma con su color. Por eso va en
 * crema y rojo Romero —`theme-cream`— y no en el gris azulado del taller: ahí
 * dentro el rojo significa «retrasado», y aquí significa Romero Motors.
 *
 * Dos mitades. A la izquierda la fotografía del taller con el nombre en la
 * pared, la promesa y los cuatro conceptos de la guía. A la derecha el acceso,
 * sobre blanco, sin una sola imagen: lo que se hace con las manos no compite
 * con lo que se mira.
 */
export default function LoginPage() {
  return (
    /*
     * `lg:h-dvh` y no `min-h-dvh`: con la altura mínima, una pantalla de
     * portátil —900 px— dejaba «Responder la encuesta» cortado abajo y había
     * que desplazar la página entera, fotografía incluida. Fijando el alto, la
     * imagen se queda quieta y lo único que se desplaza es la columna que lo
     * necesita.
     */
    <main className="theme-cream grid min-h-dvh bg-surface-sunken lg:h-dvh lg:grid-cols-[57fr_43fr]">
      <ShowcasePanel />
      <AccessPanel />
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Izquierda: la empresa
 * ------------------------------------------------------------------ */

/**
 * Marfil cálido, no blanco puro.
 *
 * El blanco #FFF sobre una fotografía de taller con luz de tungsteno se lee
 * azulado y se despega de la escena. El marfil pertenece a la misma luz, y es
 * el mismo que usa el panel de acceso al otro lado.
 */
const IVORY = '#f8f4ec';

function ShowcasePanel() {
  return (
    <section className="@container/hero relative isolate hidden overflow-hidden bg-graphite-950 lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element -- fondo local ya
          recortado y comprimido; el optimizador no aporta y añade una petición. */}
      <img
        src="/fondos/hero-showroom.webp"
        alt=""
        aria-hidden
        /*
         * El encuadre se ancla CERCA DEL BORDE IZQUIERDO, no al centro.
         *
         * La columna cambia de proporción con la pantalla —1,15 en un monitor
         * grande, 0,76 en uno de 1024— y cuanto más estrecha, más ancho se
         * lleva el recorte: en el peor caso se va el 43 %. Los dos bordes no
         * valen lo mismo: a la derecha solo hay vestíbulo, y a la izquierda
         * están el rótulo y el lema pintados en la pared.
         *
         * El 18 % es el valor que deja la pintura entera en TODOS los casos
         * probados, del monitor ancho al portátil de 1024. Con el 35 % de
         * antes, ahí «ROMERO» se quedaba sin la R.
         */
        className="absolute inset-0 -z-20 size-full object-[18%_center] object-cover"
      />

      {/*
        Dos velos con trabajos distintos.
      */}

      {/* El primero corre de IZQUIERDA a derecha y es el que hace que esto se
          lea como una campaña y no como texto encima de una foto: el lado del
          texto queda en penumbra y el vestíbulo se abre hacia la derecha.
          Antes solo había uno de abajo arriba, y el titular competía con el
          capó de la camioneta. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(7_8_10/0.80)_0%,rgb(7_8_10/0.58)_38%,rgb(7_8_10/0.25)_64%,rgb(7_8_10/0.06)_100%)]"
      />
      {/* El segundo asienta el bloque de abajo, donde el suelo es claro y
          reflectante. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(7_8_10/0.80)_0%,rgb(7_8_10/0.30)_34%,transparent_62%)]"
      />

      <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
        <div>
          {/* Sin el nombre del producto. Esta mitad es la EMPRESA —su taller,
              su rótulo, su promesa—; DIANA es la herramienta, y firma donde
              corresponde: el pie del panel de acceso. Dos marcas compitiendo
              sobre la misma fotografía no dejaban leer ninguna. */}
          <span aria-hidden className="block h-[3px] w-14 rounded-full bg-romero-500" />

          {/*
            Los saltos de línea son MANUALES y no un `max-width` que deja
            partir por donde caiga. Un titular de campaña se compone: «buenas
            manos» no puede quedar huérfano al final de un renglón, y
            «negocios en movimiento» tiene que leerse de una pieza.

            El interlineado baja de 1,15 a 1,0 y el espaciado entre letras se
            aprieta: a este cuerpo, el espaciado normal separa las palabras
            como si fuera un párrafo.
          */}
          <h1
            className="mt-7 font-display text-[2.125rem] font-extrabold leading-[1.02] tracking-[-0.02em] [@media(max-height:52rem)]:mt-5 [@media(max-height:52rem)]:text-[1.875rem] xl:text-[2.75rem] 2xl:text-[3.25rem]"
            style={{ color: IVORY }}
          >
            Vehículos en buenas manos,
            <br />
            negocios en movimiento.
          </h1>

          <p
            className="mt-6 max-w-[34rem] text-[1.0625rem] leading-[1.55] [@media(max-height:52rem)]:mt-4 [@media(max-height:52rem)]:text-[0.9375rem] xl:text-[1.1875rem]"
            style={{ color: 'rgb(248 244 236 / 0.82)' }}
          >
            Gestiona cada vehículo desde la recepción hasta la entrega,
            <br className="hidden xl:inline" /> con trazabilidad completa, eficiencia y
            clientes más satisfechos.
          </p>
        </div>

        <p
          className="mt-12 flex items-center gap-3 text-[0.6875rem] font-medium uppercase tracking-[0.3em] xl:mt-14"
          style={{ color: 'rgb(248 244 236 / 0.60)' }}
        >
          <span aria-hidden className="h-px w-8 bg-romero-500" />
          El movimiento nos conecta
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Derecha: el acceso
 * ------------------------------------------------------------------ */

function AccessPanel() {
  return (
    <section className="flex justify-center overflow-y-auto px-5 py-8 sm:px-8 lg:py-6">
      {/*
        `my-auto` en el hijo y NO `items-center` en el contenedor. Centrar con
        `items-center` funciona mientras el contenido quepa; en cuanto no cabe
        —una pantalla de 800 px de alto—, el desbordamiento se reparte arriba y
        abajo y la parte de ARRIBA queda fuera del área desplazable: el
        logotipo y «Bienvenido» se volvían inalcanzables. Los márgenes
        automáticos centran igual y se colapsan solos cuando no hay sitio.
      */}
      <div className="w-full max-w-[28rem] lg:my-auto">
        <header className="text-center">
          <RomeroWordmark className="mx-auto h-9 w-auto" />
          <p className="mt-2 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-fg-subtle">
            Más que un taller, tu aliado en el camino
          </p>
        </header>

        <div className="@container/acceso mt-5 rounded-modal border border-border bg-surface p-5 shadow-panel sm:p-6">
          <h1 className="font-display text-[1.625rem] font-bold tracking-tight text-fg">
            Bienvenido
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Accede al centro de operaciones automotrices.
          </p>

          {/*
            El formulario de correo y contraseña está DESACTIVADO a propósito.
            La autenticación real es la Fase 3 (Supabase Auth); dibujar aquí un
            campo que parece funcionar y no valida nada sería mentirle a quien
            lo pruebe. Se ve, dice por qué no funciona todavía, y la entrada
            real es la de abajo.
          */}
          {/* Deshabilitado de verdad, pero no borrado: a 60 % de opacidad el
              rojo de Romero se leía rosa, y la primera impresión de la
              empresa no puede ser un color que no es el suyo. El aviso de
              debajo dice por qué no funciona todavía. */}
          <fieldset disabled className="mt-5 space-y-3 opacity-80">
            <legend className="sr-only">Acceso con credenciales</legend>
            <FakeInput icon={<Mail />} placeholder="Correo electrónico" />
            <FakeInput icon={<Lock />} placeholder="Contraseña" trailing={<Eye />} />
            <p className="flex items-center justify-between pt-0.5 text-sm">
              <span className="flex items-center gap-2 text-fg-muted">
                <span
                  aria-hidden
                  className="size-4 rounded-[0.25rem] border-2 border-border-strong"
                />
                Recordarme
              </span>
              <span className="font-medium text-romero-600">¿Olvidaste tu contraseña?</span>
            </p>
            <p className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-romero-600 text-sm font-semibold text-white">
              Ingresar al sistema
              <ArrowRight aria-hidden className="size-4" />
            </p>
          </fieldset>

          <p className="mt-2.5 rounded-control bg-surface-sunken px-3 py-2 text-xs leading-snug text-fg-muted">
            El acceso con credenciales llega con la autenticación real. Por ahora se entra
            eligiendo un puesto.
          </p>

          {clientEnv.NEXT_PUBLIC_DEMO_MODE && (
            <>
              <div className="my-4 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-fg-subtle">o accede como</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {/* Dos columnas solo cuando la TARJETA da de sí, no cuando la
                  ventana lo hace. A 1024 px `sm:` ya era cierto y la tarjeta
                  medía 312: «Administrador» salía «Adminis…». */}
              <form action={enterDemo} className="grid grid-cols-1 gap-2 @sm/acceso:grid-cols-2">
                {DEMO_ROLES.map(({ role, icon, label, hint }) => (
                  <button
                    key={role}
                    type="submit"
                    name="role"
                    value={role}
                    className="group flex items-center gap-2.5 rounded-control border border-border bg-surface px-3 py-2 text-left transition-colors duration-150 ease-snap hover:border-romero-400 hover:bg-romero-500/5 active:scale-[0.98]"
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-sunken text-romero-600 [&>svg]:size-4"
                    >
                      {icon}
                    </span>
                    {/* 13 px, no 14: con dos columnas dentro de una tarjeta de
                        448 px quedan 110 px de texto, y «Administrador» a 14 px
                        semibold mide más. Salía «Administr…» justo en el puesto
                        que más se usa. */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold leading-tight text-fg">
                        {label}
                      </span>
                      {/* El rótulo se recorta si hace falta; la explicación
                          se parte en dos líneas. «Recepción y client…» no
                          explica nada, y una ficha un poco más alta no cuesta
                          nada en una rejilla que estira todas por igual. */}
                      <span className="mt-0.5 block text-[0.6875rem] leading-tight text-fg-muted">
                        {hint}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-3.5 shrink-0 text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5"
                    />
                  </button>
                ))}
              </form>

              {/* El cliente, aparte. No elige puesto ni deja sesión: abre el
                  mismo enlace que le llegaría al móvil. */}
              <p className="mt-4 text-xs text-fg-subtle">O realiza otras acciones</p>
              <div className="mt-2 grid gap-2">
                {VISTAS_CLIENTE.map(({ href, icon, label, hint }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-2.5 rounded-control border border-border bg-surface px-3 py-2 transition-colors duration-150 ease-snap hover:border-romero-400 hover:bg-romero-500/5 active:scale-[0.98]"
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-sunken text-fg-muted [&>svg]:size-4"
                    >
                      {icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{label}</span>
                      <span className="block truncate text-xs text-fg-muted">{hint}</span>
                    </span>
                    <ArrowUpRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="mt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fg-muted">
            Romero Motors
          </p>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            <span data-numeric>DIANA v1.0.0</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-ok-500" />
              Sistema operativo
            </span>
            <span aria-hidden>·</span>
            <span>© 2026</span>
          </p>
        </footer>
      </div>
    </section>
  );
}

function FakeInput({
  icon,
  placeholder,
  trailing,
}: {
  readonly icon: ReactNode;
  readonly placeholder: string;
  readonly trailing?: ReactNode;
}) {
  return (
    <span className="flex h-12 items-center gap-3 rounded-control border border-border-strong bg-surface px-3.5">
      <span aria-hidden className="shrink-0 text-fg-subtle [&>svg]:size-[1.125rem]">
        {icon}
      </span>
      <span className="flex-1 text-sm text-fg-subtle">{placeholder}</span>
      {trailing !== undefined && (
        <span aria-hidden className="shrink-0 text-fg-subtle [&>svg]:size-[1.125rem]">
          {trailing}
        </span>
      )}
    </span>
  );
}
