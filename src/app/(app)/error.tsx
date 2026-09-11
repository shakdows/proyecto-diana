'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/states';
import { Panel } from '@/components/ui/panel';

export default function AppError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // El detalle completo va al registro del servidor; al usuario solo le
    // llega el identificador de incidencia.
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <ErrorState
        detail={
          error.digest === undefined
            ? 'Vuelve a intentarlo en unos segundos.'
            : `Incidencia ${error.digest}. Vuelve a intentarlo en unos segundos.`
        }
        action={
          <Button variant="secondary" size="sm" onClick={reset}>
            Reintentar
          </Button>
        }
      />
    </Panel>
  );
}
