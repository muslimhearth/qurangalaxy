import { describe, expect, it } from 'vitest';
import { snippet } from './snippet';

describe('snippet', () => {
  it('keeps short text as is', () => {
    expect(snippet('Indeed, Allah is with the patient.', 60)).toBe('Indeed, Allah is with the patient.');
  });

  it('cuts long text at a word boundary and adds an ellipsis', () => {
    expect(snippet('O you who have believed, seek help through patience and prayer.', 30)).toBe(
      'O you who have believed, seek…',
    );
  });
});
