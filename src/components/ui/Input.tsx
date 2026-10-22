'use client';

import {
  AtSign,
  Banknote,
  Eye,
  EyeOff,
  Hash,
  Lock,
  Mail,
  Phone,
  Search,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { DateField } from './DateField';
import { DateTimeField } from './DateTimeField';
import { Field, autoPlaceholder } from './Field';
import { TimeField } from './TimeField';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon | null;
};

/* Icône par défaut selon le type ou le nom du champ ; `icon={null}` la retire. */
function autoIcon(type: string | undefined, name: string | undefined): LucideIcon | null {
  if (type === 'email') return Mail;
  if (type === 'tel') return Phone;
  if (type === 'password') return Lock;
  if (type === 'search') return Search;
  if (type === 'number')
    return /price|prix|amount|value|montant/i.test(name ?? '')
      ? Banknote
      : /dur|minute|hour|notice|delai/i.test(name ?? '')
        ? Timer
        : Hash;
  if (/mail/i.test(name ?? '')) return Mail;
  if (/phone|tel/i.test(name ?? '')) return Phone;
  if (/name|nom|prenom/i.test(name ?? '')) return User;
  if (/handle|user|insta/i.test(name ?? '')) return AtSign;
  return null;
}

/* Champ texte avec icône. Les types date / heure / date-heure utilisent les sélecteurs
   personnalisés (calendrier, menu d'heures) à la place des contrôles natifs. */
export function Input({ label, error, hint, id, required, icon, type, ...rest }: InputProps) {
  const [visible, setVisible] = useState(false);
  if (type === 'date') {
    return (
      <DateField
        label={label}
        error={error}
        hint={hint}
        id={id}
        required={required}
        name={rest.name}
        value={rest.value as string | undefined}
        defaultValue={rest.defaultValue as string | undefined}
        min={rest.min as string | undefined}
        max={rest.max as string | undefined}
        disabled={rest.disabled}
        onChange={rest.onChange as ((e: ChangeEvent<HTMLInputElement>) => void) | undefined}
      />
    );
  }
  if (type === 'time') {
    return (
      <TimeField
        label={label}
        error={error}
        hint={hint}
        id={id}
        required={required}
        name={rest.name}
        value={rest.value as string | undefined}
        defaultValue={rest.defaultValue as string | undefined}
        disabled={rest.disabled}
        onChange={rest.onChange as ((e: ChangeEvent<HTMLInputElement>) => void) | undefined}
      />
    );
  }
  if (type === 'datetime-local') {
    return (
      <DateTimeField
        label={label}
        error={error}
        hint={hint}
        required={required}
        name={rest.name}
        defaultValue={rest.defaultValue as string | undefined}
        min={typeof rest.min === 'string' ? rest.min.slice(0, 10) : undefined}
        max={typeof rest.max === 'string' ? rest.max.slice(0, 10) : undefined}
      />
    );
  }

  const inputId = id ?? `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null]
    .filter(Boolean)
    .join(' ');
  const isPassword = type === 'password';
  const Icon = icon === null ? null : (icon ?? autoIcon(type, rest.name));
  return (
    <Field id={inputId} label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        {Icon ? (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cacao"
          />
        ) : null}
        <input
          {...rest}
          placeholder={
            rest.placeholder ??
            (type && /^(checkbox|radio|file|hidden|range|color)$/.test(type)
              ? undefined
              : autoPlaceholder(label, type, rest.name))
          }
          type={isPassword && visible ? 'text' : type}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-10 w-full rounded-[var(--radius-md)] border bg-card text-sm text-fg placeholder:text-muted transition ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${isPassword ? 'pr-11' : 'pr-3.5'} ${error ? 'border-alert' : 'border-line focus:border-cacao'}`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-cacao hover:bg-accent-soft"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </Field>
  );
}
