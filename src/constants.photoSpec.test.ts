import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { RING_HEIGHT, SHIP_HEIGHT, SHIP_RADIUS } from './constants.ts';

const specPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'starship-photo-research.md');

function requiredNumber(spec: string, key: string): number {
  const match = spec.match(new RegExp(`\`${key}:\\s*([0-9.]+)\``));
  assert.ok(match, `missing ${key} in photo spec`);
  const value = Number(match[1]);
  assert.ok(Number.isFinite(value), `non-numeric ${key}`);
  return value;
}

describe('photo-backed Ship dimensions', () => {
  const spec = readFileSync(specPath, 'utf8');

  it('inventory has at least six live image URLs', () => {
    const urls = spec.match(/https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/\S+/g) ?? [];
    assert.ok(urls.length >= 6, `only ${urls.length} commons image URLs`);
  });

  it('shipped constants match the research spec numbers', () => {
    assert.equal(SHIP_RADIUS * 2, requiredNumber(spec, 'diameter_m'));
    assert.equal(RING_HEIGHT, requiredNumber(spec, 'ring_height_m'));
    assert.equal(SHIP_HEIGHT, requiredNumber(spec, 'block2_height_m'));
  });
});
