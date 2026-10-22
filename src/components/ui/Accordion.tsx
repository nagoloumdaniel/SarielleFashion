'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

type Item = { id: string; title: string; content: string };

/* Accordéon accessible (boutons aria-expanded). Deux colonnes dès md (items-start : ouvrir une
   question n'étire pas sa voisine). */
export function Accordion({ items }: { items: ReadonlyArray<Item> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  function renderItem(item: Item) {
    const open = openId === item.id;
    return (
      <div
        key={item.id}
        className="rounded-[var(--radius-md)] border border-line bg-card shadow-soft"
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`accordion-${item.id}`}
          onClick={() => setOpenId(open ? null : item.id)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
        >
          {item.title}
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-cacao transition ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open ? (
          <p id={`accordion-${item.id}`} className="px-5 pb-5 text-muted">
            {item.content}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-3 md:grid-cols-2 md:gap-4">{items.map(renderItem)}</div>
  );
}
