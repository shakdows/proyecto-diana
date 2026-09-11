import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { findDemoOrder, factsFor } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import { availableActions } from '@/features/orders/services/state-machine';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import { computeProgress } from '@/features/repairs/services/progress';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { orderCoverage } from '@/features/parts/services/coverage';
import { getSessionUser } from '@/lib/auth/session';
import { formatDayTime, formatNumber } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Orden de servicio' };

export default async function OrdenPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const row = findDemoOrder(id, now);
  if (row === undefined) notFound();

  const user = getSessionUser();
  const facts = factsFor(row.order);

  // Las acciones se calculan contra el usuario real de la sesión: lo que este
  // rol puede hacer en este estado, ni más ni menos.
  const actions = availableActions(facts, {
    profileId: user.profileId,
    permissions: user.permissions,
  });
  const coverage = orderCoverage(row.order.parts);

  const progress = computeProgress({
    status: row.order.status,
    checklistRequired: row.order.checklistRequired,
    checklistResolved: row.order.checklistResolved,
    quotationLineCount: row.order.quotationLineCount,
    decidedItemCount: row.order.decidedItemCount,
    requiredPartsCount: coverage.totalRequired,
    partsCoverageRatio: coverage.ratio,
    repairJobsTotal: row.order.repairJobsTotal,
    repairJobsDone: row.order.repairJobsDone,
    estimatedMinutes: row.order.estimatedMinutes,
    effectiveMinutes: row.totals.effectiveMinutes,
    finalStagesTotal: row.order.finalStages.length,
    finalStagesDone: row.order.finalStagesDone,
  });

  return (
    <>
      <PageHeader
        title={row.order.serviceType}
        description={`${row.order.code} · ${row.order.vehicle} ${row.order.modelYear} · ${formatNumber(
          row.order.usage,
        )} ${vocabularyFor(row.order.equipmentKind).usageUnit} · ${row.order.customer}`}
        actions={
          <div className="flex items-center gap-2">
            <Plate value={row.order.plate} />
            <StatusChip status={row.order.status} />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Avance"
              description="Suma ponderada de ocho etapas. Ningún valor se escribe a mano."
              action={<TrafficLightDot color={row.light.color} reason={row.light.reason} showLabel />}
            />
            <PanelBody className="space-y-5">
              <ProgressBar percent={progress.percent} label="Avance total de la orden" />

              <table className="w-full text-sm">
                <caption className="sr-only">Desglose del avance por etapa</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                    <th scope="col" className="pb-2 font-medium">Etapa</th>
                    <th scope="col" className="pb-2 text-right font-medium">Peso</th>
                    <th scope="col" className="pb-2 text-right font-medium">Completitud</th>
                    <th scope="col" className="pb-2 text-right font-medium">Aporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {progress.stages.map((stage) => (
                    <tr key={stage.stage}>
                      <td className="py-2 text-fg">{stage.label}</td>
                      <td data-numeric className="py-2 text-right text-fg-subtle">{stage.weight}</td>
                      <td data-numeric className="py-2 text-right text-fg-muted">
                        {Math.round(stage.completion * 100)} %
                      </td>
                      <td data-numeric className="py-2 text-right font-medium text-fg">
                        {stage.contribution.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Acciones disponibles"
              description="Las calcula la máquina de estados: origen, permiso y guardas de negocio."
            />
            <PanelBody>
              {actions.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  No hay acciones disponibles para tu rol en el estado «
                  {STATUS_LABELS[row.order.status]}».
                </p>
              ) : (
                <ul className="space-y-3">
                  {actions.map((action) => (
                    <li
                      key={action.action}
                      className="flex flex-col gap-2 rounded-control border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{action.label}</p>
                        <p className="mt-0.5 text-xs text-fg-subtle">
                          Lleva a {STATUS_LABELS[action.to]}
                        </p>
                        {action.unmet.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {action.unmet.map((requirement) => (
                              <li key={requirement} className="text-xs text-crit-600">
                                · {requirement}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={action.available ? 'primary' : 'secondary'}
                        disabled={!action.available}
                      >
                        {action.available ? 'Ejecutar' : 'Requisitos pendientes'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-fg-subtle">
                Las acciones que tu rol no puede ejecutar no se muestran. Las que fallan por
                requisitos sí, deshabilitadas y con lo que falta: ahí el usuario sí puede hacer
                algo al respecto. La ejecución real llega en la Fase 7.
              </p>
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Tiempos" description="Todo se deriva de las sesiones de trabajo." />
            <PanelBody>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Tiempo bruto</dt>
                  <dd data-numeric className="font-medium text-fg">
                    {formatMinutes(row.totals.grossMinutes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Pausas</dt>
                  <dd data-numeric className="font-medium text-fg">
                    {formatMinutes(row.totals.pausedMinutes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Tiempo efectivo</dt>
                  <dd data-numeric className="font-medium text-fg">
                    {formatMinutes(row.totals.effectiveMinutes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="text-fg-muted">Restante</dt>
                  <dd data-numeric className="font-medium text-fg">
                    {row.eta.indeterminate ? '—' : formatMinutes(row.eta.remainingMinutes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Entrega estimada</dt>
                  <dd className="font-medium text-fg">
                    {row.eta.etaAt === null ? (
                      <span className="text-fg-subtle">En espera de un tercero</span>
                    ) : (
                      <span data-numeric>{formatDayTime(row.eta.etaAt, now)}</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Entrega prometida</dt>
                  <dd data-numeric className="font-medium text-fg">
                    {row.promisedAt === null ? '—' : formatDayTime(row.promisedAt, now)}
                  </dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Repuestos"
              description="La cantidad requerida sale de los trabajos aprobados."
              action={
                <Badge tone={coverage.complete ? 'ok' : 'warn'}>
                  {coverage.complete ? 'Completos' : `${coverage.percent} %`}
                </Badge>
              }
            />
            <PanelBody>
              {coverage.lines.length === 0 ? (
                <p className="text-sm text-fg-subtle">
                  Esta orden no requiere repuestos.
                </p>
              ) : (
                <ul className="space-y-3">
                  {coverage.lines.map((line) => (
                    <li key={line.partId}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-fg">{line.description}</span>
                        <span data-numeric className="text-fg-muted">
                          {line.received} / {line.required}
                        </span>
                      </div>
                      <ProgressBar percent={line.percent} label={line.description} />
                    </li>
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Ficha" />
            <PanelBody>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Asesor</dt>
                  <dd className="text-fg">{row.order.advisor}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Técnico</dt>
                  <dd className="text-fg">{row.order.technician ?? 'Sin asignar'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Cliente corporativo</dt>
                  <dd className="text-fg">{row.order.corporateClient ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Orden</dt>
                  <dd><Code value={row.order.code} /></dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}
