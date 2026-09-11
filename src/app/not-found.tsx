import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-sunken px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-fg-subtle">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-fg">
          No se encontró lo que buscabas
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Puede que el recurso no exista o que esté fuera de tu alcance. Los dos casos responden
          igual a propósito: distinguirlos permitiría averiguar qué órdenes existen en otra
          empresa probando identificadores.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
