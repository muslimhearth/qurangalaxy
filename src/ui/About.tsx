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
          <p>Each star is an Arabic root of the Quran. Bigger stars have more words; lines join roots that share verses.</p>
          <ul>
            <li>Drag or two-finger swipe to turn; pinch or scroll to zoom.</li>
            <li>Tap a star, or search: رحم, noor, light. Use the gear for meaning search.</li>
          </ul>
          <p className="sources">
            Sources: <a href="https://corpus.quran.com/" target="_blank" rel="noreferrer">Quranic Arabic Corpus</a>{' '}
            (morphology), <a href="https://tanzil.net/" target="_blank" rel="noreferrer">Tanzil.net</a> (Uthmani text,
            Saheeh International translation, English transliteration),{' '}
            <a href="https://en.wiktionary.org/" target="_blank" rel="noreferrer">
              Wiktionary
            </a>{' '}
            (English meanings, CC BY-SA 4.0).
          </p>
        </div>
      )}
    </div>
  );
}
