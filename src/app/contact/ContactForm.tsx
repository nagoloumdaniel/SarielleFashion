'use client';

import { CircleCheck, Send, TriangleAlert } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { createConversation } from './actions';

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(createConversation, null);
  const successRef = useRef<HTMLDivElement>(null);

  // Après un envoi réussi, le focus passe au message de confirmation.
  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state?.ok]);

  if (state?.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-success/30 bg-success-soft p-6 outline-none sm:p-8"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-card text-success">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-fg">Merci, c’est bien reçu</h2>
          <p className="font-medium text-fg">
            Message envoyé. Patricia vous répond par e-mail sous 24 heures ouvrées (pensez à
            vérifier vos courriers indésirables).
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={Send}
          onClick={() => window.location.reload()}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="space-y-6 rounded-[var(--radius-lg)] bg-card p-5 shadow-soft sm:p-8"
    >
      {/* Honeypot : invisible pour les humains, rempli par les bots. */}
      <input
        name="website"
        type="text"
        aria-hidden="true"
        autoComplete="off"
        tabIndex={-1}
        style={{ display: 'none' }}
      />

      <h2 className="font-heading text-xl font-bold text-fg">Votre message</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Nom"
          name="name"
          placeholder="Votre nom et prénom"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          placeholder="vous@exemple.com"
          required
          maxLength={200}
          autoComplete="email"
        />
        <div className="sm:col-span-2">
          <Input
            label="Téléphone (facultatif)"
            name="phone"
            type="tel"
            placeholder="+221 77 123 45 67"
            maxLength={30}
            autoComplete="tel"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Sujet"
            name="subject"
            placeholder="Objet de votre message"
            required
            minLength={3}
            maxLength={200}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Message"
            name="message"
            placeholder="Écrivez votre message ici…"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            autoComplete="off"
            hint="Précisez la coiffure ou la date visée si vous en avez une."
          />
        </div>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-md)] bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" icon={Send} loading={isPending} className="w-full sm:w-auto">
        {isPending ? 'Envoi en cours...' : 'Envoyer le message'}
      </Button>
    </form>
  );
}
