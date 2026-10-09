import { describe, expect, it } from 'vitest';

import { PointerPolicy } from './pointer-policy';

const mouse = { pointerId: 1, pointerType: 'mouse' };
const pen = { pointerId: 2, pointerType: 'pen' };
const finger = { pointerId: 3, pointerType: 'touch' };
const otherFinger = { pointerId: 4, pointerType: 'touch' };

describe('PointerPolicy', () => {
  it('um ponteiro por vez: o segundo é ignorado até o primeiro soltar', () => {
    const policy = new PointerPolicy();

    expect(policy.down(finger)).toBe('start');
    expect(policy.down(otherFinger)).toBe('ignore');
    expect(policy.owns(otherFinger)).toBe(false);
    expect(policy.up(otherFinger)).toBe(false);
    expect(policy.owns(finger)).toBe(true);
    expect(policy.up(finger)).toBe(true);
    expect(policy.down(otherFinger)).toBe('start');
  });

  it('rejeição de palma: toque é ignorado durante um traço de caneta', () => {
    const policy = new PointerPolicy();

    expect(policy.down(pen)).toBe('start');
    expect(policy.down(finger)).toBe('ignore');
    expect(policy.owns(finger)).toBe(false);
    expect(policy.up(pen)).toBe(true);
  });

  it('rejeição de palma: a caneta substitui um toque que começou antes', () => {
    const policy = new PointerPolicy();

    expect(policy.down(finger)).toBe('start');
    expect(policy.down(pen)).toBe('replace');
    expect(policy.owns(pen)).toBe(true);
    expect(policy.owns(finger)).toBe(false);
  });

  it('mouse não interrompe nem é interrompido', () => {
    const policy = new PointerPolicy();

    expect(policy.down(mouse)).toBe('start');
    expect(policy.down(pen)).toBe('ignore');
    policy.reset();
    expect(policy.owns(mouse)).toBe(false);
    expect(policy.down(pen)).toBe('start');
    expect(policy.down(mouse)).toBe('ignore');
  });
});
