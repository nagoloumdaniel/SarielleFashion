import { Mail, Phone, Wand2 } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import {
  CUSTOM_REQUEST_STATUS_LABELS,
  CUSTOM_REQUEST_STATUS_TONES,
  getCustomRequestAdmin,
  listPublishedServiceOptions,
} from '@/modules/demandes/queries';
import { formatFcfa } from '@/modules/reservations/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomRequestDecisionForm } from './decision-form';

export const metadata: Metadata = { title: 'Demande personnalisée - Tableau de bord' };

const HAIR_LABELS: Record<string, string> = {
  SHORT: 'Courts',
  MEDIUM: 'Mi-longs',
  LONG: 'Longs',
  VERY_LONG: 'Très longs',
};

const ACTION_LABELS: Record<string, string> = {
  IN_REVIEW: 'Prise en charge',
  INFO_REQUESTED: 'Précisions demandées',
  QUOTED: 'Devis envoyé',
  ACCEPTED: 'Demande acceptée',
  REFUSED: 'Demande refusée',
  CLOSED: 'Demande clôturée',
};

export default async function CustomRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/demandes/${id}`);

  const [request, services] = await Promise.all([
    getCustomRequestAdmin(id),
    listPublishedServiceOptions(),
  ]);
  if (!request) notFound();

  return (
    <div>
      <PageHeader
        icon={Wand2}
        back={<BackButton fallbackHref="/dashboard/demandes" />}
        title={`Demande de ${request.requesterName}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={CUSTOM_REQUEST_STATUS_TONES[request.status]}>
              {CUSTOM_REQUEST_STATUS_LABELS[request.status]}
            </Badge>
            <span>
              Reçue le <LocalDateTime iso={request.createdAt.toISOString()} dateStyle="long" />
            </span>
          </span>
        }
      />

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Demande</h2>
            <ul className="mt-2 grid gap-1.5 text-sm">
              <li>
                <a
                  href={`mailto:${request.requesterEmail}`}
                  className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {request.requesterEmail}
                </a>
              </li>
              {request.requesterPhone ? (
                <li>
                  <a
                    href={`tel:${request.requesterPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-4" />
                    {request.requesterPhone}
                  </a>
                </li>
              ) : null}
            </ul>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="font-semibold">Date souhaitée</dt>
                <dd className="text-muted">
                  {request.desiredDate
                    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(
                        request.desiredDate,
                      )
                    : 'Non précisée'}
                </dd>
              </div>
              {request.hairInfo ? (
                <>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="font-semibold">Longueur</dt>
                    <dd className="text-muted">
                      {HAIR_LABELS[String(request.hairInfo.length)] ?? 'Non précisée'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="font-semibold">Type de cheveux</dt>
                    <dd className="text-muted">{String(request.hairInfo.type ?? '')}</dd>
                  </div>
                  {request.hairInfo.currentStyle ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="font-semibold">Coiffure actuelle</dt>
                      <dd className="text-muted">{String(request.hairInfo.currentStyle)}</dd>
                    </div>
                  ) : null}
                  {request.hairInfo.comment ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="font-semibold">Précisions</dt>
                      <dd className="text-muted">{String(request.hairInfo.comment)}</dd>
                    </div>
                  ) : null}
                </>
              ) : null}
            </dl>
            <p className="mt-3 whitespace-pre-line rounded-[var(--radius-md)] bg-page p-3 text-sm text-fg">
              {request.description}
            </p>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Photos de référence</h2>
            {request.photos.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune photo transmise.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {request.photos.map((photo, index) => (
                  <li key={photo.key}>
                    {photo.url ? (
                      <a href={photo.url} target="_blank" rel="noreferrer" className="block">
                        {/* URL signée privée : next/image la mettrait en cache optimisé, on garde <img>. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`Photo de référence ${index + 1}`}
                          loading="lazy"
                          className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
                        />
                      </a>
                    ) : (
                      <p className="rounded-[var(--radius-md)] bg-page p-3 text-xs text-muted">
                        Photo privée indisponible pour le moment.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Historique des décisions</h2>
            {request.decisions.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune décision enregistrée.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {request.decisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="rounded-[var(--radius-md)] border border-line p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-fg">
                        {ACTION_LABELS[decision.action] ?? decision.action}
                      </p>
                      <p className="text-xs text-muted">
                        <LocalDateTime iso={decision.createdAt.toISOString()} dateStyle="medium" />
                        {decision.userName ? ` · ${decision.userName}` : ''}
                      </p>
                    </div>
                    {decision.message ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-muted">
                        {decision.message}
                      </p>
                    ) : null}
                    {decision.priceCents != null ||
                    decision.proposedServiceName ||
                    decision.proposedSlot ? (
                      <p className="mt-2 text-xs text-muted">
                        {decision.priceCents != null
                          ? `Prix : ${formatFcfa(decision.priceCents)}`
                          : ''}
                        {decision.proposedServiceName
                          ? ` · Prestation : ${decision.proposedServiceName}`
                          : ''}
                        {decision.proposedSlot ? (
                          <>
                            {' · Créneau : '}
                            <LocalDateTime iso={decision.proposedSlot.toISOString()} />
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="grid gap-3">
          {request.adminReply ? (
            <Card>
              <h2 className="font-heading text-lg font-bold text-fg">Proposition actuelle</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-fg">{request.adminReply}</p>
              <p className="mt-2 text-sm text-muted">
                {request.estimatedPriceCents != null
                  ? `Prix estimé : ${formatFcfa(request.estimatedPriceCents)}`
                  : 'Prix non estimé'}
                {request.proposedService ? ` · ${request.proposedService.name}` : ''}
              </p>
              {request.proposedSlot ? (
                <p className="mt-1 text-sm text-muted">
                  Créneau proposé : <LocalDateTime iso={request.proposedSlot.toISOString()} />
                </p>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Décider</h2>
            <CustomRequestDecisionForm
              requestId={request.id}
              services={services}
              currentStatus={request.status}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
