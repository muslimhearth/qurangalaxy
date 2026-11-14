import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { VerseKey } from '../data/types';
import type { VerseWord } from '../ui/helpers';
import { useWordCard } from './cardStore';

/** Props for `VerseWords`. */
export interface VerseWordsProps {
  verseKey: VerseKey;
  /** The verse's words (see `verseWords`): text plus root highlights. */
  words: VerseWord[];
}

/**
 * The words of one verse as tap targets for the word card. Goes inside the verse's `<p>`.
 * Keyboard: one Tab stop per verse (roving tabindex); arrow keys move between words (right to
 * left, so ArrowLeft is the next word), Home/End jump to the ends, Enter or Space opens the card.
 */
export function VerseWords({ verseKey, words }: VerseWordsProps) {
  const openPos = useWordCard((s) => (s.word?.verse === verseKey ? s.word.pos : 0));
  const show = useWordCard((s) => s.show);
  const [active, setActive] = useState(0);
  // The open word keeps the Tab stop, so focus can come back to it.
  const tabStop = openPos > 0 ? openPos - 1 : active;

  const open = (i: number, el: HTMLElement) => show({ verse: verseKey, pos: i + 1 }, el);

  const onClick = (i: number) => (e: MouseEvent<HTMLElement>) => {
    // A drag that selected text is not a tap.
    const sel = window.getSelection?.();
    if (sel && !sel.isCollapsed && sel.toString().trim() !== '') return;
    setActive(i);
    open(i, e.currentTarget);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(i, e.currentTarget);
      return;
    }
    const step: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1, Home: -Infinity, End: Infinity };
    if (!(e.key in step)) return;
    e.preventDefault();
    const next = Math.min(words.length - 1, Math.max(0, i + step[e.key]!));
    setActive(next);
    const el = e.currentTarget.closest('p')?.querySelectorAll<HTMLElement>('.qw')[next];
    el?.focus();
  };

  return (
    <>
      {words.map((word, i) => (
        // Spaces between words are kept as text nodes so copy/paste stays natural.
        <span key={i}>
          {i > 0 && ' '}
          <span
            role="button"
            className={openPos === i + 1 ? 'qw on' : 'qw'}
            tabIndex={i === tabStop ? 0 : -1}
            aria-haspopup="dialog"
            data-w={i + 1}
            onClick={onClick(i)}
            onKeyDown={onKeyDown(i)}
            onFocus={() => setActive(i)}
          >
            {word.hit ? <mark>{word.text}</mark> : word.alt ? <mark className="alt">{word.text}</mark> : word.text}
          </span>
        </span>
      ))}
    </>
  );
}
