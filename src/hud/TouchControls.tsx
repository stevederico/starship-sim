import type { Controls } from '../input/controls.ts';

interface TouchControlsProps {
  controls: Controls;
}

function SteerButton({
  controls,
  direction,
  label
}: {
  controls: Controls;
  direction: -1 | 1;
  label: string;
}) {
  return (
    <button
      type="button"
      data-hud
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      className="pointer-events-auto flex size-16 touch-none items-center justify-center border border-foreground/30 bg-panel text-foreground select-none active:bg-accent/30"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        controls.setSteer(direction);
      }}
      onPointerUp={() => controls.setSteer(0)}
      onPointerCancel={() => controls.setSteer(0)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
        <path
          d={direction < 0 ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
    </button>
  );
}

/** Thumb steering for phones. Throttle and action sit in the HUD itself. */
export default function TouchControls({ controls }: TouchControlsProps) {
  return (
    <div className="flex gap-3">
      <SteerButton controls={controls} direction={-1} label="Tilt left" />
      <SteerButton controls={controls} direction={1} label="Tilt right" />
    </div>
  );
}
