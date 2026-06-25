import { describe, expect, test } from 'vitest';
import { BALL_COLOR_OPTIONS } from './createBouncingBallScene.js';
import {
  pickRandomActiveColorIds,
  toggleActiveColorId,
  toggleActiveRosterId,
} from './ballRoster.js';

describe('pickRandomActiveColorIds', () => {
  test('returns a unique random subset of the available roster ids', () => {
    const activeColorIds = pickRandomActiveColorIds(BALL_COLOR_OPTIONS, 4, () => 0.25);

    expect(activeColorIds).toHaveLength(4);
    expect(new Set(activeColorIds)).toHaveProperty('size', 4);
    activeColorIds.forEach((colorId) => {
      expect(BALL_COLOR_OPTIONS.some((color) => color.id === colorId)).toBe(true);
    });
  });
});

describe('toggleActiveColorId', () => {
  test('activates inactive roster ids', () => {
    expect(toggleActiveColorId(['yellow'], 'blue')).toEqual({
      activeColorIds: ['yellow', 'blue'],
      rejected: false,
    });
  });

  test('deactivates active roster ids when more than one remains', () => {
    expect(toggleActiveColorId(['yellow', 'blue'], 'yellow')).toEqual({
      activeColorIds: ['blue'],
      rejected: false,
    });
  });

  test('rejects deactivating the last active roster id', () => {
    expect(toggleActiveColorId(['yellow'], 'yellow')).toEqual({
      activeColorIds: ['yellow'],
      rejected: true,
    });
  });
});

describe('toggleActiveRosterId', () => {
  test('allows the cat roster id to be toggled like a ball id', () => {
    expect(toggleActiveRosterId(['yellow', 'cat'], 'cat')).toEqual({
      activeRosterIds: ['yellow'],
      rejected: false,
    });
  });

  test('rejects deactivating the last active roster item', () => {
    expect(toggleActiveRosterId(['cat'], 'cat')).toEqual({
      activeRosterIds: ['cat'],
      rejected: true,
    });
  });
});
