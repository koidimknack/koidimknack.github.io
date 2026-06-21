export function clamp(value, min, max) {
  const clamped = Math.min(Math.max(value, min), max);
  return Object.is(clamped, -0) ? 0 : clamped;
}

export function normalizePointer(clientX, clientY, width, height) {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp((clientX / width) * 2 - 1, -1, 1),
    y: clamp(-((clientY / height) * 2 - 1), -1, 1),
  };
}

export function getPointerWorldPosition(pointer, bounds) {
  return {
    x: (pointer.x * bounds.width) / 2,
    y: (pointer.y * bounds.height) / 2,
  };
}

function smoothstep(edge) {
  return edge * edge * (3 - 2 * edge);
}

// Returns the unit direction the ball's face should point: tilting toward the
// pointer (capped at `maxLean` radians) and resting at *exactly* straight ahead
// (+Z) when the pointer is out of range. The turn strength is shaped by two
// smooth falloffs so it peaks near the ball's edge:
//   - outer: fades to 0 as the pointer reaches `range`, so a far ball rests and
//     doesn't over-rotate as it drifts past the cursor;
//   - inner: fades back to 0 as the pointer reaches the ball center, where the
//     look direction is ill-defined and would otherwise make the face spin.
export function getLookDirection(
  pointer,
  ball,
  bounds,
  { maxLean = 0.6, range = 3, innerRange = 1 } = {},
) {
  const target = getPointerWorldPosition(pointer, bounds);
  const dx = target.x - ball.x;
  const dy = target.y - ball.y;
  const length = Math.hypot(dx, dy);

  if (length === 0 || length >= range) {
    return { x: 0, y: 0, z: 1 };
  }

  const outer = smoothstep(1 - length / range);
  const inner = innerRange > 0 ? smoothstep(Math.min(length / innerRange, 1)) : 1;
  const lean = maxLean * outer * inner;
  const sin = Math.sin(lean);

  return {
    x: (dx / length) * sin,
    y: (dy / length) * sin,
    z: Math.cos(lean),
  };
}

export function stepBall(ball, bounds) {
  const halfWidth = bounds.width / 2 - bounds.radius;
  const halfHeight = bounds.height / 2 - bounds.radius;
  let x = ball.x + ball.vx * bounds.speedFactor;
  let y = ball.y + ball.vy * bounds.speedFactor;
  let vx = ball.vx;
  let vy = ball.vy;

  if (x > halfWidth) {
    x = halfWidth;
    vx = -Math.abs(vx);
  } else if (x < -halfWidth) {
    x = -halfWidth;
    vx = Math.abs(vx);
  }

  if (y > halfHeight) {
    y = halfHeight;
    vy = -Math.abs(vy);
  } else if (y < -halfHeight) {
    y = -halfHeight;
    vy = Math.abs(vy);
  }

  return { ...ball, x, y, vx, vy };
}

// Bounces two equal-mass circles off each other: separates any overlap and
// exchanges the velocity component along the line of contact. Mutates a and b
// (each { x, y, vx, vy, radius }) and returns whether they were touching.
export function resolveCircleCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;

  if (distance === 0 || distance >= minDistance) {
    return false;
  }

  const nx = dx / distance;
  const ny = dy / distance;

  // Push the circles apart equally so they no longer overlap.
  const overlap = minDistance - distance;
  a.x -= (nx * overlap) / 2;
  a.y -= (ny * overlap) / 2;
  b.x += (nx * overlap) / 2;
  b.y += (ny * overlap) / 2;

  // Only swap velocity when they're actually closing, so circles that are
  // already separating don't gain energy.
  const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (approach > 0) {
    a.vx -= approach * nx;
    a.vy -= approach * ny;
    b.vx += approach * nx;
    b.vy += approach * ny;
  }

  return true;
}
