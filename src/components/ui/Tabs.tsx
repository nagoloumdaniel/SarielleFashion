'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/* Onglets WAI-ARIA : flèches gauche/droite (en boucle), Home/End, tabIndex itinérant,
   activation automatique au focus. */
export function Tabs({
  tabs,
  defaultIndex = 0,
  label = 'Onglets',
}: {
  tabs: ReadonlyArray<{ id: string; label: string; content: ReactNode }>;
  defaultIndex?: number;
  label?: string;
}) {
  const [active, setActive] = useState(defaultIndex);
  const uid = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function goTo(index: number) {
    setActive(index);
    refs.current[index]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    goTo(next);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`h-9 rounded-[var(--radius-md)] px-3.5 text-sm font-semibold transition-colors ${
              i === active
                ? 'bg-accent text-accent-fg'
                : 'bg-card text-fg border border-line hover:border-cacao'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${uid}-panel-${tabs[active]?.id}`}
        aria-labelledby={`${uid}-tab-${tabs[active]?.id}`}
        tabIndex={0}
        className="mt-4"
      >
        {tabs[active]?.content}
      </div>
    </div>
  );
}
