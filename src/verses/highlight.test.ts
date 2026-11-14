import { describe, expect, it } from 'vitest';
import { markedSnippet } from './highlight';

const text = (segs: { text: string }[]) => segs.map((s) => s.text).join('');
const hits = (segs: { text: string; hit: boolean }[]) => segs.filter((s) => s.hit).map((s) => s.text);

describe('markedSnippet', () => {
  it('marks the words that match the query', () => {
    const segs = markedSnippet('Allah is the Light of the heavens.', 'light heaven', 'en', 200);
    expect(text(segs)).toBe('Allah is the Light of the heavens.');
    expect(hits(segs)).toEqual(['Light', 'heavens']);
  });

  it('does not mark stop words when the query has other words', () => {
    expect(hits(markedSnippet('the Light of the heavens', 'the light', 'en', 200))).toEqual(['Light']);
  });

  it('marks transliteration words inside the plain text', () => {
    expect(hits(markedSnippet('Walillahi ma fee alssamawati', 'samawati', 'tr', 200))).toEqual(['alssamawati']);
  });

  it('cuts long text around the first hit, at word edges', () => {
    const long = `${'word '.repeat(40)}patience ${'more '.repeat(40)}`.trim();
    const segs = markedSnippet(long, 'patience', 'en', 60);
    const out = text(segs);
    expect(out.startsWith('…')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(62);
    expect(hits(segs)).toEqual(['patience']);
    expect(out).toMatch(/^…word( word)* patience( more)*…$/);
  });

  it('cuts from the start when nothing matches', () => {
    const out = text(markedSnippet('one two three four five six', 'zzz', 'en', 12));
    expect(out).toBe('one two…');
  });
});
