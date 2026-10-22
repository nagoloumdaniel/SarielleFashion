import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { purgeExpiredPhotoData } from '@/modules/rgpd/retention';

/* Purge quotidienne des photos privées expirées et des liens d'annulation obsolètes. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const summary = await purgeExpiredPhotoData();
  return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
