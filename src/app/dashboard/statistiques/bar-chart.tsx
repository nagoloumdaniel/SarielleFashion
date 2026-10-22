/* Graphiques sans dépendance (composants serveur) : barres fines à sommet arrondi, une seule teinte,
   grille discrète, valeurs au survol / focus clavier, tableau de valeurs en alternative. */

export type BarDatum = { key: string; label: string; tip: string; value: number };

/** Plafond « rond » (1, 2, 5 × 10^n) pour que l'axe reste lisible. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

export function BarChart({
  data,
  format,
  formatAxis,
  title,
  valueLabel,
}: {
  data: BarDatum[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  title: string;
  valueLabel: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const step = Math.ceil(data.length / 6);
  const empty = data.every((d) => d.value === 0);
  const axis = formatAxis ?? format;

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="flex h-36 w-9 shrink-0 flex-col justify-between text-right text-[11px] leading-none text-muted sm:h-44 sm:w-11"
        >
          <span>{axis(max)}</span>
          <span>{axis(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-36 border-b border-line sm:h-44">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-line/70" />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 border-t border-dashed border-line/70"
            />
            <ul className="absolute inset-0 flex items-end gap-[3px]" role="list">
              {data.map((d, i) => {
                const pct = (d.value / max) * 100;
                const align =
                  i < data.length * 0.25
                    ? 'left-0'
                    : i > data.length * 0.75
                      ? 'right-0'
                      : 'left-1/2 -translate-x-1/2';
                return (
                  <li
                    key={d.key}
                    tabIndex={0}
                    aria-label={`${d.tip} : ${format(d.value)}`}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm outline-none focus-visible:bg-accent-soft hover:bg-accent-soft/60"
                  >
                    <span
                      aria-hidden="true"
                      className={`block w-full max-w-7 rounded-t-[4px] ${d.value > 0 ? 'bg-accent' : 'bg-line'}`}
                      style={{ height: d.value > 0 ? `max(${pct}%, 3px)` : '2px' }}
                    />
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-44 rounded-[var(--radius-sm)] bg-ink px-2 py-1 text-xs text-panel-fg shadow-lift group-hover:block group-focus-visible:block ${align}`}
                    >
                      <span className="block opacity-80">{d.tip}</span>
                      <span className="block font-bold">{format(d.value)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {empty ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                Aucune donnée sur la période.
              </p>
            ) : null}
          </div>
          <ul aria-hidden="true" className="mt-1.5 flex gap-[3px]">
            {data.map((d, i) => (
              <li key={d.key} className="relative h-4 min-w-0 flex-1">
                {i % step === 0 ? (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">
                    {d.label}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-accent focus-visible:outline-2">
          Voir les valeurs
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-[var(--radius-md)] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-accent-soft text-fg">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-semibold">
                  Période
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                  {valueLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((d) => (
                <tr key={d.key}>
                  <td className="px-3 py-1.5 text-muted">{d.tip}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-fg">
                    {format(d.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/* Classement horizontal : libellé + valeur au-dessus d'une barre fine (lisible sur mobile). */
export function RankBars({
  rows,
  emptyLabel,
}: {
  rows: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{emptyLabel}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg">{row.label}</span>
            <span className="shrink-0 font-bold text-fg">{row.value}</span>
          </div>
          <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
