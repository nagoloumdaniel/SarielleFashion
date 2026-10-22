'use client';

import { RotateCcw, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import type { CatalogueCategory } from '@/lib/catalogue';

type CatalogueFiltersProps = {
  categories: CatalogueCategory[];
  initialSearch: string;
  initialCategory: string;
  total: number;
};

function buildCatalogueHref(search: string, category: string): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (category) params.set('category', category);
  const query = params.toString();
  return query ? `/coiffures?${query}` : '/coiffures';
}

/**
 * Barre de recherche et filtres du catalogue.
 * - Recherche soumise au clavier (Entrée) ou après une courte pause de frappe.
 * - Catégories en puces-liens : fonctionnelles sans JavaScript, défilables sur mobile.
 * - État de chargement annoncé et visible pendant la navigation.
 */
export function CatalogueFilters({
  categories,
  initialSearch,
  initialCategory,
  total,
}: CatalogueFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const categoryRef = useRef(initialCategory);

  // Suit la catégorie réellement appliquée par l'URL.
  categoryRef.current = initialCategory;

  // Re-synchronise le champ après un retour navigateur ou un changement d'URL.
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const navigate = useCallback(
    (nextSearch: string, nextCategory: string) => {
      categoryRef.current = nextCategory;
      startTransition(() => {
        router.replace(buildCatalogueHref(nextSearch, nextCategory), { scroll: false });
      });
    },
    [router],
  );

  // Recherche « instantanée » : 400 ms après la dernière frappe.
  useEffect(() => {
    if (search === initialSearch) return;
    const timer = window.setTimeout(() => {
      navigate(search, categoryRef.current);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, navigate]);

  const hasFilters = initialSearch !== '' || initialCategory !== '';
  const resultLabel = `${total} coiffure${total > 1 ? 's' : ''} trouvée${total > 1 ? 's' : ''}`;

  return (
    <section
      aria-labelledby="filtres-titre"
      className="space-y-4 rounded-[var(--radius-xl)] border border-line bg-card/80 p-4 shadow-soft backdrop-blur-md md:p-5"
    >
      <h2 id="filtres-titre" className="sr-only">
        Rechercher et filtrer les coiffures
      </h2>

      <form
        action="/coiffures"
        method="get"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(search, initialCategory);
        }}
        className="flex gap-2"
        aria-busy={isPending || undefined}
      >
        <div className="relative min-w-0 flex-1">
          <label htmlFor="catalogue-search" className="sr-only">
            Rechercher une coiffure
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted"
          />
          <input
            id="catalogue-search"
            name="search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tresses, vanilles, locs…"
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full rounded-[var(--radius-md)] border border-line bg-page pl-10 pr-10 text-base text-fg placeholder:text-muted/70 focus:border-cacao focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {isPending ? (
            <span
              aria-hidden="true"
              className="absolute right-3.5 top-1/2 inline-block size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-cacao border-t-transparent motion-reduce:animate-none"
            />
          ) : search ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                navigate('', categoryRef.current);
              }}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        <Button type="submit" icon={Search} iconOnly="mobile" loading={isPending}>
          Rechercher
        </Button>
      </form>

      <nav
        aria-label="Filtrer par catégorie"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-5 md:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Link
          href={buildCatalogueHref(initialSearch, '')}
          scroll={false}
          aria-current={initialCategory === '' ? 'page' : undefined}
          className={buttonClasses({
            size: 'sm',
            variant: initialCategory === '' ? 'primary' : 'secondary',
          })}
        >
          Toutes
        </Link>
        {categories.map((category) => {
          const active = category.slug === initialCategory;
          return (
            <Link
              key={category.slug}
              href={buildCatalogueHref(initialSearch, category.slug)}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={buttonClasses({ size: 'sm', variant: active ? 'primary' : 'secondary' })}
            >
              {category.name}
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  active ? 'bg-accent-fg/20' : 'bg-line text-muted'
                }`}
              >
                {category.count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-sm text-muted" aria-live="polite">
          {isPending ? 'Mise à jour des résultats…' : resultLabel}
        </p>
        {hasFilters ? (
          <Link
            href="/coiffures"
            scroll={false}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cacao underline-offset-4 hover:underline"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Réinitialiser les filtres
          </Link>
        ) : null}
      </div>
    </section>
  );
}
