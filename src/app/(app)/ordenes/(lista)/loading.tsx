import { LoadingState } from '@/components/feedback/states';
import { Panel } from '@/components/ui/panel';

/**
 * Estado «cargando» del LISTADO de órdenes.
 *
 * ⚠️ Vive dentro del grupo de rutas `(lista)`, no en `ordenes/`.
 *
 * Un `loading.tsx` convierte en respuesta en streaming a todo su segmento
 * **y a sus hijos**: la cabecera HTTP sale con 200 antes de que el componente
 * termine, y a partir de ahí `notFound()` ya no puede fijar el 404.
 *
 * Verificado contra el servidor de producción:
 *   · con `ordenes/loading.tsx`  → `/ordenes/no-existe` respondía **200**
 *   · con `(lista)/loading.tsx`  → responde **404**
 *
 * El grupo de rutas deja el estado de carga en el listado sin arrastrar a
 * `/ordenes/[id]`, que sí decide si el recurso existe.
 */
export default function Loading() {
  return (
    <Panel>
      <LoadingState />
    </Panel>
  );
}
