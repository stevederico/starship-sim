import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Controls, TOUCH_STEER, buttonOwnsKey, keyCode } from './controls.ts';
import type { KeyEventLike } from './controls.ts';

function press(code: string, target: unknown): KeyEventLike & { prevented: boolean } {
  const event = {
    code,
    key: '',
    target: target as EventTarget,
    repeat: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    prevented: false,
    preventDefault() {
      event.prevented = true;
    }
  };
  return event;
}

describe('controls', () => {
  it('touch steering and throttle reach the input', () => {
    const controls = new Controls();
    controls.holdSteer(1, -1);
    controls.setThrottle(0.4);
    const input = controls.read();
    assert.equal(input.steer, -TOUCH_STEER);
    assert.ok(TOUCH_STEER < 1, 'touch steers softer than a key');
    assert.equal(input.throttleSet, 0.4);
    assert.equal(input.action, false);
  });

  it('throttle set and action are one-shot', () => {
    const controls = new Controls();
    let actions = 0;
    controls.onAction = () => {
      actions += 1;
    };
    controls.setThrottle(2);
    controls.pressAction();
    const first = controls.read();
    const second = controls.read();
    assert.equal(first.throttleSet, 1);
    assert.equal(first.action, true);
    assert.equal(second.throttleSet, null);
    assert.equal(second.action, false);
    assert.equal(actions, 1);
  });

  it('key codes fall back to the typed character', () => {
    assert.equal(keyCode({ code: 'KeyA', key: 'q' }), 'KeyA');
    assert.equal(keyCode({ code: '', key: 'a' }), 'KeyA');
    assert.equal(keyCode({ code: '', key: 'D' }), 'KeyD');
    assert.equal(keyCode({ code: '', key: ' ' }), 'Space');
    assert.equal(keyCode({ code: '', key: 'ArrowLeft' }), 'ArrowLeft');
  });

  it('space after clicking a HUD button still stages', () => {
    const controls = new Controls();
    let actions = 0;
    controls.onAction = () => {
      actions += 1;
    };
    const mute = { tagName: 'BUTTON', dataset: { hud: '' } };
    const event = press('Space', mute);
    controls.keyDown(event);
    assert.equal(actions, 1);
    assert.equal(event.prevented, true);
    assert.equal(controls.read().action, true);
  });

  it('a focused plain button keeps its own space and enter', () => {
    const controls = new Controls();
    let actions = 0;
    controls.onAction = () => {
      actions += 1;
    };
    const launch = { tagName: 'BUTTON', dataset: {} };
    controls.keyDown(press('Enter', launch));
    assert.equal(actions, 0);
    assert.equal(buttonOwnsKey(launch as unknown as EventTarget), true);
    assert.equal(buttonOwnsKey({ tagName: 'DIV' } as unknown as EventTarget), false);
    assert.equal(buttonOwnsKey(null), false);
  });

  it('releasing one of two held steer buttons keeps the other steering', () => {
    const controls = new Controls();
    controls.holdSteer(1, -1);
    controls.holdSteer(2, 1);
    assert.equal(controls.read().steer, 0);
    controls.releaseSteer(2);
    assert.equal(controls.read().steer, -TOUCH_STEER);
    controls.releaseSteer(1);
    assert.equal(controls.read().steer, 0);
  });

  it('release drops held steering', () => {
    const controls = new Controls();
    controls.holdSteer(1, 1);
    controls.release();
    assert.equal(controls.read().steer, 0);
  });
});
