import { CalendarDays, ChevronRight, MessageSquare, Search, Users, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/guards';
import { listCustomers } from '@/modules/clients/queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { RowCard, rowLinkClass } from '@/components/ui/RowCard';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = { title: 'Clientes - Tableau de bord' };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  if (!user) redirect('/connexion?callbackUrl=/dashboard/clients');

  const params = await searchParams;
  const search = first(params.q).slice(0, 100);
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const result = await listCustomers({ search, page });

  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams();
    if (search) query.set('q', search);
    if (nextPage > 1) query.set('page', String(nextPage));
    const value = query.toString();
    return value ? `/dashboard/clients?${value}` : '/dashboard/clients';
  };

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Clientes"
        description={`${result.total} fiche${result.total > 1 ? 's' : ''} · accès réservé à l’administration`}
      />

      <form
        method="get"
        action="/dashboard/clients"
        role="search"
        className="mb-3 flex items-end gap-2"
      >
        <div className="min-w-0 flex-1">
          <Input
            label="Rechercher une cliente"
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Nom, e-mail ou téléphone"
            maxLength={100}
          />
        </div>
        <Button type="submit" variant="secondary" icon={Search} iconOnly="mobile">
          Rechercher
        </Button>
        {search ? (
          <ButtonLink href="/dashboard/clients" variant="ghost" icon={X} iconOnly="mobile">
            Réinitialiser
          </ButtonLink>
        ) : null}
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          variant="compact"
          title={search ? 'Aucun résultat' : 'Aucune cliente'}
          message={
            search
              ? 'Aucune fiche ne correspond à cette recherche. Essayez un autre nom, e-mail ou numéro.'
              : 'Les fiches sont créées automatiquement lors d’une réservation, d’une demande ou d’un message.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.items.map((customer) => (
            <li key={customer.id}>
              <RowCard>
                <div className="flex items-center gap-3">
                  <Avatar name={customer.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/clients/${customer.id}`}
                      className={`block truncate font-semibold text-fg ${rowLinkClass}`}
                    >
                      {customer.name}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {customer.email}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        {customer.appointmentCount} rdv
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare aria-hidden="true" className="size-3.5" />
                        {customer.conversationCount} conv.
                      </span>
                      <span>
                        {customer.customRequestCount} demande
                        {customer.customRequestCount > 1 ? 's' : ''} · {customer.assessmentCount}{' '}
                        évaluation{customer.assessmentCount > 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
                </div>
              </RowCard>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={hrefFor}
        label="Pagination des clientes"
      />
    </div>
  );
}
