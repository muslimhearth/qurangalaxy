import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchBox } from './SearchBox';
import { useGalaxyStore } from '../state/store';
import { fixtureGalaxy } from '../data/fixture';

describe('SearchBox', () => {
  beforeEach(() => {
    useGalaxyStore.setState(useGalaxyStore.getInitialState());
    useGalaxyStore.getState().setGalaxy(fixtureGalaxy);
  });
  afterEach(cleanup);

  const input = () => screen.getByRole('combobox', { name: /search roots/i });

  it('shows matching roots as you type', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    expect(useGalaxyStore.getState().query).toBe('rhm');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('رحم');
    expect(options[0]).toHaveTextContent('r-ḥ-m');
  });

  it('selects a result on click and clears the query', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.click(screen.getByRole('option'));
    expect(useGalaxyStore.getState().selectedId).toBe(2);
    expect(useGalaxyStore.getState().query).toBe('');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('moves through results with arrow keys and selects with Enter', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'r' } }); // r-b-b, r-ḥ-m
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(useGalaxyStore.getState().selectedId).toBe(2);
  });

  it('clears the query with Escape', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'rhm' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(useGalaxyStore.getState().query).toBe('');
  });

  it('says when nothing matches', () => {
    render(<SearchBox />);
    fireEvent.change(input(), { target: { value: 'zzz' } });
    expect(screen.getByText(/no roots match/i)).toBeInTheDocument();
  });
});
