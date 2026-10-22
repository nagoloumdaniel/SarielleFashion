/* Formats FCFA (XOF) : les colonnes *Cents sont en 1/100 de FCFA, sans décimales à l'affichage. */
const fcfa = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});

export function formatFcfa(cents: number): string {
  return fcfa.format(Math.round(cents / 100));
}

export function formatFcfaOrPending(cents: number | null): string {
  return cents == null ? 'Prix à confirmer' : formatFcfa(cents);
}

/** « 1 h 30 » / « 45 min ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
