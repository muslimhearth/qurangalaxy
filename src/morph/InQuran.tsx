import { useState } from 'react';
import type { Occurrence, VerseKey, Verses } from '../data/types';
import type { NewTabHandlers } from '../tabs/useNewTabGesture';
import type { TargetLike } from '../tabs/target';
import { wordTotal } from './counts';
import type { WordData } from './useWordData';

/** The three rows: same form, same lemma, same root. */
export type RowKey = 'form' | 'lemma' | 'root';

/** Verses shown at first and added per "Show more". */
export const LIST_PAGE = 20;

const fmt = (n: number) => n.toLocaleString('en');

/** Props for `InQuran`. */
export interface InQuranProps {
  data: WordData;
  /** The verse of the open word: its row in a list gets a "here" tag. */
  current: VerseKey;
  /** The expanded row, or null. */
  open: RowKey | null;
  onToggle: (row: RowKey) => void;
  /** Opens a verse (plain tap). */
  onVerse: (key: VerseKey) => void;
  /** New-tab gesture binder for verse rows (see `useNewTabGesture`). */
  bind: (target: TargetLike, onSelect: () => void) => NewTabHandlers;
}

/** A few words around the first marked word of a verse, the marked words in gold. */
function Snippet({ text, w }: { text: string; w: number[] }) {
  const words = text.split(' ');
  const first = w[0] ?? 1;
  const a = Math.max(0, first - 4);
  const b = Math.min(words.length, first + 3);
  const marked = new Set(w);
  return (
    <span className="snip" lang="ar" dir="rtl">
      {a > 0 && '… '}
      {words.slice(a, b).map((word, i) => (
        <span key={i}>
          {i > 0 && ' '}
          {marked.has(a + i + 1) ? <mark>{word}</mark> : word}
        </span>
      ))}
      {b < words.length && ' …'}
    </span>
  );
}

/** One expanded list: verse rows, then "Show more". */
function VerseRows({ list, verses, current, onVerse, bind }: { list: Occurrence[]; verses: Verses } & Pick<InQuranProps, 'current' | 'onVerse' | 'bind'>) {
  const [shown, setShown] = useState(LIST_PAGE);
  return (
    <>
      <ul className="wc-vlist" aria-label="Verses">
        {list.slice(0, shown).map((o) => (
          <li key={o.v}>
            <button type="button" className="wc-v" aria-label={`Open ${o.v}`} {...bind({ verse: o.v }, () => onVerse(o.v))}>
              <span className="key">{o.v}</span>
              <Snippet text={verses[o.v]?.ar ?? ''} w={o.w} />
              {o.v === current && <span className="here">here</span>}
            </button>
          </li>
        ))}
      </ul>
      {shown < list.length && (
        <button type="button" className="wc-more" onClick={() => setShown((n) => n + LIST_PAGE)}>
          Show more ({fmt(list.length - shown)} verses left)
        </button>
      )}
    </>
  );
}

/** "In the Quran": same form, same lemma and same root, with word and verse counts; each expands to its verses. */
export function InQuran({ data, current, open, onToggle, onVerse, bind }: InQuranProps) {
  const rows: { key: RowKey; label: string; ar: string; list: Occurrence[] }[] = [
    { key: 'form', label: 'Same form', ar: data.text, list: data.form },
  ];
  if (data.lemma) rows.push({ key: 'lemma', label: 'Same lemma', ar: data.lemma.ar, list: data.lemmaList });
  if (data.root && data.rootList) rows.push({ key: 'root', label: 'Same root', ar: data.root.ar, list: data.rootList });
  // A word without lemma or root (e.g. Quranic initials) has no index to count in.
  if (!data.lemma && !data.root) return null;
  return (
    <>
      <h3 className="wc-h">In the Quran</h3>
      <ul className="wc-inst">
        {rows.map((r) => {
          const isOpen = open === r.key;
          const id = `wc-list-${r.key}`;
          return (
            <li key={r.key} className={isOpen ? 'open' : undefined}>
              <button
                type="button"
                className="wc-irow"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => onToggle(r.key)}
              >
                <span className="k">
                  {r.label}
                  <small>{fmt(r.list.length)} verses</small>
                </span>
                <span className="ar" lang="ar" dir="rtl">
                  {r.ar}
                </span>
                <span className="n">
                  {fmt(wordTotal(r.list))}
                  <span className="sr-only"> words</span>
                </span>
                <svg className="chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {isOpen && (
                <div id={id}>
                  <VerseRows list={r.list} verses={data.verses} current={current} onVerse={onVerse} bind={bind} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
