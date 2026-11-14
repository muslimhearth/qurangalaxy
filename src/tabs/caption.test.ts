import { describe, expect, it } from 'vitest';
import { tabCaption, tabKind } from './caption';
import { EMPTY_VIEW, type TabView } from './model';
import { fixtureGalaxy } from '../data/fixture';

const view = (v: Partial<TabView>): TabView => ({ ...EMPTY_VIEW, ...v });

describe('tab caption', () => {
  it('names the kind of view: reader first, then root, verse, search', () => {
    expect(tabKind(view({ selectedId: 2, reader: { surah: 2, verse: 17 } }))).toBe('reader');
    expect(tabKind(view({ selectedId: 2 }))).toBe('root');
    expect(tabKind(view({ openVerse: '2:255' }))).toBe('verse');
    expect(tabKind(view({ query: 'light' }))).toBe('search');
    expect(tabKind(EMPTY_VIEW)).toBe('empty');
  });

  it('describes a root by its letters and up to two meanings', () => {
    expect(tabCaption(view({ selectedId: 2 }), fixtureGalaxy)).toEqual({ kind: 'Root', detail: 'r-ḥ-m · mercy' });
    expect(tabCaption(view({ selectedId: 0 }), fixtureGalaxy)).toEqual({ kind: 'Root', detail: 's-m-w · name, sky' });
  });

  it('describes a root before the galaxy loads by its kind only', () => {
    expect(tabCaption(view({ selectedId: 2 }), null)).toEqual({ kind: 'Root', detail: '' });
  });

  it('describes reader, verse, search and empty tabs', () => {
    expect(tabCaption(view({ reader: { surah: 2, verse: 17 } }), fixtureGalaxy)).toEqual({ kind: 'Reader', detail: 'surah 2, verse 17' });
    expect(tabCaption(view({ openVerse: '2:255' }), fixtureGalaxy)).toEqual({ kind: 'Verse', detail: '2:255' });
    expect(tabCaption(view({ query: 'light' }), fixtureGalaxy)).toEqual({ kind: 'Search', detail: 'Roots' });
    expect(tabCaption(view({ query: 'light', searchMode: 'verses' }), fixtureGalaxy)).toEqual({ kind: 'Search', detail: 'Verses' });
    expect(tabCaption(EMPTY_VIEW, fixtureGalaxy)).toEqual({ kind: 'Empty', detail: '' });
  });
});
