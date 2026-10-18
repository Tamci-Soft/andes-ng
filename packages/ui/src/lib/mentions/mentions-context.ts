/** One suggestion offered after a trigger character. */
export interface AndesMentionOption {
  /** Inserted into the text after the trigger, and what the default filter matches. */
  readonly value: string;
  /** What the list shows. Defaults to `value`. */
  readonly label?: string;
  /** A disabled option is shown but cannot be picked, and navigation skips it. */
  readonly disabled?: boolean;
  /** Stable identity for the list, when two options share a `value`. */
  readonly key?: string | number;
  /** Anything a custom option template wants to render (an avatar URL, a role). */
  readonly data?: unknown;
}

/** The mention being typed: the trigger, where it starts and what follows it. */
export interface AndesMentionContext {
  /** The trigger that opened it (`@`, `#`, ...). */
  readonly prefix: string;
  /** Index of the trigger's first character in the text. */
  readonly start: number;
  /** Index just after the last typed character (the caret). */
  readonly end: number;
  /** The text typed after the trigger, which the options are filtered by. */
  readonly query: string;
}

/** What `validateSearch` receives next to the typed text. */
export interface AndesMentionSearchInfo {
  readonly prefix: string;
  readonly split: string;
}

/**
 * Decides whether the text typed after a trigger is still a search. When it returns `false`
 * the suggestions close. The default stops at the first `split` and at a line break, so
 * "@ana is" is no longer a search for "ana is".
 */
export type AndesMentionValidateSearch = (
  query: string,
  info: AndesMentionSearchInfo,
) => boolean;

/** Decides which options remain for the typed text. */
export type AndesMentionFilter = (
  query: string,
  option: AndesMentionOption,
) => boolean;

/** The default {@link AndesMentionValidateSearch}. */
export function andesMentionsDefaultValidateSearch(
  query: string,
  info: AndesMentionSearchInfo,
): boolean {
  if (/[\r\n]/.test(query)) {
    return false;
  }
  return !info.split || !query.includes(info.split);
}

/** The default {@link AndesMentionFilter}: a case-insensitive "contains" on label and value. */
export function andesMentionsDefaultFilter(
  query: string,
  option: AndesMentionOption,
): boolean {
  const needle = query.toLocaleLowerCase();
  return (
    (option.label ?? option.value).toLocaleLowerCase().includes(needle) ||
    option.value.toLocaleLowerCase().includes(needle)
  );
}

/**
 * Finds the mention being typed at the caret, if any.
 *
 * The nearest trigger before the caret wins, and only a trigger at the start of the text or
 * right after whitespace counts, so "mail@host" is not a mention. If the text after that
 * trigger is no longer a valid search the answer is `null`: an earlier trigger further back is
 * not resumed.
 */
export function andesMentionsFindContext(
  text: string,
  caret: number,
  prefixes: readonly string[],
  info: { split: string },
  validate: AndesMentionValidateSearch = andesMentionsDefaultValidateSearch,
): AndesMentionContext | null {
  const before = text.slice(0, caret);
  let best: { prefix: string; start: number } | null = null;

  for (const prefix of prefixes) {
    if (!prefix) {
      continue;
    }
    let index = before.lastIndexOf(prefix);
    while (index >= 0) {
      if (index === 0 || /\s/.test(before.charAt(index - 1))) {
        if (
          !best ||
          index > best.start ||
          (index === best.start && prefix.length > best.prefix.length)
        ) {
          best = { prefix, start: index };
        }
        break;
      }
      index = index === 0 ? -1 : before.lastIndexOf(prefix, index - 1);
    }
  }

  if (!best) {
    return null;
  }
  const query = before.slice(best.start + best.prefix.length);
  if (!validate(query, { prefix: best.prefix, split: info.split })) {
    return null;
  }
  return { prefix: best.prefix, start: best.start, end: caret, query };
}

/** The text and caret after a suggestion replaces the mention being typed. */
export interface AndesMentionInsertion {
  /** The text that replaces the range from the trigger to the caret. */
  readonly insert: string;
  /** The whole new text. */
  readonly text: string;
  /** Where the caret goes. */
  readonly caret: number;
}

/**
 * Builds the result of picking `option` for `context`: the trigger, the option's value and
 * `split`. A `split` that already follows the caret is reused instead of doubled, so picking
 * in the middle of "hello @an| world" leaves a single space.
 */
export function andesMentionsInsert(
  text: string,
  context: AndesMentionContext,
  option: AndesMentionOption,
  split: string,
): AndesMentionInsertion {
  const head = text.slice(0, context.start);
  const tail = text.slice(context.end);
  const insert = context.prefix + option.value;
  const reuseSplit = !!split && tail.startsWith(split);
  const fullInsert = reuseSplit || !split ? insert : insert + split;
  const next = head + fullInsert + tail;
  const caret = head.length + insert.length + (split ? split.length : 0);
  return {
    insert: fullInsert,
    text: next,
    caret: Math.min(caret, next.length),
  };
}
