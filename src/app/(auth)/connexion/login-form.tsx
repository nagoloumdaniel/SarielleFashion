'use client';

import { LogIn } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { login } from '@/modules/auth/actions';

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}

      <Input
        label="E-mail"
        type="email"
        name="email"
        placeholder="vous@exemple.com"
        required
        autoComplete="email"
      />

      <Input
        label="Mot de passe"
        type="password"
        name="password"
        placeholder="Votre mot de passe"
        required
        autoComplete="current-password"
      />

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" icon={LogIn} loading={pending} className="w-full">
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}
