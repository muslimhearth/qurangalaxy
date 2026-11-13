import { describe, expect, it } from 'vitest';
import { freeArea } from './freeArea';

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('freeArea', () => {
  it('fills the screen below the search field and above bottom bars', () => {
    const area = freeArea(1280, 720, { panel: null, top: [rect(420, 16, 440, 46)], bottom: [rect(16, 660, 200, 44)] });
    expect(area).toEqual({ left: 24, top: 86, width: 1232, height: 550 });
  });

  it('leaves out a side panel on the right', () => {
    const area = freeArea(1280, 720, { panel: rect(844, 16, 420, 688), top: [rect(420, 16, 440, 46)], bottom: [] });
    expect(area.left + area.width).toBe(844 - 24);
    expect(area.height).toBe(720 - 86 - 24);
  });

  it('stops above a bottom sheet on phones', () => {
    const area = freeArea(412, 915, { panel: rect(0, 600, 412, 315), top: [rect(16, 10, 380, 46)], bottom: [] });
    expect(area).toEqual({ left: 12, top: 68, width: 388, height: 600 - 12 - 68 });
  });

  it('never returns a negative size', () => {
    const area = freeArea(412, 915, { panel: rect(0, 74, 412, 841), top: [rect(16, 10, 380, 46)], bottom: [] });
    expect(area.height).toBe(0);
  });
});
