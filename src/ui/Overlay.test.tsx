import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Overlay } from './Overlay';
import { useGalaxyStore } from '../state/store';
import { useLoadError } from './loadError';
import { resetLoadCache } from '../data/load';
import { fixtureGalaxy } from '../data/fixture';
import { resetTabs } from '../tabs/store';

describe('Overlay', () => {
  beforeEach(() => {
    resetLoadCache();
    window.history.replaceState(null, '', '/?fixture');
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useLoadError.setState({ error: null });
    // Tabs are saved and restored; start every test with one empty tab.
    localStorage.clear();
    resetTabs();
  });
  afterEach(cleanup);

  it('shows a loading screen until the galaxy is ready', () => {
    render(<Overlay />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    act(() => useGalaxyStore.getState().setGalaxy(fixtureGalaxy));
    expect(screen.queryByText(/loading the galaxy/i)).toBeNull();
    expect(screen.getByRole('combobox', { name: /search roots/i })).toBeInTheDocument();
  });

  it('shows an error screen when loading fails', () => {
    useLoadError.setState({ error: 'Could not load galaxy.json: HTTP 404' });
    render(<Overlay />);
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 404');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('keeps the container click-through and panels clickable', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    const { container } = render(<Overlay />);
    expect(container.firstElementChild).toHaveClass('overlay');
    expect(container.querySelector('.search')).toHaveClass('panel');
  });

  it('shows the title, how-to and source attribution', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    render(<Overlay />);
    expect(screen.getByRole('heading', { name: /quran root galaxy/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.getByText(/quranic arabic corpus/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tanzil/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/saheeh international/i)).toBeInTheDocument();
  });

  it('shows a hover hint for the hovered root', () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    render(<Overlay />);
    expect(screen.queryByTestId('hover-hint')).toBeNull();
    act(() => useGalaxyStore.getState().hover(4));
    const hint = screen.getByTestId('hover-hint');
    expect(hint).toHaveTextContent('ربب');
    expect(hint).toHaveTextContent('r-b-b');
    expect(hint).toHaveTextContent('980');
    // The panel already names the selected root, so no hint for it.
    act(() => useGalaxyStore.getState().select(4));
    expect(screen.queryByTestId('hover-hint')).toBeNull();
  });

  it('opens the panel when a root is selected through the store', async () => {
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
    render(<Overlay />);
    act(() => useGalaxyStore.getState().select(2));
    expect(screen.getByRole('complementary', { name: /root details/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/root/' + encodeURIComponent('رحم'));
    await screen.findByText('1:3');
    expect(document.querySelectorAll('mark')).toHaveLength(4);
  });
});
