import {
  andesMentionsDefaultFilter,
  andesMentionsDefaultValidateSearch,
  andesMentionsFindContext,
  andesMentionsInsert,
} from './mentions-context';
import {
  andesMentionsCaretPosition,
  andesMentionsResolveSide,
} from './mentions-caret';

describe('andesMentionsFindContext', () => {
  const find = (text: string, caret = text.length, prefixes = ['@']) =>
    andesMentionsFindContext(text, caret, prefixes, { split: ' ' });

  it('finds a trigger at the start of the text', () => {
    expect(find('@an')).toEqual({ prefix: '@', start: 0, end: 3, query: 'an' });
  });

  it('finds a trigger right after the trigger character itself with an empty query', () => {
    expect(find('hello @')).toEqual({
      prefix: '@',
      start: 6,
      end: 7,
      query: '',
    });
  });

  it('finds a trigger after any whitespace, including a line break', () => {
    expect(find('first\n@lu')?.start).toBe(6);
    expect(find('a\t@b')?.start).toBe(2);
  });

  it('ignores a trigger inside a word, such as an e-mail address', () => {
    expect(find('write to ana@host')).toBeNull();
  });

  it('only looks at the text before the caret', () => {
    expect(find('hi @ana and more', 6)).toEqual({
      prefix: '@',
      start: 3,
      end: 6,
      query: 'an',
    });
    expect(find('hi @ana and more', 2)).toBeNull();
  });

  it('uses the nearest trigger and does not resume an earlier one', () => {
    expect(find('@ana and @lu')?.query).toBe('lu');
    expect(find('@ana and then')).toBeNull();
  });

  it('stops being a search at the first split, and at a line break', () => {
    expect(find('@ana ')).toBeNull();
    expect(find('@ana\nx')).toBeNull();
  });

  it('supports several triggers, the later one winning', () => {
    expect(find('@ana #t', 7, ['@', '#'])).toEqual({
      prefix: '#',
      start: 5,
      end: 7,
      query: 't',
    });
    expect(find('#t @a', 5, ['@', '#'])?.prefix).toBe('@');
  });

  it('supports a trigger of more than one character, preferring the longer', () => {
    expect(find('x @@jo', 6, ['@', '@@'])?.prefix).toBe('@@');
    expect(find('x @@jo', 6, ['@', '@@'])?.query).toBe('jo');
  });

  it('lets validateSearch decide', () => {
    const allowSpaces = andesMentionsFindContext(
      '@ana to',
      7,
      ['@'],
      { split: ' ' },
      (query) => query.length < 20,
    );
    expect(allowSpaces?.query).toBe('ana to');

    const never = andesMentionsFindContext(
      '@a',
      2,
      ['@'],
      { split: ' ' },
      () => false,
    );
    expect(never).toBeNull();
  });

  it('passes the trigger and split to validateSearch', () => {
    const seen: unknown[] = [];
    andesMentionsFindContext(
      '#t',
      2,
      ['@', '#'],
      { split: ', ' },
      (q, info) => {
        seen.push([q, info]);
        return true;
      },
    );
    expect(seen).toEqual([['t', { prefix: '#', split: ', ' }]]);
  });

  it('ignores empty triggers', () => {
    expect(find('abc', 3, [''])).toBeNull();
  });
});

describe('default search rules', () => {
  it('validates until the split or a line break', () => {
    const info = { prefix: '@', split: ' ' };
    expect(andesMentionsDefaultValidateSearch('ana', info)).toBe(true);
    expect(andesMentionsDefaultValidateSearch('ana l', info)).toBe(false);
    expect(
      andesMentionsDefaultValidateSearch('a\nb', { ...info, split: '' }),
    ).toBe(false);
    expect(
      andesMentionsDefaultValidateSearch('a b', { ...info, split: '' }),
    ).toBe(true);
  });

  it('filters case-insensitively on label and value', () => {
    const option = { value: 'ana', label: 'Ana Torres' };
    expect(andesMentionsDefaultFilter('TOR', option)).toBe(true);
    expect(andesMentionsDefaultFilter('AN', option)).toBe(true);
    expect(andesMentionsDefaultFilter('zz', option)).toBe(false);
    expect(andesMentionsDefaultFilter('', option)).toBe(true);
    expect(andesMentionsDefaultFilter('ol', { value: 'olga' })).toBe(true);
  });
});

describe('andesMentionsInsert', () => {
  const context = { prefix: '@', start: 6, end: 9, query: 'an' };

  it('replaces the trigger and the typed text with trigger, value and split', () => {
    expect(
      andesMentionsInsert('hello @an', context, { value: 'ana' }, ' '),
    ).toEqual({ insert: '@ana ', text: 'hello @ana ', caret: 11 });
  });

  it('keeps the text after the caret', () => {
    expect(
      andesMentionsInsert('hello @an, bye', context, { value: 'ana' }, ' '),
    ).toEqual({ insert: '@ana ', text: 'hello @ana , bye', caret: 11 });
  });

  it('does not double a split that already follows the caret', () => {
    const result = andesMentionsInsert(
      'hello @an world',
      context,
      { value: 'ana' },
      ' ',
    );
    expect(result.text).toBe('hello @ana world');
    expect(result.caret).toBe(11);
  });

  it('inserts nothing after the value with an empty split', () => {
    expect(
      andesMentionsInsert('hello @an', context, { value: 'ana' }, ''),
    ).toEqual({ insert: '@ana', text: 'hello @ana', caret: 10 });
  });

  it('supports a multi-character split', () => {
    expect(
      andesMentionsInsert(
        '@an',
        { ...context, start: 0, end: 3 },
        { value: 'ana' },
        ', ',
      ).text,
    ).toBe('@ana, ');
  });
});

describe('andesMentionsCaretPosition', () => {
  /**
   * jsdom has no layout, so the marker's offsets are stubbed on the prototype. The property is
   * defined outright instead of spied on: the suites of a worker share one `HTMLElement`, and a
   * spec that deleted `offsetTop` while cleaning up would make a spy on it throw here. Whatever
   * was there before (a getter, or nothing) is put back afterwards.
   */
  const stubbed: [string, PropertyDescriptor | undefined][] = [];

  function stubOffsets(offsets: { offsetTop: number; offsetLeft: number }) {
    for (const [property, value] of Object.entries(offsets)) {
      stubbed.push([
        property,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, property),
      ]);
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        get: () => value,
      });
    }
  }

  afterEach(() => {
    for (const [property, descriptor] of stubbed.splice(0).reverse()) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, property, descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, property);
      }
    }
    document.body.innerHTML = '';
  });

  it('lays the text before the position out in a hidden copy and removes it again', () => {
    const field = document.createElement('textarea');
    field.value = 'one\ntwo @an';
    field.style.lineHeight = '22px';
    document.body.append(field);
    stubOffsets({ offsetTop: 22, offsetLeft: 31 });

    const before = document.body.children.length;
    const position = andesMentionsCaretPosition(field, 8);

    expect(position).toEqual({ top: 22, left: 31, height: 22 });
    expect(document.body.children.length).toBe(before);
  });

  it('subtracts the field scroll', () => {
    const field = document.createElement('textarea');
    field.value = 'text';
    document.body.append(field);
    field.scrollTop = 10;
    stubOffsets({ offsetTop: 40, offsetLeft: 5 });

    expect(andesMentionsCaretPosition(field, 2).top).toBe(30);
  });

  it('measures a single-line input on one line', () => {
    const field = document.createElement('input');
    field.value = 'a b';
    document.body.append(field);

    expect(() => andesMentionsCaretPosition(field, 2)).not.toThrow();
  });
});

describe('andesMentionsResolveSide', () => {
  it('reads the side back from the geometry', () => {
    const anchor = { top: 100, height: 20 };
    expect(
      andesMentionsResolveSide(
        anchor,
        { top: 124, height: 80, width: 9 },
        'bottom',
      ),
    ).toBe('bottom');
    expect(
      andesMentionsResolveSide(
        anchor,
        { top: 10, height: 80, width: 9 },
        'bottom',
      ),
    ).toBe('top');
    expect(
      andesMentionsResolveSide(
        anchor,
        { top: 124, height: 80, width: 9 },
        'top',
      ),
    ).toBe('bottom');
    expect(andesMentionsResolveSide(anchor, { top: 0, height: 0 }, 'top')).toBe(
      'top',
    );
  });
});
