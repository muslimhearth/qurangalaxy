import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VerseList } from './VerseList';
import { fixtureOccurrences, fixtureVerses } from '../data/fixture';
import type { Occurrence, Verses } from '../data/types';

describe('VerseList', () => {
  afterEach(cleanup);

  it('shows key, RTL Arabic with highlighted root words, and English', () => {
    const { container } = render(<VerseList occurrences={fixtureOccurrences[2]!} verses={fixtureVerses} />);
    expect(screen.getByText('1:1')).toBeInTheDocument();
    expect(screen.getByText('1:3')).toBeInTheDocument();
    expect(screen.getByText('Fixture translation of 1:1')).toBeInTheDocument();
    const arabic = container.querySelector('.verse-ar')!;
    expect(arabic).toHaveAttribute('dir', 'rtl');
    expect(arabic).toHaveAttribute('lang', 'ar');
    const marks = [...arabic.querySelectorAll('mark')].map((m) => m.textContent);
    expect(marks).toEqual(['ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']);
  });

  it('shows the first 30 verses, then more on request', () => {
    const verses: Verses = {};
    const occurrences: Occurrence[] = [];
    for (let i = 1; i <= 45; i++) {
      verses[`2:${i}`] = { ar: 'كلمة', en: `v${i}` };
      occurrences.push({ v: `2:${i}`, w: [1] });
    }
    render(<VerseList occurrences={occurrences} verses={verses} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: /show more/i }));
    expect(screen.getAllByRole('listitem')).toHaveLength(45);
    expect(screen.queryByRole('button', { name: /show more/i })).toBeNull();
  });
});
