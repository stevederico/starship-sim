import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Controls, keyCode } from './controls.ts';

describe('controls', () => {
  it('touch steering and throttle reach the input', () => {
    const controls = new Controls();
    controls.setSteer(-1);
    controls.setThrottle(0.4);
    const input = controls.read();
    assert.equal(input.steer, -1);
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

  it('release drops held steering', () => {
    const controls = new Controls();
    controls.setSteer(1);
    controls.release();
    assert.equal(controls.read().steer, 0);
  });
});
