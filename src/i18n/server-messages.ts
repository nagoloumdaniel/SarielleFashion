import type { Locale } from './config';
import { deServerMessages } from './messages/de/server';

/* Messages renvoyés par les server actions / schémas Zod (français à la source).
 * En allemand ils sont traduits à l'affichage via ce catalogue fr -> de.
 * Les messages dynamiques utilisent des paramètres {0}, {1}... dans la clé ET la valeur. */

type Compiled = { regex: RegExp; target: string };
let compiled: Compiled[] | null = null;

function compile(): Compiled[] {
  if (compiled) return compiled;
  compiled = Object.entries(deServerMessages)
    .filter(([source]) => /\{\d+\}/.test(source))
    .map(([source, target]) => {
      const escape = (part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = source
        .split(/\{\d+\}/)
        .map(escape)
        .join('(.+?)');
      return { regex: new RegExp(`^${pattern}$`), target };
    });
  return compiled;
}

/** Traduit un message serveur français ; renvoie le texte tel quel s'il est inconnu ou en français. */
export function localizeMessage(locale: Locale, text: string | undefined | null): string {
  if (!text || locale === 'fr') return text ?? '';
  const exact = deServerMessages[text];
  if (exact) return exact;
  for (const { regex, target } of compile()) {
    const match = regex.exec(text);
    if (match) {
      return target.replace(/\{(\d+)\}/g, (_, i: string) =>
        translateParam(match[Number(i) + 1] ?? ''),
      );
    }
  }
  return text;
}

/** Paramètre capturé : libellé connu du catalogue, sinon délai (« 30 minutes », « 1 h 30 ») traduit. */
function translateParam(value: string): string {
  const known = deServerMessages[value];
  if (known) return known;
  return value
    .replace(/^(\d+) h (\d{2})$/, '$1 Std. $2 Min.')
    .replace(/^(\d+) heures?$/, (_, n: string) => `${n} ${Number(n) === 1 ? 'Stunde' : 'Stunden'}`)
    .replace(
      /^(\d+) minutes?$/,
      (_, n: string) => `${n} ${Number(n) === 1 ? 'Minute' : 'Minuten'}`,
    );
}
