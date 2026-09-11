import type { Metadata } from 'next';
import {
  Activity,
  ClipboardList,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingCart,
  User,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { RomeroMark, RomeroWordmark } from '@/components/brand/romero-logo';
import { DianaLockup } from '@/components/brand/diana-logo';
import { BlueWave, HexPattern } from '@/components/brand/surfaces';
import type { RoleCode } from '@/lib/auth/permissions';
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

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[55fr_45fr]">
      <ShowcasePanel />
      <AccessPanel />
    </main>
  );
}

/**
 * Panel izquierdo.
 *
 * En el diseño va una fotografía del taller. Mientras no exista el archivo,
 * el hueco se rellena con una composición en grafito y el degradado que
 * llevaría encima la foto: así el texto ya está probado sobre el fondo que
 * tendrá, y el día que entre la imagen no hay que recolocar nada.
 */
function ShowcasePanel() {
  return (
    <section className="relative hidden overflow-hidden bg-graphite-950 lg:block">
      {/* La fotografía del taller, por fin. El degradado que va encima ya
          estaba probado contra este hueco, así que la imagen entró sin mover
          una sola medida del texto. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- fondo local ya
          recortado y comprimido; el optimizador no aporta y añade una petición. */}
      <img
        src="/fondos/hero-taller.webp"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-br from-graphite-950/95 via-graphite-950/88 to-brand-950/80"
      />
      {/* El lenguaje gráfico de la guía: retícula hexagonal de fondo y las
          ondas azules cruzando por debajo del texto. Dibujados, no imágenes:
          escalan a cualquier pantalla, siguen el azul de marca si cambia y no
          hay descarga que esperar antes de ver la portada entera. */}
      <HexPattern className="text-white/[0.04]" />
      <BlueWave className="opacity-60" />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 size-[28rem] rounded-full bg-brand-600/20 blur-3xl"
      />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        {/* Momento de marca: aquí el logotipo va con su color, porque no hay
            ningún rojo de estado con el que pueda confundirse. */}
        <header>
          <RomeroWordmark on="dark" className="h-16 w-auto text-white" />
          <p className="mt-2 text-xs text-graphite-400">
            Más que un taller, tu aliado en el camino
          </p>
        </header>

        <div className="max-w-xl">
          <DianaLockup size="lg" endorsement={false} />

          <h1 className="mt-8 font-display text-3xl font-semibold leading-tight tracking-tight text-white xl:text-[2.5rem]">
            Control inteligente del
            <br />
            servicio automotriz
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-graphite-300">
            Gestiona cada vehículo desde la recepción hasta la entrega con trazabilidad completa
            en tiempo real.
          </p>

          <ul className="mt-9 space-y-3.5">
            <Feature icon={<Activity />} label="Operación en tiempo real" />
            <Feature icon={<ClipboardList />} label="Control de órdenes" />
            <Feature icon={<ShieldCheck />} label="Trazabilidad y confiabilidad" />
          </ul>
        </div>

        <footer>
          <p className="text-xs text-graphite-500">
            © 2026 Romero Motors. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </section>
  );
}

function Feature({ icon, label }: { readonly icon: ReactNode; readonly label: string }) {
  return (
    <li className="flex items-center gap-3.5">
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-control border border-brand-500/30 bg-brand-500/10 text-brand-400 [&>svg]:size-5"
      >
        {icon}
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.06em] text-graphite-200">
        {label}
      </span>
    </li>
  );
}

/** Panel derecho: el acceso propiamente dicho. */
function AccessPanel() {
  return (
    <section className="flex items-center justify-center bg-surface-sunken px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3 lg:hidden">
          <RomeroMark className="size-10 text-brand-600" />
          <span className="font-display text-base font-bold uppercase tracking-[0.04em] text-fg">
            Romero Motors
          </span>
        </div>

        <div className="rounded-modal border border-border bg-surface-raised p-7 shadow-panel sm:p-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Bienvenido a DIANA
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            Accede al centro de operaciones automotrices.
          </p>

          {/*
            El formulario de correo y contraseña está DESACTIVADO a propósito.
            La autenticación real es la Fase 3 (Supabase Auth); dibujar aquí un
            campo que parece funcionar y no valida nada sería mentirle a quien
            lo pruebe. Se ve, dice por qué no funciona todavía, y la entrada
            real es la de abajo.
          */}
          <fieldset disabled className="mt-6 space-y-3 opacity-60">
            <legend className="sr-only">Acceso con credenciales</legend>
            <FakeInput icon={<Mail />} placeholder="Correo electrónico" />
            <FakeInput icon={<Lock />} placeholder="Contraseña" trailing={<Eye />} />
            <p className="flex items-center justify-between pt-1 text-sm">
              <span className="flex items-center gap-2 text-fg-muted">
                <span
                  aria-hidden
                  className="size-4 rounded-[0.3rem] border-2 border-border-strong"
                />
                Recordarme
              </span>
              <span className="text-brand-600">¿Olvidaste tu contraseña?</span>
            </p>
            <p className="h-12 w-full rounded-control bg-brand-600 text-center text-sm font-semibold leading-[3rem] text-white">
              Ingresar al sistema
            </p>
          </fieldset>

          <p className="mt-3 rounded-control bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            El acceso con credenciales llega con la autenticación real. Por ahora se entra
            eligiendo un puesto.
          </p>

          {clientEnv.NEXT_PUBLIC_DEMO_MODE && (
            <>
          <div className="my-6 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-fg-subtle">o</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-control border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">Explorar modo demostración</p>
            <p className="mt-0.5 text-xs text-brand-700/80">
              Cada puesto entra a la pantalla que le sirve.
            </p>
          </div>

          <form action={enterDemo} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ROLES.map(({ role, icon, label, hint }) => (
              <button
                key={role}
                type="submit"
                name="role"
                value={role}
                className="flex items-center gap-2.5 rounded-control border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 ease-snap hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-sunken text-fg-muted [&>svg]:size-4"
                >
                  {icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{label}</span>
                  <span className="block truncate text-xs text-fg-subtle">{hint}</span>
                </span>
              </button>
            ))}
          </form>
            </>
          )}

          <footer className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs text-fg-subtle">
            <span data-numeric>DIANA v1.0.0</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-ok-500" />
              Sistema operativo
            </span>
            <span>© Romero Motors</span>
          </footer>
        </div>
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
