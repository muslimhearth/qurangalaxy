import { useState } from 'react';
import type { Occurrence, Verses } from '../data/types';
import { verseWords } from './helpers';

/** Verses shown at first and added per "show more" click. */
export const VERSE_PAGE = 30;

/** Props for `VerseList`. */
export interface VerseListProps {
  occurrences: Occurrence[];
  verses: Verses;
}

/** Verses that use a root: key, Arabic with the root's words highlighted, English below. */
export function VerseList({ occurrences, verses }: VerseListProps) {
  const [shown, setShown] = useState(VERSE_PAGE);
  const visible = occurrences.slice(0, shown);

  return (
    <>
      <ol className="verse-list">
        {visible.map((occ) => {
          const verse = verses[occ.v];
          if (!verse) return null;
          return (
            <li key={occ.v} className="verse">
              <span className="verse-key">{occ.v}</span>
              <p className="verse-ar" dir="rtl" lang="ar">
                {verseWords(verse.ar, occ.w).map((word, i) => (
                  // Spaces between words are kept as text nodes so copy/paste stays natural.
                  <span key={i}>
                    {i > 0 && ' '}
                    {word.hit ? <mark>{word.text}</mark> : word.text}
                  </span>
                ))}
              </p>
              <p className="verse-en">{verse.en}</p>
            </li>
          );
        })}
      </ol>
      {shown < occurrences.length && (
        <button type="button" className="show-more" onClick={() => setShown((n) => n + VERSE_PAGE)}>
          Show more ({occurrences.length - shown} left)
        </button>
      )}
    </>
  );
}
