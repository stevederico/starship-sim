import type { Bar as BarModel, Readout as ReadoutModel, Tone } from './model.ts';

const TEXT: Record<Tone, string> = {
  ok: 'text-foreground',
  warn: 'text-warn',
  bad: 'text-bad',
  dim: 'text-muted'
};

const FILL: Record<Tone, string> = {
  ok: 'bg-accent',
  warn: 'bg-warn',
  bad: 'bg-bad',
  dim: 'bg-muted'
};

export function toneText(tone: Tone): string {
  return TEXT[tone];
}

export function Readout({ label, value, unit, tone }: ReadoutModel) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase sm:text-[10px]">
        {label}
      </span>
      <span className={`font-mono text-sm tabular-nums sm:text-base ${TEXT[tone]}`}>
        {value}
        <span className="ml-1 text-[10px] text-muted">{unit}</span>
      </span>
    </div>
  );
}

export function Bar({ label, value, marker, text, tone }: BarModel) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase sm:text-[10px]">
          {label}
        </span>
        <span className={`font-mono text-[11px] tabular-nums ${TEXT[tone]}`}>{text}</span>
      </div>
      <div
        className="relative h-1.5 w-full bg-foreground/15"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <div className={`h-full ${FILL[tone]}`} style={{ width: `${value * 100}%` }} />
        {marker !== null ? (
          <div
            className="absolute -top-1 h-3.5 w-0.5 bg-foreground"
            style={{ left: `${marker * 100}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

interface DialProps {
  /** Tilt from vertical, radians. */
  angle: number;
  cue: number;
  prograde: number | null;
}

const DEG = 180 / Math.PI;

/** Attitude dial: white needle is the vehicle, blue chevron is where to point. */
export function AttitudeDial({ angle, cue, prograde }: DialProps) {
  const error = Math.abs(cue - angle) * DEG;
  const cueColor = error < 3 ? 'var(--color-good)' : error < 8 ? 'var(--color-accent)' : 'var(--color-warn)';
  return (
    <svg viewBox="-60 -60 120 120" className="size-24 sm:size-28" role="img" aria-label="Attitude">
      <circle r="54" fill="rgb(5 7 10 / 0.62)" stroke="rgb(232 238 242 / 0.25)" strokeWidth="1" />
      {[-90, -60, -30, 0, 30, 60, 90].map((tick) => (
        <line
          key={tick}
          y1="-54"
          y2={tick % 90 === 0 ? -44 : -49}
          stroke="rgb(232 238 242 / 0.45)"
          strokeWidth="1"
          transform={`rotate(${tick})`}
        />
      ))}
      {prograde !== null ? (
        <g transform={`rotate(${prograde * DEG})`}>
          <circle cy="-34" r="4" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" />
        </g>
      ) : null}
      <g transform={`rotate(${cue * DEG})`}>
        <path d="M -7 -40 L 0 -52 L 7 -40" fill="none" stroke={cueColor} strokeWidth="3" />
      </g>
      <g transform={`rotate(${angle * DEG})`}>
        <path d="M 0 -42 L 4.5 -26 L 4.5 18 L -4.5 18 L -4.5 -26 Z" fill="var(--color-foreground)" />
        <path d="M -4.5 8 L -10 20 L -4.5 18 Z M 4.5 8 L 10 20 L 4.5 18 Z" fill="var(--color-muted)" />
      </g>
      <text
        y="40"
        textAnchor="middle"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill="var(--color-muted)"
      >
        {`${(angle * DEG).toFixed(0)}°`}
      </text>
    </svg>
  );
}

interface ThrottleProps {
  value: number;
  /** Suggested setting, or null to hide the tick. */
  cue: number | null;
  /** Called with 0..1 while the player drags. Omit for a read-only gauge. */
  onSet?: (value: number) => void;
  tall?: boolean;
}

/** Vertical throttle. Drag it on touch screens. Tick shows the suggested setting. */
export function Throttle({ value, cue, onSet, tall = false }: ThrottleProps) {
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onSet) return;
    const box = event.currentTarget.getBoundingClientRect();
    onSet(1 - (event.clientY - box.top) / box.height);
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[11px] text-foreground tabular-nums">
        {Math.round(value * 100)}%
      </span>
      <div
        className={`relative w-10 touch-none border border-foreground/25 bg-panel ${
          tall ? 'h-40' : 'h-24 sm:h-28'
        } ${onSet ? 'pointer-events-auto cursor-ns-resize' : ''}`}
        role="slider"
        aria-label="Throttle"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={-1}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0 || event.pointerType === 'touch') drag(event);
        }}
      >
        <div className="absolute inset-x-0 bottom-0 bg-hot/80" style={{ height: `${value * 100}%` }} />
        {cue !== null ? (
          <div
            className="absolute -inset-x-1.5 h-0.5 bg-accent"
            style={{ bottom: `${cue * 100}%` }}
          />
        ) : null}
      </div>
      <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">Throttle</span>
    </div>
  );
}
