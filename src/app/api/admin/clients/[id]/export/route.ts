import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/modules/auth/guards';
import { logAudit } from '@/modules/stats/audit';
import { collectCustomerData } from '@/modules/clients/rgpd';

/* P9.6 : export des données d'une cliente, réservé à l'administration. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Rôle ADMIN exigé (une simple session ne suffit pas).
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  // Export de données personnelles : 5 par 10 minutes et par administrateur.
  const limit = await rateLimit(`export:customer:${user.id}`, { max: 5, windowMs: 10 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop d’exports. Réessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
        },
      },
    );
  }
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id)) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }
  const data = await collectCustomerData(id);
  if (!data) {
    return NextResponse.json({ error: 'Fiche cliente introuvable.' }, { status: 404 });
  }
  await logAudit({
    userId: user.id,
    action: 'customer.export',
    entityType: 'Customer',
    entityId: id,
  });
  const filename = `cliente-${id}-donnees-personnelles.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
