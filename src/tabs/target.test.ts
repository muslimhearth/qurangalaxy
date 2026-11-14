import { beforeEach, describe, expect, it } from 'vitest';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';
import { showTarget, targetView, toTarget } from './target';
import { openInNewTab } from './actions';
import { resetTabs, useTabsStore } from './store';
import { activeTab } from './model';

describe('tab targets', () => {
  beforeEach(() => {
    resetTabs();
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });

  it('a bare number is a root', () => {
    expect(toTarget(3)).toEqual({ root: 3 });
    expect(toTarget({ verse: '2:255' })).toEqual({ verse: '2:255' });
  });

  it('turns a target into a tab view', () => {
    expect(targetView({ root: 3 })).toEqual({ selectedId: 3 });
    expect(targetView({ verse: '2:255' })).toEqual({ openVerse: '2:255' });
  });

  it('opens a root or a verse in a new tab', () => {
    openInNewTab({ verse: '2:255' }, true);
    expect(activeTab(useTabsStore.getState()).openVerse).toBe('2:255');
    openInNewTab(4, false);
    expect(useTabsStore.getState().tabs.map((t) => t.selectedId)).toEqual([null, null, 4]);
  });

  it('shows a root in the current tab: closes the verse and clears the search', () => {
    useGalaxyStore.setState({ openVerse: '1:2', query: 'praise' });
    showTarget({ root: 2 });
    const s = useGalaxyStore.getState();
    expect([s.selectedId, s.openVerse, s.query]).toEqual([2, null, '']);
  });

  it('shows a verse in the current tab', () => {
    showTarget({ verse: '1:3' });
    expect(useGalaxyStore.getState().openVerse).toBe('1:3');
  });
});
