import { encapsulateStyle } from '@angular/compiler';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AndesCheckbox } from './checkbox';

/**
 * Regression suite for the icon-visibility bug: a checked checkbox rendered as a plain solid
 * blue square, with no checkmark glyph at all, because the rule that reveals the icon never
 * matched anything.
 *
 * WHY THESE TESTS GO THROUGH `encapsulateStyle` RATHER THAN JUST RENDERING THE COMPONENT:
 * the bug only exists on the RUNTIME style-scoping path. The AOT builder (`ng-packagr`, and
 * the unit-test builder these specs run under) hands each component's CSS to esbuild first,
 * which reformats every selector onto a single line before Angular ever scopes it - so the
 * defect is invisible from a plain `TestBed` render. Storybook, by contrast, embeds the CSS
 * file's RAW text in the compiled bundle (verified by grepping dist/storybook) and Angular
 * scopes it in the browser at runtime, newlines and all. `encapsulateStyle` is precisely that
 * runtime entry point, so feeding it the real checkbox.css source is what reproduces what a
 * user actually sees - and it is the only way a test here can fail when the source regresses.
 */

const CSS_PATH = join(
  process.cwd(),
  new URL('./checkbox.css', import.meta.url).pathname,
);

/** Stand-in for the `%COMP%` placeholder Angular fills with the component's own id. */
const SCOPE = 'andes-test-scope';

function runtimeScopedCss(): string {
  const raw = readFileSync(CSS_PATH, 'utf8');

  return encapsulateStyle(raw).replace(/%COMP%/g, SCOPE);
}

/**
 * Re-stamps a rendered checkbox's scoping attributes with `SCOPE`, so that only the CSS this
 * suite compiles at runtime applies to it - never the already-correct copy the AOT build
 * injected into the document, which would otherwise mask the very bug under test.
 */
function withRuntimeScope(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;

  for (const element of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
    for (const { name } of Array.from(element.attributes)) {
      if (name.startsWith('_ngcontent-')) {
        element.removeAttribute(name);
        element.setAttribute(`_ngcontent-${SCOPE}`, '');
      } else if (name.startsWith('_nghost-')) {
        element.removeAttribute(name);
        element.setAttribute(`_nghost-${SCOPE}`, '');
      }
    }
  }

  return clone;
}

@Component({
  imports: [AndesCheckbox],
  template: `<andes-checkbox
    [checked]="checked()"
    [indeterminate]="indeterminate()"
    >Accept terms</andes-checkbox
  >`,
})
class IconHost {
  readonly checked = signal(false);
  readonly indeterminate = signal(false);
}

describe('AndesCheckbox style encapsulation', () => {
  let styleElement: HTMLStyleElement | undefined;
  let mounted: HTMLElement | undefined;

  afterEach(() => {
    styleElement?.remove();
    mounted?.remove();
    styleElement = undefined;
    mounted = undefined;
  });

  /**
   * Renders the real component, then mounts a runtime-scoped clone of its DOM styled only by
   * the runtime-scoped build of the real checkbox.css.
   */
  function renderWithRuntimeCss(options: {
    checked: boolean;
    indeterminate: boolean;
  }) {
    const fixture = TestBed.createComponent(IconHost);
    fixture.componentInstance.checked.set(options.checked);
    fixture.componentInstance.indeterminate.set(options.indeterminate);
    fixture.detectChanges();

    mounted = withRuntimeScope(fixture.nativeElement as HTMLElement);
    const input = mounted.querySelector('input') as HTMLInputElement;
    // `cloneNode` copies the `checked` ATTRIBUTE (`defaultChecked`) and skips `indeterminate`
    // entirely - both `:checked` and `:indeterminate` match on the live DOM PROPERTY, so they
    // have to be re-applied by hand here.
    input.checked = options.checked;
    input.indeterminate = options.indeterminate;

    styleElement = document.createElement('style');
    styleElement.textContent = runtimeScopedCss();
    document.head.appendChild(styleElement);
    document.body.appendChild(mounted);

    const opacityOf = (selector: string) =>
      getComputedStyle(mounted!.querySelector(selector) as Element).opacity;

    return { input, opacityOf };
  }

  describe('compiled selectors', () => {
    it('never emits a scoping attribute as a compound of its own', () => {
      // The actual defect, in its most general form: Angular treats a NEWLINE inside a
      // selector as a part boundary, drops the scoping attribute from the compound before it,
      // and emits that attribute as a standalone extra descendant step - matching an element
      // that does not exist. Guarding the whole stylesheet (rather than the three known
      // rules) is what makes this catch the next multi-line selector someone adds.
      const phantomStep = new RegExp(`(^|[\\s>~+(,])\\[_ngcontent-${SCOPE}\\]`);

      const offenders = runtimeScopedCss()
        .split('\n')
        .filter((line) => phantomStep.test(line));

      expect(offenders).toEqual([]);
    });

    it('attaches the scoping attribute to every compound of the icon rules', () => {
      const css = runtimeScopedCss();
      const attr = `[_ngcontent-${SCOPE}]`;

      for (const [state, icon] of [
        ['checked', 'check'],
        ['indeterminate', 'indeterminate'],
        ['indeterminate', 'check'],
      ] as const) {
        const selector = css
          .split('\n')
          .find(
            (line) =>
              line.includes(`:${state}`) &&
              line.includes(`.andes-checkbox__icon--${icon}${attr}`),
          );

        expect(selector).toBeDefined();
        // The box is the compound that lost its attribute, taking the whole rule down with it.
        expect(selector).toContain(`.andes-checkbox__box${attr}`);
      }
    });
  });

  describe('rendered icon visibility', () => {
    it('shows the check icon when checked', () => {
      const { input, opacityOf } = renderWithRuntimeCss({
        checked: true,
        indeterminate: false,
      });

      expect(input.checked).toBe(true);
      expect(opacityOf('.andes-checkbox__icon--check')).toBe('1');
    });

    it('hides the check icon when unchecked', () => {
      const { opacityOf } = renderWithRuntimeCss({
        checked: false,
        indeterminate: false,
      });

      expect(opacityOf('.andes-checkbox__icon--check')).toBe('0');
    });

    it('shows the indeterminate icon and hides the check icon when indeterminate', () => {
      const { input, opacityOf } = renderWithRuntimeCss({
        checked: true,
        indeterminate: true,
      });

      expect(input.indeterminate).toBe(true);
      expect(opacityOf('.andes-checkbox__icon--indeterminate')).toBe('1');
      expect(opacityOf('.andes-checkbox__icon--check')).toBe('0');
    });
  });
});
