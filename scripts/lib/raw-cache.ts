import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Fetches a URL and returns its body as text. */
export type Downloader = (url: string) => Promise<string>;

/** Default downloader: plain fetch that fails on a non-2xx status. */
export const fetchText: Downloader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return res.text();
};

/**
 * Returns the contents of `dir/name`. Downloads it from `url` first if the file is missing.
 */
export async function readCached(
  dir: string,
  name: string,
  url: string,
  download: Downloader = fetchText,
): Promise<string> {
  const path = join(dir, name);
  if (!existsSync(path)) {
    console.log(`Downloading ${name} ...`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, await download(url));
  }
  return readFileSync(path, 'utf8');
}
