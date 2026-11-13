import { describe, expect, it } from 'vitest';
import { useVerseFocus } from './verseFocus';

describe('useVerseFocus', () => {
  it('stores the requested verse with a growing tick', () => {
    useVerseFocus.getState().focusVerse('2:255');
    const first = useVerseFocus.getState().request!;
    expect(first.key).toBe('2:255');
    useVerseFocus.getState().focusVerse('2:255');
    expect(useVerseFocus.getState().request!.tick).toBe(first.tick + 1);
  });
});
