import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MushafPrompt } from './MushafPrompt';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

describe('MushafPrompt', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  it('invites the user to pick a root and offers only roots the data has', () => {
    render(<MushafPrompt />);
    expect(screen.getByText('Pick a root to light its verses')).toBeInTheDocument();
    // The fixture has رحم but not نور.
    expect(screen.getByRole('button', { name: /رحم/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /نور/ })).toBeNull();
  });

  it('selects the root of a tapped chip', () => {
    render(<MushafPrompt />);
    fireEvent.click(screen.getByRole('button', { name: /رحم/ }));
    const { selectedId, galaxy } = useGalaxyStore.getState();
    expect(galaxy!.roots[selectedId!]!.ar).toBe('رحم');
  });

  it('hides while a root is selected', () => {
    useGalaxyStore.getState().select(0);
    const { container } = render(<MushafPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
