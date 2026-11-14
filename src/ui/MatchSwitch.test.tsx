import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MATCH_WEIGHTS, MatchSwitch, matchMode } from './MatchSwitch';
import { useGalaxyStore } from '../state/store';

describe('matchMode', () => {
  it('names the mode of a weight; any mix in between is hybrid', () => {
    expect(matchMode(0)).toBe('exact');
    expect(matchMode(0.3)).toBe('hybrid');
    expect(matchMode(0.5)).toBe('hybrid');
    expect(matchMode(1)).toBe('meaning');
  });

  it('maps each mode to one weight', () => {
    expect(MATCH_WEIGHTS).toEqual({ exact: 0, hybrid: 0.5, meaning: 1 });
  });
});

describe('MatchSwitch', () => {
  beforeEach(() => useGalaxyStore.setState(useGalaxyStore.getInitialState()));
  afterEach(cleanup);

  const radio = (name: string) => screen.getByRole('radio', { name });

  it('shows the current mode of the root search mix', () => {
    render(<MatchSwitch status="off" progress={0} />);
    expect(screen.getByRole('radiogroup', { name: 'Search mode' })).toBeInTheDocument();
    expect(radio('Exact')).toHaveAttribute('aria-checked', 'true');
    expect(radio('Hybrid')).toHaveAttribute('aria-checked', 'false');
  });

  it('writes the weight of the picked mode to the store', () => {
    render(<MatchSwitch status="off" progress={0} />);
    fireEvent.click(radio('Semantic'));
    expect(useGalaxyStore.getState().semanticWeight).toBe(1);
    fireEvent.click(radio('Hybrid'));
    expect(useGalaxyStore.getState().semanticWeight).toBe(0.5);
    expect(radio('Hybrid')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a saved in-between mix as hybrid', () => {
    useGalaxyStore.getState().setSemanticWeight(0.35);
    render(<MatchSwitch status="off" progress={0} />);
    expect(radio('Hybrid')).toHaveAttribute('aria-checked', 'true');
  });

  it('uses a given mix instead of the store', () => {
    let seen = -1;
    render(<MatchSwitch status="off" progress={0} weight={1} onWeight={(w) => (seen = w)} />);
    expect(radio('Semantic')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radio('Exact'));
    expect(seen).toBe(0);
    expect(useGalaxyStore.getState().semanticWeight).toBe(0);
  });

  it('shows model download progress', () => {
    render(<MatchSwitch status="loading" progress={0.42} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0.42');
    expect(screen.getByText(/loading meaning model.*42%/i)).toBeInTheDocument();
  });

  it('says when the model could not load', () => {
    render(<MatchSwitch status="error" progress={0} error="HTTP 404" />);
    expect(screen.getByText(/semantic search is unavailable/i)).toHaveTextContent('HTTP 404');
  });
});
