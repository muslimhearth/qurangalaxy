import { describe, expect, it } from 'vitest';
import { parseTanzil, stripBasmala } from './tanzil';

// Escapes copy Tanzil's exact code points (shadda before the vowel mark).
const ALLAH_RAHMAN_RAHIM =
  'ٱللَّهِ ' +
  'ٱلرَّحْمَٰنِ ' +
  'ٱلرَّحِيمِ';
const BASMALA = `بِسْمِ ${ALLAH_RAHMAN_RAHIM}`;
// Surahs 95 and 97: shadda on the first letter.
const BASMALA_95 = `بِّسْمِ ${ALLAH_RAHMAN_RAHIM}`;

describe('parseTanzil', () => {
  it('reads surah|ayah|text lines and skips comments and blank lines', () => {
    const text = `1|1|${BASMALA}\n1|2|ٱلْحَمْدُ لِلَّهِ\n\n# Tanzil license\n#\n`;
    const verses = parseTanzil(text);
    expect(verses.size).toBe(2);
    expect(verses.get('1:2')).toBe('ٱلْحَمْدُ لِلَّهِ');
  });

  it('keeps a | inside the text', () => {
    expect(parseTanzil('2|5|a | b').get('2:5')).toBe('a | b');
  });

  it('throws on a malformed line', () => {
    expect(() => parseTanzil('hello')).toThrow(/line 1/);
  });
});

describe('stripBasmala', () => {
  it('removes the basmala prefix from verse 1', () => {
    expect(stripBasmala('2:1', `${BASMALA} الٓمٓ`)).toBe('الٓمٓ');
  });

  it('removes the variant spelling with shadda (surahs 95, 97)', () => {
    expect(stripBasmala('95:1', `${BASMALA_95} وَٱلتِّينِ`)).toBe('وَٱلتِّينِ');
  });

  it('does not accept the same words with a different diacritic order', () => {
    const swapped = BASMALA.replace('َّ', 'َّ');
    expect(() => stripBasmala('2:1', `${swapped} الٓمٓ`)).toThrow(/2:1/);
  });

  it('keeps 1:1, surah 9 and every other verse as is', () => {
    expect(stripBasmala('1:1', BASMALA)).toBe(BASMALA);
    expect(stripBasmala('9:1', 'بَرَآءَةٌ مِّنَ')).toBe('بَرَآءَةٌ مِّنَ');
    expect(stripBasmala('27:30', `إِنَّهُۥ ${BASMALA}`)).toBe(`إِنَّهُۥ ${BASMALA}`);
  });

  it('throws when verse 1 of a surah lacks the basmala', () => {
    expect(() => stripBasmala('3:1', 'الٓمٓ')).toThrow(/3:1/);
  });
});
