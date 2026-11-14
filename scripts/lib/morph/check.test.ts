import { describe, expect, it } from 'vitest';
import { matchesTanzil, spellingKey } from './check';

describe('spellingKey', () => {
  it('ignores the hamza spelling differences between Corpus and Tanzil', () => {
    // Corpus ٱلْءَاخِرَةِ, Tanzil ٱلْـَٔاخِرَةِ (tatweel + hamza above).
    expect(spellingKey('ٱلْءَاخِرَةِ')).toBe(spellingKey('ٱلْـَٔاخِرَةِ'));
  });

  it('treats small high yeh and small yeh as one mark', () => {
    // Corpus إِبْرَٰهِۦمَ, Tanzil إِبْرَٰهِـۧمَ.
    expect(spellingKey('إِبْرَٰهِۦمَ')).toBe(spellingKey('إِبْرَٰهِـۧمَ'));
  });

  it('keeps real letter differences', () => {
    expect(spellingKey('قَالَ')).not.toBe(spellingKey('قِيلَ'));
  });
});

describe('matchesTanzil', () => {
  it('accepts joined segments equal to the Tanzil word', () => {
    expect(matchesTanzil('2:30', 10, ['قَالُ', 'وٓا۟'], 'قَالُوٓا۟')).toBe(true);
  });

  it('accepts a joined Corpus word against two Tanzil words', () => {
    expect(matchesTanzil('2:181', 3, ['بَعْدَمَا'], 'بَعْدَ مَا')).toBe(true);
    expect(matchesTanzil('37:130', 3, ['إِلْ يَاسِينَ'], 'إِلْ يَاسِينَ')).toBe(true);
  });

  it('accepts the listed exceptions only', () => {
    expect(matchesTanzil('12:39', 1, ['يَٰ', 'صَىٰحِبَ', 'ىِ'], 'يَٰصَٰحِبَىِ')).toBe(true);
    expect(matchesTanzil('12:40', 1, ['يَٰ', 'صَىٰحِبَ', 'ىِ'], 'يَٰصَٰحِبَىِ')).toBe(false);
  });

  it('rejects a different word', () => {
    expect(matchesTanzil('2:30', 10, ['قَالَ'], 'قَالُوٓا۟')).toBe(false);
  });
});
