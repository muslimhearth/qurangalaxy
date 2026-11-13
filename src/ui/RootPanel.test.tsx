import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RootPanel } from './RootPanel';
import { CONNECTED_PREVIEW } from './ConnectedRoots';
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

  it('shows the root meanings and the first meaning of each lemma', () => {
    useGalaxyStore.getState().select(0);
    render(<RootPanel />);
    const panel = screen.getByRole('complementary', { name: /root details/i });
    expect(within(panel).getByLabelText('Meanings')).toHaveTextContent('name, sky');
    const chips = within(within(panel).getByRole('list', { name: 'Lemmas' })).getAllByRole('listitem');
    expect(chips[0]).toHaveTextContent('name');
    expect(chips[1]).toHaveTextContent('sky');
    expect(chips[1]).not.toHaveTextContent('heaven');
  });

  it('hides the meanings line when a root has none', () => {
    useGalaxyStore.getState().setGalaxy({
      ...fixtureGalaxy,
      roots: fixtureGalaxy.roots.map((r) => ({ ...r, en: [], lemmas: r.lemmas.map((l) => ({ ...l, en: [] })) })),
    });
    useGalaxyStore.getState().select(0);
    render(<RootPanel />);
    expect(screen.queryByLabelText('Meanings')).toBeNull();
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

  it('shows the strongest connected roots first and the rest on demand', () => {
    // Give root 2 (رحم) 16 extra weak neighbors: 18 in total.
    const extra = Array.from({ length: 16 }, (_, i) => ({
      ...fixtureGalaxy.roots[3]!,
      id: 6 + i,
      ar: `ج${i}`,
    }));
    useGalaxyStore.getState().setGalaxy({
      ...fixtureGalaxy,
      roots: [...fixtureGalaxy.roots, ...extra],
      edges: [...fixtureGalaxy.edges, ...extra.map((r) => ({ source: 2, target: r.id, weight: 1 }))],
    });
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const list = () => within(screen.getByRole('list', { name: /connected roots/i })).getAllByRole('button');
    expect(list()).toHaveLength(CONNECTED_PREVIEW);
    expect(list()[0]).toHaveTextContent('أله');

    fireEvent.click(screen.getByRole('button', { name: 'Show all 18 connected roots' }));
    expect(list()).toHaveLength(18);
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
  });

  it('shows the full list again collapsed for the next root', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...fixtureGalaxy.roots[3]!, id: 6 + i, ar: `ج${i}` }));
    const edges = many.flatMap((r) => [
      { source: 1, target: r.id, weight: 1 },
      { source: 2, target: r.id, weight: 1 },
    ]);
    useGalaxyStore.getState().setGalaxy({ ...fixtureGalaxy, roots: [...fixtureGalaxy.roots, ...many], edges: [...fixtureGalaxy.edges, ...edges] });
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    act(() => useGalaxyStore.getState().select(1));
    expect(within(screen.getByRole('list', { name: /connected roots/i })).getAllByRole('button')).toHaveLength(CONNECTED_PREVIEW);
  });
});
