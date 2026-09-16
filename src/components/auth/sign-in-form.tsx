'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, TriangleAlert } from 'lucide-react';
import { signIn } from '@/app/login/actions';
import { cn } from '@/lib/utils/cn';

/**
 * El acceso con correo y contraseña, de verdad.
 *
 * Hasta aquí este formulario estaba dibujado y DESACTIVADO, con un aviso
 * honesto debajo: «el acceso con credenciales llega con la autenticación
 * real». Ya llegó.
 *
 * ── Detalles que no son adorno ─────────────────────────────────────────────
 *
 * · El error va DEBAJO del formulario y no en un aviso flotante: quien se
 *   equivoca de contraseña está mirando el campo, no la esquina.
 * · El botón dice «Entrando…» y se bloquea. Sin eso, en una conexión de
 *   taller se pulsa tres veces y se disparan tres intentos, que es la forma
 *   más rápida de chocar con el límite de peticiones de Supabase.
 * · El ojo para ver la contraseña existe porque se escribe en una tablet, de
 *   pie y a veces con guantes.
 */
export function SignInForm() {
  const [error, formAction, pending] = useActionState(signIn, null);
  const [visible, setVisible] = useState(false);

  return (
    /*
      `noValidate` no desactiva las comprobaciones: desactiva LAS DEL
      NAVEGADOR. Con `type="email"`, Chrome interrumpe el envío antes de que
      corra nada nuestro y enseña su propio globo —«Please include an '@'…»—
      en inglés y apuntando al campo, de modo que el mensaje en español de
      debajo no llegaba a pintarse nunca. Es la misma lección que ya está
      aprendida en `components/ui/modal.tsx`.

      Los `type` se quedan: son los que abren el teclado correcto en el móvil
      y los que dejan que el gestor de contraseñas rellene. Lo único que se va
      es el globo.
    */
    <form action={formAction} noValidate className="mt-5 space-y-3">
      <div className="space-y-3">
        <Campo
          icon={<Mail />}
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Correo electrónico"
          invalid={error !== null}
        />

        <Campo
          icon={<Lock />}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Contraseña"
          invalid={error !== null}
          trailing={
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
              className="grid size-8 place-items-center rounded-control text-fg-subtle transition-colors hover:text-fg"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
      </div>

      {error !== null && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control bg-crit-100 px-3 py-2 text-sm leading-snug text-crit-700"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-control',
          'text-sm font-semibold text-white transition-colors duration-150',
          pending
            ? 'cursor-wait bg-romero-600/70'
            : 'bg-romero-600 hover:bg-romero-700 active:scale-[0.99]',
        )}
      >
        {pending ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            Ingresar al sistema
            <ArrowRight aria-hidden className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}

function Campo({
  icon,
  trailing,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  readonly icon: React.ReactNode;
  readonly trailing?: React.ReactNode;
  readonly invalid?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex h-12 items-center gap-2.5 rounded-control border bg-surface px-3',
        'transition-colors duration-150 focus-within:border-romero-500',
        invalid === true ? 'border-crit-500' : 'border-border-strong',
      )}
    >
      <span aria-hidden className="shrink-0 text-fg-subtle [&>svg]:size-4">
        {icon}
      </span>
      <input
        {...props}
        required
        className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
      />
      {trailing}
    </label>
  );
}
