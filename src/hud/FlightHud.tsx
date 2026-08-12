import { LEO_ALTITUDE_KM, LEO_VELOCITY_KMS } from '../constants.ts';

interface FlightHudProps {
  isBurning: boolean;
  onToggleBurn: () => void;
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </div>
  );
}

/** Overlay telemetry + engine toggle. */
export default function FlightHud({ isBurning, onToggleBurn }: FlightHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">Flight</p>
          <h1 className="mt-1 text-lg font-medium tracking-tight text-balance">Starship Sim</h1>
          <p className="mt-1 text-sm text-muted">Block 2 · Low Earth Orbit</p>
        </div>
        <p className="hidden max-w-48 text-right font-mono text-[10px] leading-relaxed text-muted sm:block">
          Drag To Orbit
          <br />
          Scroll To Zoom
          <br />
          Space To Ignite
        </p>
      </header>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="pointer-events-none flex gap-5 rounded-lg bg-panel px-4 py-3">
          <Readout label="Altitude" value={`${LEO_ALTITUDE_KM} km`} />
          <Readout label="Velocity" value={`${LEO_VELOCITY_KMS.toFixed(2)} km/s`} />
          <Readout label="Engines" value={isBurning ? 'Burn' : 'Coast'} />
        </div>
        <button
          type="button"
          onClick={onToggleBurn}
          aria-pressed={isBurning}
          className="pointer-events-auto min-h-11 w-full rounded-md border border-accent/40 bg-panel px-4 font-medium text-accent hover:bg-accent/10 sm:w-auto"
        >
          {isBurning ? 'Cutoff' : 'Ignite'}
        </button>
      </div>
    </div>
  );
}
