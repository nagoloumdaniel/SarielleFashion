/* Formats FCFA du dashboard : les montants en base sont en 1/100 FCFA, jamais de décimales. */
const fcfa = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** 1/100 FCFA → « 15 000 F CFA ». */
export function formatFcfa(cents: number): string {
  return fcfa.format(Math.round(cents / 100));
}

/** Version courte pour les axes de graphique (« 120 k »). */
export function formatFcfaCompact(cents: number): string {
  return compact.format(Math.round(cents / 100));
}
