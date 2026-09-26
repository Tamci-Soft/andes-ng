import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AndesInput,
  AndesInputCountInfo,
  AndesInputSize,
  AndesInputStatus,
  AndesInputType,
  AndesInputVariant,
} from './input';

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
  describe('value model', () => {
    it('supports two-way [(value)] binding without Angular Forms', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input [(value)]="text" />`,
      })
      class ModelHost {
        readonly text = signal('initial');
      }

      const fixture = TestBed.createComponent(ModelHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.value).toBe('initial');

      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.text()).toBe('typed');

      fixture.componentInstance.text.set('from parent');
      fixture.detectChanges();

      expect(input.value).toBe('from parent');
    });
  });

  describe('variant', () => {
    it('defaults to outlined', () => {
      const { wrapper } = createHost();

      expect(wrapper.classList).toContain('andes-input-wrapper--outlined');
    });

    it.each(['filled', 'borderless', 'underlined'] as const)(
      'supports the %s variant',
      (variant) => {
        @Component({
          imports: [AndesInput],
          template: `<andes-input [variant]="variant" />`,
        })
        class VariantHost {
          variant: AndesInputVariant = variant;
        }

        const fixture = TestBed.createComponent(VariantHost);
        fixture.detectChanges();
        const wrapper = fixture.nativeElement.querySelector(
          '.andes-input-wrapper',
        );

        expect(wrapper.classList).toContain(`andes-input-wrapper--${variant}`);
        expect(wrapper.classList).not.toContain(
          'andes-input-wrapper--outlined',
        );
      },
    );

    it('draws only the bottom border for underlined', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input variant="underlined" />`,
      })
      class UnderlinedHost {}

      const fixture = TestBed.createComponent(UnderlinedHost);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        '.andes-input-wrapper',
      );

      expect(getComputedStyle(wrapper).borderWidth).toBe('0px 0px 1px');
    });
  });

  describe('status', () => {
    function createStatusHost(status: AndesInputStatus | undefined) {
      @Component({
        imports: [AndesInput],
        template: `<andes-input [status]="status()" />`,
      })
      class StatusHost {
        readonly status = signal(status);
      }

      const fixture = TestBed.createComponent(StatusHost);
      fixture.detectChanges();
      return {
        fixture,
        input: fixture.nativeElement.querySelector('input') as HTMLInputElement,
        wrapper: fixture.nativeElement.querySelector(
          '.andes-input-wrapper',
        ) as HTMLElement,
      };
    }

    it('status="error" paints the invalid state and announces it via aria-invalid', () => {
      const { input, wrapper } = createStatusHost('error');

      expect(wrapper.classList).toContain('andes-input-wrapper--invalid');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('status="warning" paints the warning state without marking the field invalid', () => {
      const { input, wrapper } = createStatusHost('warning');

      expect(wrapper.classList).toContain('andes-input-wrapper--warning');
      expect(wrapper.classList).not.toContain('andes-input-wrapper--invalid');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
    });

    it('keeps the single wrapper focus ring, recolored, for status="warning"', () => {
      const { input, wrapper } = createStatusHost('warning');

      input.focus();

      expect(getComputedStyle(input).outline).toBe('none');
      expect(getComputedStyle(wrapper).outlineColor).toBe(
        'var(--andes-color-warning)',
      );
    });
  });

  describe('showCount', () => {
    it('renders the count with the maxLength and links it to the input description', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input
          showCount
          [maxLength]="10"
          aria-describedby="hint"
          [(value)]="text"
        />`,
      })
      class CountHost {
        readonly text = signal('abc');
      }

      const fixture = TestBed.createComponent(CountHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      const count = fixture.nativeElement.querySelector('.andes-input__count');

      expect(count.textContent.trim()).toBe('3 / 10');
      expect(input.getAttribute('maxlength')).toBe('10');
      expect(input.getAttribute('aria-describedby')).toBe(`hint ${count.id}`);

      input.value = 'abcde';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(count.textContent.trim()).toBe('5 / 10');
    });

    it('shows just the count without a maxLength, and nothing when showCount is off', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input [showCount]="show()" value="hello" />`,
      })
      class CountHost {
        readonly show = signal(true);
      }

      const fixture = TestBed.createComponent(CountHost);
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('.andes-input__count')
          .textContent.trim(),
      ).toBe('5');

      fixture.componentInstance.show.set(false);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.andes-input__count'),
      ).toBeFalsy();
      expect(
        fixture.nativeElement
          .querySelector('input')
          .hasAttribute('aria-describedby'),
      ).toBe(false);
    });

    it('uses a custom countFormatter', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input
          showCount
          [maxLength]="20"
          [countFormatter]="formatter"
          value="hey"
        />`,
      })
      class FormatterHost {
        readonly formatter = ({ count, maxLength }: AndesInputCountInfo) =>
          `${(maxLength ?? 0) - count} left`;
      }

      const fixture = TestBed.createComponent(FormatterHost);
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('.andes-input__count')
          .textContent.trim(),
      ).toBe('17 left');
    });

    it('flags a value (set programmatically) that exceeds maxLength', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input showCount [maxLength]="3" value="toolong" />`,
      })
      class ExceededHost {}

      const fixture = TestBed.createComponent(ExceededHost);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.andes-input__count').classList,
      ).toContain('andes-input__count--exceeded');
    });
  });

  describe('addons', () => {
    it('renders addonBefore / addonAfter text as attached segments outside the field', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input addonBefore="https://" addonAfter=".com" />`,
      })
      class AddonHost {}

      const fixture = TestBed.createComponent(AddonHost);
      fixture.detectChanges();
      const before = fixture.nativeElement.querySelector(
        '.andes-input__addon--before',
      );
      const after = fixture.nativeElement.querySelector(
        '.andes-input__addon--after',
      );
      const wrapper = fixture.nativeElement.querySelector(
        '.andes-input-wrapper',
      );

      expect(before.textContent.trim()).toBe('https://');
      expect(after.textContent.trim()).toBe('.com');
      expect(wrapper.contains(before)).toBe(false);
      expect(wrapper.contains(after)).toBe(false);
      expect(before.nextElementSibling).toBe(wrapper);
      expect(wrapper.nextElementSibling).toBe(after);
    });

    it('projects [slot=addon-before] / [slot=addon-after] content', () => {
      @Component({
        imports: [AndesInput],
        template: `<andes-input
          ><span slot="addon-before">+51</span
          ><span slot="addon-after">kg</span></andes-input
        >`,
      })
      class AddonSlotHost {}

      const fixture = TestBed.createComponent(AddonSlotHost);
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('.andes-input__addon--before')
          .textContent.trim(),
      ).toBe('+51');
      expect(
        fixture.nativeElement
          .querySelector('.andes-input__addon--after')
          .textContent.trim(),
      ).toBe('kg');
    });

    it('leaves an unused addon :empty, so it takes no room', () => {
      const { fixture } = createHost();

      const addons = fixture.nativeElement.querySelectorAll(
        '.andes-input__addon',
      ) as NodeListOf<HTMLElement>;

      expect(addons).toHaveLength(2);
      addons.forEach((addon) => {
        expect(addon.matches(':empty')).toBe(true);
        expect(getComputedStyle(addon).display).toBe('none');
      });
    });
  });

  describe('clear', () => {
    it('clears through the ControlValueAccessor and emits (cleared) and (valueChange)', () => {
      @Component({
        imports: [AndesInput, ReactiveFormsModule],
        template: `<andes-input
          clearable
          [formControl]="control"
          (cleared)="clearedCount = clearedCount + 1"
          (valueChange)="lastValue = $event"
        />`,
      })
      class ClearHost {
        readonly control = new FormControl('something');
        clearedCount = 0;
        lastValue: string | undefined;
      }

      const fixture = TestBed.createComponent(ClearHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      (
        fixture.nativeElement.querySelector(
          '.andes-input__clear',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBe('');
      expect(fixture.componentInstance.control.dirty).toBe(true);
      expect(fixture.componentInstance.clearedCount).toBe(1);
      expect(fixture.componentInstance.lastValue).toBe('');
      expect(input.value).toBe('');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('pressEnter', () => {
    @Component({
      imports: [AndesInput],
      template: `<andes-input (pressEnter)="events.push($event)" />`,
    })
    class EnterHost {
      readonly events: KeyboardEvent[] = [];
    }

    it('emits on Enter', () => {
      const fixture = TestBed.createComponent(EnterHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(fixture.componentInstance.events).toHaveLength(1);
      expect(fixture.componentInstance.events[0].key).toBe('Enter');
    });

    it('does not emit for an Enter that commits an IME composition', () => {
      const fixture = TestBed.createComponent(EnterHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }),
      );

      expect(fixture.componentInstance.events).toHaveLength(0);
    });
  });

  describe('focus() / blur()', () => {
    it('focuses the native input and places the caret per `cursor`', () => {
      const fixture = TestBed.createComponent(AndesInput);
      fixture.componentRef.setInput('value', 'hello');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector(
        'input',
      ) as HTMLInputElement;
      const component = fixture.componentInstance;

      component.focus({ cursor: 'start' });
      expect(document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 0]);

      component.focus({ cursor: 'end' });
      expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);

      component.focus({ cursor: 'all' });
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5]);

      component.blur();
      expect(document.activeElement).not.toBe(input);
    });

    it('does not throw for input types without a selection API', () => {
      const fixture = TestBed.createComponent(AndesInput);
      fixture.componentRef.setInput('type', 'email');
      fixture.detectChanges();

      expect(() =>
        fixture.componentInstance.focus({ cursor: 'end' }),
      ).not.toThrow();
    });
  });

  describe('font-family', () => {
    it('sets the font stack on the group root and the wrapper, and inherits it in the control', () => {
      const { fixture, input, wrapper } = createHost();
      const group = fixture.nativeElement.querySelector('.andes-input-group');

      expect(getComputedStyle(group).fontFamily).toBe(
        'var(--andes-font-family), sans-serif',
      );
      expect(getComputedStyle(wrapper).fontFamily).toBe(
        'var(--andes-font-family), sans-serif',
      );
      expect(
        readFileSync(
          join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
          'utf-8',
        ),
      ).toMatch(/\.andes-input__control\s*{[^}]*font-family:\s*inherit;/);
      expect(input).toBeTruthy();
    });
  });
});
