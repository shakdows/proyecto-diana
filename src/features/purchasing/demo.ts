import type { QuotedLine } from './services/supplier-quotes';

/**
 * Cotizaciones de proveedores de la orden 154.
 *
 * Son las líneas que el asesor autorizó y que el almacén NO cubre: pastillas,
 * discos y pernos. En la Fase 11 salen de `supplier_quotes`.
 *
 * Los números están puestos para que la decisión no sea obvia: el más barato
 * tarda una semana, el más rápido cobra de más, y el tercero no tiene stock
 * para toda la cantidad. Una comparación donde siempre gana el mismo no
 * enseña nada sobre la pantalla.
 */
export const DEMO_QUOTED_LINES: readonly QuotedLine[] = [
  {
    lineId: 'r1',
    description: 'Juego de pastillas delanteras cerámicas',
    partNumber: '04465-0K260',
    quantity: 1,
    offers: [
      {
        supplierId: 'imp',
        supplierName: 'Importaciones del Sur',
        unitCostCents: 28_000,
        leadTimeDays: 6,
        warrantyMonths: 12,
        paymentTerms: 'credito_30',
        availableQuantity: 5,
      },
      {
        supplierId: 'lima',
        supplierName: 'Repuestos Lima',
        unitCostCents: 32_000,
        leadTimeDays: 1,
        warrantyMonths: 6,
        paymentTerms: 'contado',
        availableQuantity: 3,
      },
      {
        supplierId: 'andes',
        supplierName: 'AutoPartes Andes',
        unitCostCents: 30_500,
        leadTimeDays: 3,
        warrantyMonths: 12,
        paymentTerms: 'credito_15',
        availableQuantity: 2,
      },
    ],
  },
  {
    lineId: 'r3',
    description: 'Disco de freno delantero ventilado',
    partNumber: '43512-0K090',
    quantity: 2,
    offers: [
      {
        supplierId: 'lima',
        supplierName: 'Repuestos Lima',
        unitCostCents: 33_500,
        leadTimeDays: 2,
        warrantyMonths: 6,
        paymentTerms: 'contado',
        availableQuantity: 4,
      },
      {
        supplierId: 'andes',
        supplierName: 'AutoPartes Andes',
        unitCostCents: 31_000,
        leadTimeDays: 4,
        warrantyMonths: 12,
        paymentTerms: 'credito_15',
        availableQuantity: 6,
      },
      {
        supplierId: 'imp',
        supplierName: 'Importaciones del Sur',
        unitCostCents: 27_900,
        leadTimeDays: 9,
        warrantyMonths: 12,
        paymentTerms: 'credito_30',
        // No cubre los 2 que se necesitan: elegirlo bloquea el envío.
        availableQuantity: 1,
      },
    ],
  },
  {
    lineId: 'r4',
    description: 'Kit de pernos de disco',
    partNumber: '90105-08484',
    quantity: 5,
    offers: [
      {
        supplierId: 'lima',
        supplierName: 'Repuestos Lima',
        unitCostCents: 1_800,
        leadTimeDays: 1,
        warrantyMonths: 3,
        paymentTerms: 'contado',
        availableQuantity: 40,
      },
      {
        supplierId: 'andes',
        supplierName: 'AutoPartes Andes',
        unitCostCents: 1_650,
        leadTimeDays: 4,
        warrantyMonths: 3,
        paymentTerms: 'credito_15',
        availableQuantity: 25,
      },
    ],
  },
];
