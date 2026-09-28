import { useEffect, useState } from 'react';
import type { Mission } from '../game/mission.ts';
import type { Controls } from '../input/controls.ts';
import { hudModel } from './model.ts';
import type { HudModel } from './model.ts';
import { AttitudeDial, Bar, Readout, Throttle, toneText } from './parts.tsx';
import TouchControls from './TouchControls.tsx';

export interface Banner {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

interface FlightHudProps {
  mission: Mission;
  controls: Controls;
  banner: Banner | null;
  /** True while guidance flies the mission for the player. */
  demo: boolean;
  touch: boolean;
  paused: boolean;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
}

const BANNER_TONE: Record<Banner['tone'], string> = {
  good: 'border-good/60 text-good',
  bad: 'border-bad/60 text-bad',
  info: 'border-accent/50 text-accent'
};

/** Re-reads the mission about 20 times a second. The sim itself runs per frame. */
function useHud(mission: Mission): HudModel {
  const [hud, setHud] = useState(() => hudModel(mission));
  useEffect(() => {
    const refresh = () => setHud(hudModel(mission));
    const id = window.setInterval(refresh, 50);
    window.addEventListener('hud-refresh', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('hud-refresh', refresh);
    };
  }, [mission]);
  return hud;
}

function IconButton({
  label,
  pressed,
  onClick,
  children
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="pointer-events-auto flex size-11 items-center justify-center border border-foreground/25 bg-panel text-foreground hover:bg-foreground/10"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** Flight overlay: telemetry, gauges, prompts and touch controls. */
export default function FlightHud({
  mission,
  controls,
  banner,
  demo,
  touch,
  paused,
  muted,
  onPause,
  onMute
}: FlightHudProps) {
  const hud = useHud(mission);
  const showControls = hud.flying || hud.phase === 'countdown';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">
              {hud.phaseLabel}
            </p>
            <p className="mt-0.5 font-mono text-lg text-foreground tabular-nums">{hud.clock}</p>
          </div>
          {hud.readouts.length > 0 ? (
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 bg-panel px-3 py-2 sm:flex sm:gap-6 sm:px-4 sm:py-3">
              {hud.readouts.map((readout) => (
                <Readout key={readout.label} {...readout} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <IconButton label={muted ? 'Sound on' : 'Sound off'} pressed={muted} onClick={onMute}>
            <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
            {muted ? <path d="M17 9 L22 15 M22 9 L17 15" /> : <path d="M17 8 Q20 12 17 16" />}
          </IconButton>
          <IconButton label={paused ? 'Resume' : 'Pause'} pressed={paused} onClick={onPause}>
            {paused ? <path d="M8 5 L19 12 L8 19 Z" /> : <path d="M8 5 V19 M16 5 V19" />}
          </IconButton>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-start gap-3 pt-3">
        {demo ? (
          <p className="font-mono text-[10px] tracking-[0.22em] text-hot uppercase">
            Demo flight · Guidance is flying
          </p>
        ) : null}
        {banner ? (
          <p
            key={banner.id}
            role="status"
            className={`banner border bg-panel px-4 py-2 font-mono text-sm tracking-[0.2em] uppercase ${BANNER_TONE[banner.tone]}`}
          >
            {banner.text}
          </p>
        ) : null}
        {hud.countdown !== null && hud.countdown > 0 ? (
          <p className="mt-6 font-mono text-7xl text-foreground tabular-nums">{hud.countdown}</p>
        ) : null}
        {hud.card ? (
          <div className="mt-4 max-w-sm border border-accent/40 bg-panel px-5 py-4">
            <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">Next</p>
            <h2 className="mt-1 text-xl font-medium text-balance">{hud.card.title}</h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
              {hud.card.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-3">
        {hud.prompt && hud.flying ? (
          <p
            role="status"
            className={`self-center bg-panel px-3 py-1.5 text-center font-mono text-xs tracking-wide sm:text-sm ${toneText(hud.promptTone === 'dim' ? 'ok' : hud.promptTone)}`}
          >
            {hud.prompt}
          </p>
        ) : null}
        {showControls ? (
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-3">
              <div className="flex w-40 flex-col gap-2 bg-panel px-3 py-2 sm:w-56 sm:px-4 sm:py-3">
                {hud.bars.map((bar) => (
                  <Bar key={bar.label} {...bar} />
                ))}
              </div>
              {touch ? <TouchControls controls={controls} /> : null}
            </div>
            <AttitudeDial angle={hud.angle} cue={hud.cueAngle} prograde={hud.prograde} />
            <div className="flex flex-col items-end gap-3">
              {hud.actionLabel ? (
                <button
                  type="button"
                  disabled={!hud.actionReady}
                  onClick={() => controls.pressAction()}
                  className="pointer-events-auto min-h-12 min-w-24 border border-hot bg-hot/20 px-4 font-mono text-sm tracking-[0.18em] text-foreground uppercase hover:bg-hot/40 disabled:border-foreground/20 disabled:bg-panel disabled:text-muted"
                >
                  {hud.actionLabel}
                </button>
              ) : null}
              <Throttle
                value={hud.throttle}
                cue={hud.throttleCue}
                onSet={(value) => controls.setThrottle(value)}
                tall={touch}
              />
            </div>
          </div>
        ) : null}
        {showControls && !touch ? (
          <p className="hidden text-center font-mono text-[10px] tracking-[0.14em] text-muted uppercase sm:block">
            A D Steer · W S Throttle · Z Full · X Cut · Space Action · P Pause
          </p>
        ) : null}
      </footer>
    </div>
  );
}
