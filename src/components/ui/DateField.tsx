'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState, type ChangeEvent } from 'react';
import { Field, fieldBox } from './Field';
import { fakeChange, usePopover } from './usePopover';

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
function parse(v: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null;
}
function todayISO() {
  const n = new Date();
  return iso(n.getFullYear(), n.getMonth(), n.getDate());
}
export function formatDateFr(v: string) {
  const p = parse(v);
  return p ? `${pad(p[2])}/${pad(p[1] + 1)}/${p[0]}` : '';
}

type Props = {
  label: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/* Calendrier personnalisé : grille mensuelle (lundi en premier), bornes min/max, valeur ISO. */
export function DateField({
  label,
  name,
  id,
  value,
  defaultValue,
  min,
  max,
  required,
  disabled,
  error,
  hint,
  className,
  onChange,
}: Props) {
  const auto = useId();
  const inputId = id ?? `date-${auto}`;
  const { open, setOpen, ref } = usePopover();
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const base = parse(current) ?? parse(todayISO())!;
  const [view, setView] = useState<[number, number]>([base[0], base[1]]);

  const [vy, vm] = view;
  const first = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const count = new Date(vy, vm + 1, 0).getDate();
  const cells = [
    ...Array<number>(first).fill(0),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    const d = new Date(vy, vm + delta, 1);
    setView([d.getFullYear(), d.getMonth()]);
  }
  function pick(v: string) {
    setInner(v);
    setOpen(false);
    onChange?.(fakeChange<HTMLInputElement>(name, v));
  }
  const blocked = (v: string) => (min ? v < min : false) || (max ? v > max : false);
  const today = todayISO();
  const nav = 'flex size-8 items-center justify-center rounded-full text-fg hover:bg-accent-soft';

  return (
    <Field id={inputId} label={label} required={required} error={error} hint={hint}>
      <div ref={ref} className={`relative ${className ?? ''}`}>
        {name ? <input type="hidden" name={name} value={current} /> : null}
        <button
          type="button"
          id={inputId}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            if (!open) setView([base[0], base[1]]);
            setOpen(!open);
          }}
          className={`${fieldBox(error)} flex items-center gap-2 text-left disabled:opacity-60`}
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-cacao" />
          <span className={current ? '' : 'text-muted'}>
            {current ? formatDateFr(current) : 'jj/mm/aaaa'}
          </span>
        </button>
        {open ? (
          <div
            role="dialog"
            aria-label={`Choisir une date : ${label}`}
            className="absolute left-0 z-50 mt-1 w-72 rounded-[var(--radius-md)] border border-line bg-card p-3 shadow-soft"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mois précédent"
                onClick={() => shift(-1)}
                className={nav}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <p className="font-heading text-sm font-bold text-fg" aria-live="polite">
                {MONTHS[vm]} {vy}
              </p>
              <button
                type="button"
                aria-label="Mois suivant"
                onClick={() => shift(1)}
                className={nav}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
              {DAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const v = iso(vy, vm, d);
                const sel = v === current;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={blocked(v)}
                    aria-pressed={sel}
                    aria-label={formatDateFr(v)}
                    onClick={() => pick(v)}
                    className={`flex size-8 items-center justify-center rounded-full text-sm transition disabled:opacity-30 ${
                      sel
                        ? 'bg-accent font-bold text-accent-fg'
                        : v === today
                          ? 'border border-accent font-bold text-fg hover:bg-accent-soft'
                          : 'text-fg hover:bg-accent-soft'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-xs font-bold">
              <button
                type="button"
                disabled={blocked(today)}
                onClick={() => pick(today)}
                className="text-accent disabled:opacity-40"
              >
                Aujourd’hui
              </button>
              {!required && current ? (
                <button type="button" onClick={() => pick('')} className="text-muted">
                  Effacer
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
}
