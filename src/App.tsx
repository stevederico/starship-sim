import { ACESFilmicToneMapping, Color } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Sound } from './audio/sound.ts';
import { SHIP_CENTER_Z } from './constants.ts';
import { Mission } from './game/mission.ts';
import type { MissionEvent, Phase } from './game/mission.ts';
import FlightHud from './hud/FlightHud.tsx';
import type { Banner } from './hud/FlightHud.tsx';
import ResultsScreen from './hud/ResultsScreen.tsx';
import TitleScreen from './hud/TitleScreen.tsx';
import { Controls } from './input/controls.ts';
import Scene from './scene/Scene.tsx';
import { useShipTextures } from './scene/useShipTextures.ts';
import { trackEvent } from './utils/analytics.ts';
import CatchView from './view/CatchView.tsx';
import GameLoop from './view/GameLoop.tsx';
import LaunchView from './view/LaunchView.tsx';
import OrbitView from './view/OrbitView.tsx';
import StepDriver from './view/StepDriver.tsx';
import { FOV } from './view/shared.ts';

type ViewKind = 'title' | 'launch' | 'catch' | 'orbit';

const BEST_KEY = 'starship-sim-best';
const MUTE_KEY = 'starship-sim-muted';
/** Keys used by 0.2.0. Read once so players keep their best score and mute setting. */
const LEGACY_KEYS: [string, string][] = [
  ['steel-ascent-best', BEST_KEY],
  ['steel-ascent-muted', MUTE_KEY]
];
const TITLE_CAMERA: [number, number, number] = [125, 35, 86];
/** Orbit target of the title scene. */
const TITLE_TARGET: [number, number, number] = [0, 1, SHIP_CENTER_Z - 6];

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode: the score just does not persist.
  }
}

/** Copies 0.2.0 settings to the current keys once, then drops the old ones. */
function migrateStore(): void {
  for (const [from, to] of LEGACY_KEYS) {
    const old = readStore(from);
    if (old === null) continue;
    if (readStore(to) === null) writeStore(to, old);
    try {
      window.localStorage.removeItem(from);
    } catch {
      // Storage blocked: nothing to clean up.
    }
  }
}

migrateStore();

function viewFor(phase: Phase, current: ViewKind): ViewKind {
  switch (phase) {
    case 'title':
      return 'title';
    case 'countdown':
    case 'ascent':
    case 'separation':
      return 'launch';
    case 'catch':
      return 'catch';
    case 'orbit':
      return 'orbit';
    default:
      return current;
  }
}

function bannerTone(event: MissionEvent): Banner['tone'] {
  if (event.type === 'explode' || event.type === 'reentry') return 'bad';
  if (event.type === 'caught' || event.type === 'orbit') return 'good';
  return 'info';
}

/** Puts the camera back for the title scene, further out on narrow screens. */
function TitleCamera() {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  useLayoutEffect(() => {
    const reach = Math.min(3, Math.max(1, 1.25 / aspect));
    camera.position.set(
      TITLE_TARGET[0] + (TITLE_CAMERA[0] - TITLE_TARGET[0]) * reach,
      TITLE_TARGET[1] + (TITLE_CAMERA[1] - TITLE_TARGET[1]) * reach,
      TITLE_TARGET[2] + (TITLE_CAMERA[2] - TITLE_TARGET[2]) * reach
    );
  }, [camera, aspect]);
  return null;
}

function Views({ mission, view, run }: { mission: Mission; view: ViewKind; run: number }) {
  const maps = useShipTextures();
  if (view === 'launch') return <LaunchView key={run} mission={mission} maps={maps} />;
  if (view === 'catch') return <CatchView key={run} mission={mission} maps={maps} />;
  if (view === 'orbit') return <OrbitView key={run} mission={mission} maps={maps} />;
  return (
    <>
      <TitleCamera />
      <Scene isBurning={false} />
    </>
  );
}

export default function App() {
  const game = useMemo(
    () => ({ mission: new Mission(), controls: new Controls(), sound: new Sound() }),
    []
  );
  const { mission, controls, sound } = game;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const [phase, setPhase] = useState<Phase>('title');
  const [view, setView] = useState<ViewKind>('title');
  const [run, setRun] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [flash, setFlash] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(() => readStore(MUTE_KEY) === '1');
  const [best, setBest] = useState(() => Number(readStore(BEST_KEY)) || 0);
  const [isBest, setIsBest] = useState(false);
  const [demo, setDemo] = useState(false);
  const [touch, setTouch] = useState(
    () => params.has('touch') || window.matchMedia('(pointer: coarse)').matches
  );
  // Dev only: ?step hands frame timing to test scripts. See StepDriver.
  const stepped = import.meta.env.DEV && params.has('step');
  const pausedRef = useRef(false);
  const bannerId = useRef(0);

  const start = useCallback(
    (asDemo: boolean) => {
      sound.unlock();
      controls.release();
      mission.autopilot = asDemo;
      mission.start((Date.now() & 0x7fffffff) || 1);
      pausedRef.current = false;
      setPaused(false);
      setDemo(asDemo);
      setIsBest(false);
      setBanner(null);
      setRun((n) => n + 1);
      setPhase('countdown');
      setView('launch');
      trackEvent('game-start', { demo: asDemo });
    },
    [controls, mission, sound]
  );

  const toTitle = useCallback(() => {
    mission.toTitle();
    controls.release();
    sound.resume();
    pausedRef.current = false;
    setPaused(false);
    setBanner(null);
    setPhase('title');
    setView('title');
  }, [controls, mission, sound]);

  const togglePause = useCallback(() => {
    if (mission.phase === 'title' || mission.phase === 'results') return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    controls.release();
    if (pausedRef.current) sound.suspend();
    else if (!document.hidden) sound.resume();
  }, [controls, mission, sound]);

  const toggleMute = useCallback(() => {
    setMuted((was) => {
      const next = !was;
      sound.setMuted(next);
      writeStore(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }, [sound]);

  const handlePhase = useCallback(
    (next: Phase) => {
      setPhase(next);
      setView((current) => viewFor(next, current));
      if (next !== 'results' || !mission.score) return;
      const total = mission.score.total;
      trackEvent('game-over', {
        total,
        rank: mission.score.rank,
        caught: mission.score.caught,
        orbit: mission.score.inOrbit,
        demo: mission.autopilot
      });
      if (mission.autopilot) return;
      setBest((previous) => {
        if (total <= previous) return previous;
        writeStore(BEST_KEY, String(total));
        setIsBest(true);
        return total;
      });
    },
    [mission]
  );

  const handleEvent = useCallback(
    (event: MissionEvent) => {
      if (event.type !== 'results' && event.type !== 'liftoff') {
        bannerId.current += 1;
        setBanner({ id: bannerId.current, text: event.text, tone: bannerTone(event) });
      }
      switch (event.type) {
        case 'ignition':
        case 'stage':
        case 'landing-burn':
          sound.thump();
          break;
        case 'explode':
        case 'reentry':
          sound.explosion();
          setFlash((n) => n + 1);
          break;
        case 'caught':
          sound.clang();
          sound.fanfare();
          break;
        case 'orbit':
          sound.fanfare();
          break;
        case 'stage-ready':
          sound.beep(990, 0.12);
          break;
        case 'maxq':
        case 'cutoff':
        case 'booster-inbound':
        case 'ship-burn':
          sound.chime();
          break;
        default:
          break;
      }
    },
    [sound]
  );

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 2800);
    return () => window.clearTimeout(id);
  }, [banner]);

  useEffect(() => controls.attach(window), [controls]);

  useEffect(() => {
    // Dev builds expose the game for browser test scripts.
    if (import.meta.env.DEV) Object.assign(window, { __game: game });
  }, [game]);

  useEffect(() => {
    controls.onAction = () => {
      if (pausedRef.current) togglePause();
      else if (mission.phase === 'title' || mission.phase === 'results') start(false);
    };
    controls.onPause = togglePause;
    controls.onMute = toggleMute;
  }, [controls, mission, start, toggleMute, togglePause]);

  useEffect(() => {
    sound.setMuted(muted);
  }, [muted, sound]);

  useEffect(() => {
    const onTouch = () => setTouch(true);
    const onHide = () => {
      if (document.hidden) {
        sound.suspend();
        if (!pausedRef.current) togglePause();
      } else if (!pausedRef.current) {
        // Title and results never pause, so bring their sound straight back.
        sound.resume();
      }
    };
    window.addEventListener('touchstart', onTouch, { once: true, passive: true });
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('touchstart', onTouch);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [sound, togglePause]);

  useEffect(() => {
    if (params.has('demo')) start(true);
  }, [params, start]);

  const flying = phase !== 'title' && phase !== 'results';

  return (
    <main className="relative h-full">
      <Canvas
        className="h-full w-full"
        dpr={[1, 2]}
        frameloop={stepped ? 'never' : 'always'}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color('#05070a'));
        }}
        camera={{ position: TITLE_CAMERA, fov: FOV, near: 0.1, far: 4000 }}
      >
        {stepped ? <StepDriver /> : null}
        <GameLoop
          mission={mission}
          controls={controls}
          sound={sound}
          paused={pausedRef}
          onPhase={handlePhase}
          onEvent={handleEvent}
        />
        <Suspense fallback={null}>
          <Views mission={mission} view={view} run={run} />
        </Suspense>
      </Canvas>

      {flash > 0 ? (
        <div key={flash} className="flash pointer-events-none absolute inset-0 z-10 bg-white" />
      ) : null}

      {phase === 'title' ? (
        <TitleScreen
          best={best}
          touch={touch}
          onLaunch={() => start(false)}
          onDemo={() => start(true)}
        />
      ) : null}

      {flying ? (
        <FlightHud
          mission={mission}
          controls={controls}
          banner={banner}
          demo={demo}
          touch={touch}
          paused={paused}
          muted={muted}
          onPause={togglePause}
          onMute={toggleMute}
        />
      ) : null}

      {paused ? (
        <div className="safe-pad absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/70">
          <h2 className="font-mono text-2xl tracking-[0.2em] uppercase">Paused</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={togglePause}
              className="min-h-12 border border-hot bg-hot px-8 font-mono text-sm tracking-[0.2em] text-background uppercase hover:bg-hot/85"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={toTitle}
              className="min-h-12 border border-foreground/30 px-6 font-mono text-xs tracking-[0.18em] uppercase hover:bg-foreground/10"
            >
              Quit
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'results' && mission.score ? (
        <ResultsScreen
          score={mission.score}
          best={best}
          isBest={isBest}
          demo={demo}
          onRestart={() => start(false)}
          onTitle={toTitle}
        />
      ) : null}
    </main>
  );
}
