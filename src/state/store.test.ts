import { beforeEach, describe, expect, it } from 'vitest';
import { useGalaxyStore } from './store';
import { fixtureGalaxy } from '../data/fixture';

describe('galaxy store', () => {
  beforeEach(() => useGalaxyStore.setState(useGalaxyStore.getInitialState()));

  it('starts empty', () => {
    const s = useGalaxyStore.getState();
    expect(s.galaxy).toBeNull();
    expect(s.selectedId).toBeNull();
    expect(s.hoveredId).toBeNull();
    expect(s.query).toBe('');
  });

  it('stores the loaded galaxy', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    expect(useGalaxyStore.getState().galaxy).toBe(fixtureGalaxy);
  });

  it('selects and clears a root', () => {
    useGalaxyStore.getState().select(2);
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    useGalaxyStore.getState().select(null);
    expect(useGalaxyStore.getState().selectedId).toBeNull();
  });

  it('tracks hover and query', () => {
    useGalaxyStore.getState().hover(4);
    useGalaxyStore.getState().setQuery('rhm');
    expect(useGalaxyStore.getState().hoveredId).toBe(4);
    expect(useGalaxyStore.getState().query).toBe('rhm');
  });
});
