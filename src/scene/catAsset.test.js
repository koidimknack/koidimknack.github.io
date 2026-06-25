import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const catAssetDir = resolve(import.meta.dirname, '../../public/models/cat');
const publicImagesDir = resolve(import.meta.dirname, '../../public/images');

describe('cat model assets', () => {
  test('ships the OBJ, material, and texture files together', () => {
    const objPath = resolve(catAssetDir, '12222_Cat_v1_l3.obj');
    const materialPath = resolve(catAssetDir, '12222_Cat_v1_l3.mtl');
    const diffusePath = resolve(catAssetDir, 'Cat_diffuse.jpg');
    const bumpPath = resolve(catAssetDir, 'Cat_bump.jpg');

    expect(existsSync(objPath)).toBe(true);
    expect(existsSync(materialPath)).toBe(true);
    expect(existsSync(diffusePath)).toBe(true);
    expect(existsSync(bumpPath)).toBe(true);

    expect(readFileSync(objPath, 'utf8')).toContain('mtllib 12222_Cat_v1_l3.mtl');
    expect(readFileSync(materialPath, 'utf8')).toContain('map_Kd Cat_diffuse.jpg');
    expect(readFileSync(materialPath, 'utf8')).toContain('bump Cat_bump.jpg');
  });

  test('ships the cat roster icon', () => {
    expect(existsSync(resolve(publicImagesDir, 'british-shorthair-cat.png'))).toBe(true);
  });
});
