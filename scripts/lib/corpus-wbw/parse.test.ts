import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeEntities, extractTable, parseWordByWordPage } from './parse';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b &ndash; &quot;c&quot; &#39;d&#x27; &laquo;e&raquo;')).toBe(
      'a & b – "c" \'d\' «e»',
    );
  });

  it('leaves unknown entities as they are', () => {
    expect(decodeEntities('&foo;')).toBe('&foo;');
  });
});

describe('parseWordByWordPage', () => {
  it('reads location, transliteration and gloss of each word', () => {
    const words = parseWordByWordPage(fixture('wbw-2-255-excerpt.html'));
    expect(words.map((w) => w.location)).toEqual([
      '2:255:1',
      '2:255:2',
      '2:255:9',
      '2:255:11',
      '2:255:14',
      '2:255:50',
    ]);
    expect(words[0]).toEqual({ location: '2:255:1', translit: 'al-lahu', gloss: 'Allah -' });
    expect(words[1]).toEqual({ location: '2:255:2', translit: 'lā', gloss: '(there is) no' });
    expect(words[3]?.gloss).toBe('[and] not');
    expect(words[4]?.gloss).toBe('what(ever)');
    expect(words[5]?.gloss).toBe('the Most Great.');
  });

  it('reads every verse on a page that shows several verses', () => {
    const words = parseWordByWordPage(fixture('wbw-114-1.html'));
    expect(words).toHaveLength(20);
    expect(words[1]).toMatchObject({ location: '114:1:2', gloss: '"I seek refuge' });
    expect(words.at(-1)).toMatchObject({ location: '114:6:3', gloss: 'and men.' });
  });

  it('returns no words when the page has no word table', () => {
    expect(parseWordByWordPage('<html><body>Error</body></html>')).toEqual([]);
  });

  it('strips inner tags and decodes entities in the gloss', () => {
    const html =
      '<table class="morphologyTable"><tr><td><span class="location">(3:7:9)</span><br/>' +
      '<span class="phonetic">x</span><br/>the <i>Book</i> &amp; more</td></tr></table>';
    expect(parseWordByWordPage(html)).toEqual([{ location: '3:7:9', translit: 'x', gloss: 'the Book & more' }]);
  });
});

describe('extractTable', () => {
  it('keeps only the word table of a page', () => {
    const table = extractTable(fixture('wbw-114-1.html'));
    expect(table?.startsWith('<table class="morphologyTable"')).toBe(true);
    expect(table?.endsWith('</table>')).toBe(true);
  });

  it('returns undefined when there is no word table', () => {
    expect(extractTable('<html></html>')).toBeUndefined();
  });
});
