import { ClipboardCheck, ExternalLink, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { assessmentEngineAnswers, getAssessmentDetail } from '@/modules/compatibilite/queries';
import { evaluateCompatibility } from '@/modules/compatibilite/engine';
import {
  ASSESSMENT_STATUS_LABELS,
  ASSESSMENT_DECISION_LABELS,
} from '@/modules/compatibilite/schemas';
import { listAuditLogsForEntity } from '@/modules/stats/audit';
import { signedPrivatePhotos } from '@/modules/fichiers/private-images';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DecisionForm } from './decision-form';

export const metadata: Metadata = { title: 'Évaluation capillaire - Tableau de bord' };

const STATUS_TONES: Record<string, 'accent' | 'success' | 'alert' | 'neutral'> = {
  RECEIVED: 'accent',
  IN_PROGRESS: 'accent',
  INFO_REQUESTED: 'neutral',
  ACCEPTED: 'success',
  REFUSED: 'alert',
  BOOKING_PENDING: 'neutral',
  CONFIRMED: 'success',
};

const ACTION_LABELS: Record<string, string> = {
  'assessment.submit': 'Demande envoyée par la cliente',
  'assessment.decision.accept': 'Compatibilité acceptée',
  'assessment.decision.refuse': 'Prestation refusée',
  'assessment.decision.request_info': 'Informations complémentaires demandées',
  'assessment.decision.propose_alternative': 'Autre coiffure proposée',
  'assessment.decision.allow_conditional': 'Réservation autorisée sous conditions',
};

const TERMINAL_STATUSES = new Set(['ACCEPTED', 'REFUSED', 'CONFIRMED']);

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value == null || value === '') return 'Non renseigné';
  return String(value);
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/evaluations/${id}`);

  const detail = await getAssessmentDetail(id);
  if (!detail) notFound();

  const [photos, history] = await Promise.all([
    signedPrivatePhotos(detail.photoKeys),
    listAuditLogsForEntity('HairAssessment', detail.id),
  ]);
  const engine = evaluateCompatibility({
    rule: detail.rule,
    answers: assessmentEngineAnswers(detail.answers),
  });
  const questionByKey = new Map(detail.questions.map((question) => [question.key, question]));
  const terminal = TERMINAL_STATUSES.has(detail.status);

  const answerRows = Object.entries(detail.answers).map(([key, value]) => {
    const question = questionByKey.get(key);
    const optionLabel = question?.options.find((option) => option.value === String(value))?.label;
    return {
      key,
      label: question?.label ?? key,
      value: optionLabel ?? formatAnswer(value),
    };
  });

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        back={<BackButton fallbackHref="/dashboard/evaluations" />}
        title={`Évaluation de ${detail.customer?.name ?? 'une cliente'}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={STATUS_TONES[detail.status] ?? 'neutral'}>
              {ASSESSMENT_STATUS_LABELS[detail.status] ?? detail.status}
            </Badge>
            <Link
              href={`/dashboard/catalogue/prestations/${detail.serviceId}`}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              {detail.serviceName}
            </Link>
            <span>
              · demandée le{' '}
              <LocalDateTime iso={detail.createdAt.toISOString()} dateStyle="medium" />
            </span>
          </span>
        }
      />

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Cliente</h2>
            {detail.customer ? (
              <>
                <p className="mt-2 font-semibold">{detail.customer.name}</p>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  <li>
                    <a
                      href={`mailto:${detail.customer.email}`}
                      className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                    >
                      <Mail aria-hidden="true" className="size-4" />
                      {detail.customer.email}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${detail.customer.phone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-2 text-accent underline-offset-4 hover:underline"
                    >
                      <Phone aria-hidden="true" className="size-4" />
                      {detail.customer.phone}
                    </a>
                  </li>
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Coordonnées non renseignées.</p>
            )}
            <p className="mt-3 text-sm">
              <Link
                href={`/compatibilite?service=${detail.serviceSlug}`}
                className="inline-flex items-center gap-1.5 text-muted underline-offset-4 hover:underline"
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                Voir le parcours public
              </Link>
            </p>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Réponses capillaires</h2>
            {answerRows.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune réponse enregistrée.</p>
            ) : (
              <dl className="mt-2 divide-y divide-line">
                {answerRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-3"
                  >
                    <dt className="text-sm font-semibold text-fg">{row.label}</dt>
                    <dd className="text-sm text-muted sm:text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Photos privées</h2>
            {photos.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune photo envoyée.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <li
                    key={photo.key}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-line"
                  >
                    {photo.url ? (
                      <a href={photo.url} target="_blank" rel="noreferrer" className="block">
                        {/* URL signée privée : next/image la mettrait en cache optimisé, on garde <img>. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`Photo capillaire ${index + 1} de la cliente`}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      </a>
                    ) : (
                      <p className="p-3 text-xs text-muted">
                        Aperçu indisponible (stockage non configuré ou URL expirée).
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">
              Ces photos ne sont jamais publiées dans la galerie publique.
            </p>
          </Card>
        </div>

        <div className="grid gap-3">
          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Analyse automatique</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  engine.verdict === 'COMPATIBLE'
                    ? 'success'
                    : engine.verdict === 'INCOMPATIBLE'
                      ? 'alert'
                      : 'neutral'
                }
              >
                {engine.verdict === 'COMPATIBLE'
                  ? 'Compatible'
                  : engine.verdict === 'INCOMPATIBLE'
                    ? 'Incompatible'
                    : 'À vérifier'}
              </Badge>
              {engine.requiresManualReview ? (
                <Badge tone="neutral">Validation manuelle requise</Badge>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
              {engine.message}
            </p>
            {engine.conditionsNote ? (
              <p className="mt-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-sm text-fg">
                {engine.conditionsNote}
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Décision</h2>
            {detail.decidedAt ? (
              <p className="mt-1 text-sm text-muted">
                Prise le <LocalDateTime iso={detail.decidedAt.toISOString()} dateStyle="medium" />
                {detail.decidedByName ? ` par ${detail.decidedByName}` : ''}
              </p>
            ) : null}
            {detail.decisionMessage ? (
              <div className="mt-2 rounded-[var(--radius-md)] bg-line px-3 py-2.5 text-sm">
                <p className="font-semibold text-fg">Message pour la cliente</p>
                <p className="mt-1 whitespace-pre-line text-muted">{detail.decisionMessage}</p>
              </div>
            ) : null}
            {detail.decisionNote ? (
              <div className="mt-2 rounded-[var(--radius-md)] bg-line px-3 py-2.5 text-sm">
                <p className="font-semibold text-fg">Note interne</p>
                <p className="mt-1 whitespace-pre-line text-muted">{detail.decisionNote}</p>
              </div>
            ) : null}
            <div className="mt-3">
              <DecisionForm assessmentId={detail.id} terminal={terminal} />
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-bold text-fg">Historique</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucune action enregistrée.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-fg">
                      {ACTION_LABELS[entry.action] ??
                        ASSESSMENT_DECISION_LABELS[
                          entry.action
                            .replace('assessment.decision.', '')
                            .toUpperCase() as keyof typeof ASSESSMENT_DECISION_LABELS
                        ] ??
                        entry.action}
                    </p>
                    <p className="text-xs text-muted">
                      <LocalDateTime iso={entry.createdAt.toISOString()} dateStyle="medium" />
                      {entry.userName ? ` · ${entry.userName}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
