import {
  andesCommandMatch,
  andesCommandNormalize,
  andesCommandScore,
  andesCommandSegments,
} from './command-score';

describe('andesCommandNormalize', () => {
  it('lower-cases and strips accents without changing the length', () => {
    expect(andesCommandNormalize('Ácido CAFÉ Ñandú')).toBe('acido cafe nandu');
    const text = 'Crème Brûlée';
    expect(andesCommandNormalize(text)).toHaveLength(text.length);
  });
});

describe('andesCommandScore', () => {
  it('scores an empty query as a full match', () => {
    expect(andesCommandScore('Anything', '')).toBe(1);
    expect(andesCommandScore('Anything', '   ')).toBe(1);
  });

  it('scores no match as zero', () => {
    expect(andesCommandScore('Open file', 'zzz')).toBe(0);
    expect(andesCommandScore('abc', 'abcd')).toBe(0);
  });

  it('ranks exact above prefix above word-start above mid-word above fuzzy', () => {
    const exact = andesCommandScore('save', 'save');
    const prefix = andesCommandScore('save all', 'save');
    const wordStart = andesCommandScore('quick save', 'save');
    const midWord = andesCommandScore('unsaved', 'save');
    const fuzzy = andesCommandScore('s-a-v-e', 'save');

    expect(exact).toBe(1);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(midWord);
    expect(midWord).toBeGreaterThan(fuzzy);
    expect(fuzzy).toBeGreaterThan(0);
  });

  it('prefers an earlier hit and a larger share of the text', () => {
    expect(andesCommandScore('open the settings', 'set')).toBeGreaterThan(
      andesCommandScore('open the application settings', 'set'),
    );
    expect(andesCommandScore('settings', 'set')).toBeGreaterThan(
      andesCommandScore('settings and more settings here', 'set'),
    );
  });

  it('matches in-order characters, favouring word starts and runs', () => {
    expect(andesCommandScore('GitHub Home', 'gh')).toBeGreaterThan(0);
    // Initials of words beat characters scattered inside them.
    expect(andesCommandScore('Go Home', 'gh')).toBeGreaterThan(
      andesCommandScore('gigantic ash', 'gh'),
    );
    expect(andesCommandScore('Home Github', 'hg')).toBeGreaterThan(0);
    // Order matters.
    expect(andesCommandScore('abc', 'cba')).toBe(0);
  });

  it('ignores case and accents', () => {
    expect(andesCommandScore('Café Menú', 'CAFE')).toBeGreaterThan(0.9);
    expect(andesCommandScore('cafe', 'CAFÉ')).toBe(1);
  });

  it('requires every word of the query to match', () => {
    expect(andesCommandScore('Open recent file', 'open file')).toBeGreaterThan(
      0,
    );
    expect(andesCommandScore('Open recent file', 'open zip')).toBe(0);
    expect(andesCommandScore('Open recent file', 'file open')).toBeGreaterThan(
      0,
    );
  });

  it('finds an item through its keywords, a little below a direct hit', () => {
    const direct = andesCommandScore('Theme', 'theme');
    const viaKeyword = andesCommandScore('Appearance', 'theme', [
      'theme',
      'dark',
    ]);
    expect(viaKeyword).toBeGreaterThan(0);
    expect(viaKeyword).toBeLessThan(direct);
    expect(andesCommandScore('Appearance', 'night', ['theme', 'dark'])).toBe(0);
  });

  it('takes the better of the text and the keywords', () => {
    expect(andesCommandScore('Settings', 'settings', ['preferences'])).toBe(1);
  });

  it('copes with very long texts', () => {
    const long = `${'x'.repeat(500)} target`;
    expect(() => andesCommandScore(long, 'tgt')).not.toThrow();
    expect(andesCommandScore(long, 'target')).toBeGreaterThan(0);
  });
});

describe('andesCommandMatch ranges', () => {
  it('returns the matched stretch of a contiguous hit', () => {
    expect(andesCommandMatch('Open settings', 'set').ranges).toEqual([[5, 8]]);
  });

  it('returns indices into the original text even with accents', () => {
    expect(andesCommandMatch('Ácido Úrico', 'urico').ranges).toEqual([[6, 11]]);
  });

  it('groups consecutive fuzzy characters into runs', () => {
    // The second letter lands on the start of "Home", not inside "GitHub".
    expect(andesCommandMatch('GitHub Home', 'gh').ranges).toEqual([
      [0, 1],
      [7, 8],
    ]);
    expect(andesCommandMatch('abcdef', 'ace').ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('merges the ranges of several words', () => {
    expect(andesCommandMatch('Open recent file', 'open file').ranges).toEqual([
      [0, 4],
      [12, 16],
    ]);
  });

  it('has no ranges for a keyword hit or an empty query', () => {
    expect(andesCommandMatch('Appearance', 'theme', ['theme']).ranges).toEqual(
      [],
    );
    expect(andesCommandMatch('Appearance', '').ranges).toEqual([]);
  });
});

describe('andesCommandSegments', () => {
  it('cuts a text along the ranges', () => {
    expect(
      andesCommandSegments('Open settings', [
        [0, 1],
        [5, 8],
      ]),
    ).toEqual([
      { text: 'O', match: true },
      { text: 'pen ', match: false },
      { text: 'set', match: true },
      { text: 'tings', match: false },
    ]);
  });

  it('returns the whole text as unmatched without ranges, and nothing for an empty text', () => {
    expect(andesCommandSegments('Hello', [])).toEqual([
      { text: 'Hello', match: false },
    ]);
    expect(andesCommandSegments('', [])).toEqual([]);
  });

  it('does not create empty slices', () => {
    expect(andesCommandSegments('abc', [[0, 3]])).toEqual([
      { text: 'abc', match: true },
    ]);
  });
});
