'use client';

import { Download, ShieldAlert, UserX } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition, type FormEvent } from 'react';
import { anonymizeCustomerAction, type CustomerRgpdState } from '@/modules/clients/actions';
import { Button, buttonClasses } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const PHRASE = 'ANONYMISER';

/* Droits RGPD : export JSON et anonymisation irréversible.
   Sécurité renforcée : mot à saisir + modale de confirmation + contrôle côté serveur. */
export function CustomerRgpdActions({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [typed, setTyped] = useState('');
  const [transitioning, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<CustomerRgpdState, FormData>(
    anonymizeCustomerAction,
    {},
  );

  useEffect(() => {
    if (state.success) notify('Fiche anonymisée.', 'success');
    else if (state.error) notify(state.error, 'error');
  }, [state, notify]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (typed !== PHRASE) return;
    const ok = await confirm({
      title: 'Anonymiser cette fiche ?',
      message: `Les conversations, évaluations, demandes, avis et photos privées de ${customerName} seront supprimés définitivement. Cette action est irréversible.`,
      confirmLabel: 'Anonymiser définitivement',
    });
    if (!ok) return;
    const data = new FormData(form);
    startTransition(() => formAction(data));
  }

  const busy = pending || transitioning;

  return (
    <section
      aria-labelledby="rgpd-title"
      className="mt-3 rounded-[var(--radius-lg)] border border-alert/40 bg-alert-soft p-4 sm:p-5"
    >
      <h2
        id="rgpd-title"
        className="flex items-center gap-2 font-heading text-lg font-bold text-fg"
      >
        <ShieldAlert aria-hidden="true" className="size-5 text-alert" />
        Droits RGPD
      </h2>
      <p className="mt-1 text-sm text-muted">
        Export ou effacement des données de {customerName}. L’effacement supprime conversations,
        évaluations, demandes, avis et photos, puis anonymise la fiche. Les rendez-vous sont
        conservés sans identité, pour la comptabilité.
      </p>

      <div className="mt-3">
        <a
          href={`/api/admin/clients/${customerId}/export`}
          download
          className={buttonClasses({ variant: 'secondary' })}
        >
          <Download aria-hidden="true" className="size-[18px] shrink-0" />
          Exporter les données (JSON)
        </a>
      </div>

      {state.success ? (
        <div
          role="status"
          className="mt-4 rounded-[var(--radius-md)] bg-card p-3 text-sm text-success"
        >
          <p>{state.success}</p>
          <Link href="/dashboard/clients" className="mt-2 inline-block font-semibold underline">
            Retour à la liste des clientes
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="customerId" value={customerId} />
          <Input
            label={`Pour confirmer, saisissez ${PHRASE}`}
            name="confirmation"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={PHRASE}
            icon={ShieldAlert}
            error={state.error}
          />
          <div>
            <Button
              type="submit"
              variant="danger"
              icon={UserX}
              loading={busy}
              disabled={typed !== PHRASE || busy}
            >
              Anonymiser la fiche
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
