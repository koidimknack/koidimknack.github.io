import { describe, expect, test } from 'vitest';
import { resolveSpriteSettings } from './createBouncingSpritesScene.js';

describe('resolveSpriteSettings', () => {
  test('uses stable defaults for the 2D scene controls', () => {
    expect(resolveSpriteSettings()).toEqual({
      speedFactor: 1,
      spriteSize: 80,
    });
  });

  test('reads and clamps runtime control values', () => {
    expect(resolveSpriteSettings({
      getSpeedFactor: () => 9,
      getSpriteSize: () => 10,
    })).toEqual({
      speedFactor: 4,
      spriteSize: 40,
    });

    expect(resolveSpriteSettings({
      getSpriteSize: () => 999,
    })).toEqual({
      speedFactor: 1,
      spriteSize: 160,
    });
  });
});
