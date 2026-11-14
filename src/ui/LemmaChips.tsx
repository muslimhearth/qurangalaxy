import type { Lemma } from '../data/types';

const fmt = (n: number) => n.toLocaleString('en');

/** Props for `LemmaChips`. */
export interface LemmaChipsProps {
  lemmas: Lemma[];
  /** Index of the lemma that filters the verses, or null. */
  picked: number | null;
  /** Called with the tapped lemma's index, or null when the picked lemma is tapped again. */
  onPick: (index: number | null) => void;
}

/**
 * "Words from this root": one toggle chip per lemma (Arabic, first meaning, count).
 * A tap filters the verse list to that lemma; the chip then shows as pressed.
 */
export function LemmaChips({ lemmas, picked, onPick }: LemmaChipsProps) {
  return (
    <ul className="chips" aria-label="Lemmas">
      {lemmas.map((l, i) => (
        <li key={l.ar}>
          <button
            type="button"
            className="chip lemma-chip"
            aria-pressed={picked === i}
            title={picked === i ? 'Show all verses' : 'Show only the verses with this word'}
            onClick={() => onPick(picked === i ? null : i)}
          >
            <span lang="ar" dir="rtl">
              {l.ar}
            </span>
            {l.en[0] && <span className="chip-en">{l.en[0]}</span>}
            <span className="count">{fmt(l.count)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
