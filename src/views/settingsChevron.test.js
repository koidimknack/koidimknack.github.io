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
    expect(styles).toContain('max-width: min(512px, calc(100vw - 82px));');
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

  test('defaults the 3D focus target to the cat', () => {
    const markup = readView('ThreeDView.vue');

    expect(markup).toContain('const DEFAULT_FOCUS_COLOR_ID = CAT_OBJECT_ID;');
  });

  test('renders the cat exit speech bubble from scene callbacks', () => {
    const markup = readView('ThreeDView.vue');
    const styles = readFileSync(resolve(viewsDir, '../assets/scene.css'), 'utf8');

    expect(markup).toContain('class="scene-cat-speech-bubble"');
    expect(markup).toContain('onCatSpeechBubbleChange: setCatSpeechBubble');
    expect(markup).toContain("I'm outta hear!");
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
