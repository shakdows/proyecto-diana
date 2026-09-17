import type { Metadata } from 'next';
import { AdminModuleCard } from '@/components/dashboard/admin-module-card';
import { RouteBoard } from '@/components/dashboard/route-board';
import { ADMIN_MODULES, visibleModules } from '@/features/dashboard/services/modules';
import { getSessionUser } from '@/lib/auth/session';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, greetingAt } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tablero' };

/* La fecha del encabezado se calcula contra `now`: prerrenderizar la dejaría
   congelada en el día de la compilación. */
export const dynamic = 'force-dynamic';

/**
 * El tablero del administrador.
 *
 * Esta pantalla no supervisa: ABRE. Siete fotografías, y nada más.
 *
 * ── Por qué no hay ni una cifra ────────────────────────────────────────────
 *
 * La versión anterior traía distintivos con pendientes, la lista de vehículos
 * que piden atención y una tarjeta de marca. Todo eso ya existe —y mejor
 * contado— en `/tablero/operacion`, que es la pantalla de supervisión. Tenerlo
 * en las dos convertía la portada en un resumen del resumen: quien entra a
 * abrir Recepción tenía que atravesar cinco cifras que no iba a usar, y quien
 * entra a supervisar leía una versión recortada de lo que iba a ver un clic
 * después.
 *
 * Son dos trabajos distintos y ahora son dos pantallas distintas. El centro de
 * operaciones está en el menú lateral, a la misma distancia que todo lo demás.
 *
 * ── Los módulos que no están aquí ──────────────────────────────────────────
 *
 * Encuestas, Auditoría, Entregas y el propio centro de operaciones viven solo
 * en el menú. Son siete tarjetas porque siete es lo que cabe en dos filas sin
 * que sobre una suelta, y porque son los siete sitios donde se trabaja todos
 * los días. El menú lateral no oculta nada.
 */
export default async function TableroPage() {
  const user = await getSessionUser();
  const now = new Date();

  const modules = visibleModules(ADMIN_MODULES, user.permissions);

  return (
    <div className="theme-cream -mx-4 -my-6 min-h-[calc(100dvh-var(--spacing-topbar))] bg-surface-sunken px-4 py-6 text-fg lg:-mx-6 lg:-my-7 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {/*
            El rótulo dice la EMPRESA y no «centro de operaciones», que es el
            nombre de otra pantalla del sistema. Dos cosas distintas con el
            mismo nombre a dos centímetros la una de la otra —el menú lateral
            lleva su entrada— se convierten en una pregunta cada vez.
          */}
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-fg-subtle">
            Romero Motors
          </p>
          <h1 className="mt-2 font-display text-[2rem] font-bold leading-tight tracking-tight text-fg">
            {greetingAt(now)}, {firstName(user.fullName)}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Todo el taller, en un solo lugar.</p>
        </div>

        <p className="shrink-0 border-l border-border pl-5 leading-tight">
          <span className="block text-xs capitalize text-fg-muted">{weekday(now)}</span>
          <span className="mt-0.5 block text-sm font-medium text-fg">{longDate(now)}</span>
        </p>
      </header>

      {/*
        El recorrido va PRIMERO.

        El tablero abría siete módulos ordenados por frecuencia de uso, y eso
        sirve a quien ya conoce el taller. A quien no, no le decía nada:
        registrabas un cliente, recibías el vehículo y no había forma de saber
        cuál de las siete tarjetas era la siguiente. Ahora lo primero que se ve
        es el camino, con el cuadro donde está el vehículo marcado; los módulos
        siguen abajo, para ir directo cuando ya se sabe a dónde.
      */}
      <RouteBoard
        profileId={user.profileId}
        permissions={user.permissions}
        actorName={user.fullName}
      />

      <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-fg">
        Todo el taller
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Los módulos completos, sin pasar por el recorrido.
      </p>

      {/*
        Doce columnas: cuatro de tres arriba, tres de cuatro abajo. Con siete
        módulos cualquier reparto uniforme deja una tarjeta huérfana en la
        última fila, y una tarjeta sola a un cuarto de ancho se lee como un
        error de maquetación, no como una decisión.

        El reparto lo declara el dominio —`span`— y no la plantilla: una
        prueba comprueba que cada fila sume doce exactas, así que añadir un
        octavo módulo sin recolocar la rejilla falla en vez de descuadrarse.
      */}
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        {modules.map((module) => (
          <li
            key={module.id}
            className={module.span === 3 ? 'xl:col-span-3' : 'xl:col-span-4'}
          >
            <AdminModuleCard module={module} priority={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** «Ricardo Salazar» → «Ricardo». En un saludo, el apellido sobra. */
function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

/* La fecha se lee en la zona del TALLER. Con la del servidor —que en
   producción es UTC— a las siete de la tarde en Lima el tablero ya estaría
   en el día siguiente. */
function weekday(now: Date): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: 'long',
  }).format(now);
}

function longDate(now: Date): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}
