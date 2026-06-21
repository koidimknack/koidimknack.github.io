import { describe, expect, test } from 'vitest';
import { resolveSceneSettings } from './createBouncingBallScene.js';

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

describe('resolveSceneSettings', () => {
  test('uses stable defaults for the 3D scene controls', () => {
    const settings = resolveSceneSettings();

    expect(settings.speedFactor).toBe(1);
    expect(settings.ballRadius).toBe(0.5);
    expect(settings.lookRange).toBe(10);
    expect(settings.innerLookRange).toBe(0.5);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(55), 12);
    expect(settings.tiltSmoothing).toBe(0.18);
    expect(settings.facesFollowPointer).toBe(true);
  });

  test('reads and clamps runtime control values', () => {
    const settings = resolveSceneSettings({
      getSpeedFactor: () => 9,
      getBallRadius: () => 2,
      getLookRange: () => 99,
      getMaxLean: () => degreesToRadians(80),
      getTiltSmoothing: () => 0,
      getFacesFollowPointer: () => false,
    });

    expect(settings.speedFactor).toBe(4);
    expect(settings.ballRadius).toBe(1.35);
    expect(settings.lookRange).toBe(20);
    expect(settings.innerLookRange).toBe(1.35);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(60), 12);
    expect(settings.tiltSmoothing).toBe(0.02);
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
