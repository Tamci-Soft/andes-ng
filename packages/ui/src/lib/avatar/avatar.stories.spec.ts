import type { Type } from '@angular/core';
import { reflectComponentType } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

import * as avatarStories from './avatar.stories';
// Deliberately reaching into ANOTHER component's story file from the Avatar
// folder. The bug this suite exists for is a Storybook-configuration bug, and
// the whole point of the reported symptom was cross-component blast radius:
// one story file's malformed decorator producing NG0304s while a reader is
// looking at some unrelated component's page. A check that only ever ran over
// Avatar could not distinguish "Avatar is fine" from "Avatar is fine and so is
// everything it shares a preview build with", so the same invariant is
// asserted over every story file in the library. No Button source is touched -
// this only reads its story definitions.
import * as buttonStories from '../button/button.stories';

/**
 * Regression coverage for the meta-level decorator in avatar.stories.ts.
 *
 * It used to be hand-rolled as
 *
 *   (story) => ({ moduleMetadata: { imports: [...] }, ...story() })
 *
 * Decorators compose inside-out, so `story()` here is the result of the
 * STORY-level decorator, and spreading it last means a story that declares its
 * own `moduleMetadata` (the Group story did, for the group components)
 * overwrites the meta-level one entirely instead of adding to it. The Group
 * story therefore compiled with no `AndesAvatarImage` / `AndesAvatarFallback`
 * at all, and every `<andes-avatar-image>` / `<andes-avatar-fallback>` in its
 * template hit Angular's unknown-element path - NG0304 in the console, photo
 * and initials missing on the page.
 *
 * A `build-storybook` run cannot catch this: unknown elements are a RUNTIME
 * diagnostic, not a compile error, so the build stays green while the story is
 * visibly broken. Rather than boot a browser, this suite replays Storybook's
 * own decorator composition over the real story definitions and asserts the
 * invariant that was violated: every custom element a story's template renders
 * must be reachable from the module metadata that story compiles with.
 */

type AnyStory = StoryObj<unknown> & {
  decorators?: unknown[];
  render?: (args: unknown, context: unknown) => Record<string, unknown>;
};

type StoryModule = Record<string, unknown> & { default: Meta<unknown> };

interface ResolvedStory {
  readonly file: string;
  readonly exportName: string;
  readonly template: string;
  readonly selectors: readonly string[];
}

/**
 * Runs a story through the same decorator chain Storybook applies - story
 * decorators innermost, then meta decorators - and returns the final
 * `StoryFnAngularReturnType`. Anything that mis-composes `moduleMetadata` (the
 * original bug) shows up in the result exactly as it would in the browser.
 */
function resolveStory(
  meta: Meta<unknown>,
  story: AnyStory,
): Record<string, unknown> {
  const render = story.render ?? (meta as AnyStory).render;
  if (!render) {
    throw new Error('Story has no render function and no meta-level render');
  }

  const args = { ...(meta.args ?? {}), ...(story.args ?? {}) };
  const context = { args, parameters: {}, globals: {} };

  const decorators = [
    ...((story.decorators as ((fn: unknown, ctx: unknown) => unknown)[]) ?? []),
    ...((meta.decorators as ((fn: unknown, ctx: unknown) => unknown)[]) ?? []),
  ];

  let storyFn = () => render(args, context);
  for (const decorator of decorators) {
    const inner = storyFn;
    storyFn = () => decorator(inner, context) as ReturnType<typeof storyFn>;
  }

  return storyFn();
}

/**
 * Component selectors reachable from a resolved story: everything in its
 * module metadata, plus the story's own `component` - which `@storybook/angular`
 * adds to the compiled module for you, and which is therefore legitimately
 * absent from `imports`.
 */
function reachableSelectors(
  resolved: Record<string, unknown>,
  component: unknown,
): Set<string> {
  const metadata = (resolved['moduleMetadata'] ?? {}) as {
    imports?: unknown[];
    declarations?: unknown[];
  };
  const candidates = [
    component,
    ...(metadata.imports ?? []),
    ...(metadata.declarations ?? []),
  ];

  const selectors = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const mirror = reflectComponentType(candidate as Type<unknown>);
    if (mirror?.selector) {
      selectors.add(mirror.selector);
    }
  }
  return selectors;
}

/**
 * Custom element names a template renders. Restricted to the library's own
 * `andes-` prefix so that native tags, and third-party tags whose component is
 * supplied through the preview-level `applicationConfig` rather than a story's
 * `moduleMetadata`, don't produce false failures.
 */
function andesElementsIn(template: string): string[] {
  const matches = template.matchAll(/<(andes-[a-z0-9-]*)/g);
  return [...new Set([...matches].map((match) => match[1]))];
}

function collectStories(file: string, module: StoryModule): ResolvedStory[] {
  const meta = module.default;
  const stories: ResolvedStory[] = [];

  for (const [exportName, value] of Object.entries(module)) {
    if (exportName === 'default' || !value || typeof value !== 'object') {
      continue;
    }
    const story = value as AnyStory;
    const resolved = resolveStory(meta, story);
    const template = (resolved['template'] as string | undefined) ?? '';
    const component =
      (story as { component?: unknown }).component ?? meta.component;
    const selectors = [...reachableSelectors(resolved, component)];

    stories.push({ file, exportName, template, selectors });
  }

  return stories;
}

const storyFiles: Array<[string, StoryModule]> = [
  ['avatar.stories.ts', avatarStories as unknown as StoryModule],
  ['button.stories.ts', buttonStories as unknown as StoryModule],
];

const allStories = storyFiles.flatMap(([file, module]) =>
  collectStories(file, module),
);

describe('Storybook story module metadata', () => {
  it('finds the Avatar stories (guards against this suite silently testing nothing)', () => {
    const avatar = allStories.filter(
      (story) => story.file === 'avatar.stories.ts',
    );

    expect(avatar.length).toBeGreaterThanOrEqual(8);
    expect(avatar.map((story) => story.exportName)).toContain('Group');
  });

  it("also covers a second, unrelated component's stories", () => {
    expect(allStories.some((story) => story.file === 'button.stories.ts')).toBe(
      true,
    );
  });

  it.each(
    allStories.map(
      (story) => [`${story.file} > ${story.exportName}`, story] as const,
    ),
  )('%s renders no andes-* element it has not imported', (_label, story) => {
    const used = andesElementsIn(story.template);
    const missing = used.filter(
      (element) => !story.selectors.includes(element),
    );

    // The exact failure mode the old decorator produced: the element is in
    // the template, nothing in `moduleMetadata` declares it, and Angular
    // logs NG0304 and renders nothing where the component should be.
    expect(missing).toEqual([]);
  });

  it('keeps the Avatar parts available to the Group story specifically', () => {
    const group = allStories.find(
      (story) =>
        story.file === 'avatar.stories.ts' && story.exportName === 'Group',
    );

    // Before the fix this story's own `moduleMetadata` (group components
    // only) replaced the meta-level one wholesale, so these two were absent.
    expect(group?.selectors).toEqual(
      expect.arrayContaining([
        'andes-avatar-image',
        'andes-avatar-fallback',
        'andes-avatar-group',
        'andes-avatar-group-count',
      ]),
    );
  });
});
