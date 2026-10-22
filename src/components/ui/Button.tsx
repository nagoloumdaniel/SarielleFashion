import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost' | 'onDark';
type ButtonSize = 'sm' | 'md' | 'lg';
/* `true` : icône seule partout ; `'mobile'` : icône seule sous 640 px, libellé visible ensuite. */
type IconOnly = boolean | 'mobile';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconOnly?: IconOnly;
  children: ReactNode;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  CommonProps & {
    loading?: boolean;
  };

type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  CommonProps & {
    href: string;
    prefetch?: boolean;
  };

const VARIANTS: Record<ButtonVariant, string> = {
  // Primaire ocre (clair) / jaune (sombre) : text-accent-fg garantit le contraste AA.
  primary: 'bg-gradient-primary text-accent-fg hover:brightness-110 shadow-soft',
  secondary: 'bg-card text-fg border border-line hover:border-cacao shadow-soft',
  ghost: 'bg-transparent text-cacao hover:bg-accent-soft',
  danger: 'bg-alert text-alert-fg hover:brightness-95',
  // Action destructive discrète (ex. déconnexion) : texte rouge, fond rouge doux au survol.
  dangerGhost: 'bg-transparent text-alert hover:bg-alert-soft',
  // Sur fond sombre/ocre (hero, panneaux) : verre translucide lisible.
  onDark: 'border border-white/25 bg-white/10 text-panel-fg hover:bg-white/20',
};

/* Hauteurs uniques (boutons = champs = menus) : sm 36, md 40, lg 44. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-[var(--radius-md)]',
  md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
  lg: 'h-11 px-5 text-sm rounded-[var(--radius-md)]',
};

const SQUARE: Record<ButtonSize, string> = { sm: 'size-9', md: 'size-10', lg: 'size-11' };
const SQUARE_MOBILE: Record<ButtonSize, string> = {
  sm: 'max-sm:size-9 max-sm:px-0',
  md: 'max-sm:size-10 max-sm:px-0',
  lg: 'max-sm:size-11 max-sm:px-0',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  className = '',
}: Pick<CommonProps, 'variant' | 'size' | 'iconOnly'> & { className?: string }) {
  const shape =
    iconOnly === true
      ? `${SQUARE[size]} rounded-[var(--radius-md)] p-0`
      : `${SIZES[size]} ${iconOnly === 'mobile' ? SQUARE_MOBILE[size] : ''}`;
  return `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${shape} ${className}`;
}

function Content({
  icon: Icon,
  iconOnly,
  children,
  loading,
}: Pick<CommonProps, 'icon' | 'iconOnly' | 'children'> & { loading?: boolean }) {
  // inline-flex : une icône passée en enfant reste alignée avec le libellé (svg = display:block).
  const hideLabel =
    iconOnly === true
      ? 'sr-only'
      : iconOnly === 'mobile'
        ? 'max-sm:sr-only sm:inline-flex sm:items-center sm:gap-2'
        : 'inline-flex items-center gap-2';
  return (
    <>
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block size-4 animate-spin rounded-full motion-reduce:animate-none border-2 border-current border-t-transparent"
        />
      ) : Icon ? (
        <Icon aria-hidden="true" className="size-[18px] shrink-0" />
      ) : null}
      <span className={hideLabel}>{children}</span>
    </>
  );
}

const titleOf = (iconOnly: IconOnly | undefined, children: ReactNode) =>
  iconOnly && typeof children === 'string' ? children : undefined;

/* Bouton accessible : hauteur uniforme, icône optionnelle, icône seule (toujours ou sur mobile),
   état de chargement annoncé. Un `loading` désactive le bouton (anti double-clic). */
export function Button({
  variant,
  size,
  icon,
  iconOnly,
  loading = false,
  disabled,
  children,
  className = '',
  title,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      title={title ?? titleOf(iconOnly, children)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, iconOnly, className })}
    >
      <Content icon={icon} iconOnly={iconOnly} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

/* Lien ayant l'apparence d'un bouton (mêmes tailles et variantes). */
export function ButtonLink({
  variant,
  size,
  icon,
  iconOnly,
  children,
  className = '',
  title,
  href,
  prefetch,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch}
      title={title ?? titleOf(iconOnly, children)}
      className={buttonClasses({ variant, size, iconOnly, className })}
    >
      <Content icon={icon} iconOnly={iconOnly}>
        {children}
      </Content>
    </Link>
  );
}
