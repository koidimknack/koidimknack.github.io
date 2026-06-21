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

// Returns the unit direction the ball's face should point: tilting toward the
// pointer (capped at `maxLean` radians), strongest right next to the ball and
// smoothly fading to *exactly* straight ahead (+Z, the initial pose) at and
// beyond `range`. Resting at forward when the pointer is far avoids the face
// over-rotating to the opposite side as the ball drifts past the cursor. The
// scene turns this into a single quaternion swing, which avoids the gimbal
// "twirl" of easing Euler angles and never approaches the antipodal pole.
export function getLookDirection(pointer, ball, bounds, { maxLean = 0.6, range = 3 } = {}) {
  const target = getPointerWorldPosition(pointer, bounds);
  const dx = target.x - ball.x;
  const dy = target.y - ball.y;
  const length = Math.hypot(dx, dy);

  if (length === 0 || length >= range) {
    return { x: 0, y: 0, z: 1 };
  }

  // proximity ramps 1 -> 0 from the ball center out to `range` (smoothstep for
  // gentle ends), so the face eases in near the cursor and rests far away.
  const t = 1 - length / range;
  const proximity = t * t * (3 - 2 * t);
  const lean = maxLean * proximity;
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
