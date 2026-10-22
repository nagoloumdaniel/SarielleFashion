'use client';

import { useState } from 'react';
import { DateField } from './DateField';
import { TimeField } from './TimeField';

/* Date + heure : deux sélecteurs, une seule valeur postée « AAAA-MM-JJTHH:mm ». */
export function DateTimeField({
  label,
  name,
  defaultValue,
  required,
  error,
  hint,
  min,
  max,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  min?: string;
  max?: string;
}) {
  const [d0, t0] = (defaultValue ?? '').split('T');
  const [date, setDate] = useState(d0 ?? '');
  const [time, setTime] = useState(t0?.slice(0, 5) ?? '');
  const full = date ? `${date}T${time || '00:00'}` : '';
  return (
    <div className="flex flex-col gap-1.5">
      {name ? <input type="hidden" name={name} value={full} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          label={label}
          required={required}
          error={error}
          min={min}
          max={max}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TimeField label="Heure" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {hint && !error ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
