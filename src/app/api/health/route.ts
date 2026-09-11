import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Salud del servicio. Responde **sin sesión**, para monitoreo externo.
 *
 * No revela versiones de dependencias ni detalles de infraestructura: un
 * endpoint público de diagnóstico es también superficie de ataque.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'diana',
      phase: 1,
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
