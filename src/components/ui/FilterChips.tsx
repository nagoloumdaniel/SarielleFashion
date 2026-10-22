import { ButtonLink } from '@/components/ui/Button';

export type Chip = { href: string; label: string; active: boolean; count?: number };

/* Filtres en liens (état dans l'URL) : défilement horizontal sur mobile, sans débordement de page. */
export function FilterChips({ items, label }: { items: Chip[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {items.map((item) => (
        <ButtonLink
          key={item.href + item.label}
          href={item.href}
          size="sm"
          variant={item.active ? 'primary' : 'secondary'}
          aria-current={item.active ? 'page' : undefined}
        >
          {item.label}
          {item.count != null ? ` (${item.count})` : ''}
        </ButtonLink>
      ))}
    </nav>
  );
}
