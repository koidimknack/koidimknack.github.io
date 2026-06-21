import * as THREE from 'three';
import {
  clamp,
  getLookDirection,
  normalizePointer,
  resolveCircleCollision,
  stepBall,
} from './ballMotion.js';

const BALL_RADIUS = 0.7;
const TILT_SMOOTHING = 0.2;
// World distance within which a face reacts to the cursor; beyond it (or when the
// pointer leaves the scene) the face rests at its forward (initial) orientation.
const LOOK_RANGE = 3;
const MAX_LEAN = 0.6;

const BALL_COLORS = [0xffdf2e, 0xff6b6b, 0x51cf66, 0x4dabf7, 0xcc5de8];
const FACE_COLOR = 0x1b1b1b;
// The face is drawn on the +Z cap of each sphere; we swing this axis toward the
// cursor with a quaternion (no Euler angles = no gimbal twirl).
const FORWARD = new THREE.Vector3(0, 0, 1);

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
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
    new THREE.SphereGeometry(BALL_RADIUS, 48, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }),
  );
  lookGroup.add(sphere);
  lookGroup.add(createFace(BALL_RADIUS));

  return {
    root,
    lookGroup,
    state: { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS },
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
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 9;

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
  const lookVector = new THREE.Vector3();

  function seedBallPositions() {
    const halfWidth = bounds.width / 2 - BALL_RADIUS;
    const halfHeight = bounds.height / 2 - BALL_RADIUS;
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

    camera.aspect = width / height || 1;
    camera.updateProjectionMatrix();

    // Match the bounds to what the camera actually shows at the ball plane (z=0)
    // so the balls bounce against the real window edges, not an inset margin.
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    bounds = {
      ...bounds,
      width: visibleHeight * camera.aspect,
      height: visibleHeight,
    };
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

  function render() {
    bounds.speedFactor = options.getSpeedFactor?.() ?? 1;

    // 1) Integrate motion and bounce off the viewport walls.
    balls.forEach((ball) => {
      ball.state = stepBall(ball.state, {
        width: bounds.width,
        height: bounds.height,
        radius: ball.state.radius,
        speedFactor: bounds.speedFactor,
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

      if (pointerActive) {
        const look = getLookDirection(pointer, ball.state, bounds, {
          maxLean: MAX_LEAN,
          range: LOOK_RANGE,
        });
        lookVector.set(look.x, look.y, look.z);
        targetQuaternion.setFromUnitVectors(FORWARD, lookVector);
      } else {
        targetQuaternion.identity();
      }
      ball.lookGroup.quaternion.slerp(targetQuaternion, TILT_SMOOTHING);
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
