'use client';

import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Field, fieldBox } from './Field';
import { fakeChange, usePopover } from './usePopover';

type Option = { value: string; label: string };

type SelectProps = {
  label: string;
  options: ReadonlyArray<Option>;
  name?: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  value?: string;
  defaultValue?: string;
  className?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

/* Menu déroulant personnalisé (listbox ARIA, clavier) ; valeur postée via un champ caché. */
export function Select({
  label,
  options,
  name,
  id,
  error,
  hint,
  required,
  disabled,
  icon: Icon,
  value,
  defaultValue,
  className,
  onChange,
}: SelectProps) {
  const auto = useId();
  const inputId = id ?? `select-${auto}`;
  const { open, setOpen, ref } = usePopover();
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? '');
  const [cursor, setCursor] = useState(0);
  const current = value ?? inner;
  const selected = options.find((o) => o.value === current);

  function pick(v: string) {
    setInner(v);
    setOpen(false);
    onChange?.(fakeChange<HTMLSelectElement>(name, v));
  }

  function toggle() {
    if (disabled) return;
    setCursor(
      Math.max(
        0,
        options.findIndex((o) => o.value === current),
      ),
    );
    setOpen(!open);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return toggle();
      setCursor((c) => (c + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault();
      const o = options[cursor];
      if (o) pick(o.value);
    }
  }

  return (
    <Field id={inputId} label={label} required={required} error={error} hint={hint}>
      <div ref={ref} className={`relative ${className ?? ''}`}>
        {name ? <input type="hidden" name={name} value={current} /> : null}
        <button
          type="button"
          id={inputId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${inputId}-list`}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={onKeyDown}
          className={`${fieldBox(error)} flex items-center gap-2 text-left disabled:opacity-60`}
        >
          {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-cacao" /> : null}
          <span
            className={`min-w-0 flex-1 truncate ${selected && selected.label ? '' : 'text-muted'}`}
          >
            {selected?.label || 'Sélectionner…'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open ? (
          <ul
            id={`${inputId}-list`}
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-[var(--radius-md)] border border-line bg-card p-1 shadow-soft"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === current}
                data-value={o.value}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                onPointerEnter={() => setCursor(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-fg ${
                  i === cursor ? 'bg-accent-soft' : ''
                } ${o.value === current ? 'font-bold' : ''}`}
              >
                <span>{o.label}</span>
                {o.value === current ? (
                  <Check aria-hidden="true" className="size-4 text-accent" />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
