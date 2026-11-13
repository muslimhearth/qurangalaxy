import { describe, expect, it } from 'vitest';
import { parseLemmaPage, parseRootAppendix } from './pages';

const NUR_APPENDIX = `==Arabic==

===Etymology===
From {{der|ar|sem-pro|*nūr-|t=light}}.

===Root===
{{ar-root-head}}

# Related to [[light]].

====Derived terms====
{{ar-verb forms||a|II=+|IV=+}}

* {{l|ar|نُور|t=light}}
* {{l|ar|نَار|t=fire}}
* {{l|ar|رحمن|رَحْمَان|t=[[merciful]], [[compassionate]]}}
* {{l|ar|رُحْمَى}}
`;

const RAHM_ROOT = `==Arabic==
===Root===
{{ar-root-head}}

# {{non-gloss|relating to [[mercy]]}}
`;

describe('parseRootAppendix', () => {
  it('reads the root meaning without "related to"', () => {
    expect(parseRootAppendix(NUR_APPENDIX).glosses).toEqual(['light']);
    expect(parseRootAppendix(RAHM_ROOT).glosses).toEqual(['mercy']);
  });

  it('handles the ng template, "forms terms related to" and "the number"', () => {
    const page = (s: string) => parseRootAppendix(`==Arabic==\n===Root===\n# ${s}`).glosses;
    expect(page('{{ng|related to the number [[three]]}}')).toEqual(['three']);
    expect(page('{{n-g|Forms terms related to traveling.}}')).toEqual(['traveling']);
    expect(page('bowing down; relate to bending')).toEqual(['bowing down', 'bending']);
  });

  it('splits meanings joined by "and" or "or"', () => {
    expect(parseRootAppendix('==Arabic==\n===Root===\n# Related to [[sea]] and [[sailing]].').glosses).toEqual([
      'sea',
      'sailing',
    ]);
  });

  it('reads derived terms with their glosses', () => {
    expect(parseRootAppendix(NUR_APPENDIX).derived).toEqual([
      { word: 'نُور', glosses: ['light'] },
      { word: 'نَار', glosses: ['fire'] },
      { word: 'رَحْمَان', glosses: ['merciful', 'compassionate'] },
    ]);
  });
});

const YAWM = `==Arabic==
{{ar-rootbox|ي و م}}

===Etymology 1.1===
{{ety|ar|:inh|sem-pro:*yawm-|text=+|tree=1}}

====Pronunciation====
{{ar-pr|يَوْم}}

====Noun====
{{ar-noun|يَوْم|m|pl=أَيَّام}}

# [[day]], period from [[sunrise]] to [[sunset]]
#: {{ant|ar|لَيْلَة}}
#* {{RQ:Qur'an|69|7
|passage=سَخَّرَهَا
|translation=Which Allah imposed upon them.}}
# [[day]], period of [[twenty-four]] hours
# {{lb|ar|in the plural}} [[days]] {{gl|a particular time}}
# {{lb|ar|singulare tantum}} [[Judgment Day]]

=====Declension=====
{{ar-decl-noun|يَوْم|pl=أَيَّام}}

===Etymology 1.2===

====Pronunciation====
{{ar-pr|يَوْمَ}}

====Conjunction====
{{ar-head|conj|يَوْمَ}}

# at the day when

==Persian==
# روز
`;

const ILM = `==Arabic==

===Etymology 1===
{{ar-rootbox|ع ل م}}

====Pronunciation====
{{ar-pr|عَلِمَ}}

====Verb====
{{ar-verb|I/i~a.vn:عِلْم.ap:+}}

# {{lb|ar|transitive}} to [[know]], to have [[knowledge]]

===Etymology 3===
{{ar-rootbox|ع ل م}}

====Pronunciation====
{{ar-pr|عِلْم}}

====Noun====
{{ar-noun|عِلْم|m|pl=عُلُوم}}

# {{ar-verbal noun of|عَلِمَ|form=I}}
# [[knowledge]], [[learning]], [[lore]]

===Etymology 2===
{{ar-root|ق ي ل}}

====Proper noun====
{{ar-proper noun|عَلِيم}}

# [[Alim]]
`;

describe('parseLemmaPage', () => {
  it('reads one entry per part of speech with root, head and glosses', () => {
    const entries = parseLemmaPage('يوم', YAWM);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      title: 'يوم',
      root: 'يوم',
      head: 'يَوْم',
      pos: 'Noun',
      glosses: ['day', 'Judgment Day'],
    });
    expect(entries[1]).toMatchObject({ head: 'يَوْمَ', pos: 'Conjunction', glosses: ['at the day when'] });
  });

  it('takes the head of a verb from its pronunciation and keeps form-of targets', () => {
    const [verb, noun, proper] = parseLemmaPage('علم', ILM);
    expect(verb).toMatchObject({ head: 'عَلِمَ', root: 'علم', glosses: ['to know', 'to have knowledge'] });
    expect(noun).toMatchObject({ head: 'عِلْم', glosses: ['knowledge', 'learning', 'lore'] });
    expect(noun!.formOf).toEqual([{ kind: 'verbal noun', target: 'عَلِمَ' }]);
    expect(proper).toMatchObject({ root: 'قيل', pos: 'Proper noun', glosses: ['Alim'] });
  });

  it('returns nothing for a page without an Arabic section', () => {
    expect(parseLemmaPage('x', '==English==\n# x')).toEqual([]);
  });
});
