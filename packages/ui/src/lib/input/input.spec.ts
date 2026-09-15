import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesInput, AndesInputSize, AndesInputType } from './input';

@Component({
  imports: [AndesInput],
  template: `<andes-input
    [type]="type()"
    [size]="size()"
    [disabled]="disabled()"
    [required]="required()"
    [readOnly]="readOnly()"
    [clearable]="clearable()"
    [placeholder]="placeholder()"
    [id]="id()"
    [name]="name()"
  />`,
})
class HostComponent {
  readonly type = signal<AndesInputType>('text');
  readonly size = signal<AndesInputSize>('md');
  readonly disabled = signal(false);
  readonly required = signal(false);
  readonly readOnly = signal(false);
  readonly clearable = signal(false);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly id = signal<string | undefined>(undefined);
  readonly name = signal<string | undefined>(undefined);
}

describe('AndesInput', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const wrapper = fixture.nativeElement.querySelector(
      '.andes-input-wrapper',
    ) as HTMLElement;
    return { fixture, input, wrapper };
  }

  it('renders a native input', () => {
    const { input } = createHost();

    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('text');
  });

  it('defaults to the md size', () => {
    const { wrapper } = createHost();

    expect(wrapper.classList).toContain('andes-input-wrapper--md');
  });

  it.each(['sm', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, wrapper } = createHost();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(wrapper.classList).toContain(`andes-input-wrapper--${size}`);
  });

  it.each(['email', 'password', 'number', 'search', 'tel', 'url'] as const)(
    'supports the %s type',
    (type) => {
      const { fixture, input } = createHost();
      fixture.componentInstance.type.set(type);
      fixture.detectChanges();

      expect(input.getAttribute('type')).toBe(type);
    },
  );

  it('reflects disabled state on the native input', () => {
    const { fixture, input, wrapper } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect(wrapper.classList).toContain('andes-input-wrapper--disabled');
  });

  it('reflects required state on the native input', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();

    expect(input.required).toBe(true);
  });

  it('reflects readOnly state on the native input', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.readOnly.set(true);
    fixture.detectChanges();

    expect(input.readOnly).toBe(true);
  });

  it('forwards placeholder, id and name to the native input and nulls them on the host', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.placeholder.set('Email address');
    fixture.componentInstance.id.set('email');
    fixture.componentInstance.name.set('email');
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-input');

    expect(input.getAttribute('placeholder')).toBe('Email address');
    expect(input.getAttribute('id')).toBe('email');
    expect(input.getAttribute('name')).toBe('email');
    expect(host.hasAttribute('id')).toBe(false);
    expect(host.hasAttribute('name')).toBe(false);
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesInput],
      template: `<andes-input disabled required readOnly />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');

    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.readOnly).toBe(true);
  });

  it('forwards aria-label, aria-invalid etc. to the real input, not the host', () => {
    @Component({
      imports: [AndesInput],
      template: `<andes-input
        aria-label="Email"
        aria-describedby="email-hint"
        aria-invalid="true"
      />`,
    })
    class AriaHost {}

    const fixture = TestBed.createComponent(AriaHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-input');
    const input = fixture.nativeElement.querySelector('input');
    const wrapper = fixture.nativeElement.querySelector('.andes-input-wrapper');

    expect(input.getAttribute('aria-label')).toBe('Email');
    expect(input.getAttribute('aria-describedby')).toBe('email-hint');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(wrapper.classList).toContain('andes-input-wrapper--invalid');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-describedby')).toBe(false);
    expect(host.hasAttribute('aria-invalid')).toBe(false);
  });

  it('does not set aria-invalid on the input when false', () => {
    const { input } = createHost();

    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('projects prefix and suffix slot content', () => {
    @Component({
      imports: [AndesInput],
      template: `<andes-input
        ><span slot="prefix">$</span><span slot="suffix">USD</span></andes-input
      >`,
    })
    class SlotHost {}

    const fixture = TestBed.createComponent(SlotHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('.andes-input__prefix')
        .textContent.trim(),
    ).toBe('$');
    expect(
      fixture.nativeElement
        .querySelector('.andes-input__suffix')
        .textContent.trim(),
    ).toBe('USD');
  });

  describe('clearable', () => {
    it('does not render a clear button without a value', () => {
      const { fixture } = createHost();
      fixture.componentInstance.clearable.set(true);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.andes-input__clear'),
      ).toBeFalsy();
    });

    it('renders a clear button once there is a value and clears it on click', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.clearable.set(true);
      fixture.detectChanges();

      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const clearButton = fixture.nativeElement.querySelector(
        '.andes-input__clear',
      ) as HTMLButtonElement;
      expect(clearButton).toBeTruthy();

      clearButton.click();
      fixture.detectChanges();

      expect(input.value).toBe('');
      expect(
        fixture.nativeElement.querySelector('.andes-input__clear'),
      ).toBeFalsy();
    });

    it('does not render a clear button while disabled, even with a value', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.clearable.set(true);
      fixture.detectChanges();
      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.andes-input__clear'),
      ).toBeFalsy();
    });
  });

  describe('focus indicator', () => {
    // Regression coverage for a forced-colors (Windows High Contrast Mode) a11y bug: the
    // wrapper used to show focus purely via `box-shadow` on `:focus-within`. `box-shadow`
    // is stripped entirely under `forced-colors: active`, which left keyboard users with
    // no visible focus indicator at all - a WCAG 2.4.7 failure. The fix uses `outline`
    // (which browsers keep, recoloring it to the system's own highlight color, under
    // forced-colors) keyed off `:focus-visible` on the native input, matching every other
    // control in this library.
    //
    // jsdom does resolve dynamic pseudo-classes (`:focus`, `:focus-visible`, ...) both in
    // `Element.matches()` and in `getComputedStyle`, so the assertions below exercise the
    // real cascade against a really-focused input. It does not expand shorthands, though,
    // so `outline` is compared as the authored string rather than via `outlineStyle`; and
    // `var()` is left unresolved, hence the token name appearing verbatim. The authored
    // stylesheet is also read directly where the point is which *selector* carries a
    // declaration, which a computed style cannot show.
    const focusRingSelector =
      '.andes-input-wrapper:has(.andes-input__control:focus-visible)';

    it('does not match the focus-ring selector before the input is focused', () => {
      const { wrapper } = createHost();

      expect(wrapper.matches(focusRingSelector)).toBe(false);
    });

    it('matches the focus-ring selector once the native input is focused', () => {
      const { input, wrapper } = createHost();

      input.focus();

      expect(document.activeElement).toBe(input);
      expect(wrapper.matches(focusRingSelector)).toBe(true);
    });

    it('defines the focus ring using `outline` (not `box-shadow`), keyed off `:focus-visible`', () => {
      const css = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
        'utf-8',
      );
      const ruleBody =
        /:has\(\.andes-input__control:focus-visible\)\s*{([^}]*)}/.exec(
          css,
        )?.[1];

      expect(ruleBody).toBeDefined();
      expect(ruleBody).toContain(
        'outline: 2px solid var(--andes-color-focus-ring)',
      );
      expect(ruleBody).not.toContain('box-shadow');

      // No live rule anywhere in the stylesheet should key the focus ring off
      // `:focus-within` - it fires on a plain mouse click, unlike `:focus-visible`.
      // (Comments are stripped first since the stylesheet documents, in prose, why
      // `:focus-within` was deliberately dropped for this purpose.)
      const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(cssWithoutComments).not.toMatch(/:focus-within/);
    });

    // Regression coverage for the "double ring" this fix removes: dropping `outline: none`
    // from `.andes-input__control` left the browser's own default ring painting on the
    // native input *in addition to* the wrapper's authored one, so a focused field showed
    // two differently-colored rectangles with a gap between them. The inner control must
    // resolve to `outline: none` while focused; the wrapper must still resolve to the real
    // authored outline.
    it('paints exactly one focus ring: the wrapper outlines, the native input does not', () => {
      const { input, wrapper } = createHost();

      input.focus();

      // `auto` here would mean the UA's own default focus ring is back on the inner input.
      expect(getComputedStyle(input).outline).toBe('none');
      expect(getComputedStyle(wrapper).outline).toBe(
        '2px solid var(--andes-color-focus-ring)',
      );
    });

    it('does not reset the outline of the native input while it is unfocused', () => {
      const { input } = createHost();

      expect(getComputedStyle(input).outline).not.toBe('none');
    });

    it("scopes the native-ring reset to the control's own focus pseudo-classes", () => {
      const css = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
        'utf-8',
      ).replace(/\/\*[\s\S]*?\*\//g, '');

      // Every `outline: none` in the stylesheet must be scoped to a focus state of the
      // native control. A blanket `.andes-input__control { outline: none }` would also kill
      // any outline a consumer or the UA applies for non-focus reasons, and it is the shape
      // the pre-fix code used - the wrapper's ring is what must carry accessibility here.
      const outlineNoneRules = [
        ...css.matchAll(/([^{}]+){([^}]*outline:\s*none[^}]*)}/g),
      ].map((match) => match[1].trim());

      expect(outlineNoneRules).toEqual([
        '.andes-input__control:focus,\n.andes-input__control:focus-visible',
      ]);
    });
  });

  describe('ControlValueAccessor', () => {
    it('works with [formControl] - writes, updates and disables', () => {
      @Component({
        imports: [AndesInput, ReactiveFormsModule],
        template: `<andes-input [formControl]="control" />`,
      })
      class ReactiveFormHost {
        readonly control = new FormControl('initial');
      }

      const fixture = TestBed.createComponent(ReactiveFormHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.value).toBe('initial');

      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBe('typed');

      fixture.componentInstance.control.setValue('from control');
      fixture.detectChanges();

      expect(input.value).toBe('from control');

      fixture.componentInstance.control.disable();
      fixture.detectChanges();

      expect(input.disabled).toBe(true);
    });

    it('works with [(ngModel)]', async () => {
      @Component({
        imports: [AndesInput, FormsModule],
        template: `<andes-input [(ngModel)]="value" />`,
      })
      class NgModelHost {
        value = 'initial';
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      // NgModel writes the initial value through Angular Forms' own
      // `resolvedPromise.then(...)` microtask, so flush that before asserting.
      await Promise.resolve();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.value).toBe('initial');

      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.value).toBe('typed');
    });

    it('calls onTouched on blur', () => {
      @Component({
        imports: [AndesInput, ReactiveFormsModule],
        template: `<andes-input [formControl]="control" />`,
      })
      class TouchedHost {
        readonly control = new FormControl('');
      }

      const fixture = TestBed.createComponent(TouchedHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(fixture.componentInstance.control.touched).toBe(false);

      input.dispatchEvent(new Event('blur'));

      expect(fixture.componentInstance.control.touched).toBe(true);
    });
  });
});
