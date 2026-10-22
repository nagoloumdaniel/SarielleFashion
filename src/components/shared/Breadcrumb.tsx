import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

type Crumb = { label: string; href?: string };

/* Fil d'Ariane unique pour les pages publiques : dernier élément = page courante. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <li aria-hidden="true">
                <ChevronRight className="size-3.5" />
              </li>
            ) : null}
            <li>
              {item.href ? (
                <Link href={item.href} className="transition hover:text-cacao">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-fg">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
