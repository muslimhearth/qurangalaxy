import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecenterButton } from './RecenterButton';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

describe('RecenterButton', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  it('stays hidden while the selection is in view', () => {
    useGalaxyStore.getState().select(2);
    render(<RecenterButton />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('appears after the view moves away and flies back on click', () => {
    useGalaxyStore.getState().select(2);
    render(<RecenterButton />);
    act(() => useGalaxyStore.getState().setAwayFromSelection(true));
    const button = screen.getByRole('button', { name: 'Back to رحم' });
    const tick = useGalaxyStore.getState().recenterTick;
    fireEvent.click(button);
    expect(useGalaxyStore.getState().recenterTick).toBe(tick + 1);
  });

  it('is hidden without a selection', () => {
    act(() => useGalaxyStore.getState().setAwayFromSelection(true));
    render(<RecenterButton />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
