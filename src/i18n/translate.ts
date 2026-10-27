import { INTL_LOCALE, type Locale } from './config';
import type { Messages } from './messages/types';

/* Traduction pure (aucune dépendance React) : t(), pluriels via Intl.PluralRules, interpolation {nom}. */

export type Plural = { one: string; other: string };
export type MessageValue = string | Plural;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageTree = { readonly [key: string]: any };

type Leaf = string | Plural;
type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
/** Toutes les clés pointées menant à une chaîne ou à un objet de pluriel. */
export type MessagePaths<T, P extends string = ''> = T extends Leaf
  ? P
  : T extends readonly unknown[]
    ? never
    : T extends object
      ? { [K in keyof T & string]: MessagePaths<T[K], Join<P, K>> }[keyof T & string]
      : never;

export type TParams = Record<string, string | number>;

function lookup(messages: MessageTree, key: string): unknown {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

export function createTranslator(locale: Locale, messages: Messages) {
  const rules = new Intl.PluralRules(INTL_LOCALE[locale]);

  /** t('home.hero.title') ; t('catalogue.count', { count: 3 }) pour un pluriel {one, other}. */
  function t(key: MessagePaths<Messages>, params?: TParams): string {
    const value = lookup(messages, key);
    if (typeof value === 'string') return interpolate(value, params);
    if (value && typeof value === 'object' && 'other' in value) {
      const plural = value as Plural;
      const count = Number(params?.count ?? 0);
      const form = rules.select(count) === 'one' ? plural.one : plural.other;
      return interpolate(form, params);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] clé manquante (${locale}) : ${key}`);
    }
    return key;
  }
  return t;
}

export type Translator = ReturnType<typeof createTranslator>;
