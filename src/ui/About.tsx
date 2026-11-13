import { useState } from 'react';

/** Corner title with a short how-to and the data source attribution (shown on demand). */
export function About() {
  const [open, setOpen] = useState(false);
  return (
    <div className="about panel">
      <div className="about-head">
        <h1>Quran Root Galaxy</h1>
        <button
          type="button"
          className="about-toggle"
          aria-expanded={open}
          aria-controls="about-body"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide' : 'About'}
        </button>
      </div>
      {open && (
        <div id="about-body" className="about-body">
          <p>
            Each star is an Arabic root of the Quran. Bigger stars have more words. Lines join roots that often share
            verses.
          </p>
          <ul>
            <li>Drag to turn, scroll to zoom.</li>
            <li>Click a star or search a root to see its words and verses.</li>
            <li>Press Escape to close the panel.</li>
          </ul>
          <p className="sources">
            Sources: <a href="https://corpus.quran.com/" target="_blank" rel="noreferrer">Quranic Arabic Corpus</a>{' '}
            (morphology), <a href="https://tanzil.net/" target="_blank" rel="noreferrer">Tanzil.net</a> (Uthmani text,
            Saheeh International translation).
          </p>
        </div>
      )}
    </div>
  );
}
