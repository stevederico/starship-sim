import { clamp } from '../game/physics.ts';
import type { FlightInput } from '../game/types.ts';

type Listener = () => void;

const STEER_LEFT = new Set(['KeyA', 'ArrowLeft']);
const STEER_RIGHT = new Set(['KeyD', 'ArrowRight']);
const THROTTLE_UP = new Set(['KeyW', 'ArrowUp']);
const THROTTLE_DOWN = new Set(['KeyS', 'ArrowDown']);
const ACTION = new Set(['Space', 'Enter']);

/** Touch steering is gentler than a key: thumbs overshoot. */
export const TOUCH_STEER = 0.6;

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

/** Minimal shape of a key event, so tests can drive the handler without a DOM. */
export interface KeyEventLike extends KeyLike {
  target: EventTarget | null;
  repeat: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

interface ElementLike {
  tagName?: string;
  dataset?: Record<string, string | undefined>;
}

/**
 * A focused plain button keeps its own Space and Enter. HUD buttons carry
 * data-hud: they never own those keys, so a click on Mute or Pause cannot
 * steal the stage or cutoff key afterwards.
 */
export function buttonOwnsKey(target: EventTarget | null): boolean {
  const el = target as ElementLike | null;
  if (!el || el.tagName !== 'BUTTON') return false;
  return el.dataset?.hud === undefined;
}

/** Keyboard and touch state, read once per frame by the game loop. */
export class Controls {
  onAction: Listener | null = null;
  onPause: Listener | null = null;
  onMute: Listener | null = null;

  private held = new Set<string>();
  /** Pointer id to steer direction, one entry per finger on a steer button. */
  private touchSteer = new Map<number, number>();
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
    this.touchSteer.clear();
    this.throttleSet = null;
    this.actionEdge = false;
  }

  /** A finger went down on a steer button. Each finger is tracked on its own. */
  holdSteer(pointerId: number, direction: -1 | 1): void {
    this.touchSteer.set(pointerId, direction);
  }

  releaseSteer(pointerId: number): void {
    this.touchSteer.delete(pointerId);
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
    let touch = 0;
    for (const direction of this.touchSteer.values()) touch += direction;
    let steer = clamp(touch, -1, 1) * TOUCH_STEER;
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

  keyDown(event: KeyEventLike): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const code = keyCode(event);

    if (ACTION.has(code)) {
      if (buttonOwnsKey(event.target)) return;
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
