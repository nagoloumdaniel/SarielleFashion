import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { requireAdmin } from '@/modules/auth/guards';
import {
  getCustomerSummary,
  listCustomerAppointments,
  listCustomerAssessments,
  listCustomerConversations,
  listCustomerRequests,
} from '@/modules/clients/queries';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONES } from '@/modules/reservations/status';
import { CONVERSATION_STATUS_LABELS } from '@/modules/messagerie/queries';
import { CUSTOM_REQUEST_STATUS_LABELS } from '@/modules/demandes/queries';
import { ASSESSMENT_STATUS_LABELS } from '@/modules/compatibilite/schemas';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackButton } from '@/components/shared/BackButton';
import { LocalDateTime } from '@/components/shared/LocalDateTime';
import { Skeleton } from '@/components/shared/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomerContactForm } from './customer-contact-form';
import { CustomerRgpdActions } from './customer-rgpd-actions';

export const metadata: Metadata = { title: 'Fiche cliente - Tableau de bord' };

/* FCFA sans décimales ; les colonnes *Cents sont en 1/100 FCFA. */
const fcfa = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});

/* Ligne de liste entièrement cliquable. */
function LinkRow({
  href,
  title,
  meta,
  aside,
}: {
  href: string;
  title: string;
  meta: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 transition hover:bg-accent-soft/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{title}</span>
          <span className="block text-xs text-muted">{meta}</span>
        </span>
        {aside}
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  shown,
  empty,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  shown: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-fg">
        <Icon aria-hidden="true" className="size-5 text-accent" />
        {title}
        <span className="text-sm font-semibold text-muted">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">{children}</ul>
      )}
      {count > shown ? (
        <p className="mt-2 text-xs text-muted">
          {shown} plus récents affichés sur {count}.
        </p>
      ) : null}
    </Card>
  );
}

function SectionSkeleton() {
  return (
    <Card aria-hidden="true">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-3 h-12 w-full" />
      <Skeleton className="mt-2 h-12 w-full" />
    </Card>
  );
}

async function AppointmentsSection({ customerId, count }: { customerId: string; count: number }) {
  const appointments = count > 0 ? await listCustomerAppointments(customerId) : [];
  return (
    <Section
      icon={CalendarDays}
      title="Rendez-vous"
      count={count}
      shown={appointments.length}
      empty="Aucun rendez-vous."
    >
      {appointments.map((appointment) => (
        <LinkRow
          key={appointment.id}
          href={`/dashboard/reservations/${appointment.id}`}
          title={appointment.serviceName}
          meta={
            <>
              <LocalDateTime iso={appointment.startsAt.toISOString()} dateStyle="medium" />
              {appointment.priceCents != null
                ? ` · ${fcfa.format(appointment.priceCents / 100)}`
                : ''}
            </>
          }
          aside={
            <Badge
              tone={APPOINTMENT_STATUS_TONES[appointment.status as never] ?? 'neutral'}
              size="sm"
            >
              {APPOINTMENT_STATUS_LABELS[appointment.status as never] ?? appointment.status}
            </Badge>
          }
        />
      ))}
    </Section>
  );
}

async function RequestsSection({ customerId, count }: { customerId: string; count: number }) {
  const requests = count > 0 ? await listCustomerRequests(customerId) : [];
  return (
    <Section
      icon={ClipboardList}
      title="Demandes personnalisées"
      count={count}
      shown={requests.length}
      empty="Aucune demande."
    >
      {requests.map((request) => (
        <LinkRow
          key={request.id}
          href={`/dashboard/demandes/${request.id}`}
          title={request.description.slice(0, 80)}
          meta={
            <>
              {CUSTOM_REQUEST_STATUS_LABELS[request.status as never] ?? request.status} ·{' '}
              <LocalDateTime iso={request.createdAt.toISOString()} dateStyle="medium" />
            </>
          }
        />
      ))}
    </Section>
  );
}

async function AssessmentsSection({ customerId, count }: { customerId: string; count: number }) {
  const assessments = count > 0 ? await listCustomerAssessments(customerId) : [];
  return (
    <Section
      icon={Sparkles}
      title="Évaluations capillaires"
      count={count}
      shown={assessments.length}
      empty="Aucune évaluation."
    >
      {assessments.map((assessment) => (
        <LinkRow
          key={assessment.id}
          href={`/dashboard/evaluations/${assessment.id}`}
          title={assessment.serviceName}
          meta={
            <>
              {ASSESSMENT_STATUS_LABELS[assessment.status] ?? assessment.status} ·{' '}
              <LocalDateTime iso={assessment.createdAt.toISOString()} dateStyle="medium" />
            </>
          }
        />
      ))}
    </Section>
  );
}

async function ConversationsSection({ customerId, count }: { customerId: string; count: number }) {
  const conversations = count > 0 ? await listCustomerConversations(customerId) : [];
  return (
    <Section
      icon={MessageSquare}
      title="Conversations"
      count={count}
      shown={conversations.length}
      empty="Aucune conversation."
    >
      {conversations.map((conversation) => (
        <LinkRow
          key={conversation.id}
          href={`/dashboard/messages/${conversation.id}`}
          title={conversation.subject}
          meta={
            <>
              {CONVERSATION_STATUS_LABELS[conversation.status as never] ?? conversation.status} ·{' '}
              <LocalDateTime iso={conversation.lastMessageAt.toISOString()} dateStyle="medium" />
            </>
          }
          aside={
            conversation.unreadCount > 0 ? (
              <Badge tone="accent" size="sm">
                {conversation.unreadCount} non lu{conversation.unreadCount > 1 ? 's' : ''}
              </Badge>
            ) : null
          }
        />
      ))}
    </Section>
  );
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!user) redirect(`/connexion?callbackUrl=/dashboard/clients/${id}`);
  const customer = await getCustomerSummary(id);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        back={<BackButton fallbackHref="/dashboard/clients" />}
        icon={UserRound}
        title={customer.name}
        description={
          <>
            <a href={`mailto:${customer.email}`} className="text-cacao hover:underline">
              {customer.email}
            </a>
            {customer.phone ? (
              <>
                {' · '}
                <a
                  href={`tel:${customer.phone.replace(/\s+/g, '')}`}
                  className="text-cacao hover:underline"
                >
                  {customer.phone}
                </a>
              </>
            ) : (
              ' · téléphone non renseigné'
            )}
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="font-heading text-lg font-bold text-fg">Coordonnées</h2>
          <CustomerContactForm
            customerId={customer.id}
            name={customer.name}
            email={customer.email}
            phone={customer.phone}
          />
        </Card>

        <dl className="grid grid-cols-2 gap-3 self-start">
          {(
            [
              ['Rendez-vous', customer.counts.appointments],
              ['Demandes', customer.counts.customRequests],
              ['Évaluations', customer.counts.assessments],
              ['Conversations', customer.counts.conversations],
            ] as const
          ).map(([label, count]) => (
            <Card key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-heading text-2xl font-bold text-fg">{count}</dd>
            </Card>
          ))}
        </dl>

        <Suspense fallback={<SectionSkeleton />}>
          <AppointmentsSection customerId={customer.id} count={customer.counts.appointments} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <RequestsSection customerId={customer.id} count={customer.counts.customRequests} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <AssessmentsSection customerId={customer.id} count={customer.counts.assessments} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ConversationsSection customerId={customer.id} count={customer.counts.conversations} />
        </Suspense>
      </div>

      <CustomerRgpdActions customerId={customer.id} customerName={customer.name} />

      <p className="mt-4 text-xs text-muted">
        Fiche créée le <LocalDateTime iso={customer.createdAt.toISOString()} dateStyle="long" />.
        Données capillaires conservées uniquement sur les rendez-vous et évaluations, pas sur la
        fiche cliente.
      </p>
    </div>
  );
}
