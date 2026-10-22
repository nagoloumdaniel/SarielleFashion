import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { expireStaleWaitlistNotifications } from '@/modules/liste-attente/service';
import { processPendingEmails } from '@/modules/notifications/service';

/* P8.8 : expire les notifications de liste d'attente non confirmées
   à temps et relance la cliente suivante pour le même créneau. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const expired = await expireStaleWaitlistNotifications();
  const dispatch = await processPendingEmails({ limit: 50 });
  return NextResponse.json({ ok: true, expired, dispatch, at: new Date().toISOString() });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
