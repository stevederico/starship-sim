import { clamp } from '../game/physics.ts';
import type { FlightInput } from '../game/types.ts';

type Listener = () => void;

const STEER_LEFT = new Set(['KeyA', 'ArrowLeft']);
const STEER_RIGHT = new Set(['KeyD', 'ArrowRight']);
const THROTTLE_UP = new Set(['KeyW', 'ArrowUp']);
const THROTTLE_DOWN = new Set(['KeyS', 'ArrowDown']);
const ACTION = new Set(['Space', 'Enter']);

interface KeyLike {
  code: string;
  key: string;
}

/** Physical key code, rebuilt from the character when a device leaves it blank. */
export function keyCode(event: KeyLike): string {
  if (event.code) return event.code;
  const key = event.key;
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (/^[a-zA-Z]$/.test(key)) return `Key${key.toUpperCase()}`;
  return key;
}

/** Keyboard and touch state, read once per frame by the game loop. */
export class Controls {
  onAction: Listener | null = null;
  onPause: Listener | null = null;
  onMute: Listener | null = null;

  private held = new Set<string>();
  private touchSteer = 0;
  private throttleSet: number | null = null;
  private actionEdge = false;

  attach(target: Window): () => void {
    const down = (event: KeyboardEvent) => this.keyDown(event);
    const up = (event: KeyboardEvent) => this.held.delete(keyCode(event));
    const blur = () => this.release();
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    target.addEventListener('blur', blur);
    return () => {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
      target.removeEventListener('blur', blur);
    };
  }

  /** Drop everything held, for pause and focus loss. */
  release(): void {
    this.held.clear();
    this.touchSteer = 0;
    this.throttleSet = null;
    this.actionEdge = false;
  }

  setSteer(value: number): void {
    this.touchSteer = clamp(value, -1, 1);
  }

  setThrottle(value: number): void {
    this.throttleSet = clamp(value, 0, 1);
  }

  pressAction(): void {
    this.actionEdge = true;
    this.onAction?.();
  }

  /** Builds this frame's input and clears one-shot presses. */
  read(): FlightInput {
    let steer = this.touchSteer;
    if (this.anyHeld(STEER_LEFT)) steer -= 1;
    if (this.anyHeld(STEER_RIGHT)) steer += 1;
    let throttleRate = 0;
    if (this.anyHeld(THROTTLE_UP)) throttleRate += 1;
    if (this.anyHeld(THROTTLE_DOWN)) throttleRate -= 1;

    const input: FlightInput = {
      steer: clamp(steer, -1, 1),
      throttleRate,
      throttleSet: this.throttleSet,
      action: this.actionEdge
    };
    this.throttleSet = null;
    this.actionEdge = false;
    return input;
  }

  private anyHeld(codes: Set<string>): boolean {
    for (const code of codes) if (this.held.has(code)) return true;
    return false;
  }

  private keyDown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const onButton = target instanceof HTMLElement && target.tagName === 'BUTTON';
    const code = keyCode(event);

    if (ACTION.has(code)) {
      // A focused button already handles its own Space and Enter.
      if (onButton) return;
      event.preventDefault();
      if (!event.repeat) this.pressAction();
      return;
    }
    if (event.repeat) {
      if (code.startsWith('Arrow')) event.preventDefault();
      return;
    }
    if (code === 'KeyZ') this.setThrottle(1);
    else if (code === 'KeyX') this.setThrottle(0);
    else if (code === 'KeyP' || code === 'Escape') this.onPause?.();
    else if (code === 'KeyM') this.onMute?.();
    else {
      if (code.startsWith('Arrow')) event.preventDefault();
      this.held.add(code);
    }
  }
}
