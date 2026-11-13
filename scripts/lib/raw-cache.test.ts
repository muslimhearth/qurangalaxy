import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { readCached } from './raw-cache';

describe('readCached', () => {
  it('downloads a missing file once, saves it, then reads it from disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'raw-'));
    const download = vi.fn(async () => 'hello');
    expect(await readCached(dir, 'a.txt', 'https://x', download)).toBe('hello');
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toBe('hello');
    expect(await readCached(dir, 'a.txt', 'https://x', download)).toBe('hello');
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('does not download when the file exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'raw-'));
    writeFileSync(join(dir, 'b.txt'), 'cached');
    const download = vi.fn(async () => 'new');
    expect(await readCached(dir, 'b.txt', 'https://x', download)).toBe('cached');
    expect(download).not.toHaveBeenCalled();
  });
});
