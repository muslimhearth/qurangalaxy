import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useWordCard } from './cardStore';
import { VerseWords } from './VerseWords';

const WORDS = [
  { text: 'وَإِذْ', hit: false },
  { text: 'قَالَ', hit: true },
  { text: 'رَبُّكَ', hit: false },
];

function setup() {
  render(
    <p>
      <VerseWords verseKey="2:30" words={WORDS} />
    </p>,
  );
  return screen.getAllByRole('button');
}

describe('VerseWords', () => {
  afterEach(() => {
    cleanup();
    act(() => useWordCard.getState().close());
  });

  it('renders every word as a button, root words marked, spaces kept', () => {
    const words = setup();
    expect(words.map((w) => w.textContent)).toEqual(['وَإِذْ', 'قَالَ', 'رَبُّكَ']);
    expect(words[1]!.querySelector('mark')).not.toBeNull();
    expect(words[0]!.closest('p')!.textContent).toBe('وَإِذْ قَالَ رَبُّكَ');
  });

  it('has a single Tab stop', () => {
    const words = setup();
    expect(words.map((w) => w.tabIndex)).toEqual([0, -1, -1]);
  });

  it('opens the card on click and marks the word', () => {
    const words = setup();
    fireEvent.click(words[1]!);
    expect(useWordCard.getState().word).toEqual({ verse: '2:30', pos: 2 });
    expect(useWordCard.getState().anchor).toBe(words[1]);
    expect(words[1]).toHaveClass('on');
    expect(words[1]!.tabIndex).toBe(0);
  });

  it('moves with arrow keys (right to left) and opens with Enter or Space', () => {
    const words = setup();
    words[0]!.focus();
    fireEvent.keyDown(words[0]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(words[1]);
    fireEvent.keyDown(words[1]!, { key: 'End' });
    expect(document.activeElement).toBe(words[2]);
    fireEvent.keyDown(words[2]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(words[1]);
    expect(words.map((w) => w.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(words[1]!, { key: ' ' });
    expect(useWordCard.getState().word).toEqual({ verse: '2:30', pos: 2 });
    fireEvent.keyDown(words[1]!, { key: 'Enter' });
    expect(useWordCard.getState().word?.pos).toBe(2);
  });
});
