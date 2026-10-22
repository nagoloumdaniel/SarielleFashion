'use client';

import { FolderOpen, RotateCcw, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

/* Filtres de la liste des prestations : l'URL reste la source de vérité (partageable, retour
   arrière). Menus : application immédiate ; recherche : après 300 ms sans frappe. */

type Option = { value: string; label: string };

export function ServiceFilters({
  search,
  category,
  status,
  categoryOptions,
  statusOptions,
}: {
  search: string;
  category: string;
  status: string;
  categoryOptions: Option[];
  statusOptions: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);
  const lastApplied = useRef(search);
  const hasFilters = search !== '' || category !== '' || status !== '';

  function apply(next: { search?: string; category?: string; status?: string }) {
    const params = new URLSearchParams();
    const values = { search: lastApplied.current, category, status, ...next };
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/dashboard/catalogue?${qs}` : '/dashboard/catalogue', {
        scroll: false,
      });
    });
  }

  // Recherche avec délai : on n'écrit dans l'URL que si la saisie a vraiment changé.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === lastApplied.current) return;
    const timer = window.setTimeout(() => {
      lastApplied.current = trimmed;
      apply({ search: trimmed });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply dépend uniquement des props lues ici
  }, [query]);

  return (
    <form
      role="search"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        lastApplied.current = query.trim();
        apply({ search: query.trim() });
      }}
      className="grid grid-cols-1 gap-3 border-b border-line p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_minmax(0,12rem)_auto] sm:items-end sm:p-4"
    >
      <Input
        label="Rechercher"
        name="search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nom, slug, description"
      />
      <Select
        label="Catégorie"
        name="category"
        icon={FolderOpen}
        value={category}
        onChange={(event) => apply({ category: event.target.value })}
        options={categoryOptions}
      />
      <Select
        label="Statut"
        name="status"
        icon={Tag}
        value={status}
        onChange={(event) => apply({ status: event.target.value })}
        options={statusOptions}
      />
      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          icon={RotateCcw}
          iconOnly="mobile"
          loading={pending}
          onClick={() => {
            setQuery('');
            lastApplied.current = '';
            startTransition(() => router.replace('/dashboard/catalogue', { scroll: false }));
          }}
        >
          Réinitialiser
        </Button>
      ) : null}
    </form>
  );
}
