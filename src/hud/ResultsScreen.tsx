import { SCORE_MAX } from '../game/scoring.ts';
import type { Score } from '../game/scoring.ts';

interface ResultsScreenProps {
  score: Score;
  best: number;
  isBest: boolean;
  demo: boolean;
  onRestart: () => void;
  onTitle: () => void;
}

function headline(score: Score): string {
  if (score.caught && score.inOrbit) return 'Mission complete';
  if (score.inOrbit) return 'Ship in orbit, booster lost';
  if (score.caught) return 'Booster caught, ship lost';
  return 'Vehicle lost';
}

function Category({ label, points, max }: { label: string; points: number; max: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{label}</span>
      <span className="font-mono text-lg text-foreground tabular-nums">
        {points.toLocaleString('en-US')}
        <span className="text-xs text-muted"> / {max.toLocaleString('en-US')}</span>
      </span>
      <div className="h-1 bg-foreground/15">
        <div className="h-full bg-accent" style={{ width: `${(points / max) * 100}%` }} />
      </div>
    </div>
  );
}

/** End of flight: total, rank, category and line scores, restart. */
export default function ResultsScreen({
  score,
  best,
  isBest,
  demo,
  onRestart,
  onTitle
}: ResultsScreenProps) {
  const complete = score.caught && score.inOrbit;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center safe-pad overflow-y-auto bg-background/70">
      <section
        aria-labelledby="results-title"
        className="flex w-full max-w-lg flex-col gap-4 border border-foreground/20 bg-background/90 p-5 sm:p-7"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">
              {demo ? 'Demo flight' : 'Flight report'}
            </p>
            <h2
              id="results-title"
              className={`mt-1 text-xl font-medium text-balance sm:text-2xl ${complete ? 'text-good' : 'text-foreground'}`}
            >
              {headline(score)}
            </h2>
          </div>
          <div className="flex flex-col items-center border border-hot px-3 py-1">
            <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">Rank</span>
            <span className="font-mono text-3xl text-hot">{score.rank}</span>
          </div>
        </header>

        <div>
          <p className="font-mono text-5xl text-foreground tabular-nums sm:text-6xl">
            {score.total.toLocaleString('en-US')}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            {isBest ? 'New best' : `Best ${best.toLocaleString('en-US')}`} · Max{' '}
            {SCORE_MAX.total.toLocaleString('en-US')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Category label="Fuel" points={score.fuel} max={SCORE_MAX.fuel} />
          <Category label="Accuracy" points={score.accuracy} max={SCORE_MAX.accuracy} />
          <Category label="Catch" points={score.catch} max={SCORE_MAX.catch} />
        </div>

        <table className="w-full text-sm">
          <tbody>
            {score.lines.map((line) => (
              <tr key={line.label} className="border-t border-foreground/10">
                <th scope="row" className="py-1 text-left font-normal text-muted">
                  {line.label}
                </th>
                <td className="py-1 text-right font-mono text-foreground tabular-nums">
                  {line.points.toLocaleString('en-US')}
                  <span className="text-muted"> / {line.max.toLocaleString('en-US')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-12 flex-1 border border-hot bg-hot px-6 font-mono text-sm font-medium tracking-[0.2em] text-background uppercase hover:bg-hot/85"
          >
            {demo ? 'Fly it yourself' : 'Fly again'}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-12 border border-foreground/30 px-6 font-mono text-xs tracking-[0.18em] text-foreground uppercase hover:bg-foreground/10"
          >
            Title
          </button>
        </div>
      </section>
    </div>
  );
}
