import type { VerseKey } from '../../../src/data/types';

/** One segment of a Corpus word: a prefix, the stem or a suffix. */
export interface CorpusSegment {
  /** Segment text exactly as the Corpus gives it. */
  text: string;
  /** Corpus tag and grammar features without lemma, root and family, e.g. "V|PERF|VF:1|3MP". */
  tag: string;
  /** Root letters, when the segment has a root. */
  root: string | undefined;
  /** Lemma, when the segment has one. */
  lemma: string | undefined;
}

/** One word of the Quranic Arabic Corpus with all its segments. */
export interface CorpusWord {
  verse: VerseKey;
  /** 1-based word number in the verse (Corpus numbering). */
  word: number;
  segments: CorpusSegment[];
}

/** Joins a Corpus tag and its features into one tag string, without LEM, ROOT and FAM. */
export function segmentTag(tag: string, features: string[]): string {
  const kept = features.filter((f) => f !== '' && !/^(LEM|ROOT|FAM):/.test(f));
  return [tag, ...kept].join('|');
}

/**
 * Parses the Corpus morphology file (`s:a:w:segment`, form, tag, features) into words with
 * their segments, in file (Quran) order.
 */
export function parseCorpusWords(text: string): CorpusWord[] {
  const words: CorpusWord[] = [];
  text.split('\n').forEach((line, i) => {
    if (line.trim() === '') return;
    const [location, form, tag, features] = line.split('\t');
    const parts = location?.split(':').map(Number);
    if (form === undefined || tag === undefined || features === undefined || parts?.length !== 4 || parts.some(Number.isNaN)) {
      throw new Error(`Malformed morphology line ${i + 1}: ${line.slice(0, 60)}`);
    }
    const [surah, ayah, word] = parts as [number, number, number];
    const verse: VerseKey = `${surah}:${ayah}`;
    const feats = features.split('|');
    const segment: CorpusSegment = {
      text: form,
      tag: segmentTag(tag, feats),
      root: feats.find((f) => f.startsWith('ROOT:'))?.slice(5),
      lemma: feats.find((f) => f.startsWith('LEM:'))?.slice(4),
    };
    const last = words.at(-1);
    if (last && last.verse === verse && last.word === word) last.segments.push(segment);
    else words.push({ verse, word, segments: [segment] });
  });
  return words;
}
