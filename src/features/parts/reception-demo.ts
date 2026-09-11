import type { ReceivableLine } from './services/reception';

/**
 * Recepción de ejemplo de la orden 154.
 *
 * Corresponde a la compra elegida en Compras: todo a Repuestos Lima. El kit
 * de pernos ya llegó parcialmente (2 de 5) en una entrega anterior, para que
 * la pantalla muestre el caso que de verdad complica el taller: la recepción
 * PARCIAL. En la Fase 11 sale de `purchase_order_items` y
 * `purchase_receipt_items`.
 */
export const DEMO_RECEIVABLE_LINES: readonly ReceivableLine[] = [
  {
    lineId: 'r1',
    description: 'Juego de pastillas delanteras cerámicas',
    partNumber: '04465-0K260',
    supplierName: 'Repuestos Lima',
    ordered: 1,
    alreadyReceived: 0,
  },
  {
    lineId: 'r3',
    description: 'Disco de freno delantero ventilado',
    partNumber: '43512-0K090',
    supplierName: 'Repuestos Lima',
    ordered: 2,
    alreadyReceived: 0,
  },
  {
    lineId: 'r4',
    description: 'Kit de pernos de disco',
    partNumber: '90105-08484',
    supplierName: 'Repuestos Lima',
    ordered: 5,
    alreadyReceived: 2,
  },
];
