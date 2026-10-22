'use client';

import { Save } from 'lucide-react';
import { startTransition, useActionState, useEffect, type FormEvent } from 'react';
import { updateCustomerContactAction, type CustomerRgpdState } from '@/modules/clients/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

/* Modification des coordonnées (nom, e-mail, téléphone +221). Erreur sous le formulaire + toast. */
export function CustomerContactForm({
  customerId,
  name,
  email,
  phone,
}: {
  customerId: string;
  name: string;
  email: string;
  phone: string;
}) {
  const { notify } = useToast();
  const [state, formAction, pending] = useActionState<CustomerRgpdState, FormData>(
    updateCustomerContactAction,
    {},
  );

  useEffect(() => {
    if (state.success) notify(state.success, 'success');
    else if (state.error) notify(state.error, 'error');
  }, [state, notify]);

  /* `onSubmit` plutôt que `<form action>` : React 19 remet sinon les champs aux valeurs d'origine
     après l'action, ce qui efface la saisie sur erreur (ex. e-mail déjà utilisé). La clé remonte
     le formulaire quand les valeurs serveur changent (succès + revalidation). */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      key={`${name}|${email}|${phone}`}
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-3"
    >
      <input type="hidden" name="customerId" value={customerId} />
      <Input label="Nom" name="name" defaultValue={name} required maxLength={100} />
      <Input
        label="E-mail"
        name="email"
        type="email"
        defaultValue={email}
        required
        maxLength={200}
        spellCheck={false}
      />
      <Input
        label="Téléphone"
        name="phone"
        type="tel"
        defaultValue={phone}
        maxLength={30}
        placeholder="+49 151 23456789"
      />
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" icon={Save} loading={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
