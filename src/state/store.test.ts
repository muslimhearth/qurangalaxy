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

  it('keeps the semantic weight between 0 and 1', () => {
    expect(useGalaxyStore.getState().semanticWeight).toBe(0);
    useGalaxyStore.getState().setSemanticWeight(0.4);
    expect(useGalaxyStore.getState().semanticWeight).toBe(0.4);
    useGalaxyStore.getState().setSemanticWeight(3);
    expect(useGalaxyStore.getState().semanticWeight).toBe(1);
    useGalaxyStore.getState().setSemanticWeight(-1);
    expect(useGalaxyStore.getState().semanticWeight).toBe(0);
  });

  it('tracks when the view moved away from the selection and asks to fly back', () => {
    const s = useGalaxyStore.getState;
    s().select(2);
    expect(s().awayFromSelection).toBe(false);
    s().setAwayFromSelection(true);
    expect(s().awayFromSelection).toBe(true);
    const tick = s().recenterTick;
    s().recenter();
    expect(s().recenterTick).toBe(tick + 1);
    // A new selection starts framed again.
    s().setAwayFromSelection(true);
    s().select(3);
    expect(s().awayFromSelection).toBe(false);
  });
});
