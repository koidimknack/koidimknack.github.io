import { describe, expect, test } from 'vitest';
import {
  BALL_COLOR_OPTIONS,
  CAT_BEHAVIOR_FLEEING,
  CAT_BEHAVIOR_LEAVING,
  CAT_BEHAVIOR_RETREATING,
  CAT_BEHAVIOR_WATCHING,
  CAT_OBJECT_ID,
  LOOK_MODE_CURSOR,
  LOOK_MODE_FOCUS,
  getActiveBalls,
  getActiveSceneObjects,
  getFocusTarget,
  getHitBallColorId,
  resolveCatAvoidanceState,
  resolveCatFleeDirection,
  resolveCatIdleTransform,
  resolveCatMaxSpeed,
  resolveCatSmoothedYaw,
  resolveCatTargetYaw,
  resolvePredictedEscapeTarget,
  resolveFocusEffectState,
  resolveSafeCornerRetreatTarget,
  resolveSafestCornerTarget,
  resolveSceneSettings,
  resolveSceneObjectCollisions,
  isCatOutsideScene,
  shouldOrientObject,
  stepCatRunAwayState,
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

    expect(settings.speedFactor).toBe(1.5);
    expect(settings.ballRadius).toBe(0.5);
    expect(settings.lookRange).toBe(12.5);
    expect(settings.innerLookRange).toBe(0.5);
    expect(settings.maxLean).toBeCloseTo(degreesToRadians(55), 12);
    expect(settings.tiltSmoothing).toBe(0.18);
    expect(settings.lookMode).toBe(LOOK_MODE_CURSOR);
    expect(settings.focusColorId).toBe(BALL_COLOR_OPTIONS[0].id);
    expect(settings.focusEffectsEnabled).toBe(true);
    expect(settings.catMotionEnabled).toBe(true);
    expect(settings.catActive).toBe(true);
    expect(settings.catPatiencePercent).toBe(50);
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
      getCatMotionEnabled: () => false,
      getCatActive: () => false,
      getCatPatiencePercent: () => -20,
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
    expect(settings.catMotionEnabled).toBe(false);
    expect(settings.catActive).toBe(false);
    expect(settings.catPatiencePercent).toBe(0);
    expect(settings.activeColorIds).toEqual(['blue', 'green']);
    expect(settings.facesFollowPointer).toBe(false);
  });

  test('caps cat patience at 100 percent', () => {
    const settings = resolveSceneSettings({
      getCatPatiencePercent: () => 140,
    });

    expect(settings.catPatiencePercent).toBe(100);
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

  test('allows the cat as a focus target', () => {
    const settings = resolveSceneSettings({
      getLookMode: () => LOOK_MODE_FOCUS,
      getFocusColorId: () => CAT_OBJECT_ID,
    });

    expect(settings.lookMode).toBe(LOOK_MODE_FOCUS);
    expect(settings.focusColorId).toBe(CAT_OBJECT_ID);
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

  test('allows the roster to hide every ball while the cat remains active', () => {
    const settings = resolveSceneSettings({
      getActiveColorIds: () => [],
      getCatActive: () => true,
    });

    expect(settings.activeColorIds).toEqual([]);
    expect(settings.catActive).toBe(true);
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

describe('getActiveSceneObjects', () => {
  const balls = [
    { colorId: 'yellow' },
    { colorId: 'blue' },
    { colorId: 'green' },
  ];
  const catObject = { colorId: CAT_OBJECT_ID };

  test('keeps the cat object active alongside the selected roster balls', () => {
    expect(getActiveSceneObjects(balls, catObject, { activeColorIds: ['green'] })).toEqual([
      { colorId: 'green' },
      catObject,
    ]);
  });

  test('omits the cat object when the cat roster item is inactive', () => {
    expect(getActiveSceneObjects(balls, catObject, {
      activeColorIds: ['green'],
      catActive: false,
    })).toEqual([
      { colorId: 'green' },
    ]);
  });

  test('supports scenes where the cat asset has not been created', () => {
    expect(getActiveSceneObjects(balls, null, { activeColorIds: ['blue'] })).toEqual([
      { colorId: 'blue' },
    ]);
  });
});

describe('getFocusTarget', () => {
  test('resolves the cat as a focus target from active scene objects', () => {
    const yellowBall = { colorId: 'yellow' };
    const catObject = { colorId: CAT_OBJECT_ID };

    expect(getFocusTarget([yellowBall, catObject], {
      focusColorId: CAT_OBJECT_ID,
    })).toBe(catObject);
  });

  test('returns null when the target is not active', () => {
    const yellowBall = { colorId: 'yellow' };

    expect(getFocusTarget([yellowBall], {
      focusColorId: CAT_OBJECT_ID,
    })).toBeNull();
  });
});

describe('shouldOrientObject', () => {
  test('keeps the cat from using the cursor/focus look orientation', () => {
    expect(shouldOrientObject({ type: CAT_OBJECT_ID })).toBe(false);
    expect(shouldOrientObject({ type: 'ball' })).toBe(true);
  });
});

describe('resolveSceneObjectCollisions', () => {
  test('treats the cat as a solid kinematic obstacle for balls', () => {
    const ball = {
      type: 'ball',
      state: { x: 0, y: 0, vx: 0.04, vy: 0, radius: 1 },
    };
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 1.5, y: 0, vx: -0.04, vy: 0, radius: 1 },
    };

    resolveSceneObjectCollisions([ball, catObject]);

    expect(ball.state.x).toBeCloseTo(-0.5);
    expect(ball.state.y).toBe(0);
    expect(ball.state.vx).toBeLessThan(0);
    expect(ball.state.vy).toBe(0);
    expect(catObject.state.x).toBe(1.5);
    expect(catObject.state.y).toBe(0);
    expect(catObject.state.vx).toBe(-0.04);
    expect(catObject.state.vy).toBe(0);
  });

  test('preserves ball speed after an oblique cat bounce', () => {
    const ball = {
      type: 'ball',
      state: { x: 0, y: 0, vx: 0.03, vy: 0.04, radius: 1 },
    };
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 1.2, y: 0.7, vx: -0.04, vy: 0.02, radius: 1 },
    };
    const speedBefore = Math.hypot(ball.state.vx, ball.state.vy);

    resolveSceneObjectCollisions([ball, catObject]);

    expect(Math.hypot(ball.state.vx, ball.state.vy)).toBeCloseTo(speedBefore, 14);
    expect(catObject.state.vx).toBe(-0.04);
    expect(catObject.state.vy).toBe(0.02);
  });

  test('still resolves collisions between active balls', () => {
    const leftBall = {
      type: 'ball',
      state: { x: 0, y: 0, vx: 0.04, vy: 0, radius: 1 },
    };
    const rightBall = {
      type: 'ball',
      state: { x: 1.5, y: 0, vx: -0.04, vy: 0, radius: 1 },
    };

    resolveSceneObjectCollisions([leftBall, rightBall]);

    expect(leftBall.state.vx).toBeLessThan(0);
    expect(rightBall.state.vx).toBeGreaterThan(0);
  });
});

describe('resolveCatAvoidanceState', () => {
  test('finds the corner furthest from the active balls', () => {
    const catState = { x: 0, y: 0, radius: 0.75 };
    const balls = [
      { colorId: 'yellow', state: { x: -3, y: -3, radius: 0.5 } },
      { colorId: 'blue', state: { x: -2, y: 2, radius: 0.5 } },
      { colorId: 'red', state: { x: 2, y: -3, radius: 0.5 } },
    ];

    expect(resolveSafestCornerTarget(catState, balls, {
      width: 8,
      height: 8,
    })).toEqual({ x: 3.25, y: 3.25 });
  });

  test('avoids escape targets that predicted ball motion will cut off', () => {
    const catState = { x: 0, y: 0, vx: 0, vy: 0, radius: 0.75 };
    const balls = [
      {
        colorId: 'blue',
        state: { x: 3.25, y: -3.25, vx: 0, vy: 0.11, radius: 0.5 },
      },
    ];

    const target = resolvePredictedEscapeTarget(catState, balls, {
      width: 8,
      height: 8,
    }, {
      horizonSteps: 60,
      maxSpeed: 0.08,
      sampleInterval: 10,
    });

    expect(target).not.toEqual({ x: 3.25, y: 3.25 });
    expect(target.x).toBeLessThan(3.25);
  });

  test('prefers a nearby safe-ish corner over crossing the whole screen when retreating', () => {
    const catState = { x: 2.1, y: 2.1, vx: 0, vy: 0, radius: 0.75 };
    const balls = [
      {
        colorId: 'blue',
        state: { x: 3.25, y: 0.6, vx: 0, vy: 0, radius: 0.5 },
      },
    ];

    const target = resolveSafeCornerRetreatTarget(catState, balls, {
      width: 8,
      height: 8,
    }, {
      maxSpeed: 0.04,
      distancePenalty: 1.2,
    });

    expect(target).toEqual({ x: 3.25, y: 3.25 });
  });

  test('avoids a retreat corner that predicted ball motion will occupy', () => {
    const catState = { x: 2.1, y: 2.1, vx: 0, vy: 0, radius: 0.75 };
    const balls = [
      {
        colorId: 'blue',
        state: { x: 3.25, y: -3.25, vx: 0, vy: 0.11, radius: 0.5 },
      },
    ];

    const target = resolveSafeCornerRetreatTarget(catState, balls, {
      width: 8,
      height: 8,
    }, {
      horizonSteps: 60,
      maxSpeed: 0.04,
      sampleInterval: 10,
    });

    expect(target).not.toEqual({ x: 3.25, y: 3.25 });
  });

  test('sets the cat max speed from the fastest active ball', () => {
    const balls = [
      { colorId: 'yellow', state: { vx: 0.02, vy: 0, radius: 0.5 } },
      { colorId: 'blue', state: { vx: 0.03, vy: 0.04, radius: 0.5 } },
    ];

    expect(resolveCatMaxSpeed(balls)).toBeCloseTo(0.06, 12);
  });

  test('bends the cat flee direction around a blocker in its escape corridor', () => {
    const catState = { x: 0, y: 0, radius: 0.75 };
    const balls = [
      { colorId: 'blue', state: { x: 1.4, y: 0, radius: 0.5 } },
    ];

    const direction = resolveCatFleeDirection(catState, balls, {
      width: 8,
      height: 8,
    }, {
      target: { x: 3.25, y: 0 },
      corridorBuffer: 0.6,
    });

    expect(direction.x).toBeGreaterThan(0);
    expect(direction.y).toBeGreaterThan(0.1);
  });

  test('keeps the cat watching when the closest ball is outside the danger range', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 0, y: 0, vx: 0.04, vy: 0, radius: 0.75 },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 3, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls);

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.lookTargetState).toBe(nearbyBalls[0].state);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThan(0.04);
    expect(state.x).toBe(catObject.state.x);
    expect(state.y).toBe(catObject.state.y);
  });

  test('starts a 0.9x-speed corner retreat after staying away from corners', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0.75,
        cornerAwayFrames: 120,
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 3, y: 0, vx: 0.05, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      bounds: { width: 8, height: 8 },
      cornerRetreatDelayFrames: 120,
      maxSpeed: 0.08,
      minSpeed: 0,
      maxSpeedChange: 1,
      maxSteer: 1,
      strength: 1,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_RETREATING);
    expect(state.escapeTarget).toEqual(expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number),
    }));
    expect(Math.hypot(state.vx, state.vy)).toBeGreaterThan(0.04);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(0.072000000001);
    expect(state.lookTargetState).toBe(null);
  });

  test('retreats to the nearest corner even when no balls are active', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 2.1,
        y: 2.1,
        vx: 0,
        vy: 0,
        radius: 0.75,
        cornerAwayFrames: 120,
      },
    };

    const state = resolveCatAvoidanceState(catObject, [], {
      bounds: { width: 8, height: 8 },
      cornerRetreatDelayFrames: 120,
      maxSpeed: 0.08,
      minSpeed: 0,
      maxSpeedChange: 1,
      maxSteer: 1,
      strength: 1,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_RETREATING);
    expect(state.escapeTarget).toEqual({ x: 3.25, y: 3.25 });
    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(0.072000000001);
  });

  test('keeps a near-corner retreat aimed into the nearest corner', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3.25,
        y: 2.75,
        vx: 0,
        vy: 0,
        radius: 0.75,
        cornerAwayFrames: 120,
      },
    };
    const ballsPressuringCurrentCorner = [
      { colorId: 'blue', state: { x: 3.25, y: 3.25, vx: 0, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: 2.4, y: 3.25, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, ballsPressuringCurrentCorner, {
      bounds: { width: 8, height: 8 },
      cornerRetreatDelayFrames: 120,
      dangerBuffer: -1,
      safeBuffer: -1,
      maxSpeed: 0.08,
      minSpeed: 0,
      maxSpeedChange: 1,
      maxSteer: 1,
      strength: 1,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_RETREATING);
    expect(state.escapeTarget).toEqual({ x: 3.25, y: 3.25 });
    expect(state.vy).toBeGreaterThan(0);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(0.03);
  });

  test('runs away immediately at zero percent patience', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3,
        y: 0,
        vx: 0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 2.2, y: 0, vx: 0.08, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: -3, y: 0, vx: 0.04, vy: 0, radius: 0.5 } },
      { colorId: 'green', state: { x: 0, y: 3, vx: 0.12, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
      maxSpeed: 0.08,
      agitationWindowFrames: 600,
      catPatiencePercent: 0,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_LEAVING);
    expect(state.lookTargetState).toBe(null);
    expect(state.escapeTarget).toBe(null);
    expect(state.vx).toBeGreaterThan(0);
    expect(state.vy).toBe(0);
    expect(Math.hypot(state.vx, state.vy)).toBeCloseTo(0.04, 12);
  });

  test('runs away when ball pressure exceeds the configured patience percent', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3,
        y: 0,
        vx: 0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
        agitationFrames: 0,
        agitationWindow: [
          ...Array(300).fill(1),
          ...Array(299).fill(0),
        ],
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 2.2, y: 0, vx: 0.08, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: -3, y: 0, vx: 0.04, vy: 0, radius: 0.5 } },
      { colorId: 'green', state: { x: 0, y: 3, vx: 0.12, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
      maxSpeed: 0.08,
      agitationWindowFrames: 600,
      catPatiencePercent: 50,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_LEAVING);
  });

  test('keeps the cat from running away at full patience', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3,
        y: 0,
        vx: 0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
        agitationWindow: Array(599).fill(1),
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 2.2, y: 0, vx: 0.08, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: -3, y: 0, vx: 0.04, vy: 0, radius: 0.5 } },
      { colorId: 'green', state: { x: 0, y: 3, vx: 0.12, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
      maxSpeed: 0.08,
      agitationWindowFrames: 600,
      catPatiencePercent: 100,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_FLEEING);
  });

  test('leaves through a horizontal edge even when the closest edge is vertical', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0.2,
        y: 3.6,
        vx: 0,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.2, y: 2.8, vx: 0.08, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: -3, y: 0, vx: 0.04, vy: 0, radius: 0.5 } },
      { colorId: 'green', state: { x: 0, y: 3, vx: 0.12, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
      maxSpeed: 0.08,
      catPatiencePercent: 0,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_LEAVING);
    expect(state.vx).toBeGreaterThan(0);
    expect(state.vy).toBe(0);
  });

  test('resets agitation while the cat is only watching', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0.01,
        vy: 0,
        radius: 0.75,
        agitationFrames: 12,
        agitationWindow: [1, 1, 1],
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 4, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      bounds: { width: 8, height: 8 },
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.agitationFrames).toBe(0);
    expect(state.agitationWindow.at(-1)).toBe(0);
  });

  test('waits before retreating when the cat has only recently left a corner', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0.75,
        cornerAwayFrames: 60,
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 3, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      bounds: { width: 8, height: 8 },
      cornerRetreatDelayFrames: 120,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.cornerAwayFrames).toBe(61);
    expect(state.lookTargetState).toBe(distantBalls[0].state);
  });

  test('resets the corner-away timer once the cat reaches a corner', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3.25,
        y: 3.25,
        vx: 0,
        vy: 0,
        radius: 0.75,
        cornerAwayFrames: 120,
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 0, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      bounds: { width: 8, height: 8 },
      cornerRetreatDelayFrames: 120,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.cornerAwayFrames).toBe(0);
  });

  test('comes to rest when watching a distant closest ball', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 0, y: 0, vx: 0.004, vy: -0.003, radius: 0.75 },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 4, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls);

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.vx).toBe(0);
    expect(state.vy).toBe(0);
  });

  test('switches into fleeing when the closest ball enters close proximity', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 0, y: 0, vx: 0, vy: 0, radius: 0.75 },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 1.2, y: 0, vx: 0, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: -3, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      dangerBuffer: 0.45,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_FLEEING);
    expect(state.lookTargetState).toBe(null);
    expect(state.vx).toBeLessThan(0);
    expect(state.vy).toBeCloseTo(0, 12);
  });

  test('blends local avoidance with a steer toward the safest corner', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: { x: 0, y: 0, vx: 0, vy: 0, radius: 0.75 },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.8, y: 0, vx: 0, vy: 0, radius: 0.5 } },
      { colorId: 'red', state: { x: 3, y: 3, vx: 0, vy: 0, radius: 0.5 } },
      { colorId: 'green', state: { x: -3, y: -3, vx: 0, vy: 0, radius: 0.5 } },
      { colorId: 'pink', state: { x: 3, y: -3, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_FLEEING);
    expect(state.vx).toBeLessThan(0);
    expect(state.vy).toBeGreaterThan(0.001);
  });

  test('stays fleeing until the closest ball clears the safe range', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 1.8, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      dangerBuffer: 0.45,
      safeBuffer: 0.8,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_FLEEING);
    expect(state.vx).toBeLessThan(0);
  });

  test('returns to watching once safely away from balls', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 3, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      dangerBuffer: 0.45,
      safeBuffer: 0.8,
    });

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(state.lookTargetState).toBe(distantBalls[0].state);
    expect(Math.hypot(state.vx, state.vy)).toBeLessThan(0.02);
  });

  test('brakes gradually when returning from fleeing to watching', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const distantBalls = [
      { colorId: 'blue', state: { x: 3, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, distantBalls, {
      dangerBuffer: 0.45,
      safeBuffer: 0.8,
    });
    const speed = Math.hypot(state.vx, state.vy);

    expect(state.catBehavior).toBe(CAT_BEHAVIOR_WATCHING);
    expect(speed).toBeLessThan(0.02);
    expect(speed).toBeGreaterThan(0.016);
  });

  test('caps the fleeing velocity so the cat does not accelerate away too sharply', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.2,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.8, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls);

    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(0.04);
  });

  test('allows the cat to flee at the active ball-relative speed cap', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.2,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.8, y: 0, vx: 0.05, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls);
    const speed = Math.hypot(state.vx, state.vy);

    expect(speed).toBeGreaterThan(0.04);
    expect(speed).toBeLessThanOrEqual(0.060000000001);
  });

  test('limits single-frame steering changes for smoother avoidance curves', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0.06,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.8, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      strength: 1,
      maxSpeed: 1,
      maxSteer: 0.01,
    });

    expect(Math.hypot(
      state.vx - catObject.state.vx,
      state.vy - catObject.state.vy,
    )).toBeLessThanOrEqual(0.010000000001);
  });

  test('ramps speed toward the cat max speed instead of jumping there', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0.8, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      strength: 1,
      maxSpeed: 0.08,
      minSpeed: 0,
      maxSpeedChange: 0.01,
      maxSteer: 1,
    });

    expect(Math.hypot(state.vx, state.vy)).toBeLessThanOrEqual(0.010000000001);
  });

  test('limits how quickly the cat turns toward a new avoidance direction', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0.05,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 0, y: -0.8, vx: 0, vy: 0, radius: 0.5 } },
    ];
    const maxTurn = Math.PI / 12;

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      strength: 1,
      maxSpeed: 1,
      maxSpeedChange: 1,
      maxSteer: 1,
      maxTurn,
    });

    expect(Math.atan2(state.vy, state.vx)).toBeLessThanOrEqual(maxTurn + 1e-12);
  });

  test('redirects wall-blocked avoidance into a slide along the wall', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 3.25,
        y: 0,
        vx: 0.02,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
      },
    };
    const nearbyBalls = [
      { colorId: 'blue', state: { x: 2, y: 0, vx: 0, vy: 0, radius: 0.5 } },
    ];

    const state = resolveCatAvoidanceState(catObject, nearbyBalls, {
      bounds: { width: 8, height: 8 },
      strength: 1,
      maxSpeed: 1,
      maxSteer: 0.04,
      wallBuffer: 1,
    });

    expect(state.vx).toBeLessThanOrEqual(1e-12);
    expect(state.vy).toBeGreaterThan(0);
  });

  test('moves a leaving cat straight past the viewport edge without bouncing', () => {
    const state = stepCatRunAwayState({
      x: 3.8,
      y: 0,
      vx: 0.2,
      vy: 0,
      radius: 0.75,
      catBehavior: CAT_BEHAVIOR_LEAVING,
    }, {
      speedFactor: 1,
    });

    expect(state.x).toBe(4);
    expect(state.vx).toBe(0.2);
  });

  test('detects when the leaving cat has fully crossed the viewport edge', () => {
    expect(isCatOutsideScene({
      x: 4.8,
      y: 0,
      radius: 0.75,
    }, {
      width: 8,
      height: 8,
    })).toBe(true);

    expect(isCatOutsideScene({
      x: 4.6,
      y: 0,
      radius: 0.75,
    }, {
      width: 8,
      height: 8,
    })).toBe(false);
  });
});

describe('resolveCatIdleTransform', () => {
  test('returns no idle motion when cat motion is disabled', () => {
    expect(resolveCatIdleTransform(
      { type: CAT_OBJECT_ID, idlePhase: 0 },
      1,
      { catMotionEnabled: false },
    )).toEqual({
      bobY: 0,
      rotationY: 0,
      rotationZ: 0,
    });
  });

  test('keeps enabled idle motion subtle', () => {
    const transform = resolveCatIdleTransform(
      { type: CAT_OBJECT_ID, idlePhase: 0 },
      1,
      { catMotionEnabled: true },
    );

    expect(Math.abs(transform.bobY)).toBeLessThanOrEqual(0.04);
    expect(Math.abs(transform.rotationY)).toBeLessThanOrEqual(0.08);
    expect(Math.abs(transform.rotationZ)).toBeLessThanOrEqual(0.025);
  });

  test('turns the cat with its horizontal movement direction', () => {
    const rightward = resolveCatIdleTransform(
      { type: CAT_OBJECT_ID, idlePhase: 0, state: { vx: 1, vy: 0 } },
      0,
      { catMotionEnabled: true },
    );
    const leftward = resolveCatIdleTransform(
      { type: CAT_OBJECT_ID, idlePhase: 0, state: { vx: -1, vy: 0 } },
      0,
      { catMotionEnabled: true },
    );

    expect(rightward.rotationY).toBeGreaterThan(0.2);
    expect(leftward.rotationY).toBeLessThan(-0.2);
  });
});

describe('resolveCatTargetYaw', () => {
  test('turns the watching cat horizontally toward the closest ball target', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_WATCHING,
        lookTargetState: { x: 4, y: 0, radius: 0.5 },
      },
    };
    const settings = resolveSceneSettings();

    expect(resolveCatTargetYaw(catObject, settings, {
      bounds: { width: 8, height: 8 },
    })).toBeGreaterThan(0.45);
  });

  test('turns the fleeing cat horizontally toward its direction of travel', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.05,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_FLEEING,
        lookTargetState: { x: 4, y: 0, radius: 0.5 },
      },
    };
    const settings = resolveSceneSettings();

    expect(resolveCatTargetYaw(catObject, settings, {
      bounds: { width: 8, height: 8 },
    })).toBeLessThan(-0.45);
  });

  test('turns the retreating cat horizontally toward its direction of travel', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: -0.05,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_RETREATING,
        lookTargetState: { x: 4, y: 0, radius: 0.5 },
      },
    };
    const settings = resolveSceneSettings();

    expect(resolveCatTargetYaw(catObject, settings, {
      bounds: { width: 8, height: 8 },
    })).toBeLessThan(-0.45);
  });

  test('does not target-turn when cat motion is disabled', () => {
    const catObject = {
      type: CAT_OBJECT_ID,
      state: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0.75,
        catBehavior: CAT_BEHAVIOR_WATCHING,
        lookTargetState: { x: 4, y: 0, radius: 0.5 },
      },
    };
    const settings = resolveSceneSettings({
      getLookMode: () => LOOK_MODE_CURSOR,
      getCatMotionEnabled: () => false,
    });

    expect(resolveCatTargetYaw(catObject, settings, {
      bounds: { width: 8, height: 8 },
    })).toBe(0);
  });
});

describe('resolveCatSmoothedYaw', () => {
  test('moves partway toward a changed cat target yaw', () => {
    expect(resolveCatSmoothedYaw(0, 0.8, 0.2)).toBeCloseTo(0.16, 12);
  });

  test('smooths across a large target direction change instead of snapping', () => {
    expect(resolveCatSmoothedYaw(0.8, -0.8, 0.2)).toBeCloseTo(0.48, 12);
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
  const catObject = {
    colorId: CAT_OBJECT_ID,
    baseFocusFrontLightIntensity: 0.58,
    baseFocusMaterialEmissiveIntensity: 0.18,
  };

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

  test('keeps the cat brighter by default and doubles that boost when focused', () => {
    const settings = {
      lookMode: LOOK_MODE_FOCUS,
      focusEffectsEnabled: true,
    };

    expect(resolveFocusEffectState(catObject, focusBall, settings)).toEqual({
      frontLightIntensity: 0.58,
      materialEmissiveIntensity: 0.18,
      visualScale: 1,
    });
    expect(resolveFocusEffectState(catObject, catObject, settings)).toEqual({
      frontLightIntensity: 1.16,
      materialEmissiveIntensity: 0.36,
      visualScale: 1.15,
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
