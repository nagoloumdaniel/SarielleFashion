'use client';

import { KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { changeAdminPassword, revokeAllSessions } from '@/modules/auth/actions';
import { SettingsSection } from './settings-section';

type AccountState = { error?: string; success?: string };

/* Carte « Mot de passe » : changement du mot de passe de l'administratrice. */
export function PasswordCard() {
  const { notify } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    changeAdminPassword,
    {},
  );

  useEffect(() => {
    if (state.success) {
      notify(state.success, 'success');
      formRef.current?.reset();
    } else if (state.error) {
      notify(state.error, 'error');
    }
  }, [state, notify]);

  return (
    <SettingsSection icon={KeyRound} title="Mot de passe">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <Input
          label="Mot de passe actuel"
          name="currentPassword"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          required
          maxLength={200}
        />
        <Input
          label="Nouveau mot de passe"
          name="newPassword"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
          hint="12 caractères minimum, avec une majuscule, une minuscule et un chiffre."
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          name="confirmPassword"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          required
          maxLength={200}
        />
        {state.error ? (
          <p role="alert" className="text-sm font-medium text-alert">
            {state.error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" icon={ShieldCheck} loading={pending}>
            Modifier le mot de passe
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

/* Carte « Sessions » : déconnecte tous les appareils (la session courante aussi). */
export function SessionsCard() {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const ok = await confirm({
      title: 'Déconnecter tous les appareils ?',
      message:
        'Toutes les sessions ouvertes seront fermées, y compris celle-ci. Vous devrez vous reconnecter.',
      confirmLabel: 'Tout déconnecter',
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      // En cas de succès le serveur redirige vers /connexion ; seule une erreur revient ici.
      const result = await revokeAllSessions();
      if (result?.error) {
        setError(result.error);
        notify(result.error, 'error');
      }
    });
  }

  return (
    <SettingsSection icon={LogOut} title="Sessions">
      <p className="text-sm text-muted">
        Fermez toutes les sessions ouvertes si vous avez perdu un appareil ou utilisé un appareil
        partagé.
      </p>
      {error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" variant="danger" icon={LogOut} loading={pending} onClick={onClick}>
          Déconnecter tous les appareils
        </Button>
      </div>
    </SettingsSection>
  );
}
