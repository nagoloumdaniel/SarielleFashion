import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/* P9.10 : sonde de santé minimale, sans donnée personnelle ni secret. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', database: 'ok', at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'error', at: new Date().toISOString() },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
