import { afterEach, describe, expect, it } from 'vitest';
import { trapTab } from './focusTrap';

function setup() {
  document.body.innerHTML =
    '<div id="d"><button id="a">a</button><button id="h" hidden>h</button><button id="b">b</button></div><button id="out">out</button>';
  return document.getElementById('d')!;
}
const key = (shiftKey = false) => new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });

describe('trapTab', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('wraps Tab from the last control to the first', () => {
    const d = setup();
    document.getElementById('b')!.focus();
    const e = key();
    trapTab(e, d);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('a');
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const d = setup();
    document.getElementById('a')!.focus();
    trapTab(key(true), d);
    expect(document.activeElement?.id).toBe('b');
  });

  it('pulls the focus back in when it is outside', () => {
    const d = setup();
    document.getElementById('out')!.focus();
    trapTab(key(), d);
    expect(document.activeElement?.id).toBe('a');
  });

  it('leaves Tab alone inside the dialog and ignores other keys', () => {
    const d = setup();
    document.getElementById('a')!.focus();
    const e = key();
    trapTab(e, d);
    expect(e.defaultPrevented).toBe(false);
    const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    trapTab(other, d);
    expect(other.defaultPrevented).toBe(false);
  });
});
