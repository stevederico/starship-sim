interface TitleScreenProps {
  best: number;
  touch: boolean;
  onLaunch: () => void;
  onDemo: () => void;
}

const STEPS = [
  { name: 'Ascent', text: 'Throttle back through max-Q and follow the pitch marker.' },
  { name: 'Staging', text: 'Separate near 10% booster fuel.' },
  { name: 'Catch', text: 'Fly the booster back into the tower arms.' },
  { name: 'Orbit', text: 'Burn the ship to a 150 km orbit and cut off.' }
];

/** First screen: name, goal, controls and the launch button. */
export default function TitleScreen({ best, touch, onLaunch, onDemo }: TitleScreenProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between safe-pad safe-pad-wide overflow-y-auto">
      <header>
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">
          Launch · Catch · Orbit
        </p>
        <h1 className="mt-2 font-mono text-4xl font-medium tracking-tight text-balance uppercase sm:text-6xl">
          Starship Simulator
        </h1>
        <p className="mt-3 max-w-md text-sm text-pretty text-muted sm:text-base">
          Fly a full stack off the pad, catch the booster with the tower arms and put the ship
          in orbit. Score on fuel, accuracy and the catch.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-md flex-col gap-3 bg-panel px-4 py-3">
          <ol className="flex flex-col gap-1.5">
            {STEPS.map((step, index) => (
              <li key={step.name} className="flex gap-3 text-sm">
                <span className="font-mono text-accent tabular-nums">{index + 1}</span>
                <span>
                  <span className="font-medium text-foreground">{step.name}.</span>{' '}
                  <span className="text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="font-mono text-[10px] leading-relaxed tracking-[0.14em] text-muted uppercase">
            {touch
              ? 'Arrows steer · Drag the throttle · Tap the action button'
              : 'A D or arrows steer · W S throttle · Space stage and cutoff'}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {best > 0 ? (
            <p className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
              Best <span className="text-foreground tabular-nums">{best.toLocaleString('en-US')}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={onLaunch}
            className="pointer-events-auto min-h-14 border border-hot bg-hot px-10 font-mono text-base font-medium tracking-[0.2em] text-background uppercase hover:bg-hot/85"
          >
            Launch
          </button>
          <button
            type="button"
            onClick={onDemo}
            className="pointer-events-auto min-h-11 border border-foreground/30 bg-panel px-6 font-mono text-xs tracking-[0.18em] text-foreground uppercase hover:bg-foreground/10"
          >
            Watch a demo flight
          </button>
        </div>
      </div>
    </div>
  );
}
