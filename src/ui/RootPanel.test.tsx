import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RootPanel } from './RootPanel';
import { useGalaxyStore } from '../state/store';
import { resetLoadCache } from '../data/load';
import { fixtureGalaxy } from '../data/fixture';

describe('RootPanel', () => {
  beforeEach(() => {
    resetLoadCache();
    // Fixture mode serves occurrences and verses without fetch.
    window.history.replaceState(null, '', '/?fixture');
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  it('renders nothing without a selection', () => {
    const { container } = render(<RootPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the root, counts, lemmas, connected roots and verses', async () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const panel = screen.getByRole('complementary', { name: /root details/i });
    expect(within(panel).getByRole('heading', { level: 2 })).toHaveTextContent('رحم');
    expect(panel).toHaveTextContent('r-ḥ-m');
    expect(panel).toHaveTextContent('339 words');
    expect(panel).toHaveTextContent('300 verses');
    expect(panel).toHaveTextContent('رَحِيم');
    expect(panel).toHaveTextContent('115');
    const connected = within(panel).getByRole('list', { name: /connected roots/i });
    expect(within(connected).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('أله'),
      expect.stringContaining('سمو'),
    ]);
    expect(await screen.findByText('1:3')).toBeInTheDocument();
  });

  it('selects a connected root on click', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: /أله/ }));
    expect(useGalaxyStore.getState().selectedId).toBe(1);
  });

  it('closes with the close button and with Escape', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(useGalaxyStore.getState().selectedId).toBeNull();
    act(() => useGalaxyStore.getState().select(3));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGalaxyStore.getState().selectedId).toBeNull();
  });
});
