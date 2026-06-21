import { clamp } from './ballMotion.js';

const IMAGE_FILES = ['blue.png', 'red.png', 'yellow.png', 'green.png'];
// Only the green face links somewhere for now; the others are decorative.
const IMAGE_LINKS = [null, null, null, 'https://sebastianratzenboeck.github.io/'];
const DEFAULT_SPRITE_SIZE = 80;
const MIN_SPRITE_SIZE = 40;
const MAX_SPRITE_SIZE = 160;
const MAX_SPEED_FACTOR = 4;
const MIN_AXIS_COMPONENT = 0.3;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function readOption(getter, fallback) {
  const value = getter?.();
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function resolveSpriteSettings(options = {}) {
  return {
    speedFactor: clamp(readOption(options.getSpeedFactor, 1), 0, MAX_SPEED_FACTOR),
    spriteSize: clamp(readOption(options.getSpriteSize, DEFAULT_SPRITE_SIZE), MIN_SPRITE_SIZE, MAX_SPRITE_SIZE),
  };
}

function collides(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function resolveCollision(a, b) {
  const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
  const overlapY = Math.min(a.y + a.height - b.y, b.y + b.height - a.y);

  const speed = a.baseSpeed;
  a.baseSpeed = b.baseSpeed;
  b.baseSpeed = speed;

  // Separate along the axis of least penetration and swap velocity on that axis.
  if (overlapX < overlapY) {
    const direction = a.x < b.x ? -1 : 1;
    a.x += (direction * overlapX) / 2;
    b.x -= (direction * overlapX) / 2;
    const dx = a.dx;
    a.dx = b.dx;
    b.dx = dx;
  } else {
    const direction = a.y < b.y ? -1 : 1;
    a.y += (direction * overlapY) / 2;
    b.y -= (direction * overlapY) / 2;
    const dy = a.dy;
    a.dy = b.dy;
    b.dy = dy;
  }
}

export function createBouncingSpritesScene(canvas, options = {}) {
  const ctx = canvas.getContext('2d');

  const images = IMAGE_FILES.map((fileName) => {
    const img = new Image();
    img.src = `/images/${fileName}`;
    return img;
  });

  const sprites = IMAGE_FILES.map((_, index) => ({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    baseSpeed: 5,
    width: DEFAULT_SPRITE_SIZE,
    height: DEFAULT_SPRITE_SIZE,
    imageIndex: index,
    url: IMAGE_LINKS[index] || null,
  }));

  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let destroyed = false;

  function applySpriteSize(sprite, spriteSize) {
    const centerX = sprite.x + sprite.width / 2;
    const centerY = sprite.y + sprite.height / 2;
    sprite.width = spriteSize;
    sprite.height = spriteSize;
    sprite.x = clamp(centerX - sprite.width / 2, 0, Math.max(0, width - sprite.width));
    sprite.y = clamp(centerY - sprite.height / 2, 0, Math.max(0, height - sprite.height));
  }

  function randomizeSprite(sprite) {
    const { spriteSize } = resolveSpriteSettings(options);
    sprite.width = spriteSize;
    sprite.height = spriteSize;
    sprite.x = randomBetween(0, Math.max(0, width - sprite.width));
    sprite.y = randomBetween(0, Math.max(0, height - sprite.height));
    sprite.baseSpeed = randomBetween(2.5, 10);

    const angle = randomBetween(0, Math.PI * 2);
    sprite.dx = Math.cos(angle);
    sprite.dy = Math.sin(angle);
    // Avoid near-horizontal / near-vertical drifts that look static.
    if (Math.abs(sprite.dx) < MIN_AXIS_COMPONENT) {
      sprite.dx = Math.sign(sprite.dx || 1) * MIN_AXIS_COMPONENT;
    }
    if (Math.abs(sprite.dy) < MIN_AXIS_COMPONENT) {
      sprite.dy = Math.sign(sprite.dy || 1) * MIN_AXIS_COMPONENT;
    }
    const length = Math.hypot(sprite.dx, sprite.dy);
    sprite.dx /= length;
    sprite.dy /= length;
  }

  function resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    // Draw using CSS pixels regardless of the device pixel ratio.
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function update() {
    const settings = resolveSpriteSettings(options);

    sprites.forEach((sprite) => {
      applySpriteSize(sprite, settings.spriteSize);
      sprite.x += sprite.dx * sprite.baseSpeed * settings.speedFactor;
      sprite.y += sprite.dy * sprite.baseSpeed * settings.speedFactor;

      if (sprite.x + sprite.width > width) {
        sprite.x = width - sprite.width;
        sprite.dx *= -1;
      } else if (sprite.x < 0) {
        sprite.x = 0;
        sprite.dx *= -1;
      }

      if (sprite.y + sprite.height > height) {
        sprite.y = height - sprite.height;
        sprite.dy *= -1;
      } else if (sprite.y < 0) {
        sprite.y = 0;
        sprite.dy *= -1;
      }
    });

    for (let i = 0; i < sprites.length; i += 1) {
      for (let j = i + 1; j < sprites.length; j += 1) {
        if (collides(sprites[i], sprites[j])) {
          resolveCollision(sprites[i], sprites[j]);
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    sprites.forEach((sprite) => {
      const image = images[sprite.imageIndex];
      if (image.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, sprite.x, sprite.y, sprite.width, sprite.height);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
      }
    });
  }

  function loop() {
    update();
    draw();
    if (!destroyed) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const sprite of sprites) {
      if (
        x >= sprite.x &&
        x <= sprite.x + sprite.width &&
        y >= sprite.y &&
        y <= sprite.y + sprite.height
      ) {
        if (sprite.url) {
          window.open(sprite.url, '_blank', 'noopener');
        }
        break;
      }
    }
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('click', handleClick);
  resize();
  sprites.forEach(randomizeSprite);
  loop();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
    },
  };
}
