import { describe, expect, it } from 'vitest';
import { glossSupport, supportShare, verseStems } from './support';

const verses = ['And the lights of the sky', 'They disbelieved in the signs', 'A light upon light'].map(verseStems);

describe('glossSupport', () => {
  it('counts verses that use every content word of a gloss, by stem', () => {
    expect(glossSupport('light', verses)).toBe(2);
    expect(glossSupport('to disbelieve', verses)).toBe(1);
    expect(glossSupport('common cold', verses)).toBe(0);
    expect(glossSupport('to', verses)).toBe(0);
  });
});

describe('supportShare', () => {
  it('gives the share of verses that use any of the glosses', () => {
    expect(supportShare(['light', 'sign'], verses)).toBe(1);
    expect(supportShare(['pitch', 'tar'], verses)).toBe(0);
    expect(supportShare([], verses)).toBe(0);
  });
});
