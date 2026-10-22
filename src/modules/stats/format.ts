/* Formats euro du dashboard : les montants en base sont en centimes, jamais de décimales. */
const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** centimes → « 150 € ». */
export function formatEuro(cents: number): string {
  return euro.format(Math.round(cents / 100));
}

/** Version courte pour les axes de graphique (« 120 k »). */
export function formatEuroCompact(cents: number): string {
  return compact.format(Math.round(cents / 100));
}
