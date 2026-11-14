import { Fragment } from 'react';
import type { NewTabHandlers } from '../tabs/useNewTabGesture';
import { describeParts, grammarLines, segmentKind } from './grammar';
import type { WordData } from './useWordData';

/** Props for `WordDetails`. */
export interface WordDetailsProps {
  data: WordData;
  /** Handlers for the root box: a tap opens the root (see `useNewTabGesture`). */
  rootLink?: NewTabHandlers;
}

/** Items joined by middle dots; the first one can be bold. */
function Dotted({ items, strong = false }: { items: string[]; strong?: boolean }) {
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="dot">·</span>}
          {i === 0 && strong ? <span className="pos">{item}</span> : item}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The word's analysis: its parts (right to left, stem in gold), its grammar in plain English,
 * and two boxes for the lemma and the root.
 */
export function WordDetails({ data, rootLink }: WordDetailsProps) {
  const parts = describeParts(data.word.segments);
  const [line1, line2] = grammarLines(data.word.segments);
  const stem = data.word.segments.find((_, i) => parts[i]?.role === 'stem');
  // Particles have no English meaning in the data: their grammar name stands in.
  const meaning = data.lemma?.en.slice(0, 2).join(', ') || (data.root ? '' : line1[0]?.toLowerCase());
  return (
    <>
      {parts.length > 1 && (
        <ol className="wc-parts" aria-label="Parts of the word">
          {parts.map((p, i) => (
            <li key={i} className={`wc-seg ${p.role}`} title={p.title}>
              {i > 0 && (
                <span className="wc-plus" aria-hidden="true">
                  +
                </span>
              )}
              <span className="wc-seg-box">
                <b lang="ar" dir="rtl">
                  {p.text}
                </b>
                <small>
                  {p.role} · <i>{p.label}</i>
                </small>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="wc-gram">
        <Dotted items={line1} strong />
        {line2.length > 0 && (
          <>
            <br />
            <span className="sub">
              <Dotted items={line2} />
            </span>
          </>
        )}
      </p>
      <div className="wc-rows">
        <div className="wc-box">
          <span className="lab">Dictionary form</span>
          <span className="ar" lang="ar" dir="rtl">
            {data.lemma?.ar ?? stem?.text ?? data.text}
          </span>
          <span className="en">{meaning || '—'}</span>
        </div>
        {data.root ? (
          <button
            type="button"
            className="wc-box root"
            aria-label={`Open the root ${data.root.ar} (${data.root.tr})`}
            title="Open the root (Ctrl-click or long-press: new tab)"
            {...rootLink}
          >
            <span className="top">
              <span className="lab">Root</span>
              <span className="go">Open ›</span>
            </span>
            <span className="ar" lang="ar" dir="rtl">
              {data.root.ar}
            </span>
            <span className="en">
              <span className="tr">{data.root.tr}</span>
              {data.root.en[0] && ` · ${data.root.en[0]}`}
            </span>
          </button>
        ) : (
          <div className="wc-box none">
            <span className="lab">Root</span>
            <span className="en">No root: {segmentKind(stem?.tag ?? '') === 'INL' ? 'Quranic initials' : 'a particle or pronoun'}</span>
          </div>
        )}
      </div>
    </>
  );
}
