import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { processPendingEmails, queueDueReminders } from '@/modules/notifications/service';

/* Rappels H-24 : crée les rappels manquants puis envoie la file.
   Idempotent, déclenché toutes les heures. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const reminders = await queueDueReminders();
  const dispatch = await processPendingEmails({ limit: 50 });
  return NextResponse.json({
    ok: true,
    reminders,
    dispatch,
    at: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
