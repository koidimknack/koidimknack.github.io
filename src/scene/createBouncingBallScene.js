import * as THREE from 'three';
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

const VIEW_HEIGHT = 8; // world units shown vertically (orthographic frustum)
const DEFAULT_BALL_RADIUS = 0.5;
const DEFAULT_TILT_SMOOTHING = 0.18;
const DEFAULT_LOOK_RANGE = 12.5;
const DEFAULT_MAX_LEAN = degreesToRadians(55);
const DEFAULT_FOCUS_EFFECTS_ENABLED = true;
const FOCUS_EFFECT_SMOOTHING = 0.12;
const FOCUS_FRONT_LIGHT_INTENSITY = 0.58;
const FOCUS_MATERIAL_EMISSIVE_INTENSITY = 0.18;
const FOCUS_VISUAL_SCALE = 1.15;
const LOOK_MODE_NONE = 'none';
const MAX_LOOK_RANGE = 20;
const MAX_SPEED_FACTOR = 4;
const MIN_BALL_RADIUS = 0.25;
const MAX_BALL_RADIUS = 1.35;
const MIN_TILT_SMOOTHING = 0.02;
const MAX_TILT_SMOOTHING = 1;
const MIN_MAX_LEAN = degreesToRadians(10);
const MAX_MAX_LEAN = degreesToRadians(60);

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
  return BALL_COLOR_OPTIONS.some((color) => color.id === colorId)
    ? colorId
    : BALL_COLOR_OPTIONS[0].id;
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

  return activeColorIds.length > 0 ? activeColorIds : [BALL_COLOR_IDS[0]];
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

export function resolveFocusEffectState(ball, focusBall, settings) {
  const isFocused = settings.lookMode === LOOK_MODE_FOCUS
    && settings.focusEffectsEnabled
    && ball === focusBall;

  return {
    frontLightIntensity: isFocused ? FOCUS_FRONT_LIGHT_INTENSITY : 0,
    materialEmissiveIntensity: isFocused ? FOCUS_MATERIAL_EMISSIVE_INTENSITY : 0,
    visualScale: isFocused ? FOCUS_VISUAL_SCALE : 1,
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
    speedFactor: clamp(readOption(options.getSpeedFactor, 1), 0, MAX_SPEED_FACTOR),
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

  const balls = BALL_COLOR_OPTIONS.map((colorOption) => {
    const ball = createBall(colorOption);
    ballsRoot.add(ball.root);
    return ball;
  });

  const pointer = { x: 0, y: 0 };
  // Faces start (and return) at their forward pose until the cursor engages.
  let pointerActive = false;
  let bounds = { width: 0, height: 0, speedFactor: 1 };
  let animationFrame = 0;
  let destroyed = false;

  // Reused each frame to avoid per-frame allocations.
  const targetQuaternion = new THREE.Quaternion();
  const lookDir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function seedBallPositions() {
    const { ballRadius } = resolveSceneSettings(options);
    const halfWidth = Math.max(0, bounds.width / 2 - ballRadius);
    const halfHeight = Math.max(0, bounds.height / 2 - ballRadius);
    balls.forEach((ball) => {
      ball.state.x = randomBetween(-halfWidth, halfWidth);
      ball.state.y = randomBetween(-halfHeight, halfHeight);
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.025, 0.055);
      ball.state.vx = Math.cos(angle) * speed;
      ball.state.vy = Math.sin(angle) * speed;
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
    const activeBalls = getActiveBalls(balls, settings);
    const normalizedPointer = updatePointerFromEvent(event);
    const point = getPointerWorldPosition(normalizedPointer, bounds);
    const colorId = getHitBallColorId(point, activeBalls);

    if (colorId) {
      options.onLookTargetChange?.({ lookMode: LOOK_MODE_FOCUS, focusColorId: colorId });
      return;
    }

    options.onLookTargetChange?.({ lookMode: LOOK_MODE_CURSOR });
  }

  function applyBallSize(ball, ballRadius) {
    ball.state.radius = ballRadius;
    ball.lookGroup.scale.setScalar(ballRadius / DEFAULT_BALL_RADIUS);
    ball.focusFrontLight.position.z = ballRadius * 3.2;
    ball.focusFrontLight.distance = ballRadius * 5.5;
  }

  function getFocusBall(settings, activeBalls) {
    return activeBalls.find((ball) => ball.colorId === settings.focusColorId) ?? null;
  }

  function applyFocusEffect(ball, settings, focusBall) {
    const target = resolveFocusEffectState(ball, focusBall, settings);
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

  function orientFace(ball, settings, focusBall) {
    if (settings.lookMode === LOOK_MODE_CURSOR && pointerActive) {
      const look = getLookDirection(pointer, ball.state, bounds, {
        maxLean: settings.maxLean,
        range: settings.lookRange,
        innerRange: settings.innerLookRange,
      });
      lookDir.set(look.x, look.y, look.z);
    } else if (settings.lookMode === LOOK_MODE_FOCUS && focusBall && ball !== focusBall) {
      const look = getLookDirectionToPoint(focusBall.state, ball.state, {
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

  function render() {
    const settings = resolveSceneSettings(options);
    const activeBalls = getActiveBalls(balls, settings);
    bounds.speedFactor = settings.speedFactor;

    balls.forEach((ball) => {
      ball.root.visible = activeBalls.includes(ball);
      applyBallSize(ball, settings.ballRadius);
    });

    // 1) Integrate motion and bounce off the viewport walls.
    activeBalls.forEach((ball) => {
      ball.state = stepBall(ball.state, {
        width: bounds.width,
        height: bounds.height,
        radius: ball.state.radius,
        speedFactor: settings.speedFactor,
      });
    });

    // 2) Bounce the balls off each other.
    for (let i = 0; i < activeBalls.length; i += 1) {
      for (let j = i + 1; j < activeBalls.length; j += 1) {
        resolveCircleCollision(activeBalls[i].state, activeBalls[j].state);
      }
    }

    // 3) Keep everything inside the walls (a collision can nudge a ball out),
    //    then place each ball before resolving focus targets.
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    activeBalls.forEach((ball) => {
      const { radius } = ball.state;
      ball.state.x = clamp(ball.state.x, -halfWidth + radius, halfWidth - radius);
      ball.state.y = clamp(ball.state.y, -halfHeight + radius, halfHeight - radius);
      ball.root.position.set(ball.state.x, ball.state.y, 0);
    });

    const focusBall = settings.lookMode === LOOK_MODE_FOCUS ? getFocusBall(settings, activeBalls) : null;
    balls.forEach((ball) => {
      applyFocusEffect(ball, settings, focusBall);
      if (ball.root.visible) {
        orientFace(ball, settings, focusBall);
      }
    });

    renderer.render(scene, camera);
    if (!destroyed) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('click', handleClick);
  resize();
  seedBallPositions();
  render();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
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
