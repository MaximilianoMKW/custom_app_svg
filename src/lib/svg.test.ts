import { describe, expect, it } from 'vitest';
import { extractRegionId } from './svg';

describe('extractRegionId', () => {
  it('extrai por id', () => {
    const element = document.createElement('div');
    element.id = 'PT-11';

    expect(extractRegionId(element, { selector: 'div', regionIdAttribute: 'id' })).toBe('PT-11');
  });

  it('extrai por data-region', () => {
    const element = document.createElement('div');
    element.setAttribute('data-region', 'PT-13');

    expect(extractRegionId(element, { selector: 'div', regionIdAttribute: 'data-region' })).toBe('PT-13');
  });
});
