import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { processPendingEmails } from '@/modules/notifications/service';

/* Envoi des notifications en attente. Déclenché par Vercel Cron
   ou un planificateur externe toutes les 10 minutes. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const summary = await processPendingEmails({ limit: 50 });
  return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
