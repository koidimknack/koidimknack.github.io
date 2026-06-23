import { describe, expect, test } from 'vitest';
import {
  getLookDirection,
  getLookDirectionToPoint,
  normalizePointer,
  resolveCircleCollision,
  stepBall,
} from './ballMotion.js';

describe('normalizePointer', () => {
  test('maps viewport center to neutral coordinates', () => {
    expect(normalizePointer(400, 300, 800, 600)).toEqual({ x: 0, y: 0 });
  });

  test('clamps pointer coordinates to the visible viewport', () => {
    expect(normalizePointer(1200, -200, 800, 600)).toEqual({ x: 1, y: 1 });
  });
});

describe('getLookDirection', () => {
  test('looks straight ahead when the pointer is over the ball center', () => {
    expect(getLookDirection(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { width: 8, height: 6 },
    )).toEqual({ x: 0, y: 0, z: 1 });
  });

  test('rests at the initial forward pose beyond the look range', () => {
    expect(getLookDirection(
      { x: 0, y: 0 },
      { x: -5, y: 0 },
      { width: 8, height: 6 },
      { range: 3 },
    )).toEqual({ x: 0, y: 0, z: 1 });
  });

  test('tilts toward the pointer direction when within range', () => {
    const look = getLookDirection(
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { width: 8, height: 6 },
      { range: 6 },
    );

    expect(look.x).toBeGreaterThan(0); // pointer is to the right of the ball
    expect(look.y).toBeCloseTo(0, 12);
    expect(look.z).toBeGreaterThan(0); // still mostly forward
    expect(look.z).toBeLessThan(1); // but tilted
  });

  test('fades out at the unstable center and peaks near the inner range', () => {
    const bounds = { width: 8, height: 6 };
    const almostCentered = getLookDirection(
      { x: 0, y: 0 },
      { x: -0.05, y: 0 },
      bounds,
      { range: 6, innerRange: 1 },
    );
    const nearInnerEdge = getLookDirection(
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      bounds,
      { range: 6, innerRange: 1 },
    );
    const far = getLookDirection(
      { x: 0, y: 0 },
      { x: -3, y: 0 },
      bounds,
      { range: 6, innerRange: 1 },
    );

    expect(nearInnerEdge.x).toBeGreaterThan(almostCentered.x);
    expect(nearInnerEdge.z).toBeLessThan(almostCentered.z);
    expect(nearInnerEdge.x).toBeGreaterThan(far.x);
    expect(nearInnerEdge.z).toBeLessThan(far.z);
  });

  test('returns a unit direction vector', () => {
    const look = getLookDirection(
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { width: 2, height: 2 },
      { range: 6 },
    );

    expect(Math.hypot(look.x, look.y, look.z)).toBeCloseTo(1, 12);
  });

  test('never leans beyond the maximum lean angle', () => {
    const look = getLookDirection(
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { width: 8, height: 6 },
      { maxLean: 0.6, range: 3, innerRange: 1 },
    );

    expect(Math.hypot(look.x, look.y)).toBeLessThanOrEqual(Math.sin(0.6) + 1e-9);
    expect(look.x).toBeGreaterThan(0);
  });
});

describe('getLookDirectionToPoint', () => {
  test('tilts toward a world-space target point', () => {
    const look = getLookDirectionToPoint(
      { x: 2, y: -1 },
      { x: 0, y: 0 },
      { maxLean: 0.6, range: Number.POSITIVE_INFINITY, innerRange: 0 },
    );

    expect(look.x).toBeGreaterThan(0);
    expect(look.y).toBeLessThan(0);
    expect(Math.hypot(look.x, look.y, look.z)).toBeCloseTo(1, 12);
  });

  test('rests forward when the target point is at the ball center', () => {
    expect(getLookDirectionToPoint(
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { range: Number.POSITIVE_INFINITY },
    )).toEqual({ x: 0, y: 0, z: 1 });
  });

  test('rests forward when a world-space target is outside the look range', () => {
    expect(getLookDirectionToPoint(
      { x: 4, y: 0 },
      { x: 0, y: 0 },
      { range: 3 },
    )).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe('stepBall', () => {
  test('moves the ball according to velocity and speed factor', () => {
    const next = stepBall(
      { x: 0, y: 0, vx: 2, vy: -1 },
      { width: 10, height: 10, radius: 1, speedFactor: 1.5 },
    );

    expect(next).toEqual({ x: 3, y: -1.5, vx: 2, vy: -1 });
  });

  test('bounces off viewport bounds while keeping the ball inside', () => {
    const next = stepBall(
      { x: 4.8, y: -4.8, vx: 1, vy: -1 },
      { width: 10, height: 10, radius: 1, speedFactor: 1 },
    );

    expect(next).toEqual({ x: 4, y: -4, vx: -1, vy: 1 });
  });
});

describe('resolveCircleCollision', () => {
  test('separates overlapping circles and swaps the normal velocity head-on', () => {
    const a = { x: 0, y: 0, vx: 1, vy: 0, radius: 1 };
    const b = { x: 1.5, y: 0, vx: 0, vy: 0, radius: 1 };

    expect(resolveCircleCollision(a, b)).toBe(true);
    // overlap of 0.5 split evenly between the two
    expect(a.x).toBeCloseTo(-0.25, 10);
    expect(b.x).toBeCloseTo(1.75, 10);
    // equal-mass elastic head-on: the moving circle hands off its speed
    expect(a.vx).toBeCloseTo(0, 10);
    expect(b.vx).toBeCloseTo(1, 10);
  });

  test('leaves circles that are not touching untouched', () => {
    const a = { x: 0, y: 0, vx: 1, vy: 0, radius: 1 };
    const b = { x: 5, y: 0, vx: 0, vy: 0, radius: 1 };

    expect(resolveCircleCollision(a, b)).toBe(false);
    expect(a).toEqual({ x: 0, y: 0, vx: 1, vy: 0, radius: 1 });
    expect(b).toEqual({ x: 5, y: 0, vx: 0, vy: 0, radius: 1 });
  });

  test('does not swap velocity when the circles are already separating', () => {
    const a = { x: 0, y: 0, vx: -1, vy: 0, radius: 1 };
    const b = { x: 1.5, y: 0, vx: 0, vy: 0, radius: 1 };

    resolveCircleCollision(a, b);

    expect(a.vx).toBeCloseTo(-1, 10);
    expect(b.vx).toBeCloseTo(0, 10);
  });
});
