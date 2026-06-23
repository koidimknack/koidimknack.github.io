import { describe, expect, test } from 'vitest';
import {
  BALL_COLOR_OPTIONS,
  LOOK_MODE_CURSOR,
  LOOK_MODE_FOCUS,
  getActiveBalls,
  getHitBallColorId,
  resolveFocusEffectState,
  resolveSceneSettings,
} from './createBouncingBallScene.js';

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

describe('resolveSceneSettings', () => {
  test('exposes a roster large enough for the 3D face cast', () => {
    expect(BALL_COLOR_OPTIONS).toHaveLength(10);
  });

  test('uses stable defaults for the 3D scene controls', () => {
    const settings = resolveSceneSettings();

    expect(settings.speedFactor).toBe(1);
    expect(settings.ballRadius).toBe(0.5);
    expect(settings.lookRange).toBe(12.5);
    expect(settings.innerLookRange).toBe(0.5);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(55), 12);
    expect(settings.tiltSmoothing).toBe(0.18);
    expect(settings.lookMode).toBe(LOOK_MODE_CURSOR);
    expect(settings.focusColorId).toBe(BALL_COLOR_OPTIONS[0].id);
    expect(settings.focusEffectsEnabled).toBe(true);
    expect(settings.activeColorIds).toEqual(BALL_COLOR_OPTIONS.map((color) => color.id));
    expect(settings.facesFollowPointer).toBe(true);
  });

  test('reads and clamps runtime control values', () => {
    const settings = resolveSceneSettings({
      getSpeedFactor: () => 9,
      getBallRadius: () => 2,
      getLookRange: () => 99,
      getMaxLean: () => degreesToRadians(80),
      getTiltSmoothing: () => 0,
      getLookMode: () => LOOK_MODE_FOCUS,
      getFocusColorId: () => 'blue',
      getFocusEffectsEnabled: () => false,
      getActiveColorIds: () => ['blue', 'green', 'missing', 'blue'],
    });

    expect(settings.speedFactor).toBe(4);
    expect(settings.ballRadius).toBe(1.35);
    expect(settings.lookRange).toBe(20);
    expect(settings.innerLookRange).toBe(1.35);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(60), 12);
    expect(settings.tiltSmoothing).toBe(0.02);
    expect(settings.lookMode).toBe(LOOK_MODE_FOCUS);
    expect(settings.focusColorId).toBe('blue');
    expect(settings.focusEffectsEnabled).toBe(false);
    expect(settings.activeColorIds).toEqual(['blue', 'green']);
    expect(settings.facesFollowPointer).toBe(false);
  });

  test('falls back to safe look mode and focus color values', () => {
    const settings = resolveSceneSettings({
      getLookMode: () => 'missing-mode',
      getFocusColorId: () => 'missing-color',
    });

    expect(settings.lookMode).toBe(LOOK_MODE_CURSOR);
    expect(settings.focusColorId).toBe(BALL_COLOR_OPTIONS[0].id);
    expect(settings.facesFollowPointer).toBe(true);
  });

  test('keeps the previous follow-pointer boolean fallback working', () => {
    const settings = resolveSceneSettings({
      getFacesFollowPointer: () => false,
    });

    expect(settings.lookMode).toBe('none');
    expect(settings.facesFollowPointer).toBe(false);
  });

  test('keeps look range and tilt above the useful minimums', () => {
    const settings = resolveSceneSettings({
      getBallRadius: () => 0.2,
      getLookRange: () => 0.1,
      getMaxLean: () => 0,
    });

    expect(settings.ballRadius).toBe(0.25);
    expect(settings.lookRange).toBe(0.25);
    expect(settings.innerLookRange).toBe(0.25);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(10), 12);
  });
});

describe('getActiveBalls', () => {
  const balls = [
    { colorId: 'yellow' },
    { colorId: 'blue' },
    { colorId: 'green' },
  ];

  test('returns only balls whose colors are active', () => {
    expect(getActiveBalls(balls, { activeColorIds: ['green', 'yellow'] })).toEqual([
      { colorId: 'yellow' },
      { colorId: 'green' },
    ]);
  });
});

describe('getHitBallColorId', () => {
  const balls = [
    { colorId: 'yellow', state: { x: 0, y: 0, radius: 1 } },
    { colorId: 'blue', state: { x: 3, y: 0, radius: 0.5 } },
  ];

  test('returns the color id of the clicked ball', () => {
    expect(getHitBallColorId({ x: 0.5, y: 0 }, balls)).toBe('yellow');
    expect(getHitBallColorId({ x: 3.25, y: 0 }, balls)).toBe('blue');
  });

  test('returns null when the click misses every ball', () => {
    expect(getHitBallColorId({ x: 2, y: 2 }, balls)).toBeNull();
  });

  test('prefers the closest ball if hit areas overlap', () => {
    const overlappingBalls = [
      { colorId: 'yellow', state: { x: 0, y: 0, radius: 1 } },
      { colorId: 'blue', state: { x: 0.4, y: 0, radius: 1 } },
    ];

    expect(getHitBallColorId({ x: 0.35, y: 0 }, overlappingBalls)).toBe('blue');
  });
});

describe('resolveFocusEffectState', () => {
  const focusBall = { colorId: 'blue' };
  const otherBall = { colorId: 'yellow' };

  test('highlights only the selected focus ball when focus effects are enabled', () => {
    const settings = {
      lookMode: LOOK_MODE_FOCUS,
      focusEffectsEnabled: true,
    };

    expect(resolveFocusEffectState(focusBall, focusBall, settings)).toEqual({
      frontLightIntensity: 0.58,
      materialEmissiveIntensity: 0.18,
      visualScale: 1.15,
    });
    expect(resolveFocusEffectState(otherBall, focusBall, settings)).toEqual({
      frontLightIntensity: 0,
      materialEmissiveIntensity: 0,
      visualScale: 1,
    });
  });

  test('disables the focus effect outside active focus mode', () => {
    expect(resolveFocusEffectState(focusBall, focusBall, {
      lookMode: LOOK_MODE_CURSOR,
      focusEffectsEnabled: true,
    })).toEqual({
      frontLightIntensity: 0,
      materialEmissiveIntensity: 0,
      visualScale: 1,
    });

    expect(resolveFocusEffectState(focusBall, focusBall, {
      lookMode: LOOK_MODE_FOCUS,
      focusEffectsEnabled: false,
    })).toEqual({
      frontLightIntensity: 0,
      materialEmissiveIntensity: 0,
      visualScale: 1,
    });
  });
});
