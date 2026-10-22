'use client';

import { Clock } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Select } from './Select';

/* Heure : menu déroulant par pas de 15 min (une valeur existante hors pas est conservée). */
export function TimeField({
  value,
  defaultValue,
  step = 15,
  required,
  onChange,
  ...rest
}: {
  label: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const times: string[] = [];
  for (let m = 0; m < 1440; m += step) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  const extra = [value, defaultValue].filter((v): v is string => !!v && !times.includes(v));
  const options = [
    ...(required ? [] : [{ value: '', label: '--:--' }]),
    ...[...times, ...extra].sort().map((t) => ({ value: t, label: t })),
  ];
  return (
    <Select
      {...rest}
      required={required}
      icon={Clock}
      options={options}
      value={value}
      defaultValue={defaultValue ?? (required ? '09:00' : '')}
      onChange={onChange as never}
    />
  );
}
