import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MEANINGS_KEY, MeaningsToggle, loadShowMeanings, useMeanings } from './meanings';

describe('meanings setting', () => {
  beforeEach(() => {
    localStorage.clear();
    useMeanings.setState({ show: true });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('is on by default and reads a saved "off"', () => {
    expect(loadShowMeanings()).toBe(true);
    localStorage.setItem(MEANINGS_KEY, 'false');
    expect(loadShowMeanings()).toBe(false);
  });

  it('saves a change', () => {
    useMeanings.getState().setShow(false);
    expect(localStorage.getItem(MEANINGS_KEY)).toBe('false');
    expect(useMeanings.getState().show).toBe(false);
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadShowMeanings()).toBe(true);
    useMeanings.getState().setShow(false);
    expect(useMeanings.getState().show).toBe(false);
  });

  it('the toggle shows the state and flips it', () => {
    render(<MeaningsToggle />);
    const button = screen.getByRole('button', { name: 'Show meanings' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(useMeanings.getState().show).toBe(false);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
