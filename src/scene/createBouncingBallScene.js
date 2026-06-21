import * as THREE from 'three';
import {
  clamp,
  getLookDirection,
  normalizePointer,
  resolveCircleCollision,
  stepBall,
} from './ballMotion.js';

const VIEW_HEIGHT = 8; // world units shown vertically (orthographic frustum)
const DEFAULT_BALL_RADIUS = 0.5;
const DEFAULT_TILT_SMOOTHING = 0.18;
const DEFAULT_LOOK_RANGE = 10;
const DEFAULT_MAX_LEAN = degreesToRadians(55);
const MAX_LOOK_RANGE = 20;
const MAX_SPEED_FACTOR = 4;
const MIN_BALL_RADIUS = 0.25;
const MAX_BALL_RADIUS = 1.35;
const MIN_TILT_SMOOTHING = 0.02;
const MAX_TILT_SMOOTHING = 1;
const MIN_MAX_LEAN = degreesToRadians(10);
const MAX_MAX_LEAN = degreesToRadians(60);

const BALL_COLORS = [0xffdf2e, 0xff6b6b, 0x51cf66, 0x4dabf7, 0xcc5de8];
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

export function resolveSceneSettings(options = {}) {
  const ballRadius = clamp(
    readOption(options.getBallRadius, DEFAULT_BALL_RADIUS),
    MIN_BALL_RADIUS,
    MAX_BALL_RADIUS,
  );

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
    facesFollowPointer: readBooleanOption(options.getFacesFollowPointer, true),
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

function createBall(color) {
  const root = new THREE.Group();
  const lookGroup = new THREE.Group();
  root.add(lookGroup);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULT_BALL_RADIUS, 48, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }),
  );
  lookGroup.add(sphere);
  lookGroup.add(createFace(DEFAULT_BALL_RADIUS));

  return {
    root,
    lookGroup,
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

  const balls = BALL_COLORS.map((color) => {
    const ball = createBall(color);
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

  function updatePointer(event) {
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
  }

  function handlePointerLeave() {
    pointerActive = false;
  }

  function applyBallSize(ball, ballRadius) {
    ball.state.radius = ballRadius;
    ball.lookGroup.scale.setScalar(ballRadius / DEFAULT_BALL_RADIUS);
  }

  function orientFace(ball, settings) {
    if (pointerActive && settings.facesFollowPointer) {
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

  function render() {
    const settings = resolveSceneSettings(options);
    bounds.speedFactor = settings.speedFactor;

    balls.forEach((ball) => applyBallSize(ball, settings.ballRadius));

    // 1) Integrate motion and bounce off the viewport walls.
    balls.forEach((ball) => {
      ball.state = stepBall(ball.state, {
        width: bounds.width,
        height: bounds.height,
        radius: ball.state.radius,
        speedFactor: settings.speedFactor,
      });
    });

    // 2) Bounce the balls off each other.
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        resolveCircleCollision(balls[i].state, balls[j].state);
      }
    }

    // 3) Keep everything inside the walls (a collision can nudge a ball out),
    //    then place and orient each ball.
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    balls.forEach((ball) => {
      const { radius } = ball.state;
      ball.state.x = clamp(ball.state.x, -halfWidth + radius, halfWidth - radius);
      ball.state.y = clamp(ball.state.y, -halfHeight + radius, halfHeight - radius);
      ball.root.position.set(ball.state.x, ball.state.y, 0);
      orientFace(ball, settings);
    });

    renderer.render(scene, camera);
    if (!destroyed) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', handlePointerLeave);
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
