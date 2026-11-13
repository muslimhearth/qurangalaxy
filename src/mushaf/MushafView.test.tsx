import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MushafView } from './MushafView';
import { useGalaxyStore } from '../state/store';
import { resetLoadCache } from '../data/load';
import { fixtureGalaxy } from '../data/fixture';
import { useVerseFocus } from '../ui/verseFocus';

/** Center of dot `col` in row `row`, in client pixels, read from the canvas' geometry attributes. */
function dotCenter(canvas: HTMLElement, col: number, row: number) {
  const d = canvas.dataset;
  const area = { left: parseFloat(canvas.style.left), top: parseFloat(canvas.style.top) };
  const half = Number(d.dot) / 2;
  return {
    clientX: area.left + Number(d.left) + col * Number(d.pitch) + half,
    clientY: area.top + Number(d.top) + row * Number(d.pitch) + half,
  };
}

describe('MushafView', () => {
  beforeEach(() => {
    resetLoadCache();
    // Fixture mode serves occurrences without fetch; jsdom has no 2D canvas, so stub it.
    window.history.replaceState(null, '', '/?fixture');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('draws one canvas for the whole Quran', () => {
    render(<MushafView />);
    expect(screen.getByRole('img', { name: /6,236 verses in Mushaf order/ })).toBeInTheDocument();
    expect(screen.getByText(/Each dot is one verse/)).toBeInTheDocument();
  });

  it('shows surah name and verse key for the dot under the mouse', () => {
    render(<MushafView />);
    const canvas = screen.getByRole('img');
    // Row 2 lies inside Al-Baqarah at any width.
    fireEvent.pointerMove(canvas, { pointerType: 'mouse', ...dotCenter(canvas, 3, 2) });
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Al-Baqarah');
    expect(tip).toHaveTextContent(/2:\d+/);
    fireEvent.pointerLeave(canvas, { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens a lit verse in the root panel on click', async () => {
    useGalaxyStore.getState().select(2); // رحم: 1:1 and 1:3 in the fixture
    render(<MushafView />);
    expect(await screen.findByText('رحم')).toBeInTheDocument();
    const canvas = screen.getByRole('img');
    // Wait for occurrences to load, then click 1:3.
    await waitFor(() => {
      act(() => {
        fireEvent.click(canvas, dotCenter(canvas, 2, 0));
      });
      expect(useVerseFocus.getState().request?.key).toBe('1:3');
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Al-Fatihah');
    expect(screen.getByRole('tooltip')).toHaveTextContent('uses');
  });

  it('only shows the tooltip for a dim dot', async () => {
    useGalaxyStore.getState().select(2);
    useVerseFocus.setState({ request: null });
    render(<MushafView />);
    const canvas = screen.getByRole('img');
    fireEvent.click(canvas, dotCenter(canvas, 1, 0)); // 1:2 does not use رحم
    expect(screen.getByRole('tooltip')).toHaveTextContent('1:2');
    expect(useVerseFocus.getState().request).toBeNull();
  });

  it('moves between verses with the arrow keys', () => {
    render(<MushafView />);
    const canvas = screen.getByRole('img');
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('1:2');
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('1:1');
  });

  it('shows a legend for the selected and compare roots', async () => {
    useGalaxyStore.getState().select(2);
    render(<MushafView compareRootId={1} />);
    expect(await screen.findByText('رحم')).toBeInTheDocument();
    expect(screen.getByText('أله')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/1 use both/)).toBeInTheDocument());
  });
});
