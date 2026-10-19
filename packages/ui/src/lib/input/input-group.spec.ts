import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesButton } from '../button/button';
import { AndesInput, AndesInputSize } from './input';
import { AndesInputGroup } from './input-group';

describe('AndesInputGroup', () => {
  @Component({
    imports: [AndesInputGroup, AndesInput, AndesButton],
    template: `<andes-input-group aria-label="Convert amount" [block]="block()">
      <andes-input aria-label="Amount" />
      <andes-button>Convert</andes-button>
    </andes-input-group>`,
  })
  class HostComponent {
    readonly block = signal(false);
  }

  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'input-group.css'),
    'utf-8',
  );

  it('is a labelled group that projects its children', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      'andes-input-group',
    ) as HTMLElement;

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Convert amount');
    expect(group.classList).toContain('andes-input-compact');
    expect(group.querySelector('andes-input input')).toBeTruthy();
    expect(group.querySelector('andes-button button')).toBeTruthy();
  });

  it('toggles the full-width modifier with `block`', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('andes-input-group');

    expect(group.classList).not.toContain('andes-input-compact--block');

    fixture.componentInstance.block.set(true);
    fixture.detectChanges();

    expect(group.classList).toContain('andes-input-compact--block');
  });

  it('overlaps neighbouring borders and squares off only the inner corners', () => {
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:first-child\) {\s*margin-inline-start: -1px;/,
    );
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:first-child\) :is\([^)]*\.andes-input-wrapper[^)]*\.andes-button[^)]*\) {\s*border-start-start-radius: 0;\s*border-end-start-radius: 0;/,
    );
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:last-child\) :is\([^)]*\.andes-input-wrapper[^)]*\.andes-button[^)]*\) {\s*border-start-end-radius: 0;\s*border-end-end-radius: 0;/,
    );
  });

  it('stretches buttons to the field height only when the row holds a field', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('andes-input-group').classList,
    ).toContain('andes-input-compact--fields');

    @Component({
      imports: [AndesInputGroup, AndesButton],
      template: `<andes-input-group
        ><andes-button>A</andes-button
        ><andes-button>B</andes-button></andes-input-group
      >`,
    })
    class ButtonsOnlyHost {}
    const buttonsOnly = TestBed.createComponent(ButtonsOnlyHost);
    buttonsOnly.detectChanges();

    expect(
      buttonsOnly.nativeElement.querySelector('andes-input-group').classList,
    ).not.toContain('andes-input-compact--fields');
  });

  it('gives a button no height of its own, so it is exactly as tall as the fields', () => {
    // `height: auto` alone is not enough: a button's own vertical padding, border and line
    // height would give it a natural height (26px) above an `sm` field's 24px and the whole
    // row would grow. With none of those, the row's stretch decides.
    const body = ruleBody(
      css,
      ':host(.andes-input-compact--fields) ::ng-deep > andes-button .andes-button',
    );

    expect(body).toMatch(/box-sizing: border-box;/);
    expect(body).toMatch(/height: auto;/);
    expect(body).toMatch(/min-height: 0;/);
    expect(body).toMatch(/padding-block: 0;/);
    expect(body).toMatch(/line-height: 1;/);
    expect(body).toMatch(/font-size: var\(--_andes-compact-font-size\);/);
  });

  describe('status borders', () => {
    it('raises a field in error or warning above its neighbours so its shared edge shows', () => {
      const body = ruleBody(
        css,
        ':host ::ng-deep > :has(.andes-input-group--invalid, .andes-input-group--warning)',
      );
      expect(body).toMatch(/position: relative;/);
      expect(body).toMatch(/z-index: 1;/);
      expect(ruleBody(css, ":host ::ng-deep > [aria-invalid='true']")).toMatch(
        /z-index: 1;/,
      );
    });
  });

  describe('single focus ring', () => {
    it('draws one border overlay and one ring on the row, keyed off :focus-within', () => {
      expect(ruleBody(css, ':host(:focus-within)')).toMatch(
        /box-shadow: 0 0 0 2px var\(--_andes-compact-ring\);/,
      );
      expect(ruleBody(css, ':host(:focus-within)::after')).toMatch(
        /border-color: var\(--_andes-compact-border-focus\);/,
      );
      expect(ruleBody(css, ':host(:hover)::after')).toMatch(
        /border-color: var\(--_andes-compact-border-hover\);/,
      );
      expect(ruleBody(css, ':host::after')).toMatch(/pointer-events: none;/);
    });

    it('switches the fields own ring and state border off', () => {
      expect(ruleBody(css, ':host')).toMatch(/--_andes-input-ring-width: 0px;/);
      expect(
        ruleBody(
          css,
          ':host ::ng-deep > :is(andes-input, andes-input-password, andes-input-search) .andes-input-group::after',
        ),
      ).toMatch(/display: none;/);
    });

    it('marks a focused button of the row with a 2px inset outline, on keyboard focus only', () => {
      const selector =
        ':host ::ng-deep > :is(select, button, a[href]):focus-visible';
      // Shared with the projected button's selector: the last selector owns the `{`.
      const body = ruleBody(css, selector);
      expect(body).toMatch(
        /outline: 2px solid var\(--andes-color-focus-ring\);/,
      );
      expect(body).toMatch(/outline-offset: -\d+px;/);
      expect(body).not.toContain('box-shadow');
      expect(css).toMatch(
        /:host ::ng-deep > andes-button \.andes-button:focus-visible,\s*:host ::ng-deep > :is\(select, button, a\[href\]\):focus-visible/,
      );
      expect(css).not.toMatch(/:focus\s*[{,]/);
      expect(css).not.toMatch(
        /\.andes-button:focus-visible\s*\{\s*outline: none/,
      );
    });

    it('draws the mark in its own text colour on a solid primary or danger button', () => {
      expect(
        ruleBody(
          css,
          ':host ::ng-deep > andes-button :is(.andes-button--primary, .andes-button--danger):focus-visible',
        ),
      ).toContain('outline-color: currentColor');
    });

    it('falls back to a Highlight outline for the focused button in forced-colors mode', () => {
      const forced = css.slice(
        css.indexOf(
          '@media (forced-colors: active)',
          css.indexOf('.andes-button:focus-visible'),
        ),
      );
      expect(forced).toContain(
        ':host ::ng-deep > andes-button .andes-button:focus-visible',
      );
      expect(forced).toMatch(/outline: 2px solid Highlight;/);
    });

    it('keeps the corner radius of the row in step with the fields size', () => {
      const sized = (size: AndesInputSize) => {
        @Component({
          imports: [AndesInputGroup, AndesInput],
          template: `<andes-input-group
            ><andes-input [size]="size" /><andes-input [size]="size"
          /></andes-input-group>`,
        })
        class SizedHost {
          readonly size = size;
        }
        const fixture = TestBed.createComponent(SizedHost);
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('andes-input-group')
          .classList as DOMTokenList;
      };

      expect(sized('sm')).toContain('andes-input-compact--sm');
      expect(sized('lg')).toContain('andes-input-compact--lg');
      expect(sized('md')).not.toContain('andes-input-compact--sm');
      expect(sized('md')).not.toContain('andes-input-compact--lg');
    });

    it('flags a field in error or warning on the row', () => {
      @Component({
        imports: [AndesInputGroup, AndesInput],
        template: `<andes-input-group
          ><andes-input [status]="status()" /><andes-input
        /></andes-input-group>`,
      })
      class StatusRow {
        readonly status = signal<'error' | 'warning' | undefined>('error');
      }
      const fixture = TestBed.createComponent(StatusRow);
      fixture.detectChanges();
      const classes = fixture.nativeElement.querySelector('andes-input-group')
        .classList as DOMTokenList;

      expect(classes).toContain('andes-input-compact--invalid');
      expect(classes).not.toContain('andes-input-compact--warning');

      fixture.componentInstance.status.set('warning');
      fixture.detectChanges();
      expect(classes).toContain('andes-input-compact--warning');
      expect(classes).not.toContain('andes-input-compact--invalid');

      fixture.componentInstance.status.set(undefined);
      fixture.detectChanges();
      expect(classes).not.toContain('andes-input-compact--warning');
    });

    it('colours the ring after the status of the child that has focus', () => {
      const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const invalid = ruleBody(
        css,
        ":host(:has(> :focus-within .andes-input-group--invalid, > [aria-invalid='true']:focus-within))",
      );
      const warning = ruleBody(
        css,
        ':host(:has(> :focus-within .andes-input-group--warning))',
      );

      expect(invalid).toMatch(
        /--_andes-compact-border-focus: var\(--andes-color-danger\);/,
      );
      expect(invalid).toContain('var(--andes-color-danger) 20%');
      expect(warning).toMatch(
        /--_andes-compact-border-focus: var\(--andes-color-warning-hover\);/,
      );
      expect(warning).toContain('var(--andes-color-warning-hover) 20%');
      // The invalid rule comes last, so it wins when a child carries both.
      expect(text.indexOf('--warning))')).toBeLessThan(
        text.indexOf('aria-invalid'),
      );
      // The row's own status classes no longer re-point the focus colours: a valid sibling that
      // holds the focus falls back to the primary ring.
      expect(
        ruleBody(
          css,
          ':host(:has(.andes-input-group--invalid, .andes-input-group--warning))',
        ),
      ).not.toMatch(/border-focus|compact-ring/);
      expect(ruleBody(css, ':host')).toMatch(
        /--_andes-compact-border-focus: var\(--andes-color-primary\);/,
      );
    });

    it('keeps each child its own border on hover when any child has a status', () => {
      const hover = ruleBody(
        css,
        ':host(:has(.andes-input-group--invalid, .andes-input-group--warning))',
      );
      expect(hover).toMatch(/--_andes-compact-border-hover: transparent;/);
    });

    it('no longer lifts individual children above their neighbours', () => {
      expect(css).not.toMatch(/:host ::ng-deep > :hover/);
      expect(css).not.toMatch(/:host ::ng-deep > :focus-within/);
    });
  });

  it('uses logical properties only, so the row mirrors in right-to-left', () => {
    expect(css).not.toMatch(
      /(margin|padding|border)-(left|right)|(^|[\s;{])(left|right)\s*:|border-(top|bottom)-(left|right)-radius/m,
    );
  });

  it('never splits a selector before a combinator (the style shim would mis-scope it)', () => {
    expect(css).not.toMatch(/\n\s*[>+~]/);
  });
});

/** The declarations between the braces of the rule whose selector is exactly `selector`. */
function ruleBody(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let from = 0;
  for (;;) {
    const at = stripped.indexOf(selector, from);
    if (at < 0) {
      return '';
    }
    const end = at + selector.length;
    const open = stripped.indexOf('{', end);
    const before = stripped.slice(Math.max(0, at - 1), at);
    if (
      open >= 0 &&
      stripped.slice(end, open).trim() === '' &&
      !/[\w-]/.test(before)
    ) {
      return stripped.slice(open + 1, stripped.indexOf('}', open));
    }
    from = at + 1;
  }
}
