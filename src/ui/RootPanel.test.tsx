import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RootPanel } from './RootPanel';
import { CONNECTED_PREVIEW } from './ConnectedRoots';
import { useGalaxyStore } from '../state/store';
import { resetLoadCache } from '../data/load';
import { fixtureGalaxy } from '../data/fixture';
import { useVerseFocus } from './verseFocus';
import { resetBookmarks, useBookmarks } from '../bookmarks/store';

describe('RootPanel', () => {
  beforeEach(() => {
    resetLoadCache();
    // Fixture mode serves occurrences and verses without fetch.
    window.history.replaceState(null, '', '/?fixture');
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  it('bookmarks the root from the header', () => {
    localStorage.clear();
    resetBookmarks();
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark رحم' }));
    expect(useBookmarks.getState().has({ root: 2 })).toBe(true);
  });

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
    // Highest score first: سمو (score 4.5) before أله (score 0.9), though أله shares more verses.
    expect(within(connected).getAllByRole('listitem').map((b) => b.textContent)).toEqual([
      expect.stringContaining('سمو'),
      expect.stringContaining('أله'),
    ]);
    expect(panel).toHaveTextContent('Roots that appear with رحم more than chance');
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
    fireEvent.click(screen.getByRole('button', { name: 'أله' }));
    expect(useGalaxyStore.getState().selectedId).toBe(1);
  });

  it('explains a link in the chip title: shared verses and how far above chance', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    // Link 0-2: 2 shared verses, score 4.5 = lift × log2(3), so lift ≈ 2.8.
    expect(screen.getByRole('button', { name: 'سمو' })).toHaveAttribute(
      'title',
      's-m-w: 2 shared verses, 2.8× more often than chance',
    );
  });

  it('shows the verses both roots share on a tap on the count, with both roots marked', async () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const count = screen.getByRole('button', { name: 'Show the 2 verses shared with سمو' });
    fireEvent.click(count);
    expect(count).toHaveAttribute('aria-pressed', 'true');
    const shared = await screen.findByRole('region', { name: 'Verses with رحم and سمو' });
    // Only 1:1 holds both roots in the fixture occurrences.
    expect(await within(shared).findByText('1:1')).toBeInTheDocument();
    expect(within(shared).queryByText('1:3')).toBeNull();
    const marks = [...shared.querySelectorAll('.verse-ar mark')].map((m) => [m.textContent, m.className]);
    expect(marks).toEqual([
      ['بِسْمِ', 'alt'],
      ['ٱلرَّحْمَٰنِ', ''],
      ['ٱلرَّحِيمِ', ''],
    ]);
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    // A second tap closes it.
    fireEvent.click(count);
    expect(screen.queryByRole('region', { name: /verses with/i })).toBeNull();
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
      edges: [...fixtureGalaxy.edges, ...extra.map((r) => ({ source: 2, target: r.id, weight: 1, score: 0.1 }))],
    });
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const list = () => within(screen.getByRole('list', { name: /connected roots/i })).getAllByRole('listitem');
    expect(list()).toHaveLength(CONNECTED_PREVIEW);
    expect(list()[0]).toHaveTextContent('سمو');

    fireEvent.click(screen.getByRole('button', { name: 'Show all 18 connected roots' }));
    expect(list()).toHaveLength(18);
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
  });

  it('shows the full list again collapsed for the next root', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...fixtureGalaxy.roots[3]!, id: 6 + i, ar: `ج${i}` }));
    const edges = many.flatMap((r) => [
      { source: 1, target: r.id, weight: 1, score: 1 },
      { source: 2, target: r.id, weight: 1, score: 1 },
    ]);
    useGalaxyStore.getState().setGalaxy({ ...fixtureGalaxy, roots: [...fixtureGalaxy.roots, ...many], edges: [...fixtureGalaxy.edges, ...edges] });
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: /show all/i }));
    act(() => useGalaxyStore.getState().select(1));
    expect(within(screen.getByRole('list', { name: /connected roots/i })).getAllByRole('listitem')).toHaveLength(CONNECTED_PREVIEW);
  });

  it('minimizes to its header and expands again', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const toggle = screen.getByRole('button', { name: 'Minimize root details' });
    fireEvent.click(toggle);
    expect(screen.getByRole('list', { name: 'Lemmas', hidden: true })).not.toBeVisible();
    expect(screen.getByRole('heading', { level: 2 })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Expand root details' }));
    expect(screen.getByRole('list', { name: 'Lemmas' })).toBeVisible();
  });

  it('opens expanded again when another root is selected', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize root details' }));
    act(() => useGalaxyStore.getState().select(1));
    expect(screen.getByRole('list', { name: 'Lemmas' })).toBeVisible();
  });

  it('maximizes and restores the sheet', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    const panel = screen.getByRole('complementary', { name: /root details/i });
    fireEvent.click(screen.getByRole('button', { name: 'Maximize root details' }));
    expect(panel).toHaveClass('max');
    // At full size there is nothing bigger: only "restore" goes back down.
    expect(screen.queryByRole('button', { name: 'Maximize root details' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restore root details' }));
    expect(panel).not.toHaveClass('max');
    expect(panel).not.toHaveClass('collapsed');
  });

  it('opens a minimized sheet when its header is tapped', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize root details' }));
    fireEvent.click(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByRole('list', { name: 'Lemmas' })).toBeVisible();
  });

  it('opens a minimized sheet on a verse focus request, and stays minimized after', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize root details' }));
    act(() => useVerseFocus.getState().focusVerse('1:3'));
    expect(screen.getByRole('list', { name: 'Lemmas' })).toBeVisible();
    // The same request does not reopen the sheet when the user minimizes it again.
    fireEvent.click(screen.getByRole('button', { name: 'Minimize root details' }));
    expect(screen.queryByRole('list', { name: 'Lemmas' })).toBeNull();
  });

  it('does not close or resize when the header is tapped while open', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    fireEvent.click(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByRole('list', { name: 'Lemmas' })).toBeVisible();
    expect(useGalaxyStore.getState().selectedId).toBe(2);
  });

  it('shows "Back to" with the panel, but not when the sheet is maximized', () => {
    useGalaxyStore.getState().select(2);
    render(<RootPanel />);
    act(() => useGalaxyStore.getState().setAwayFromSelection(true));
    expect(screen.getByRole('button', { name: 'Back to رحم' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Maximize root details' }));
    expect(screen.queryByRole('button', { name: 'Back to رحم' })).toBeNull();
  });
});
