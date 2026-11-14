import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useGalaxyStore } from '../state/store';
import { ModeSwitch } from './ModeSwitch';

describe('ModeSwitch', () => {
  beforeEach(() => useGalaxyStore.setState(useGalaxyStore.getInitialState()));
  afterEach(cleanup);

  it('shows the current mode and switches it', () => {
    const onSwitch = vi.fn();
    render(<ModeSwitch onSwitch={onSwitch} />);
    expect(screen.getByRole('radio', { name: 'Roots' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Verses' }));
    expect(useGalaxyStore.getState().searchMode).toBe('verses');
    expect(screen.getByRole('radio', { name: 'Verses' })).toHaveAttribute('aria-checked', 'true');
    expect(onSwitch).toHaveBeenCalledWith('verses');
  });
});
