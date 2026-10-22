import { Children, Fragment, type ElementType, type ReactNode, type Ref } from 'react';

type TitleProps = {
  as?: 'h1' | 'h2' | 'h3';
  /** `display` : titre de page (grand, animé). `section` : titre de section. */
  size?: 'display' | 'section';
  id?: string;
  ref?: Ref<HTMLHeadingElement>;
  tabIndex?: number;
  className?: string;
  children: ReactNode;
};

/* Titre immersif (DESIGN-RULES.md) : majuscules, Playfair Display 900 mêlé à
   Lato italique en dégradé. Les derniers mots passent en style « accent ».
   Le texte reste un seul titre accessible : les mots sont de simples <span>. */
export function Title({
  as = 'h2',
  size = 'section',
  id,
  ref,
  tabIndex,
  className = '',
  children,
}: TitleProps) {
  const Tag = as as ElementType;
  const parts = Children.toArray(children);
  const plain = parts.every((p) => typeof p === 'string' || typeof p === 'number');
  const base = size === 'display' ? 'display-title' : 'section-title';

  if (!plain) {
    return (
      <Tag id={id} ref={ref} tabIndex={tabIndex} className={`${base} ${className}`}>
        {children}
      </Tag>
    );
  }

  const words = parts.join('').trim().split(/\s+/);
  const accentCount = words.length >= 4 ? 2 : 1;
  const firstAccent = words.length - accentCount;

  return (
    <Tag id={id} ref={ref} tabIndex={tabIndex} className={`${base} ${className}`}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span
            className={
              i >= firstAccent && words.length > 1 ? 'title-word title-accent' : 'title-word'
            }
            style={{ ['--i' as string]: i }}
          >
            {word}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  );
}
