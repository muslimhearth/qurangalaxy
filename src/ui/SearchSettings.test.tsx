import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { modeLabel, SearchSettings } from './SearchSettings';
import { useGalaxyStore } from '../state/store';

describe('modeLabel', () => {
  it('names the current search mode in one short word', () => {
    expect(modeLabel(0)).toBe('Exact');
    expect(modeLabel(0.4)).toBe('Hybrid');
    expect(modeLabel(1)).toBe('Semantic');
  });
});

describe('SearchSettings', () => {
  beforeEach(() => useGalaxyStore.setState(useGalaxyStore.getInitialState()));
  afterEach(cleanup);

  const button = () => screen.getByRole('button', { name: /search mode/i });

  it('shows the current mode on a small button and keeps the slider hidden', () => {
    render(<SearchSettings status="off" progress={0} />);
    expect(button()).toHaveTextContent('Exact');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('opens the slider, updates the hint, and closes with Escape', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    const slider = screen.getByRole('slider', { name: /search mode/i });
    fireEvent.change(slider, { target: { value: '1' } });
    expect(button()).toHaveTextContent('Semantic');
    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(screen.queryByRole('slider')).toBeNull();
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps Escape from also closing the root panel', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    let reachedWindow = false;
    const onKey = () => (reachedWindow = true);
    window.addEventListener('keydown', onKey);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Escape' });
    window.removeEventListener('keydown', onKey);
    expect(reachedWindow).toBe(false);
  });

  it('closes when clicking outside', () => {
    render(<SearchSettings status="off" progress={0} />);
    fireEvent.click(button());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('shows model download progress on the button while the panel is closed', () => {
    useGalaxyStore.getState().setSemanticWeight(1);
    render(<SearchSettings status="loading" progress={0.42} />);
    const ring = screen.getByRole('progressbar', { name: /loading semantic model/i });
    expect(button()).toContainElement(ring);
    expect(ring).toHaveAttribute('aria-valuenow', '42');
    // No bare number on the chip: it would read like the semantic share.
    expect(button()).not.toHaveTextContent('%');
  });

  it('closes when focus moves outside, e.g. back to the search field', () => {
    render(
      <>
        <input aria-label="field" />
        <SearchSettings status="off" progress={0} />
      </>,
    );
    fireEvent.click(button());
    fireEvent.focusIn(screen.getByLabelText('field'));
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
