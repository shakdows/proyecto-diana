import { LoadingState } from '@/components/feedback/states';
import { Panel } from '@/components/ui/panel';

/**
 * Estado «cargando» del tablero.
 *
 * Seguro aquí porque el tablero no llama a `notFound()`. Ver la nota de
 * `ordenes/(lista)/loading.tsx`: un `loading.tsx` que envuelva una ruta capaz
 * de devolver 404 le impide fijar el código de estado.
 */
export default function Loading() {
  return (
    <Panel>
      <LoadingState />
    </Panel>
  );
}
