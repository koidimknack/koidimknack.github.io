import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const viewsDir = dirname(fileURLToPath(import.meta.url));

function readView(name) {
  return readFileSync(resolve(viewsDir, name), 'utf8');
}

describe('settings drawer chevrons', () => {
  test('2D settings toggle uses the shared SVG chevron', () => {
    const markup = readView('TwoDView.vue');

    expect(markup).toContain('class="scene-drawer-chevron scene-settings-chevron"');
    expect(markup).not.toContain('scene-settings-triangle');
  });
});

describe('3D roster', () => {
  test('includes a cat roster item wired to scene cat visibility', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('class="scene-roster-cat"');
    expect(markup).toContain('src="/images/british-shorthair-cat.png"');
    expect(markup).toContain('getCatActive: () => isRosterItemActive(CAT_OBJECT_ID)');
  });

  test('lists the cat before the ball roster items and sizes the drawer for all items', () => {
    const markup = readView('ThreeDView.vue');
    const styles = readFileSync(resolve(viewsDir, '../assets/scene.css'), 'utf8');

    expect(markup).toContain(`const rosterItems = computed(() => [
  CAT_ROSTER_ITEM,
  ...BALL_COLOR_OPTIONS.map((color) => ({`);
    expect(styles).toContain('--scene-safe-left: env(safe-area-inset-left, 0px);');
    expect(styles).toContain('max-width: min(512px, calc(100vw - 82px - var(--scene-safe-left) - var(--scene-safe-right)));');
  });

  test('deactivates the cat roster item when the scene reports a cat run-away', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('onCatRunAway: () => deactivateRosterItem(CAT_OBJECT_ID)');
    expect(markup).toContain('activeRosterIds.value.filter((activeRosterId) => activeRosterId !== rosterId)');
  });

  test('wires a cat patience slider into the 3D scene settings', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('for="cat-patience-3d"');
    expect(markup).toContain('v-model.number="catPatiencePercent"');
    expect(markup).toContain('getCatPatiencePercent: () => catPatiencePercent.value');
  });

  test('wires an always-UFO cat exit toggle into the 3D scene settings', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('for="cat-force-ufo-exit-3d"');
    expect(markup).toContain('v-model="catForceUfoExit"');
    expect(markup).toContain('getCatForceUfoExit: () => catForceUfoExit.value');
    expect(markup).toContain('catForceUfoExit.value = DEFAULT_CAT_FORCE_UFO_EXIT;');
  });

  test('defaults the 3D focus target to the cat', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('const DEFAULT_FOCUS_COLOR_ID = CAT_OBJECT_ID;');
  });

  test('keeps the 3D view defaults aligned with scene defaults', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('const DEFAULT_SPEED_FACTOR = 1;');
    expect(markup).toContain('const DEFAULT_FOLLOW_RADIUS = 13.5;');
    expect(markup).toContain('const DEFAULT_CAT_PATIENCE_PERCENT = 20;');
  });

  test('renders the cat exit speech bubble from scene callbacks', () => {
    const markup = readView('ThreeDView.vue');
    const styles = readFileSync(resolve(viewsDir, '../assets/scene.css'), 'utf8');

    expect(markup).toContain('class="scene-cat-speech-bubble"');
    expect(markup).toContain('onCatSpeechBubbleChange: setCatSpeechBubble');
    expect(markup).toContain("I'm outta here!");
    expect(styles).toContain('.scene-cat-speech-bubble');
  });

  test('auto-closes the roster drawer after the pointer leaves it', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('const ROSTER_AUTO_CLOSE_DELAY_MS = 5000;');
    expect(markup).toContain('@pointerenter="cancelRosterAutoClose"');
    expect(markup).toContain('@pointerleave="scheduleRosterAutoClose"');
    expect(markup).toContain('@click="toggleRosterOpen"');
    expect(markup).toContain('rosterAutoCloseTimeout = window.setTimeout(() => {');
    expect(markup).toContain('rosterOpen.value = false;');
  });
});

describe('mobile viewport layout', () => {
  test('uses dynamic viewport height and safe-area offsets for mobile Safari chrome', () => {
    const appStyles = readFileSync(resolve(viewsDir, '../App.vue'), 'utf8');
    const sceneStyles = readFileSync(resolve(viewsDir, '../assets/scene.css'), 'utf8');
    const indexMarkup = readFileSync(resolve(viewsDir, '../../index.html'), 'utf8');
    const ballScene = readFileSync(resolve(viewsDir, '../scene/createBouncingBallScene.js'), 'utf8');
    const spriteScene = readFileSync(resolve(viewsDir, '../scene/createBouncingSpritesScene.js'), 'utf8');

    expect(indexMarkup).toContain('viewport-fit=cover');
    expect(appStyles).toContain('height: 100dvh;');
    expect(sceneStyles).toContain('--scene-safe-bottom: env(safe-area-inset-bottom, 0px);');
    expect(sceneStyles).toContain('bottom: calc(16px + var(--scene-safe-bottom));');
    expect(sceneStyles).toContain('right: calc(16px + var(--scene-safe-right));');
    expect(sceneStyles).toContain('max-height: calc(100dvh - 32px - var(--scene-safe-top) - var(--scene-safe-bottom));');
    expect(ballScene).toContain("window.visualViewport?.addEventListener('resize', resize);");
    expect(spriteScene).toContain("window.visualViewport?.addEventListener('resize', resize);");
  });
});
