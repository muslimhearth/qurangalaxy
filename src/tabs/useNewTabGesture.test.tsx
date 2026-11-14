import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LONG_PRESS_MS, useNewTabGesture } from './useNewTabGesture';
import { resetTabs, useTabsStore } from './store';
import { activeTab } from './model';

function Chip({ onSelect }: { onSelect: () => void }) {
  const newTab = useNewTabGesture();
  return (
    <button type="button" {...newTab(5, onSelect)}>
      chip
    </button>
  );
}

const tabs = () => useTabsStore.getState();

describe('useNewTabGesture', () => {
  let onSelect: ReturnType<typeof vi.fn<() => void>>;
  beforeEach(() => {
    resetTabs();
    onSelect = vi.fn<() => void>();
    render(<Chip onSelect={onSelect} />);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('a plain click selects in the current tab', () => {
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(tabs().tabs).toHaveLength(1);
  });

  it('Ctrl-click and Cmd-click open a background tab', () => {
    const before = tabs().activeId;
    fireEvent.click(screen.getByRole('button'), { ctrlKey: true });
    fireEvent.click(screen.getByRole('button'), { metaKey: true });
    expect(onSelect).not.toHaveBeenCalled();
    expect(tabs().tabs.map((t) => t.selectedId)).toEqual([null, 5, 5]);
    expect(tabs().activeId).toBe(before);
  });

  it('middle-click opens a background tab', () => {
    fireEvent(screen.getByRole('button'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(tabs().tabs).toHaveLength(2);
    expect(activeTab(tabs()).selectedId).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a touch long-press opens the root in a new tab and switches to it; the click after it is ignored', () => {
    vi.useFakeTimers();
    const chip = screen.getByRole('button');
    fireEvent.pointerDown(chip, { pointerType: 'touch', clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(tabs().tabs).toHaveLength(2);
    expect(activeTab(tabs()).selectedId).toBe(5);
    fireEvent.pointerUp(chip, { pointerType: 'touch' });
    fireEvent.click(chip);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a short tap or a drag is not a long-press', () => {
    vi.useFakeTimers();
    const chip = screen.getByRole('button');
    fireEvent.pointerDown(chip, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerUp(chip, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerDown(chip, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(chip, { pointerType: 'touch', clientX: 10, clientY: 40 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(tabs().tabs).toHaveLength(1);
  });

  it('a mouse press never starts a long-press', () => {
    vi.useFakeTimers();
    fireEvent.pointerDown(screen.getByRole('button'), { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 2));
    expect(tabs().tabs).toHaveLength(1);
  });
});
