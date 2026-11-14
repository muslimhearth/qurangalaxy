import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Galaxy, Occurrences, Verses } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { useWordCard } from './cardStore';
import type { MorphTags, SurahMorph } from './types';
import { VerseWords } from './VerseWords';
import { WordCard } from './WordCard';

// A tiny Quran: surah 2 with two verses that use قَالُوٓا۟ (root قول, lemma قالَ).
const VERSES = {
  '2:30': { ar: 'وَإِذْ قَالُوٓا۟ فِى', en: '' },
  '2:31': { ar: 'قَالُوٓا۟ قَالَ', en: '' },
} as Verses;
const TAGS: MorphTags = ['P|REM|PREF', 'N|T', 'V|PERF|VF:1|3MP', 'N|PRON|SUFF|3MP', 'P|P', 'V|PERF|VF:1|3MS'];
const SURAH2: SurahMorph = [];
SURAH2[29] = [[-1, 0, 'وَ', 0, 'إِذْ', 1], [0, 0, 'قَالُ', 2, 'وٓا۟', 3], [-1, 1, 'فِى', 4]];
SURAH2[30] = [[0, 0, 'قَالُ', 2, 'وٓا۟', 3], [0, 0, 'قَالَ', 5]];
const OCC: Occurrences = [
  [
    { v: '2:30', w: [2] },
    { v: '2:31', w: [1, 2] },
  ],
];
const GALAXY = {
  roots: [{ id: 0, ar: 'قول', tr: 'q-w-l', en: ['saying'], count: 3, verseCount: 2, lemmas: [{ ar: 'قالَ', count: 3, en: ['to say'] }] }],
  edges: [],
} as unknown as Galaxy;

vi.mock('../data/load', () => ({
  loadVerses: async () => VERSES,
  loadOccurrences: async () => OCC,
  loadLemmaIndex: async () => [[0, 0, 0]],
  loadJson: async (file: string) =>
    ({ 'morph/2.json': SURAH2, 'morph/tags.json': TAGS, 'particles.json': { lemmas: ['إِذ', 'فِي'], words: [[0], [2]] } })[file],
}));
const openInNewTab = vi.fn();
vi.mock('../tabs/actions', () => ({ openInNewTab: (...a: unknown[]) => openInNewTab(...a) }));

function setup() {
  render(
    <>
      <p data-verse="2:30">
        <VerseWords verseKey="2:30" words={VERSES['2:30']!.ar.split(' ').map((text) => ({ text, hit: false }))} />
      </p>
      <WordCard />
    </>,
  );
  return screen.getAllByRole('button');
}

async function openQalu() {
  const words = setup();
  fireEvent.click(words[1]!);
  const card = await screen.findByRole('dialog');
  await within(card).findByText('Same form');
  return { words, card };
}

describe('WordCard', () => {
  beforeEach(() => {
    useGalaxyStore.setState({ galaxy: GALAXY, selectedId: null, reader: { surah: 2, verse: 30 }, openVerse: null });
  });
  afterEach(() => {
    cleanup();
    act(() => useWordCard.getState().close());
    vi.unstubAllGlobals();
    openInNewTab.mockClear();
  });

  it('shows the word, its parts, grammar, lemma, root and counts', async () => {
    const { card } = await openQalu();
    expect(card).toHaveTextContent('2:30 · word 2');
    expect(within(card).getByText('قَالُوٓا۟', { selector: '.wc-word' })).toBeInTheDocument();
    const parts = within(card).getByRole('list', { name: 'Parts of the word' });
    expect(parts).toHaveTextContent('stem · verb');
    expect(parts).toHaveTextContent('suffix · they');
    expect(card.querySelector('.wc-gram')).toHaveTextContent('Verb·Form I·perfect (past)·active3rd person·masculine·plural');
    expect(card).toHaveTextContent('to say');
    expect(card).toHaveTextContent('q-w-l · saying');
    const rows = within(card).getAllByRole('button', { expanded: false });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(/Same form2 versesقَالُوٓا۟2 words/);
    expect(rows[2]).toHaveTextContent(/Same root2 versesقول3 words/);
    expect(card).toHaveTextContent('Morphology: Quranic Arabic Corpus');
  });

  it('puts focus on the close button; Escape closes and returns focus to the word', async () => {
    const { words } = await openQalu();
    expect(document.activeElement).toHaveAccessibleName('Close word details');
    const below = vi.fn();
    window.addEventListener('keydown', below);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    window.removeEventListener('keydown', below);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(below).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(words[1]);
  });

  it('switches to another tapped word', async () => {
    const { words } = await openQalu();
    fireEvent.click(words[2]!);
    const card = screen.getByRole('dialog');
    await within(card).findByText('Preposition');
    expect(card).toHaveTextContent('2:30 · word 3');
    expect(card).toHaveTextContent('a particle or pronoun');
  });

  it('expands a row into its verses; a verse opens in the reader', async () => {
    const { card } = await openQalu();
    const lemma = within(card).getByRole('button', { name: /Same lemma/ });
    fireEvent.click(lemma);
    expect(lemma).toHaveAttribute('aria-expanded', 'true');
    expect(card).toHaveClass('tall');
    const verses = within(card).getAllByRole('button', { name: /^Open 2:/ });
    expect(verses.map((v) => v.textContent)).toEqual([expect.stringMatching(/^2:30.*here$/), expect.stringMatching(/^2:31/)]);
    expect(verses[1]!.querySelectorAll('mark')).toHaveLength(2);
    fireEvent.click(verses[1]!);
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 2, verse: 31 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('desktop: the root opens in the current tab', async () => {
    const { card } = await openQalu();
    fireEvent.click(within(card).getByRole('button', { name: /Open the root قول/ }));
    expect(useGalaxyStore.getState().selectedId).toBe(0);
    expect(useGalaxyStore.getState().reader).toBeNull();
    expect(openInNewTab).not.toHaveBeenCalled();
  });

  it('phone: a sheet, and the root opens in a new tab so the reader stays', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width'), addEventListener() {}, removeEventListener() {} }));
    const { card } = await openQalu();
    expect(card).toHaveClass('sheet');
    fireEvent.click(within(card).getByRole('button', { name: /Open the root قول/ }));
    expect(openInNewTab).toHaveBeenCalledWith(0, true);
    expect(useGalaxyStore.getState().reader).toEqual({ surah: 2, verse: 30 });
  });

  it('closes when the reader moves to another place', async () => {
    await openQalu();
    act(() => useGalaxyStore.getState().setReader({ surah: 3, verse: 1 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
