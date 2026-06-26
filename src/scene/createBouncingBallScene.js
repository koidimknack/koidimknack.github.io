import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  clamp,
  getLookDirection,
  getLookDirectionToPoint,
  getPointerWorldPosition,
  normalizePointer,
  resolveCircleCollision,
  stepBall,
} from './ballMotion.js';

export const LOOK_MODE_CURSOR = 'cursor';
export const LOOK_MODE_FOCUS = 'focus';
export const CAT_OBJECT_ID = 'cat';
export const CAT_BEHAVIOR_WATCHING = 'watching';
export const CAT_BEHAVIOR_FLEEING = 'fleeing';
export const CAT_BEHAVIOR_RETREATING = 'retreating';
export const CAT_BEHAVIOR_TURNING_INWARD = 'turning_inward';
export const CAT_BEHAVIOR_ANNOUNCING = 'announcing';
export const CAT_BEHAVIOR_LEAVING = 'leaving';
export const CAT_BEHAVIOR_UFO_ENTERING = 'ufo_entering';
export const CAT_BEHAVIOR_UFO_BEAMING = 'ufo_beaming';
export const CAT_BEHAVIOR_UFO_LEAVING = 'ufo_leaving';
export const CAT_BEHAVIOR_BEAMING = CAT_BEHAVIOR_UFO_BEAMING;

const VIEW_HEIGHT = 8; // world units shown vertically (orthographic frustum)
const DEFAULT_SPEED_FACTOR = 1;
const DEFAULT_BALL_RADIUS = 0.5;
const DEFAULT_CAT_RADIUS = 0.75;
const DEFAULT_TILT_SMOOTHING = 0.18;
const DEFAULT_LOOK_RANGE = 13.5;
const DEFAULT_MAX_LEAN = degreesToRadians(55);
const DEFAULT_FOCUS_EFFECTS_ENABLED = true;
const DEFAULT_CAT_MOTION_ENABLED = true;
const DEFAULT_CAT_ACTIVE = true;
const DEFAULT_CAT_PATIENCE_PERCENT = 20;
const DEFAULT_CAT_FORCE_UFO_EXIT = false;
const FOCUS_EFFECT_SMOOTHING = 0.12;
const FOCUS_FRONT_LIGHT_INTENSITY = 0.58;
const FOCUS_MATERIAL_EMISSIVE_INTENSITY = 0.18;
const FOCUS_VISUAL_SCALE = 1.15;
const CAT_BASE_FRONT_LIGHT_INTENSITY = 1;
const CAT_BASE_MATERIAL_EMISSIVE_INTENSITY = FOCUS_MATERIAL_EMISSIVE_INTENSITY;
// Self-illumination baked onto the loaded cat model so it stays readable on the
// black background instead of sinking into shadow when it leaves the key light.
const CAT_MODEL_EMISSIVE_INTENSITY = 0.6;
const LOOK_MODE_NONE = 'none';
const MAX_LOOK_RANGE = 20;
const MAX_SPEED_FACTOR = 4;
const MIN_BALL_RADIUS = 0.25;
const MAX_BALL_RADIUS = 1.35;
const MIN_TILT_SMOOTHING = 0.02;
const MAX_TILT_SMOOTHING = 1;
const MIN_MAX_LEAN = degreesToRadians(10);
const MAX_MAX_LEAN = degreesToRadians(60);
const CAT_MODEL_BASE_URL = '/models/cat/';
const CAT_MODEL_FILE = '12222_Cat_v1_l3.obj';
const CAT_MATERIAL_FILE = '12222_Cat_v1_l3.mtl';
const CAT_MODEL_TARGET_SIZE = 1.65;
const UFO_MODEL_BASE_URL = '/models/ufo/';
const UFO_MODEL_FILE = 'UFO2.obj';
const UFO_MATERIAL_FILE = 'UFO2.mtl';
const UFO_MODEL_TARGET_SIZE = 1.55;
const CAT_BOB_DISTANCE = 0.035;
const CAT_TARGET_YAW_AMOUNT = 0.85;
const CAT_MOVEMENT_YAW_AMOUNT = 0.3;
const CAT_YAW_AMOUNT = 0.07;
const CAT_ROLL_AMOUNT = 0.02;
const CAT_MAX_TOTAL_YAW = 0.85;
const CAT_AVOIDANCE_BUFFER = 1.35;
const CAT_AVOIDANCE_STRENGTH = 0.02;
const CAT_ESCAPE_CORRIDOR_BUFFER = 0.6;
const CAT_ESCAPE_CORRIDOR_STRENGTH = 0.75;
const CAT_ESCAPE_DETOUR_STRENGTH = 1.15;
const CAT_ESCAPE_LOOKAHEAD_STEPS = 60;
const CAT_ESCAPE_LOOKAHEAD_SAMPLE_INTERVAL = 6;
const CAT_ESCAPE_SPEED_MULTIPLIER = 1.2;
const CAT_ESCAPE_TARGET_STICKINESS = 0.35;
const CAT_ESCAPE_TARGET_DISTANCE_PENALTY = 0.08;
const CAT_MAX_AVOIDANCE_SPEED = 0.04;
const CAT_MIN_AVOIDANCE_SPEED = 0.025;
const CAT_MAX_AVOIDANCE_STEER = 0.012;
const CAT_MAX_AVOIDANCE_SPEED_CHANGE = 0.006;
const CAT_MAX_AVOIDANCE_TURN = 0.14;
const CAT_AVOIDANCE_WALL_BUFFER = 0.9;
const CAT_AVOIDANCE_EPSILON = 0.0001;
const CAT_DANGER_BUFFER = 0.55;
const CAT_SAFE_BUFFER = 0.95;
const CAT_WATCHING_DECELERATION = 0.003;
const CAT_TARGET_YAW_SMOOTHING = 0.14;
const CAT_EXIT_TARGET_YAW_SMOOTHING = 0.08;
const CAT_EXIT_INWARD_TURN_THRESHOLD = 0.08;
const CAT_EXIT_ANNOUNCEMENT_FRAMES = 90;
const CAT_CORNER_RETREAT_DELAY_FRAMES = 120;
const CAT_CORNER_SETTLE_DISTANCE = 0.45;
const CAT_CORNER_RETREAT_SPEED_FACTOR = 0.9;
const CAT_CORNER_RETREAT_DISTANCE_PENALTY = 1.2;
const CAT_CORNER_RETREAT_TARGET_STICKINESS = 0.2;
const CAT_CORNER_NEAR_DISTANCE_FACTOR = 2;
const CAT_CORNER_SETTLE_SPEED_FACTOR = 0.35;
const CAT_AGITATION_WINDOW_FRAMES = 600;
const CAT_RUN_AWAY_SPEED_FACTOR = 0.5;
const CAT_MIN_RUN_AWAY_SPEED = 0.03;
const CAT_MAX_RUN_AWAY_SPEED = 0.075;
const CAT_RUN_AWAY_DISTANCE_BOOST = 0.025;
const CAT_RUN_AWAY_DISTANCE_BOOST_START = 0.3;
const CAT_EXIT_ROUTE_BUFFER = 0.08;
const CAT_EXIT_LANE_SPACING = 0.35;
const CAT_EXIT_OPPOSITE_SIDE_PENALTY = 0.25;
const CAT_UFO_BASE_TRAVEL_FRAMES = 90;
const CAT_UFO_TRAVEL_SPEED_FACTOR = 0.8;
const CAT_UFO_ENTER_FRAMES = Math.round(CAT_UFO_BASE_TRAVEL_FRAMES / CAT_UFO_TRAVEL_SPEED_FACTOR);
const CAT_UFO_BEAM_FRAMES = 120;
const CAT_UFO_LEAVE_FRAMES = CAT_UFO_ENTER_FRAMES;
const CAT_UFO_SCREEN_MARGIN = 1.2;
const CAT_UFO_HOVER_OFFSET = 1.65;
const CAT_UFO_Z_OFFSET = 2.2;

export const BALL_COLOR_OPTIONS = [
  { id: 'yellow', label: 'Yellow', value: 0xffdf2e, css: '#ffdf2e' },
  { id: 'red', label: 'Red', value: 0xff6b6b, css: '#ff6b6b' },
  { id: 'green', label: 'Green', value: 0x51cf66, css: '#51cf66' },
  { id: 'blue', label: 'Blue', value: 0x4dabf7, css: '#4dabf7' },
  { id: 'purple', label: 'Purple', value: 0xcc5de8, css: '#cc5de8' },
  { id: 'orange', label: 'Orange', value: 0xffa94d, css: '#ffa94d' },
  { id: 'teal', label: 'Teal', value: 0x20c997, css: '#20c997' },
  { id: 'pink', label: 'Pink', value: 0xf06595, css: '#f06595' },
  { id: 'lime', label: 'Lime', value: 0x94d82d, css: '#94d82d' },
  { id: 'white', label: 'White', value: 0xf8f9fa, css: '#f8f9fa' },
];

const BALL_COLOR_IDS = BALL_COLOR_OPTIONS.map((color) => color.id);
const FOCUS_TARGET_IDS = [...BALL_COLOR_IDS, CAT_OBJECT_ID];
const FACE_COLOR = 0x1b1b1b;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function readOption(getter, fallback) {
  const value = getter?.();
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function readBooleanOption(getter, fallback) {
  const value = getter?.();
  return typeof value === 'boolean' ? value : fallback;
}

function readLookMode(options) {
  const mode = options.getLookMode?.();
  if (mode === LOOK_MODE_CURSOR || mode === LOOK_MODE_FOCUS || mode === LOOK_MODE_NONE) {
    return mode;
  }

  return readBooleanOption(options.getFacesFollowPointer, true)
    ? LOOK_MODE_CURSOR
    : LOOK_MODE_NONE;
}

function readFocusColorId(getter) {
  const colorId = getter?.();
  return FOCUS_TARGET_IDS.includes(colorId)
    ? colorId
    : CAT_OBJECT_ID;
}

function readActiveColorIds(getter) {
  const rawColorIds = getter?.();
  if (!Array.isArray(rawColorIds)) {
    return [...BALL_COLOR_IDS];
  }

  const activeColorIds = [];
  rawColorIds.forEach((colorId) => {
    if (BALL_COLOR_IDS.includes(colorId) && !activeColorIds.includes(colorId)) {
      activeColorIds.push(colorId);
    }
  });

  return activeColorIds;
}

export function getHitBallColorId(point, balls) {
  let hitColorId = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  balls.forEach((ball) => {
    const distance = Math.hypot(point.x - ball.state.x, point.y - ball.state.y);
    if (distance <= ball.state.radius && distance < closestDistance) {
      hitColorId = ball.colorId;
      closestDistance = distance;
    }
  });

  return hitColorId;
}

export function getActiveBalls(balls, settings) {
  const activeColorIds = new Set(settings.activeColorIds ?? BALL_COLOR_IDS);
  return balls.filter((ball) => activeColorIds.has(ball.colorId));
}

export function getActiveSceneObjects(balls, catObject, settings) {
  const activeObjects = getActiveBalls(balls, settings);
  if (catObject && settings.catActive !== false) {
    activeObjects.push(catObject);
  }

  return activeObjects;
}

export function getFocusTarget(sceneObjects, settings) {
  return sceneObjects.find((object) => object.colorId === settings.focusColorId) ?? null;
}

export function resolveSceneFocusTarget(
  activeObjects,
  settings,
  { catExitSequenceActive = false, catObject = null } = {},
) {
  if (catExitSequenceActive && catObject && activeObjects.includes(catObject)) {
    if (isCatUfoSequenceActive(catObject.state) && catObject.ufoFocusTarget) {
      return catObject.ufoFocusTarget;
    }

    return catObject;
  }

  return settings.lookMode === LOOK_MODE_FOCUS
    ? getFocusTarget(activeObjects, settings)
    : null;
}

export function resolveFocusEffectState(ball, focusTarget, settings) {
  const baseFrontLightIntensity = ball.baseFocusFrontLightIntensity ?? 0;
  const baseMaterialEmissiveIntensity = ball.baseFocusMaterialEmissiveIntensity ?? 0;
  const isFocused = settings.lookMode === LOOK_MODE_FOCUS
    && settings.focusEffectsEnabled
    && ball === focusTarget;

  return {
    frontLightIntensity: baseFrontLightIntensity + (
      isFocused ? FOCUS_FRONT_LIGHT_INTENSITY : 0
    ),
    materialEmissiveIntensity: baseMaterialEmissiveIntensity + (
      isFocused ? FOCUS_MATERIAL_EMISSIVE_INTENSITY : 0
    ),
    visualScale: isFocused ? FOCUS_VISUAL_SCALE : 1,
  };
}

export function shouldOrientObject(object) {
  return object.type !== CAT_OBJECT_ID;
}

function resolveKinematicCircleCollision(dynamicState, obstacleState) {
  const speedBeforeCollision = Math.hypot(dynamicState.vx, dynamicState.vy);
  const dx = obstacleState.x - dynamicState.x;
  const dy = obstacleState.y - dynamicState.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = dynamicState.radius + obstacleState.radius;

  if (distance >= minDistance) {
    return false;
  }

  let nx = 1;
  let ny = 0;
  if (distance > CAT_AVOIDANCE_EPSILON) {
    nx = dx / distance;
    ny = dy / distance;
  } else {
    const speed = Math.hypot(dynamicState.vx, dynamicState.vy);
    if (speed > CAT_AVOIDANCE_EPSILON) {
      nx = dynamicState.vx / speed;
      ny = dynamicState.vy / speed;
    }
  }

  const overlap = minDistance - distance;
  dynamicState.x -= nx * overlap;
  dynamicState.y -= ny * overlap;

  const approach = dynamicState.vx * nx + dynamicState.vy * ny;
  if (approach > 0) {
    dynamicState.vx -= 2 * approach * nx;
    dynamicState.vy -= 2 * approach * ny;
  }

  const speedAfterCollision = Math.hypot(dynamicState.vx, dynamicState.vy);
  if (
    speedBeforeCollision > CAT_AVOIDANCE_EPSILON
    && speedAfterCollision > CAT_AVOIDANCE_EPSILON
  ) {
    const speedCorrection = speedBeforeCollision / speedAfterCollision;
    dynamicState.vx *= speedCorrection;
    dynamicState.vy *= speedCorrection;
  }

  return true;
}

export function resolveSceneObjectCollisions(sceneObjects) {
  const collidingObjects = sceneObjects.filter((object) => object.type !== CAT_OBJECT_ID);
  const catObjects = sceneObjects.filter((object) => object.type === CAT_OBJECT_ID);

  for (let i = 0; i < collidingObjects.length; i += 1) {
    for (let j = i + 1; j < collidingObjects.length; j += 1) {
      resolveCircleCollision(collidingObjects[i].state, collidingObjects[j].state);
    }
  }

  collidingObjects.forEach((object) => {
    catObjects.forEach((catObject) => {
      resolveKinematicCircleCollision(object.state, catObject.state);
    });
  });
}

function getWallInfluence(distance, buffer) {
  if (!Number.isFinite(distance) || buffer <= 0) {
    return 0;
  }

  return clamp(1 - distance / buffer, 0, 1);
}

function getWallInfluences(state, bounds, wallBuffer) {
  if (!bounds?.width || !bounds?.height) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  const halfWidth = bounds.width / 2 - state.radius;
  const halfHeight = bounds.height / 2 - state.radius;

  return {
    left: getWallInfluence(state.x + halfWidth, wallBuffer),
    right: getWallInfluence(halfWidth - state.x, wallBuffer),
    top: getWallInfluence(halfHeight - state.y, wallBuffer),
    bottom: getWallInfluence(state.y + halfHeight, wallBuffer),
  };
}

function getVerticalSlideDirection(state) {
  if (Math.abs(state.y) > 0.2) {
    return state.y > 0 ? -1 : 1;
  }

  if (Math.abs(state.vy) > CAT_AVOIDANCE_EPSILON) {
    return Math.sign(state.vy);
  }

  return 1;
}

function getHorizontalSlideDirection(state) {
  if (Math.abs(state.x) > 0.2) {
    return state.x > 0 ? -1 : 1;
  }

  if (Math.abs(state.vx) > CAT_AVOIDANCE_EPSILON) {
    return Math.sign(state.vx);
  }

  return 1;
}

function resolveWallAwarePush(pushX, pushY, state, bounds, wallBuffer) {
  const wallInfluences = getWallInfluences(state, bounds, wallBuffer);
  const verticalSlideDirection = getVerticalSlideDirection(state);
  const horizontalSlideDirection = getHorizontalSlideDirection(state);
  let adjustedPushX = pushX;
  let adjustedPushY = pushY;

  if (adjustedPushX > 0 && wallInfluences.right > 0) {
    const blockedPush = adjustedPushX * wallInfluences.right;
    adjustedPushX -= blockedPush;
    adjustedPushY += blockedPush * verticalSlideDirection;
  } else if (adjustedPushX < 0 && wallInfluences.left > 0) {
    const blockedPush = -adjustedPushX * wallInfluences.left;
    adjustedPushX += blockedPush;
    adjustedPushY += blockedPush * verticalSlideDirection;
  }

  if (adjustedPushY > 0 && wallInfluences.top > 0) {
    const blockedPush = adjustedPushY * wallInfluences.top;
    adjustedPushY -= blockedPush;
    adjustedPushX += blockedPush * horizontalSlideDirection;
  } else if (adjustedPushY < 0 && wallInfluences.bottom > 0) {
    const blockedPush = -adjustedPushY * wallInfluences.bottom;
    adjustedPushY += blockedPush;
    adjustedPushX += blockedPush * horizontalSlideDirection;
  }

  return { x: adjustedPushX, y: adjustedPushY, wallInfluences };
}

function dampOutwardWallVelocity(state, wallInfluences) {
  let vx = state.vx;
  let vy = state.vy;

  if (vx > 0 && wallInfluences.right > 0) {
    vx *= 1 - wallInfluences.right;
  } else if (vx < 0 && wallInfluences.left > 0) {
    vx *= 1 - wallInfluences.left;
  }

  if (vy > 0 && wallInfluences.top > 0) {
    vy *= 1 - wallInfluences.top;
  } else if (vy < 0 && wallInfluences.bottom > 0) {
    vy *= 1 - wallInfluences.bottom;
  }

  return { vx, vy };
}

function limitVelocitySpeed(velocity, maxSpeed) {
  const speed = Math.hypot(velocity.vx, velocity.vy);
  if (speed <= maxSpeed || speed <= CAT_AVOIDANCE_EPSILON) {
    return velocity;
  }

  const scale = maxSpeed / speed;
  return {
    vx: velocity.vx * scale,
    vy: velocity.vy * scale,
  };
}

function moveToward(value, target, maxDelta) {
  if (!Number.isFinite(maxDelta)) {
    return target;
  }

  const positiveDelta = Math.max(0, maxDelta);
  const delta = target - value;
  if (Math.abs(delta) <= positiveDelta) {
    return target;
  }

  return value + Math.sign(delta) * positiveDelta;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rotateAngleToward(currentAngle, targetAngle, maxTurn) {
  if (!Number.isFinite(maxTurn)) {
    return targetAngle;
  }

  const turnLimit = Math.max(0, maxTurn);
  const delta = normalizeAngle(targetAngle - currentAngle);
  return currentAngle + clamp(delta, -turnLimit, turnLimit);
}

export function resolveCatSmoothedYaw(
  currentYaw,
  targetYaw,
  smoothing = CAT_TARGET_YAW_SMOOTHING,
) {
  if (!Number.isFinite(currentYaw)) {
    return targetYaw;
  }

  const amount = clamp(smoothing, 0, 1);
  return currentYaw + normalizeAngle(targetYaw - currentYaw) * amount;
}

function getClosestBall(state, balls) {
  let closestBall = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  balls.forEach((ball) => {
    const distance = Math.hypot(state.x - ball.state.x, state.y - ball.state.y);
    if (distance < closestDistance) {
      closestBall = ball;
      closestDistance = distance;
    }
  });

  return { ball: closestBall, distance: closestDistance };
}

function normalizeDirection(x, y) {
  const length = Math.hypot(x, y);
  if (length <= CAT_AVOIDANCE_EPSILON) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
}

function isSameTarget(a, b) {
  return Boolean(a && b)
    && Math.abs(a.x - b.x) <= CAT_AVOIDANCE_EPSILON
    && Math.abs(a.y - b.y) <= CAT_AVOIDANCE_EPSILON;
}

function getCornerCandidateTargets(state, bounds) {
  if (!bounds?.width || !bounds?.height) {
    return [];
  }

  const halfWidth = Math.max(0, bounds.width / 2 - state.radius);
  const halfHeight = Math.max(0, bounds.height / 2 - state.radius);

  return [
    { x: -halfWidth, y: halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
  ];
}

function getEscapeCandidateTargets(state, bounds) {
  const corners = getCornerCandidateTargets(state, bounds);
  if (corners.length === 0) {
    return [];
  }

  const halfWidth = Math.max(0, bounds.width / 2 - state.radius);
  const halfHeight = Math.max(0, bounds.height / 2 - state.radius);
  const candidates = [
    ...corners,
    { x: 0, y: halfHeight },
    { x: 0, y: -halfHeight },
    { x: -halfWidth, y: 0 },
    { x: halfWidth, y: 0 },
  ];
  const uniqueTargets = [];

  candidates.forEach((candidate) => {
    if (!uniqueTargets.some((target) => isSameTarget(target, candidate))) {
      uniqueTargets.push(candidate);
    }
  });

  return uniqueTargets;
}

function getNearestCornerTarget(state, bounds) {
  const corners = getCornerCandidateTargets(state, bounds);
  if (corners.length === 0) {
    return null;
  }

  return corners.reduce((nearestCorner, corner) => {
    const distance = Math.hypot(state.x - corner.x, state.y - corner.y);
    if (distance < nearestCorner.distance) {
      return { target: corner, distance };
    }

    return nearestCorner;
  }, { target: null, distance: Number.POSITIVE_INFINITY });
}

function getDistanceToNearestCorner(state, bounds) {
  return getNearestCornerTarget(state, bounds)?.distance ?? Number.POSITIVE_INFINITY;
}

function isCatInCorner(state, bounds, settleDistance) {
  return getDistanceToNearestCorner(state, bounds) <= settleDistance;
}

function resolveNearCornerRetreatTarget(state, bounds, settleDistance) {
  const nearestCorner = getNearestCornerTarget(state, bounds);
  const nearDistance = settleDistance * CAT_CORNER_NEAR_DISTANCE_FACTOR;
  if (!nearestCorner || nearestCorner.distance > nearDistance) {
    return null;
  }

  return nearestCorner.target;
}

function resolveCornerSettleState(state, target, {
  maxSpeed,
  maxSpeedChange,
} = {}) {
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= CAT_AVOIDANCE_EPSILON) {
    return {
      ...state,
      vx: 0,
      vy: 0,
      catBehavior: CAT_BEHAVIOR_WATCHING,
      escapeTarget: null,
      lookTargetState: null,
    };
  }

  const currentSpeed = Math.hypot(state.vx ?? 0, state.vy ?? 0);
  const desiredSpeed = Math.min(maxSpeed, distance);
  const targetSpeed = moveToward(currentSpeed, desiredSpeed, maxSpeedChange);

  return {
    ...state,
    vx: (dx / distance) * targetSpeed,
    vy: (dy / distance) * targetSpeed,
    catBehavior: CAT_BEHAVIOR_RETREATING,
    escapeTarget: target,
    lookTargetState: null,
  };
}

function resolveCatAgitationState(state, isAgitated, windowFrames) {
  const resolvedWindowFrames = Math.max(1, Math.floor(windowFrames));
  const previousWindow = Array.isArray(state.agitationWindow)
    ? state.agitationWindow.slice(-(resolvedWindowFrames - 1))
    : [];
  const agitationWindow = [
    ...previousWindow,
    isAgitated ? 1 : 0,
  ];

  return {
    agitationFrames: isAgitated ? (state.agitationFrames ?? 0) + 1 : 0,
    agitationWindow,
  };
}

function shouldCatRunAwayFromAgitation(state, windowFrames, patiencePercent) {
  const resolvedWindowFrames = Math.max(1, Math.floor(windowFrames));
  const resolvedPatiencePercent = clamp(patiencePercent, 0, 100);
  if (resolvedPatiencePercent >= 100) {
    return false;
  }

  const agitationWindow = Array.isArray(state.agitationWindow)
    ? state.agitationWindow
    : [];

  if (resolvedPatiencePercent <= 0) {
    return Boolean(agitationWindow[agitationWindow.length - 1]);
  }

  if (agitationWindow.length < resolvedWindowFrames) {
    return false;
  }

  const agitatedFrames = agitationWindow.reduce((total, frame) => total + (frame ? 1 : 0), 0);
  return (agitatedFrames / resolvedWindowFrames) * 100 > resolvedPatiencePercent;
}

function resolveCatExitDirection(state, bounds) {
  if (!bounds?.width || !bounds?.height) {
    return (state.vx ?? 0) < 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
  }

  const halfWidth = bounds.width / 2;
  const rightDistance = halfWidth - state.x;
  const leftDistance = state.x + halfWidth;

  return rightDistance <= leftDistance ? { x: 1, y: 0 } : { x: -1, y: 0 };
}

function resolveCatExitTarget(state, bounds, directionX, targetY = state.y) {
  const halfWidth = bounds.width / 2;
  const halfHeight = Math.max(0, bounds.height / 2 - state.radius);

  return {
    x: directionX * (halfWidth + state.radius),
    y: clamp(targetY, -halfHeight, halfHeight),
  };
}

function isBallBlockingExitSegment(state, ballState, target, buffer = CAT_EXIT_ROUTE_BUFFER) {
  const segmentX = target.x - state.x;
  const segmentY = target.y - state.y;
  const segmentLengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  if (segmentLengthSquared <= CAT_AVOIDANCE_EPSILON) {
    return false;
  }

  const ballX = ballState.x - state.x;
  const ballY = ballState.y - state.y;
  const projection = ((ballX * segmentX) + (ballY * segmentY)) / segmentLengthSquared;
  if (projection <= 0 || projection >= 1) {
    return false;
  }

  const segmentLength = Math.sqrt(segmentLengthSquared);
  if (projection * segmentLength <= state.radius * 0.75) {
    return false;
  }

  const closestX = state.x + segmentX * projection;
  const closestY = state.y + segmentY * projection;
  const clearance = state.radius + ballState.radius + buffer;

  return Math.hypot(ballState.x - closestX, ballState.y - closestY) < clearance;
}

function isCatExitRouteClear(state, balls, target) {
  return !balls.some((ball) => isBallBlockingExitSegment(state, ball.state, target));
}

function getCatExitLaneYTargets(state, bounds) {
  const halfHeight = Math.max(0, bounds.height / 2 - state.radius);
  const currentY = clamp(state.y, -halfHeight, halfHeight);
  const yTargets = [currentY];
  const laneCount = Math.max(1, Math.ceil((halfHeight * 2) / CAT_EXIT_LANE_SPACING));

  for (let index = 0; index <= laneCount; index += 1) {
    const y = -halfHeight + ((halfHeight * 2 * index) / laneCount);
    if (!yTargets.some((targetY) => Math.abs(targetY - y) <= CAT_AVOIDANCE_EPSILON)) {
      yTargets.push(y);
    }
  }

  return yTargets.sort((a, b) => Math.abs(a - currentY) - Math.abs(b - currentY));
}

function resolveCatExitRoute(state, balls, bounds) {
  const primaryDirection = resolveCatExitDirection(state, bounds);
  if (!bounds?.width || !bounds?.height || balls.length === 0) {
    return {
      type: 'side',
      direction: primaryDirection,
    };
  }

  const directTarget = resolveCatExitTarget(state, bounds, primaryDirection.x, state.y);
  if (isCatExitRouteClear(state, balls, directTarget)) {
    return {
      type: 'side',
      direction: primaryDirection,
    };
  }

  const sideDirections = [primaryDirection.x, -primaryDirection.x];
  const yTargets = getCatExitLaneYTargets(state, bounds);
  let bestRoute = null;

  sideDirections.forEach((directionX, sideIndex) => {
    yTargets.forEach((targetY) => {
      const target = resolveCatExitTarget(state, bounds, directionX, targetY);
      if (!isCatExitRouteClear(state, balls, target)) {
        return;
      }

      const dx = target.x - state.x;
      const dy = target.y - state.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= CAT_AVOIDANCE_EPSILON) {
        return;
      }

      const verticalShift = Math.abs(target.y - state.y);
      const score = distance
        + verticalShift
        + sideIndex * bounds.width * CAT_EXIT_OPPOSITE_SIDE_PENALTY;
      const route = {
        type: 'side',
        direction: {
          x: dx / distance,
          y: dy / distance,
        },
        score,
      };

      if (!bestRoute || route.score < bestRoute.score) {
        bestRoute = route;
      }
    });
  });

  return bestRoute ?? { type: 'ufo' };
}

function easeInOut(value) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - (2 * amount));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function lerpPoint(start, end, amount) {
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
  };
}

function getUfoPhaseProgress(state, totalFrames) {
  const remaining = Math.floor(state.exitAnnouncementFramesRemaining ?? totalFrames);
  return 1 - clamp(remaining / totalFrames, 0, 1);
}

function resolveCatUfoPath(state, bounds, entryDirection) {
  const halfWidth = bounds?.width ? bounds.width / 2 : VIEW_HEIGHT / 2;
  const halfHeight = bounds?.height ? bounds.height / 2 : VIEW_HEIGHT / 2;
  const hoverY = clamp(
    state.y + state.radius * CAT_UFO_HOVER_OFFSET,
    -halfHeight + state.radius,
    halfHeight - state.radius * 0.4,
  );
  const entryX = entryDirection.x < 0
    ? -halfWidth - CAT_UFO_SCREEN_MARGIN
    : halfWidth + CAT_UFO_SCREEN_MARGIN;

  return {
    ufoEntryPoint: { x: entryX, y: hoverY },
    ufoHoverPoint: { x: state.x, y: hoverY },
    ufoExitPoint: { x: -entryX, y: hoverY },
  };
}

function isCatUfoSequenceActive(state) {
  return state?.catBehavior === CAT_BEHAVIOR_UFO_ENTERING
    || state?.catBehavior === CAT_BEHAVIOR_UFO_BEAMING
    || state?.catBehavior === CAT_BEHAVIOR_UFO_LEAVING;
}

export function resolveCatUfoVisualState(state) {
  const fallbackHover = {
    x: state.x ?? 0,
    y: (state.y ?? 0) + (state.radius ?? DEFAULT_CAT_RADIUS) * CAT_UFO_HOVER_OFFSET,
  };
  const entry = state.ufoEntryPoint ?? fallbackHover;
  const hover = state.ufoHoverPoint ?? fallbackHover;
  const exit = state.ufoExitPoint ?? hover;
  const base = {
    ufoVisible: false,
    beamVisible: false,
    ufoX: hover.x,
    ufoY: hover.y,
    catLiftY: 0,
    catScale: 1,
    catOpacity: 1,
    beamOpacity: 0,
  };

  if (state.catBehavior === CAT_BEHAVIOR_UFO_ENTERING) {
    const progress = easeInOut(getUfoPhaseProgress(state, CAT_UFO_ENTER_FRAMES));
    const point = lerpPoint(entry, hover, progress);
    return {
      ...base,
      ufoVisible: true,
      ufoX: point.x,
      ufoY: point.y,
    };
  }

  if (state.catBehavior === CAT_BEHAVIOR_UFO_BEAMING) {
    const progress = easeInOut(getUfoPhaseProgress(state, CAT_UFO_BEAM_FRAMES));
    return {
      ...base,
      ufoVisible: true,
      beamVisible: true,
      catLiftY: (state.radius ?? DEFAULT_CAT_RADIUS) * 1.75 * progress,
      catScale: lerp(1, 0.12, progress),
      catOpacity: lerp(1, 0, progress),
      beamOpacity: lerp(0.18, 0.34, progress),
    };
  }

  if (state.catBehavior === CAT_BEHAVIOR_UFO_LEAVING) {
    const progress = easeInOut(getUfoPhaseProgress(state, CAT_UFO_LEAVE_FRAMES));
    const point = lerpPoint(hover, exit, progress);
    return {
      ...base,
      ufoVisible: true,
      ufoX: point.x,
      ufoY: point.y,
      catScale: 0.12,
      catOpacity: 0,
    };
  }

  return base;
}

function resolveMedianBallSpeed(balls) {
  if (balls.length === 0) {
    return 0;
  }

  const speeds = balls
    .map((ball) => Math.hypot(ball.state.vx ?? 0, ball.state.vy ?? 0))
    .sort((a, b) => a - b);
  const middleIndex = Math.floor(speeds.length / 2);

  return speeds.length % 2 === 0
    ? (speeds[middleIndex - 1] + speeds[middleIndex]) / 2
    : speeds[middleIndex];
}

function resolveCatExitDistanceToEdge(state, bounds, direction) {
  if (!bounds?.width) {
    return 0;
  }

  const halfWidth = bounds.width / 2;
  const resolvedDirection = normalizeDirection(direction.x, direction.y ?? 0);
  if (Math.abs(resolvedDirection.x) <= CAT_AVOIDANCE_EPSILON) {
    return 0;
  }

  const edgeX = resolvedDirection.x < 0 ? -halfWidth : halfWidth;
  return Math.max(0, (edgeX - state.x) / resolvedDirection.x);
}

function resolveCatRunAwaySpeed(balls, state, bounds, direction = resolveCatExitDirection(state, bounds)) {
  const baseSpeed = resolveMedianBallSpeed(balls) * CAT_RUN_AWAY_SPEED_FACTOR;
  const halfWidth = bounds?.width ? bounds.width / 2 : 0;
  const distanceToEdge = resolveCatExitDistanceToEdge(state, bounds, direction);
  const normalizedDistance = halfWidth > 0
    ? clamp(distanceToEdge / halfWidth, 0, 1)
    : 0;
  const boostAmount = clamp(
    (normalizedDistance - CAT_RUN_AWAY_DISTANCE_BOOST_START)
      / (1 - CAT_RUN_AWAY_DISTANCE_BOOST_START),
    0,
    1,
  ) * CAT_RUN_AWAY_DISTANCE_BOOST;

  return clamp(
    baseSpeed + boostAmount,
    CAT_MIN_RUN_AWAY_SPEED,
    CAT_MAX_RUN_AWAY_SPEED,
  );
}

function resolveCatRunAwayState(state, bounds, {
  balls = [],
  forceUfoExit = false,
  speed,
} = {}) {
  const route = forceUfoExit ? { type: 'ufo' } : resolveCatExitRoute(state, balls, bounds);
  if (route.type === 'ufo') {
    const direction = resolveCatExitDirection(state, bounds);
    return {
      ...state,
      vx: 0,
      vy: 0,
      catBehavior: CAT_BEHAVIOR_TURNING_INWARD,
      exitRouteType: 'ufo',
      exitDirection: direction,
      exitSpeed: 0,
      exitAnnouncementFramesRemaining: CAT_EXIT_ANNOUNCEMENT_FRAMES,
      escapeTarget: null,
      lookTargetState: null,
      ...resolveCatUfoPath(state, bounds, direction),
    };
  }

  const direction = route.direction;
  const resolvedSpeed = Math.max(0, speed ?? resolveCatRunAwaySpeed(
    balls,
    state,
    bounds,
    direction,
  ));

  return {
    ...state,
    vx: 0,
    vy: 0,
    catBehavior: CAT_BEHAVIOR_TURNING_INWARD,
    exitRouteType: 'side',
    exitDirection: direction,
    exitSpeed: resolvedSpeed,
    exitAnnouncementFramesRemaining: CAT_EXIT_ANNOUNCEMENT_FRAMES,
    escapeTarget: null,
    lookTargetState: null,
  };
}

export function isCatExitSequenceActive(state) {
  return state?.catBehavior === CAT_BEHAVIOR_TURNING_INWARD
    || state?.catBehavior === CAT_BEHAVIOR_ANNOUNCING
    || state?.catBehavior === CAT_BEHAVIOR_LEAVING
    || isCatUfoSequenceActive(state);
}

function resolveCatInwardExitYaw(state) {
  const exitX = state.exitDirection?.x === -1 ? -1 : 1;
  return -exitX * CAT_TARGET_YAW_AMOUNT;
}

function resolveCatOutwardExitVelocity(state) {
  const exitDirection = normalizeDirection(
    state.exitDirection?.x ?? 1,
    state.exitDirection?.y ?? 0,
  );
  const speed = Math.max(0, state.exitSpeed ?? 0);
  return {
    vx: exitDirection.x * speed,
    vy: exitDirection.y * speed,
  };
}

export function resolveCatExitSequenceState(state, smoothedTargetYaw, {
  turnThreshold = CAT_EXIT_INWARD_TURN_THRESHOLD,
  announcementFrames = CAT_EXIT_ANNOUNCEMENT_FRAMES,
} = {}) {
  if (isCatUfoSequenceActive(state)) {
    const phaseFrames = state.catBehavior === CAT_BEHAVIOR_UFO_ENTERING
      ? CAT_UFO_ENTER_FRAMES
      : state.catBehavior === CAT_BEHAVIOR_UFO_BEAMING
        ? CAT_UFO_BEAM_FRAMES
        : CAT_UFO_LEAVE_FRAMES;
    const nextFramesRemaining = Math.max(
      0,
      Math.floor(state.exitAnnouncementFramesRemaining ?? phaseFrames) - 1,
    );
    if (nextFramesRemaining > 0) {
      return {
        ...state,
        vx: 0,
        vy: 0,
        exitAnnouncementFramesRemaining: nextFramesRemaining,
      };
    }

    if (state.catBehavior === CAT_BEHAVIOR_UFO_ENTERING) {
      return {
        ...state,
        vx: 0,
        vy: 0,
        catBehavior: CAT_BEHAVIOR_UFO_BEAMING,
        exitAnnouncementFramesRemaining: CAT_UFO_BEAM_FRAMES,
      };
    }

    if (state.catBehavior === CAT_BEHAVIOR_UFO_BEAMING) {
      return {
        ...state,
        vx: 0,
        vy: 0,
        catBehavior: CAT_BEHAVIOR_UFO_LEAVING,
        exitAnnouncementFramesRemaining: CAT_UFO_LEAVE_FRAMES,
      };
    }

    return {
      ...state,
      vx: 0,
      vy: 0,
      exitAnnouncementFramesRemaining: 0,
    };
  }

  if (state.catBehavior === CAT_BEHAVIOR_TURNING_INWARD) {
    const targetYaw = resolveCatInwardExitYaw(state);
    if (Math.abs(smoothedTargetYaw - targetYaw) > turnThreshold) {
      return {
        ...state,
        vx: 0,
        vy: 0,
      };
    }

    return {
      ...state,
      vx: 0,
      vy: 0,
      catBehavior: CAT_BEHAVIOR_ANNOUNCING,
      exitAnnouncementFramesRemaining: Math.max(
        1,
        Math.floor(state.exitAnnouncementFramesRemaining ?? announcementFrames),
      ),
    };
  }

  if (state.catBehavior !== CAT_BEHAVIOR_ANNOUNCING) {
    return state;
  }

  const nextFramesRemaining = Math.max(
    0,
    Math.floor(state.exitAnnouncementFramesRemaining ?? announcementFrames) - 1,
  );
  if (nextFramesRemaining > 0) {
    return {
      ...state,
      vx: 0,
      vy: 0,
      exitAnnouncementFramesRemaining: nextFramesRemaining,
    };
  }

  if (state.exitRouteType === 'ufo') {
    return {
      ...state,
      vx: 0,
      vy: 0,
      catBehavior: CAT_BEHAVIOR_UFO_ENTERING,
      exitAnnouncementFramesRemaining: CAT_UFO_ENTER_FRAMES,
    };
  }

  return {
    ...state,
    ...resolveCatOutwardExitVelocity(state),
    catBehavior: CAT_BEHAVIOR_LEAVING,
    exitAnnouncementFramesRemaining: 0,
  };
}

export function stepCatRunAwayState(state, { speedFactor = 1 } = {}) {
  if (state.exitDirection && Number.isFinite(state.exitSpeed)) {
    const exitDirection = normalizeDirection(
      state.exitDirection.x,
      state.exitDirection.y ?? 0,
    );
    const resolvedSpeedFactor = Number.isFinite(speedFactor)
      ? Math.max(0, speedFactor)
      : 1;
    const stepSpeed = clamp(
      Math.max(0, state.exitSpeed) * resolvedSpeedFactor,
      CAT_MIN_RUN_AWAY_SPEED,
      CAT_MAX_RUN_AWAY_SPEED,
    );

    return {
      ...state,
      x: state.x + exitDirection.x * stepSpeed,
      y: state.y + exitDirection.y * stepSpeed,
    };
  }

  return {
    ...state,
    x: state.x + (state.vx ?? 0) * speedFactor,
    y: state.y + (state.vy ?? 0) * speedFactor,
  };
}

export function isCatOutsideScene(state, bounds) {
  if (!bounds?.width || !bounds?.height) {
    return false;
  }

  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  return state.x - state.radius > halfWidth
    || state.x + state.radius < -halfWidth
    || state.y - state.radius > halfHeight
    || state.y + state.radius < -halfHeight;
}

function advancePredictedBalls(ballStates, bounds, steps, speedFactor) {
  for (let i = 0; i < steps; i += 1) {
    ballStates.forEach((state, index) => {
      ballStates[index] = stepBall(state, {
        width: bounds.width,
        height: bounds.height,
        radius: state.radius,
        speedFactor,
      });
    });
  }
}

function scoreEscapeTarget(state, balls, target, bounds, {
  horizonSteps,
  maxSpeed,
  sampleInterval,
  speedFactor,
  distancePenalty = CAT_ESCAPE_TARGET_DISTANCE_PENALTY,
}) {
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const targetDistance = Math.hypot(dx, dy);
  const direction = normalizeDirection(dx, dy);
  const sampleStep = Math.max(1, Math.floor(sampleInterval));
  const totalSteps = Math.max(0, Math.floor(horizonSteps));
  const sampleSteps = [];
  const predictedBallStates = balls.map((ball) => ({ ...ball.state }));
  let previousStep = 0;
  let minimumClearance = Number.POSITIVE_INFINITY;
  let totalClearance = 0;
  let sampleCount = 0;

  for (let step = 0; step < totalSteps; step += sampleStep) {
    sampleSteps.push(step);
  }
  if (sampleSteps[sampleSteps.length - 1] !== totalSteps) {
    sampleSteps.push(totalSteps);
  }

  sampleSteps.forEach((step) => {
    advancePredictedBalls(predictedBallStates, bounds, step - previousStep, speedFactor);
    previousStep = step;

    const catTravel = Math.min(targetDistance, maxSpeed * speedFactor * step);
    const catX = state.x + direction.x * catTravel;
    const catY = state.y + direction.y * catTravel;

    predictedBallStates.forEach((ballState) => {
      const clearance = Math.hypot(catX - ballState.x, catY - ballState.y)
        - state.radius
        - ballState.radius;
      minimumClearance = Math.min(minimumClearance, clearance);
      totalClearance += Math.min(clearance, VIEW_HEIGHT);
      sampleCount += 1;
    });
  });

  const averageClearance = sampleCount > 0 ? totalClearance / sampleCount : 0;
  const currentVx = state.vx ?? 0;
  const currentVy = state.vy ?? 0;
  const currentSpeed = Math.hypot(currentVx, currentVy);
  const turnPenalty = currentSpeed > CAT_AVOIDANCE_EPSILON
    ? 1 - (((currentVx * direction.x) + (currentVy * direction.y)) / currentSpeed)
    : 0;

  if (sampleCount === 0) {
    return -targetDistance * distancePenalty - turnPenalty * 0.25;
  }

  return (
    minimumClearance * 8
    + averageClearance * 1.5
    - targetDistance * distancePenalty
    - turnPenalty * 0.25
  );
}

export function resolveCatMaxSpeed(balls, {
  fallback = CAT_MAX_AVOIDANCE_SPEED,
  minimum = CAT_MIN_AVOIDANCE_SPEED,
  multiplier = CAT_ESCAPE_SPEED_MULTIPLIER,
} = {}) {
  let maxBallSpeed = 0;

  balls.forEach((ball) => {
    maxBallSpeed = Math.max(
      maxBallSpeed,
      Math.hypot(ball.state.vx ?? 0, ball.state.vy ?? 0),
    );
  });

  if (maxBallSpeed <= CAT_AVOIDANCE_EPSILON) {
    return fallback;
  }

  return Math.max(minimum, maxBallSpeed * multiplier);
}

export function resolvePredictedEscapeTarget(state, balls, bounds, {
  horizonSteps = CAT_ESCAPE_LOOKAHEAD_STEPS,
  maxSpeed = resolveCatMaxSpeed(balls),
  previousTarget = state.escapeTarget,
  sampleInterval = CAT_ESCAPE_LOOKAHEAD_SAMPLE_INTERVAL,
  speedFactor = 1,
  stickiness = CAT_ESCAPE_TARGET_STICKINESS,
} = {}) {
  const candidates = getEscapeCandidateTargets(state, bounds);
  if (candidates.length === 0 || balls.length === 0) {
    return resolveSafestCornerTarget(state, balls, bounds);
  }

  const scoredTargets = candidates.map((target) => ({
    target,
    score: scoreEscapeTarget(state, balls, target, bounds, {
      horizonSteps,
      maxSpeed,
      sampleInterval,
      speedFactor,
      distancePenalty: CAT_ESCAPE_TARGET_DISTANCE_PENALTY,
    }),
  }));
  let best = scoredTargets[0];

  scoredTargets.forEach((scoredTarget) => {
    if (scoredTarget.score > best.score) {
      best = scoredTarget;
    }
  });

  const previous = scoredTargets.find((scoredTarget) => (
    isSameTarget(scoredTarget.target, previousTarget)
  ));
  if (previous && previous.score >= best.score - stickiness) {
    return previous.target;
  }

  return best.target;
}

export function resolveSafeCornerRetreatTarget(state, balls, bounds, {
  horizonSteps = CAT_ESCAPE_LOOKAHEAD_STEPS,
  maxSpeed = resolveCatMaxSpeed(balls) * CAT_CORNER_RETREAT_SPEED_FACTOR,
  previousTarget = state.escapeTarget,
  sampleInterval = CAT_ESCAPE_LOOKAHEAD_SAMPLE_INTERVAL,
  speedFactor = 1,
  stickiness = CAT_CORNER_RETREAT_TARGET_STICKINESS,
  distancePenalty = CAT_CORNER_RETREAT_DISTANCE_PENALTY,
} = {}) {
  const candidates = getCornerCandidateTargets(state, bounds);
  if (candidates.length === 0) {
    return null;
  }

  const scoredTargets = candidates.map((target) => ({
    target,
    score: scoreEscapeTarget(state, balls, target, bounds, {
      horizonSteps,
      maxSpeed,
      sampleInterval,
      speedFactor,
      distancePenalty,
    }),
  }));
  let best = scoredTargets[0];

  scoredTargets.forEach((scoredTarget) => {
    if (scoredTarget.score > best.score) {
      best = scoredTarget;
    }
  });

  const previous = scoredTargets.find((scoredTarget) => (
    isSameTarget(scoredTarget.target, previousTarget)
  ));
  if (previous && previous.score >= best.score - stickiness) {
    return previous.target;
  }

  return best.target;
}

export function resolveSafestCornerTarget(state, balls, bounds) {
  if (!bounds?.width || !bounds?.height || balls.length === 0) {
    return null;
  }

  const halfWidth = Math.max(0, bounds.width / 2 - state.radius);
  const halfHeight = Math.max(0, bounds.height / 2 - state.radius);
  const corners = [
    { x: -halfWidth, y: halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
  ];
  let bestCorner = null;
  let bestNearestDistance = Number.NEGATIVE_INFINITY;
  let bestTotalDistance = Number.NEGATIVE_INFINITY;

  corners.forEach((corner) => {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let totalDistance = 0;

    balls.forEach((ball) => {
      const distance = Math.hypot(corner.x - ball.state.x, corner.y - ball.state.y);
      nearestDistance = Math.min(nearestDistance, distance);
      totalDistance += distance;
    });

    if (
      nearestDistance > bestNearestDistance + CAT_AVOIDANCE_EPSILON
      || (
        Math.abs(nearestDistance - bestNearestDistance) <= CAT_AVOIDANCE_EPSILON
        && totalDistance > bestTotalDistance
      )
    ) {
      bestCorner = corner;
      bestNearestDistance = nearestDistance;
      bestTotalDistance = totalDistance;
    }
  });

  return bestCorner;
}

export function resolveCatFleeDirection(state, balls, bounds, {
  target = resolveSafestCornerTarget(state, balls, bounds),
  corridorBuffer = CAT_ESCAPE_CORRIDOR_BUFFER,
  detourStrength = CAT_ESCAPE_DETOUR_STRENGTH,
} = {}) {
  if (!target) {
    return { x: 0, y: 0 };
  }

  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= CAT_AVOIDANCE_EPSILON) {
    return { x: 0, y: 0 };
  }

  const forwardX = dx / distance;
  const forwardY = dy / distance;
  let steerX = forwardX;
  let steerY = forwardY;

  balls.forEach((ball) => {
    const ballX = ball.state.x - state.x;
    const ballY = ball.state.y - state.y;
    const projection = (ballX * forwardX) + (ballY * forwardY);

    if (projection <= 0 || projection >= distance) {
      return;
    }

    const closestX = state.x + forwardX * projection;
    const closestY = state.y + forwardY * projection;
    const awayX = closestX - ball.state.x;
    const awayY = closestY - ball.state.y;
    const awayDistance = Math.hypot(awayX, awayY);
    const clearance = state.radius + ball.state.radius + corridorBuffer;

    if (awayDistance >= clearance) {
      return;
    }

    let detourX = awayX;
    let detourY = awayY;
    if (awayDistance <= CAT_AVOIDANCE_EPSILON) {
      detourX = -forwardY;
      detourY = forwardX;
    }

    const detour = normalizeDirection(detourX, detourY);
    const proximity = 1 - awayDistance / clearance;
    const ahead = 1 - projection / distance;
    const weight = proximity * proximity * (0.35 + ahead * 0.65) * detourStrength;
    steerX += detour.x * weight;
    steerY += detour.y * weight;
  });

  return normalizeDirection(steerX, steerY);
}

function resolveWatchingState(state, closestBall, maxSpeedChange) {
  const speed = Math.hypot(state.vx, state.vy);
  const restSpeed = Math.max(CAT_AVOIDANCE_EPSILON, maxSpeedChange * 2);
  if (speed <= restSpeed) {
    return {
      ...state,
      vx: 0,
      vy: 0,
      catBehavior: CAT_BEHAVIOR_WATCHING,
      escapeTarget: null,
      lookTargetState: closestBall?.state ?? null,
    };
  }

  const nextSpeed = moveToward(speed, 0, maxSpeedChange);
  const scale = nextSpeed / speed;

  return {
    ...state,
    vx: Math.abs(nextSpeed) <= CAT_AVOIDANCE_EPSILON ? 0 : state.vx * scale,
    vy: Math.abs(nextSpeed) <= CAT_AVOIDANCE_EPSILON ? 0 : state.vy * scale,
    catBehavior: CAT_BEHAVIOR_WATCHING,
    escapeTarget: null,
    lookTargetState: closestBall?.state ?? null,
  };
}

export function resolveCatAvoidanceState(object, balls, {
  avoidanceBuffer = CAT_AVOIDANCE_BUFFER,
  strength = CAT_AVOIDANCE_STRENGTH,
  maxSpeed = null,
  minSpeed = CAT_MIN_AVOIDANCE_SPEED,
  maxSteer = CAT_MAX_AVOIDANCE_STEER,
  maxSpeedChange = CAT_MAX_AVOIDANCE_SPEED_CHANGE,
  maxTurn = CAT_MAX_AVOIDANCE_TURN,
  bounds = null,
  wallBuffer = CAT_AVOIDANCE_WALL_BUFFER,
  dangerBuffer = CAT_DANGER_BUFFER,
  safeBuffer = CAT_SAFE_BUFFER,
  watchingDeceleration = CAT_WATCHING_DECELERATION,
  cornerRetreatDelayFrames = CAT_CORNER_RETREAT_DELAY_FRAMES,
  cornerSettleDistance = CAT_CORNER_SETTLE_DISTANCE,
  cornerRetreatSpeedFactor = CAT_CORNER_RETREAT_SPEED_FACTOR,
  cornerRetreatDistancePenalty = CAT_CORNER_RETREAT_DISTANCE_PENALTY,
  agitationWindowFrames = CAT_AGITATION_WINDOW_FRAMES,
  catPatiencePercent = DEFAULT_CAT_PATIENCE_PERCENT,
  forceUfoExit = DEFAULT_CAT_FORCE_UFO_EXIT,
} = {}) {
  if (object.type !== CAT_OBJECT_ID) {
    return object.state;
  }

  if (isCatExitSequenceActive(object.state)) {
    return object.state;
  }

  const closest = getClosestBall(object.state, balls);
  const closestBall = closest.ball ?? null;
  const hasBounds = Boolean(bounds?.width && bounds?.height);
  const isInCorner = hasBounds && isCatInCorner(object.state, bounds, cornerSettleDistance);
  const cornerAwayFrames = hasBounds
    ? (isInCorner ? 0 : (object.state.cornerAwayFrames ?? 0) + 1)
    : (object.state.cornerAwayFrames ?? 0);
  const stateWithCornerTimer = {
    ...object.state,
    cornerAwayFrames,
  };
  const resolvedMaxSpeed = Number.isFinite(maxSpeed)
    ? Math.max(0, maxSpeed)
    : resolveCatMaxSpeed(balls);
  const dangerDistance = closestBall
    ? object.state.radius + closestBall.state.radius + dangerBuffer
    : Number.NEGATIVE_INFINITY;
  const safeDistance = closestBall
    ? object.state.radius + closestBall.state.radius + safeBuffer
    : Number.NEGATIVE_INFINITY;
  const wasFleeing = object.state.catBehavior === CAT_BEHAVIOR_FLEEING;
  const shouldFlee = Boolean(closestBall) && (
    closest.distance <= dangerDistance
    || (wasFleeing && closest.distance < safeDistance)
  );
  const agitationState = resolveCatAgitationState(
    object.state,
    shouldFlee,
    agitationWindowFrames,
  );
  const stateWithTimers = {
    ...stateWithCornerTimer,
    ...agitationState,
  };

  if (
    shouldFlee
    && shouldCatRunAwayFromAgitation(
      stateWithTimers,
      agitationWindowFrames,
      catPatiencePercent,
    )
  ) {
    return resolveCatRunAwayState(stateWithTimers, bounds, {
      balls,
      forceUfoExit,
    });
  }

  const resolvedRetreatDelayFrames = Number.isFinite(cornerRetreatDelayFrames)
    ? Math.max(0, Math.floor(cornerRetreatDelayFrames))
    : CAT_CORNER_RETREAT_DELAY_FRAMES;
  const shouldRetreatToCorner = !shouldFlee
    && hasBounds
    && !isInCorner
    && cornerAwayFrames >= resolvedRetreatDelayFrames;

  if (!shouldFlee && !shouldRetreatToCorner) {
    return resolveWatchingState(stateWithTimers, closestBall, watchingDeceleration);
  }

  const retreatSpeedFactor = clamp(cornerRetreatSpeedFactor, 0, 1);
  const activeMaxSpeed = shouldRetreatToCorner
    ? resolvedMaxSpeed * retreatSpeedFactor
    : resolvedMaxSpeed;
  const activeMinSpeed = Math.min(minSpeed, activeMaxSpeed);
  const nearCornerRetreatTarget = shouldRetreatToCorner
    ? resolveNearCornerRetreatTarget(stateWithTimers, bounds, cornerSettleDistance)
    : null;

  if (nearCornerRetreatTarget) {
    return resolveCornerSettleState(stateWithTimers, nearCornerRetreatTarget, {
      maxSpeed: activeMaxSpeed * CAT_CORNER_SETTLE_SPEED_FACTOR,
      maxSpeedChange,
    });
  }

  let pushX = 0;
  let pushY = 0;

  balls.forEach((ball) => {
    const dx = object.state.x - ball.state.x;
    const dy = object.state.y - ball.state.y;
    const distance = Math.hypot(dx, dy);
    const shyDistance = object.state.radius + ball.state.radius + avoidanceBuffer;

    if (distance >= shyDistance) {
      return;
    }

    let directionX = 1;
    let directionY = 0;
    if (distance > 0.0001) {
      directionX = dx / distance;
      directionY = dy / distance;
    }

    const proximity = 1 - distance / shyDistance;
    const weight = proximity * proximity;
    pushX += directionX * weight;
    pushY += directionY * weight;
  });

  const escapeTarget = shouldRetreatToCorner
    ? resolveSafeCornerRetreatTarget(stateWithTimers, balls, bounds, {
      maxSpeed: activeMaxSpeed,
      previousTarget: object.state.escapeTarget,
      distancePenalty: cornerRetreatDistancePenalty,
    })
    : resolvePredictedEscapeTarget(stateWithTimers, balls, bounds, {
      maxSpeed: resolvedMaxSpeed,
      previousTarget: object.state.escapeTarget,
    });

  if (shouldRetreatToCorner && !escapeTarget) {
    return resolveWatchingState(stateWithTimers, closestBall, watchingDeceleration);
  }

  const fleeDirection = escapeTarget
    ? resolveCatFleeDirection(stateWithTimers, balls, bounds, {
      target: escapeTarget,
    })
    : { x: 0, y: 0 };
  const wallAwarePush = resolveWallAwarePush(
    pushX + fleeDirection.x * CAT_ESCAPE_CORRIDOR_STRENGTH,
    pushY + fleeDirection.y * CAT_ESCAPE_CORRIDOR_STRENGTH,
    stateWithTimers,
    bounds,
    wallBuffer,
  );
  const pushMagnitude = Math.hypot(wallAwarePush.x, wallAwarePush.y);

  if (pushMagnitude <= CAT_AVOIDANCE_EPSILON) {
    return shouldRetreatToCorner
      ? resolveWatchingState(stateWithTimers, closestBall, watchingDeceleration)
      : stateWithTimers;
  }

  const currentVelocity = limitVelocitySpeed(
    dampOutwardWallVelocity(stateWithTimers, wallAwarePush.wallInfluences),
    activeMaxSpeed,
  );
  const currentSpeed = Math.hypot(currentVelocity.vx, currentVelocity.vy);
  const desiredSpeed = clamp(
    currentSpeed + Math.min(pushMagnitude, 1) * strength,
    activeMinSpeed,
    activeMaxSpeed,
  );
  const targetSpeed = moveToward(currentSpeed, desiredSpeed, maxSpeedChange);
  const targetAngle = Math.atan2(wallAwarePush.y, wallAwarePush.x);
  const currentAngle = currentSpeed > CAT_AVOIDANCE_EPSILON
    ? Math.atan2(currentVelocity.vy, currentVelocity.vx)
    : targetAngle;
  const nextAngle = rotateAngleToward(currentAngle, targetAngle, maxTurn);
  const targetVx = Math.cos(nextAngle) * targetSpeed;
  const targetVy = Math.sin(nextAngle) * targetSpeed;
  let steerX = targetVx - currentVelocity.vx;
  let steerY = targetVy - currentVelocity.vy;
  const steerDistance = Math.hypot(steerX, steerY);

  if (steerDistance > maxSteer) {
    const scale = maxSteer / steerDistance;
    steerX *= scale;
    steerY *= scale;
  }

  const nextState = {
    ...stateWithTimers,
    vx: currentVelocity.vx + steerX,
    vy: currentVelocity.vy + steerY,
    catBehavior: shouldRetreatToCorner ? CAT_BEHAVIOR_RETREATING : CAT_BEHAVIOR_FLEEING,
    escapeTarget,
    lookTargetState: null,
  };
  const speed = Math.hypot(nextState.vx, nextState.vy);

  if (speed > activeMaxSpeed) {
    const scale = activeMaxSpeed / speed;
    nextState.vx *= scale;
    nextState.vy *= scale;
  }

  return nextState;
}

export function resolveCatTargetYaw(object, settings, {
  bounds: sceneBounds = { width: 0, height: 0 },
} = {}) {
  if (object.type !== CAT_OBJECT_ID || !settings.catMotionEnabled) {
    return 0;
  }

  if (
    object.state.catBehavior === CAT_BEHAVIOR_TURNING_INWARD
    || object.state.catBehavior === CAT_BEHAVIOR_ANNOUNCING
  ) {
    return resolveCatInwardExitYaw(object.state);
  }

  if (
    object.state.catBehavior === CAT_BEHAVIOR_FLEEING
    || object.state.catBehavior === CAT_BEHAVIOR_RETREATING
    || object.state.catBehavior === CAT_BEHAVIOR_LEAVING
  ) {
    const speed = Math.hypot(object.state.vx, object.state.vy);
    return speed > CAT_AVOIDANCE_EPSILON
      ? (object.state.vx / speed) * CAT_TARGET_YAW_AMOUNT
      : (object.state.exitDirection?.x ?? 0) * CAT_TARGET_YAW_AMOUNT;
  }

  if (object.state.lookTargetState) {
    const look = getLookDirectionToPoint(object.state.lookTargetState, object.state, {
      maxLean: settings.maxLean,
      range: settings.lookRange,
      innerRange: settings.innerLookRange,
    });
    return look.x * CAT_TARGET_YAW_AMOUNT;
  }

  return 0;
}

export function resolveCatIdleTransform(object, elapsedSeconds, settings, targetYaw = 0) {
  if (object.type !== CAT_OBJECT_ID || !settings.catMotionEnabled) {
    return {
      bobY: 0,
      rotationY: 0,
      rotationZ: 0,
    };
  }

  const speed = Math.hypot(object.state?.vx ?? 0, object.state?.vy ?? 0);
  const movementYaw = speed > 0.0001
    ? ((object.state?.vx ?? 0) / speed) * CAT_MOVEMENT_YAW_AMOUNT
    : 0;
  const movementInfluence = Math.abs(targetYaw) > 0.001 ? 0.35 : 1;
  const idleYaw = Math.sin((elapsedSeconds * 1.3) + object.idlePhase) * CAT_YAW_AMOUNT;

  return {
    bobY: Math.sin((elapsedSeconds * 2.2) + object.idlePhase) * CAT_BOB_DISTANCE,
    rotationY: clamp(
      targetYaw + (movementYaw * movementInfluence) + idleYaw,
      -CAT_MAX_TOTAL_YAW,
      CAT_MAX_TOTAL_YAW,
    ),
    rotationZ: Math.sin((elapsedSeconds * 1.8) + object.idlePhase) * CAT_ROLL_AMOUNT,
  };
}

export function resolveSceneSettings(options = {}) {
  const ballRadius = clamp(
    readOption(options.getBallRadius, DEFAULT_BALL_RADIUS),
    MIN_BALL_RADIUS,
    MAX_BALL_RADIUS,
  );
  const lookMode = readLookMode(options);

  return {
    speedFactor: clamp(readOption(options.getSpeedFactor, DEFAULT_SPEED_FACTOR), 0, MAX_SPEED_FACTOR),
    ballRadius,
    lookRange: clamp(readOption(options.getLookRange, DEFAULT_LOOK_RANGE), ballRadius, MAX_LOOK_RANGE),
    innerLookRange: ballRadius,
    maxLean: clamp(readOption(options.getMaxLean, DEFAULT_MAX_LEAN), MIN_MAX_LEAN, MAX_MAX_LEAN),
    tiltSmoothing: clamp(
      readOption(options.getTiltSmoothing, DEFAULT_TILT_SMOOTHING),
      MIN_TILT_SMOOTHING,
      MAX_TILT_SMOOTHING,
    ),
    lookMode,
    focusColorId: readFocusColorId(options.getFocusColorId),
    activeColorIds: readActiveColorIds(options.getActiveColorIds),
    focusEffectsEnabled: readBooleanOption(
      options.getFocusEffectsEnabled,
      DEFAULT_FOCUS_EFFECTS_ENABLED,
    ),
    catMotionEnabled: readBooleanOption(
      options.getCatMotionEnabled,
      DEFAULT_CAT_MOTION_ENABLED,
    ),
    catActive: readBooleanOption(options.getCatActive, DEFAULT_CAT_ACTIVE),
    catPatiencePercent: clamp(
      readOption(options.getCatPatiencePercent, DEFAULT_CAT_PATIENCE_PERCENT),
      0,
      100,
    ),
    catForceUfoExit: readBooleanOption(
      options.getCatForceUfoExit,
      DEFAULT_CAT_FORCE_UFO_EXIT,
    ),
    facesFollowPointer: lookMode === LOOK_MODE_CURSOR,
  };
}

function createFace(radius) {
  const face = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: FACE_COLOR, roughness: 0.5 });
  const z = radius + 0.01;

  const eyeGeometry = new THREE.CircleGeometry(radius * 0.12, 24);
  const leftEye = new THREE.Mesh(eyeGeometry, material);
  leftEye.position.set(-radius * 0.3, radius * 0.25, z);
  const rightEye = new THREE.Mesh(eyeGeometry, material);
  rightEye.position.set(radius * 0.3, radius * 0.25, z);

  // A half-torus rotated 180° turns the arch (∩) into a smile (∪).
  const mouthGeometry = new THREE.TorusGeometry(radius * 0.3, radius * 0.05, 12, 24, Math.PI);
  const mouth = new THREE.Mesh(mouthGeometry, material);
  mouth.position.set(0, -radius * 0.05, z);
  mouth.rotation.z = Math.PI;

  face.add(leftEye, rightEye, mouth);
  return face;
}

function createBall(colorOption) {
  const root = new THREE.Group();
  const lookGroup = new THREE.Group();
  const focusFrontLight = new THREE.PointLight(0xfff1c7, 0, DEFAULT_BALL_RADIUS * 5.5, 1.7);
  focusFrontLight.position.set(0, 0, DEFAULT_BALL_RADIUS * 3.2);
  root.add(lookGroup);
  root.add(focusFrontLight);

  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: colorOption.value,
    emissive: colorOption.value,
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0.05,
  });

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULT_BALL_RADIUS, 48, 32),
    sphereMaterial,
  );
  lookGroup.add(sphere);
  lookGroup.add(createFace(DEFAULT_BALL_RADIUS));

  return {
    colorId: colorOption.id,
    type: 'ball',
    baseRadius: DEFAULT_BALL_RADIUS,
    root,
    lookGroup,
    focusFrontLight,
    focusFrontLightIntensity: 0,
    focusMaterialEmissiveIntensity: 0,
    focusVisualScale: 1,
    sphereMaterial,
    state: { x: 0, y: 0, vx: 0, vy: 0, radius: DEFAULT_BALL_RADIUS },
  };
}

function createCatPlaceholder(material) {
  const placeholder = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), material);
  body.scale.set(1.35, 0.48, 0.42);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 12), material);
  head.position.set(0, 0.18, 0.52);

  const earGeometry = new THREE.ConeGeometry(0.09, 0.18, 3);
  const leftEar = new THREE.Mesh(earGeometry, material);
  leftEar.position.set(-0.14, 0.4, 0.52);
  leftEar.rotation.z = 0.2;
  const rightEar = new THREE.Mesh(earGeometry, material);
  rightEar.position.set(0.14, 0.4, 0.52);
  rightEar.rotation.z = -0.2;

  placeholder.add(body, head, leftEar, rightEar);
  return placeholder;
}

function createCatUfo(shouldSkipAttach) {
  const group = new THREE.Group();
  const modelAnchor = new THREE.Group();
  const fallbackModel = new THREE.Group();
  group.visible = false;

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8f5ff,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.78, 2.25, 32, 1, true),
    beamMaterial,
  );
  beam.visible = false;
  beam.position.y = -0.95;

  const saucerMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7d7d7,
    emissive: 0x2f3b46,
    emissiveIntensity: 0.24,
    metalness: 0.55,
    roughness: 0.28,
  });
  const saucer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.78, 0.12, 40),
    saucerMaterial,
  );

  const domeMaterial = new THREE.MeshStandardMaterial({
    color: 0xcff8ff,
    emissive: 0x66d9ff,
    emissiveIntensity: 0.32,
    roughness: 0.18,
    metalness: 0.12,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 14), domeMaterial);
  dome.scale.y = 0.42;
  dome.position.y = 0.1;

  fallbackModel.add(saucer, dome);
  modelAnchor.add(fallbackModel);
  group.add(beam, modelAnchor);

  loadUfoModel(modelAnchor, fallbackModel, shouldSkipAttach).catch((error) => {
    console.warn('Could not load UFO model asset', error);
  });

  return { group, beam, beamMaterial };
}

function normalizeUfoModel(object) {
  const ufoModel = new THREE.Group();
  ufoModel.add(object);

  ufoModel.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(ufoModel);
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  ufoModel.scale.setScalar(UFO_MODEL_TARGET_SIZE / maxSize);

  ufoModel.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(ufoModel);
  const center = scaledBox.getCenter(new THREE.Vector3());
  ufoModel.position.sub(center);

  return ufoModel;
}

function brightenUfoModel(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material.emissive && material.color) {
        material.emissive.copy(material.color);
        material.emissiveIntensity = 0.12;
      }
      material.needsUpdate = true;
    });
  });
}

async function loadUfoModel(modelAnchor, fallbackModel, shouldSkipAttach) {
  const materials = await new MTLLoader()
    .setPath(UFO_MODEL_BASE_URL)
    .loadAsync(UFO_MATERIAL_FILE);
  materials.preload();

  const object = await new OBJLoader()
    .setMaterials(materials)
    .setPath(UFO_MODEL_BASE_URL)
    .loadAsync(UFO_MODEL_FILE);

  if (shouldSkipAttach()) {
    return;
  }

  brightenUfoModel(object);
  fallbackModel.visible = false;
  modelAnchor.add(normalizeUfoModel(object));
}

function normalizeCatModel(object) {
  const catModel = new THREE.Group();
  // This OBJ is Z-up. Rotate it into Three.js's Y-up world before measuring.
  catModel.rotation.x = -Math.PI / 2;
  catModel.add(object);

  catModel.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(catModel);
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  catModel.scale.setScalar(CAT_MODEL_TARGET_SIZE / maxSize);

  catModel.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(catModel);
  const center = scaledBox.getCenter(new THREE.Vector3());
  catModel.position.sub(center);

  return catModel;
}

function brightenCatModel(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material.emissive) {
        return;
      }

      // Emit the model's own diffuse colour/texture so the cat glows enough to
      // stay visible on black even when it drifts away from the key light.
      if (material.color) {
        material.emissive.copy(material.color);
      } else {
        material.emissive.setHex(0xffffff);
      }
      material.emissiveMap = material.map ?? null;
      material.emissiveIntensity = CAT_MODEL_EMISSIVE_INTENSITY;
      material.needsUpdate = true;
    });
  });
}

async function loadCatModel(modelAnchor, placeholder, shouldSkipAttach) {
  const materials = await new MTLLoader()
    .setPath(CAT_MODEL_BASE_URL)
    .loadAsync(CAT_MATERIAL_FILE);
  materials.preload();

  const object = await new OBJLoader()
    .setMaterials(materials)
    .setPath(CAT_MODEL_BASE_URL)
    .loadAsync(CAT_MODEL_FILE);

  if (shouldSkipAttach()) {
    return;
  }

  brightenCatModel(object);
  placeholder.visible = false;
  modelAnchor.add(normalizeCatModel(object));
}

function createCatObject(shouldSkipAttach) {
  const root = new THREE.Group();
  const lookGroup = new THREE.Group();
  const modelAnchor = new THREE.Group();
  const focusFrontLight = new THREE.PointLight(
    0xfff1c7,
    CAT_BASE_FRONT_LIGHT_INTENSITY,
    DEFAULT_CAT_RADIUS * 5.5,
    1.7,
  );
  const ufo = createCatUfo(shouldSkipAttach);
  focusFrontLight.position.set(0, 0, DEFAULT_CAT_RADIUS * 3.2);
  root.add(lookGroup);
  root.add(focusFrontLight);
  root.add(ufo.group);
  lookGroup.add(modelAnchor);

  const placeholderMaterial = new THREE.MeshStandardMaterial({
    color: 0xb88a5a,
    emissive: 0xb88a5a,
    emissiveIntensity: CAT_BASE_MATERIAL_EMISSIVE_INTENSITY,
    roughness: 0.65,
  });
  const placeholder = createCatPlaceholder(placeholderMaterial);
  modelAnchor.add(placeholder);

  loadCatModel(modelAnchor, placeholder, shouldSkipAttach).catch((error) => {
    console.warn('Could not load cat model asset', error);
  });

  return {
    colorId: CAT_OBJECT_ID,
    type: CAT_OBJECT_ID,
    baseRadius: DEFAULT_CAT_RADIUS,
    root,
    lookGroup,
    modelAnchor,
    ufoGroup: ufo.group,
    ufoBeam: ufo.beam,
    ufoBeamMaterial: ufo.beamMaterial,
    ufoFocusTarget: {
      colorId: 'ufo',
      type: 'ufo',
      state: { x: 0, y: 0, radius: DEFAULT_CAT_RADIUS },
    },
    focusFrontLight,
    focusFrontLightIntensity: CAT_BASE_FRONT_LIGHT_INTENSITY,
    focusMaterialEmissiveIntensity: CAT_BASE_MATERIAL_EMISSIVE_INTENSITY,
    baseFocusFrontLightIntensity: CAT_BASE_FRONT_LIGHT_INTENSITY,
    baseFocusMaterialEmissiveIntensity: CAT_BASE_MATERIAL_EMISSIVE_INTENSITY,
    focusVisualScale: 1,
    sphereMaterial: placeholderMaterial,
    idlePhase: randomBetween(0, Math.PI * 2),
    smoothedTargetYaw: 0,
    state: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: DEFAULT_CAT_RADIUS,
      catBehavior: CAT_BEHAVIOR_WATCHING,
      cornerAwayFrames: 0,
      agitationFrames: 0,
      agitationWindow: [],
      escapeTarget: null,
      lookTargetState: null,
      exitDirection: null,
      exitSpeed: 0,
      exitAnnouncementFramesRemaining: 0,
      exitRouteType: 'side',
      ufoEntryPoint: null,
      ufoHoverPoint: null,
      ufoExitPoint: null,
    },
  };
}

export function createBouncingBallScene(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  // Orthographic projection: spheres stay perfectly round at the screen edges
  // (no perspective stretching) and, because the view is parallel, a face that
  // points +Z reads as looking straight at the viewer from anywhere on screen.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(3, 4, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7aa7ff, 0.7);
  fillLight.position.set(-4, -2, 4);
  scene.add(fillLight);

  const ballsRoot = new THREE.Group();
  scene.add(ballsRoot);
  let destroyed = false;

  const balls = BALL_COLOR_OPTIONS.map((colorOption) => {
    const ball = createBall(colorOption);
    ballsRoot.add(ball.root);
    return ball;
  });
  const catObject = createCatObject(() => destroyed);
  ballsRoot.add(catObject.root);
  const sceneObjects = [...balls, catObject];

  const pointer = { x: 0, y: 0 };
  // Faces start (and return) at their forward pose until the cursor engages.
  let pointerActive = false;
  let bounds = { width: 0, height: 0, speedFactor: 1 };
  let animationFrame = 0;
  const clock = new THREE.Clock();
  let wasCatActive = false;
  let catRunAwayNotified = false;
  let catSpeechBubbleVisible = false;

  // Reused each frame to avoid per-frame allocations.
  const targetQuaternion = new THREE.Quaternion();
  const lookDir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function seedSceneObject(object, settings) {
    applyObjectSize(object, settings.ballRadius);
    const halfWidth = Math.max(0, bounds.width / 2 - object.state.radius);
    const halfHeight = Math.max(0, bounds.height / 2 - object.state.radius);
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(0.025, 0.055);
    object.state.x = randomBetween(-halfWidth, halfWidth);
    object.state.y = randomBetween(-halfHeight, halfHeight);
    object.state.vx = Math.cos(angle) * speed;
    object.state.vy = Math.sin(angle) * speed;
  }

  function resetCatAfterRosterActivation(settings) {
    seedSceneObject(catObject, settings);
    catObject.state.vx = 0;
    catObject.state.vy = 0;
    catObject.state.catBehavior = CAT_BEHAVIOR_WATCHING;
    catObject.state.cornerAwayFrames = 0;
    catObject.state.agitationFrames = 0;
    catObject.state.agitationWindow = [];
    catObject.state.escapeTarget = null;
    catObject.state.lookTargetState = null;
    catObject.state.exitDirection = null;
    catObject.state.exitSpeed = 0;
    catObject.state.exitAnnouncementFramesRemaining = 0;
    catObject.state.exitRouteType = 'side';
    catObject.state.ufoEntryPoint = null;
    catObject.state.ufoHoverPoint = null;
    catObject.state.ufoExitPoint = null;
    catObject.smoothedTargetYaw = 0;
    catObject.ufoGroup.visible = false;
    catObject.ufoBeam.visible = false;
    catObject.modelAnchor.scale.setScalar(1);
    catRunAwayNotified = false;
    hideCatSpeechBubble();
  }

  function seedObjectPositions() {
    const settings = resolveSceneSettings(options);
    sceneObjects.forEach((object) => {
      seedSceneObject(object, settings);
    });
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(Math.floor(width * pixelRatio), Math.floor(height * pixelRatio), false);

    const aspect = width / height || 1;
    const halfHeight = VIEW_HEIGHT / 2;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();

    // With an orthographic camera the frustum *is* the visible area, so the
    // bounds match the window edges exactly.
    bounds = { ...bounds, width: VIEW_HEIGHT * aspect, height: VIEW_HEIGHT };
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const normalizedPointer = normalizePointer(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    pointer.x = normalizedPointer.x;
    pointer.y = normalizedPointer.y;
    pointerActive = true;
    return normalizedPointer;
  }

  function updatePointer(event) {
    updatePointerFromEvent(event);
  }

  function handlePointerLeave() {
    pointerActive = false;
  }

  function handleClick(event) {
    const settings = resolveSceneSettings(options);
    const activeObjects = getActiveSceneObjects(balls, catObject, settings);
    const normalizedPointer = updatePointerFromEvent(event);
    const point = getPointerWorldPosition(normalizedPointer, bounds);
    const colorId = getHitBallColorId(point, activeObjects);

    if (colorId) {
      options.onLookTargetChange?.({ lookMode: LOOK_MODE_FOCUS, focusColorId: colorId });
      return;
    }

    options.onLookTargetChange?.({ lookMode: LOOK_MODE_CURSOR });
  }

  function applyObjectSize(object, ballRadius) {
    const scale = ballRadius / DEFAULT_BALL_RADIUS;
    object.state.radius = object.baseRadius * scale;
    object.lookGroup.scale.setScalar(scale);
    object.focusFrontLight.position.z = object.state.radius * 3.2;
    object.focusFrontLight.distance = object.state.radius * 5.5;
  }

  function applyFocusEffect(ball, settings, focusTarget) {
    const target = resolveFocusEffectState(ball, focusTarget, settings);
    ball.focusFrontLightIntensity += (
      target.frontLightIntensity - ball.focusFrontLightIntensity
    ) * FOCUS_EFFECT_SMOOTHING;
    ball.focusMaterialEmissiveIntensity += (
      target.materialEmissiveIntensity - ball.focusMaterialEmissiveIntensity
    ) * FOCUS_EFFECT_SMOOTHING;
    ball.focusVisualScale += (target.visualScale - ball.focusVisualScale) * FOCUS_EFFECT_SMOOTHING;

    ball.focusFrontLight.intensity = ball.focusFrontLightIntensity;
    ball.sphereMaterial.emissiveIntensity = ball.focusMaterialEmissiveIntensity;
    ball.root.scale.setScalar(ball.focusVisualScale);
  }

  function resolveCatSpeechBubblePosition() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height || !bounds.width || !bounds.height) {
      return { x: 0, y: 0 };
    }

    const state = catObject.state;
    const pixelsPerWorldX = width / bounds.width;
    const pixelsPerWorldY = height / bounds.height;
    const centerX = ((state.x / bounds.width) + 0.5) * width;
    const centerY = (0.5 - (state.y / bounds.height)) * height;
    const inwardX = -(state.exitDirection?.x ?? 1);
    const bubbleX = centerX + inwardX * state.radius * pixelsPerWorldX * 0.55;
    const bubbleY = centerY - state.radius * pixelsPerWorldY * 0.8;

    return {
      x: clamp(bubbleX, 84, Math.max(84, width - 84)),
      y: clamp(bubbleY, 42, Math.max(42, height - 92)),
    };
  }

  function hideCatSpeechBubble() {
    if (!catSpeechBubbleVisible) {
      return;
    }

    catSpeechBubbleVisible = false;
    options.onCatSpeechBubbleChange?.({ visible: false });
  }

  function updateCatSpeechBubble() {
    if (
      !catObject.root.visible
      || catObject.state.catBehavior !== CAT_BEHAVIOR_ANNOUNCING
    ) {
      hideCatSpeechBubble();
      return;
    }

    catSpeechBubbleVisible = true;
    options.onCatSpeechBubbleChange?.({
      visible: true,
      ...resolveCatSpeechBubblePosition(),
    });
  }

  function orientFace(ball, settings, focusTarget) {
    if (focusTarget && ball !== focusTarget) {
      const look = getLookDirectionToPoint(focusTarget.state, ball.state, {
        maxLean: settings.maxLean,
        range: settings.lookRange,
        innerRange: settings.innerLookRange,
      });
      lookDir.set(look.x, look.y, look.z);
    } else if (settings.lookMode === LOOK_MODE_CURSOR && pointerActive) {
      const look = getLookDirection(pointer, ball.state, bounds, {
        maxLean: settings.maxLean,
        range: settings.lookRange,
        innerRange: settings.innerLookRange,
      });
      lookDir.set(look.x, look.y, look.z);
    } else {
      lookDir.set(0, 0, 1);
    }

    // Orient the face so its +Z points along lookDir while staying upright
    // (local up tracks world up). Unlike a minimal swing, this introduces no
    // roll as the look direction sweeps around, so the smile never twirls.
    right.crossVectors(WORLD_UP, lookDir).normalize();
    up.crossVectors(lookDir, right);
    basis.makeBasis(right, up, lookDir);
    targetQuaternion.setFromRotationMatrix(basis);
    ball.lookGroup.quaternion.slerp(targetQuaternion, settings.tiltSmoothing);
  }

  function setModelOpacity(modelAnchor, opacity) {
    modelAnchor.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.opacity = opacity;
        material.transparent = opacity < 1;
        material.needsUpdate = true;
      });
    });
  }

  function animateSceneObject(object, elapsedSeconds, settings) {
    if (object.type !== CAT_OBJECT_ID) {
      return;
    }

    const targetYaw = resolveCatTargetYaw(object, settings, {
      bounds,
    });
    const yawSmoothing = isCatExitSequenceActive(object.state)
      ? CAT_EXIT_TARGET_YAW_SMOOTHING
      : CAT_TARGET_YAW_SMOOTHING;
    object.smoothedTargetYaw = resolveCatSmoothedYaw(
      object.smoothedTargetYaw,
      targetYaw,
      yawSmoothing,
    );
    const transform = resolveCatIdleTransform(
      object,
      elapsedSeconds,
      settings,
      object.smoothedTargetYaw,
    );
    const ufoVisualState = resolveCatUfoVisualState(object.state);
    object.modelAnchor.position.y = transform.bobY + ufoVisualState.catLiftY;
    object.modelAnchor.rotation.y = transform.rotationY;
    object.modelAnchor.rotation.z = transform.rotationZ;
    object.modelAnchor.scale.setScalar(ufoVisualState.catScale);
    setModelOpacity(object.modelAnchor, ufoVisualState.catOpacity);

    if (object.ufoGroup) {
      const hoverBob = ufoVisualState.ufoVisible
        ? Math.sin(elapsedSeconds * 3.4) * 0.035
        : 0;
      object.ufoGroup.visible = ufoVisualState.ufoVisible;
      object.ufoGroup.position.set(
        ufoVisualState.ufoX - object.state.x,
        ufoVisualState.ufoY - object.state.y + hoverBob,
        CAT_UFO_Z_OFFSET,
      );
      object.ufoGroup.rotation.z = ufoVisualState.ufoVisible
        ? Math.sin(elapsedSeconds * 2.2) * 0.035
        : 0;
      object.ufoBeam.visible = ufoVisualState.beamVisible;
      object.ufoBeamMaterial.opacity = ufoVisualState.beamVisible
        ? ufoVisualState.beamOpacity + Math.sin(elapsedSeconds * 8) * 0.05
        : 0;
      if (object.ufoFocusTarget) {
        object.ufoFocusTarget.state.x = ufoVisualState.ufoX;
        object.ufoFocusTarget.state.y = ufoVisualState.ufoY;
        object.ufoFocusTarget.state.radius = object.state.radius;
      }
    }
  }

  function advanceCatExitSequenceAfterAnimation(settings) {
    if (!isCatExitSequenceActive(catObject.state)) {
      return;
    }

    const smoothedYaw = settings.catMotionEnabled
      ? catObject.smoothedTargetYaw
      : resolveCatInwardExitYaw(catObject.state);
    catObject.state = resolveCatExitSequenceState(catObject.state, smoothedYaw);
  }

  function render() {
    const settings = resolveSceneSettings(options);
    const activeBalls = getActiveBalls(balls, settings);
    const catActive = settings.catActive !== false;
    if (catActive && !wasCatActive) {
      resetCatAfterRosterActivation(settings);
    }
    wasCatActive = catActive;

    const activeObjects = getActiveSceneObjects(balls, catObject, settings);
    const elapsedSeconds = clock.getElapsedTime();
    bounds.speedFactor = settings.speedFactor;

    sceneObjects.forEach((object) => {
      object.root.visible = activeObjects.includes(object);
      applyObjectSize(object, settings.ballRadius);
    });
    if (catActive) {
      catObject.state = resolveCatAvoidanceState(catObject, activeBalls, {
        bounds,
        catPatiencePercent: settings.catPatiencePercent,
        forceUfoExit: settings.catForceUfoExit,
      });
    }
    const catExitSequenceActive = catActive && isCatExitSequenceActive(catObject.state);

    // 1) Integrate motion and bounce off the viewport walls.
    activeObjects.forEach((object) => {
      if (object.type === CAT_OBJECT_ID && object.state.catBehavior === CAT_BEHAVIOR_LEAVING) {
        object.state = stepCatRunAwayState(object.state, {
          speedFactor: settings.speedFactor,
        });
        return;
      }

      if (catExitSequenceActive) {
        return;
      }

      object.state = stepBall(object.state, {
        width: bounds.width,
        height: bounds.height,
        radius: object.state.radius,
        speedFactor: settings.speedFactor,
      });
    });

    // 2) Bounce balls off each other. The cat is kinematic relative to balls so
    // it can flee without stealing or injecting ball velocity.
    if (!catExitSequenceActive) {
      resolveSceneObjectCollisions(activeObjects);
    }

    // 3) Keep everything inside the walls (a collision can nudge a ball out),
    //    then place each ball before resolving focus targets.
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    activeObjects.forEach((object) => {
      const { radius } = object.state;
      if (object.type === CAT_OBJECT_ID && isCatUfoSequenceActive(object.state)) {
        object.state.x = clamp(object.state.x, -halfWidth + radius, halfWidth - radius);
        object.state.y = clamp(object.state.y, -halfHeight + radius, halfHeight - radius);
        object.root.position.set(object.state.x, object.state.y, 0);
        if (
          !catRunAwayNotified
          && object.state.catBehavior === CAT_BEHAVIOR_UFO_LEAVING
          && object.state.exitAnnouncementFramesRemaining <= 0
        ) {
          catRunAwayNotified = true;
          options.onCatRunAway?.();
        }
        return;
      }

      if (object.type === CAT_OBJECT_ID && object.state.catBehavior === CAT_BEHAVIOR_LEAVING) {
        object.root.position.set(object.state.x, object.state.y, 0);
        if (!catRunAwayNotified && isCatOutsideScene(object.state, bounds)) {
          catRunAwayNotified = true;
          hideCatSpeechBubble();
          options.onCatRunAway?.();
        }
        return;
      }

      object.state.x = clamp(object.state.x, -halfWidth + radius, halfWidth - radius);
      object.state.y = clamp(object.state.y, -halfHeight + radius, halfHeight - radius);
      object.root.position.set(object.state.x, object.state.y, 0);
    });

    const focusTarget = resolveSceneFocusTarget(activeObjects, settings, {
      catExitSequenceActive,
      catObject,
    });
    sceneObjects.forEach((object) => {
      if (!catExitSequenceActive || object.type === CAT_OBJECT_ID) {
        applyFocusEffect(object, settings, focusTarget);
      }
      if (object.root.visible) {
        if (shouldOrientObject(object)) {
          orientFace(object, settings, focusTarget);
        }
        animateSceneObject(object, elapsedSeconds, settings);
      }
    });
    if (catActive) {
      advanceCatExitSequenceAfterAnimation(settings);
    }
    updateCatSpeechBubble();

    renderer.render(scene, camera);
    if (!destroyed) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('click', handleClick);
  resize();
  seedObjectPositions();
  render();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      hideCatSpeechBubble();
      ballsRoot.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          object.material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
