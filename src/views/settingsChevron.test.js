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
