import { CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { CardImages } from './CardImages';

export type PrestationCardProps = {
  href: string;
  bookHref: string;
  images: { src: string; alt: string }[];
  badge: string;
  title: string;
  subtitle?: string;
  price: string;
  duration: string;
  optionsLabel?: string;
  priority?: boolean;
};

/* Carte prestation immersive (DESIGN-RULES.md) : photo plein cadre, voile et flou
   adaptés au thème, carte entièrement cliquable vers la fiche (lien étiré sur le titre). */
export function PrestationCard({
  href,
  bookHref,
  images,
  badge,
  title,
  subtitle,
  price,
  duration,
  optionsLabel,
  priority = false,
}: PrestationCardProps) {
  return (
    <article className="prestation-card group relative isolate aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] bg-line text-[#fff8d8] focus-within:ring-4 focus-within:ring-accent">
      <CardImages images={images} href={href} priority={priority} />
      <div aria-hidden="true" className="card-blur pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="card-scrim pointer-events-none absolute inset-0" />

      {/* Photo cliquable : lien étiré couvrant toute la carte (sous le bouton Réserver). */}
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className="card-stretch absolute inset-0 z-[1]"
      />

      <span className="pointer-events-none absolute left-4 top-4 z-[2] rounded-full bg-black/35 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
        {badge}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-heading text-xl font-bold leading-tight">
            <Link href={href} className="pointer-events-auto rounded-sm outline-none">
              {title}
            </Link>
          </h3>
          <p className="shrink-0 text-right text-sm font-black text-[#ffd84d]">{price}</p>
        </div>
        {subtitle ? (
          <p className="mt-1 line-clamp-1 text-sm font-light text-[#fff8d8]/75">{subtitle}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/20 pt-3 text-sm">
          <p>
            <span className="font-light text-[#fff8d8]/70">Durée : </span>
            <span className="font-bold">{duration}</span>
          </p>
          {optionsLabel ? (
            <p className="hidden font-light text-[#fff8d8]/70 min-[380px]:block">{optionsLabel}</p>
          ) : null}
          <ButtonLink
            href={bookHref}
            size="sm"
            icon={CalendarCheck}
            className="pointer-events-auto relative z-[3]"
          >
            Réserver
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
