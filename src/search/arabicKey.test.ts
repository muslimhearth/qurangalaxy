import { describe, expect, it } from 'vitest';
import { arabicKey, arabicWords, isArabicQuery } from './arabicKey';

describe('arabicKey', () => {
  it('gives typed plain Arabic and the Uthmani spelling the same key', () => {
    // Tanzil Uthmani forms (2:189) against keyboard text.
    expect(arabicKey('يَسْـَٔلُونَكَ')).toBe(arabicKey('يسألونك'));
    expect(arabicKey('يَسْـَٔلُونَكَ')).toBe(arabicKey('يسالونك'));
    expect(arabicKey('ظُهُورِهَا')).toBe(arabicKey('ظهورها'));
    expect(arabicKey('ٱلرَّحْمَٰنِ')).toBe(arabicKey('الرحمن'));
    expect(arabicKey('كِتَٰبٌ')).toBe(arabicKey('كتاب'));
  });

  it('folds alef, hamza, alef maqsura and taa marbuta', () => {
    expect(arabicKey('رَحْمَةً')).toBe(arabicKey('رحمه'));
    expect(arabicKey('عَلَىٰ')).toBe(arabicKey('علي'));
    expect(arabicKey('ءَامَنُوا۟')).toBe(arabicKey('آمنوا'));
    expect(arabicKey('سَيِّـَٔاتِ')).toBe(arabicKey('سيئات'));
    expect(arabicKey('إِلَىٰ')).toBe(arabicKey('الى'));
  });

  it('reads Uthmani spellings of a long alef as alef', () => {
    expect(arabicKey('ٱلصَّلَوٰةَ')).toBe(arabicKey('الصلاة'));
    expect(arabicKey('أَدْرَىٰكَ')).toBe(arabicKey('أدراك'));
    expect(arabicKey('ٱلسَّمَٰوَٰتِ')).toBe(arabicKey('السماوات'));
    expect(arabicKey('وَٰحِدٌ')).toBe(arabicKey('واحد'));
  });

  it('drops the small waw or yaa after a final haa, keeps them elsewhere', () => {
    expect(arabicKey('بِهِۦٓ')).toBe(arabicKey('به'));
    expect(arabicKey('إِنَّهُۥ')).toBe(arabicKey('إنه'));
    expect(arabicKey('إِبْرَٰهِـۧمُ')).toBe(arabicKey('إبراهيم'));
    expect(arabicKey('وَمَلَإِي۟هِۦ')).toBe(arabicKey('وملئه'));
  });

  it('keeps distinct words apart', () => {
    expect(arabicKey('ظهر')).not.toBe(arabicKey('ظهورها'));
    expect(arabicKey('قل')).not.toBe(arabicKey('كل'));
  });
});

describe('arabicWords', () => {
  it('splits a query into Arabic words and drops other characters', () => {
    expect(arabicWords('  يسألونك، عن الأهلة ')).toEqual(['يسألونك', 'عن', 'الأهلة']);
    expect(arabicWords('noor')).toEqual([]);
  });
});

describe('isArabicQuery', () => {
  it('is true when the query has an Arabic letter', () => {
    expect(isArabicQuery('رحمة')).toBe(true);
    expect(isArabicQuery('mercy')).toBe(false);
    expect(isArabicQuery('  ')).toBe(false);
  });
});
