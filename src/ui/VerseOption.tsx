import type { Verse, VerseKey } from '../data/types';
import { currentWordForms } from '../search/wordFormsLoad';
import { markedArabic } from '../verses/arabic';
import { markedSnippet, type SnippetPart } from '../verses/highlight';
import type { VerseLang } from '../verses/terms';
import { plainTranslit } from '../verses/translit';
import { useTypos } from './typos';

/** Characters of English shown in a result. */
const EN_CHARS = 150;
/** Characters of transliteration shown when it matched. */
const TR_CHARS = 90;
/** Arabic words shown before a match starts the line later (the Arabic line does not wrap). */
const AR_LEAD = 4;

/** Snippet text with the matched words in <mark>. */
function Marked({ parts }: { parts: SnippetPart[] }) {
  return <>{parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}</>;
}

/** Props for `VerseOption`. */
export interface VerseOptionProps {
  verseKey: VerseKey;
  verse?: Verse;
  /** Raw transliteration (Tanzil markup), shown when it is what matched. */
  translit?: string;
  query: string;
  /** Which text matched; semantic results mark nothing. */
  source: VerseLang | 'ar' | 'semantic';
}

/** Body of one verse search result: key, English (matches marked), matched transliteration, Arabic (matches marked). */
export function VerseOption({ verseKey, verse, translit, query, source }: VerseOptionProps) {
  const highlightQuery = source === 'semantic' ? '' : query;
  // Mark typo matches too, as search found them.
  const typos = useTypos((s) => s.on);
  return (
    <>
      <span className="verse-key">{verseKey}</span>
      <span className="verse-hit">
        {verse && (
          <span className="verse-hit-en">
            <Marked parts={markedSnippet(verse.en, highlightQuery, 'en', EN_CHARS, typos)} />
          </span>
        )}
        {source === 'tr' && translit && (
          <span className="verse-hit-tr">
            <Marked parts={markedSnippet(plainTranslit(translit), query, 'tr', TR_CHARS, typos)} />
          </span>
        )}
        {verse && (
          <span className="verse-hit-ar" lang="ar" dir="rtl">
            <Marked parts={markedArabic(verse.ar, source === 'ar' ? query : '', currentWordForms(), AR_LEAD)} />
          </span>
        )}
      </span>
    </>
  );
}
