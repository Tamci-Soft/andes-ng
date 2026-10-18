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

  it.each([
    ['sm', '1.5rem', '0.875rem'],
    ['md', '2rem', '0.875rem'],
    ['lg', '2.5rem', '1rem'],
  ] as const)('sizes %s to %s high with %s text', (size, height, fontSize) => {
    const { fixture, wrapper } = createHost();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    const style = getComputedStyle(wrapper);
    expect(style.height).toBe(height);
    expect(style.fontSize).toBe(fontSize);
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

    it('sizes the clear icon from the field and pads its hit area to 24px', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.clearable.set(true);
      fixture.detectChanges();

      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const style = getComputedStyle(
        fixture.nativeElement.querySelector('.andes-input__clear'),
      );
      // jsdom reports the declared keyword rather than resolving it - a native button
      // left alone reports the UA's own size instead.
      // The padding is half the gap between the 1em glyph and 24px (5px at 14px text, 4px at
      // 16px), so the hit area stays 24px at every size; jsdom reports the normalised calc().
      expect(style.fontSize).toBe('inherit');
      expect(style.padding).toBe('calc(0.5 * (1.5rem - 1em))');
      expect(style.margin).toBe('calc(0.5 * (1em - 1.5rem))');
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
    // A focused field shows exactly one indicator: its own border turns the focus colour and a
    // soft 2px ring hugs it from outside. It used to be a 2px `outline` offset 2px from the
    // border, which painted as a second, detached frame around the field (and only on keyboard
    // focus, so a mouse click showed nothing at all).
    //
    // jsdom resolves dynamic pseudo-classes (`:focus-within`, `:has()`) in `getComputedStyle`
    // but leaves `var()` unresolved and doesn't expand shorthands, so values are compared as
    // authored. The stylesheet is read directly where the point is which selector carries a
    // declaration.
    const css = () =>
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
        'utf-8',
      ).replace(/\/\*[\s\S]*?\*\//g, '');

    it('keys the ring off `:focus-within` on the wrapper, so mouse focus shows it too', () => {
      const { input, wrapper } = createHost();

      expect(wrapper.matches(':focus-within')).toBe(false);
      input.focus();

      expect(document.activeElement).toBe(input);
      expect(getComputedStyle(wrapper).outline).toBe('none');
      expect(getComputedStyle(wrapper).boxShadow).toBe(
        '0 0 0 2px var(--_andes-input-ring)',
      );
    });

    it('paints the ring as a 2px shadow, never as an outline around the bordered box', () => {
      const ruleBody = /\.andes-input-wrapper:focus-within\s*{([^}]*)}/.exec(
        css(),
      )?.[1];

      expect(ruleBody).toContain(
        'border-color: var(--_andes-input-border-focus)',
      );
      expect(ruleBody).toContain(
        'box-shadow: 0 0 0 2px var(--_andes-input-ring)',
      );
      expect(ruleBody).toContain('outline: none');
      expect(css()).not.toMatch(/outline-offset:\s*2px/);
      // Only the inner buttons (clear, visibility toggle) keep a keyboard outline of their own.
      expect(css()).not.toMatch(/andes-input-wrapper[^{]*:focus-visible/);
    });

    it('resolves the default ring and focus border to the primary colour at 20%', () => {
      expect(css()).toMatch(
        /--_andes-input-ring: color-mix\(\s*in srgb,\s*var\(--andes-color-primary\) 20%,\s*transparent\s*\)/,
      );
      expect(css()).toMatch(
        /--_andes-input-border-focus: var\(--andes-color-primary\)/,
      );
    });

    it('keeps the native input bare: no border, outline, shadow, fill or padding', () => {
      const { input } = createHost();

      input.focus();
      const style = getComputedStyle(input);

      expect(style.outline).toBe('0');
      expect(style.boxShadow).toBe('none');
      expect(style.padding).toBe('0px');
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('swaps in a real outline only under forced colours, where box-shadow is dropped', () => {
      expect(css()).toMatch(
        /@media \(forced-colors: active\)\s*{\s*\.andes-input-wrapper:focus-within\s*{\s*outline: 2px solid Highlight;/,
      );
    });

    it('tints the border and ring with the status colour', () => {
      const body = (selector: string) => ruleBody(css(), `.${selector}`);

      expect(body('andes-input-wrapper--invalid')).toMatch(
        /--_andes-input-ring: color-mix\(\s*in srgb,\s*var\(--andes-color-danger\) 20%/,
      );
      expect(body('andes-input-wrapper--warning')).toMatch(
        /--_andes-input-border: var\(--andes-color-warning-hover\)/,
      );
      expect(body('andes-input-wrapper--warning')).toMatch(
        /--_andes-input-ring: color-mix\(\s*in srgb,\s*var\(--andes-color-warning-hover\) 20%/,
      );
    });

    it('marks a read-only field so hover and focus leave its border alone', () => {
      const fixture = TestBed.createComponent(AndesInput);
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        '.andes-input-wrapper',
      );

      expect(wrapper.classList).toContain('andes-input-wrapper--readonly');
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

      expect(getComputedStyle(input).outline).toBe('0');
      expect(getComputedStyle(wrapper).outline).toBe('none');
      expect(getComputedStyle(wrapper).boxShadow).toBe(
        '0 0 0 2px var(--_andes-input-ring)',
      );
      expect(
        getComputedStyle(wrapper).getPropertyValue('--_andes-input-ring'),
      ).toContain('var(--andes-color-warning-hover) 20%');
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
      ).toMatch(/\.andes-input__control\s*{[^}]*font: inherit;/);
      expect(input).toBeTruthy();
    });
  });
});

describe('AndesInput count limits', () => {
  // Counts user-perceived characters, so an emoji or a flag is one, not two to four.
  const graphemes = (value: string) =>
    Array.from(new Intl.Segmenter().segment(value)).length;

  @Component({
    imports: [AndesInput],
    template: `<andes-input
      aria-label="Message"
      showCount
      [countMax]="countMax()"
      [maxLength]="maxLength()"
      [countStrategy]="strategy()"
      [countExceedFormatter]="exceedFormatter()"
      [countFormatter]="formatter()"
      [(value)]="text"
    />`,
  })
  class CountHost {
    readonly countMax = signal<number | undefined>(5);
    readonly maxLength = signal<number | undefined>(undefined);
    readonly strategy = signal<((value: string) => number) | undefined>(
      undefined,
    );
    readonly exceedFormatter = signal<
      ((value: string, config: { max: number }) => string) | undefined
    >(undefined);
    readonly formatter = signal<
      ((info: AndesInputCountInfo) => string) | undefined
    >(undefined);
    readonly text = signal('');
  }

  function createCountHost() {
    const fixture = TestBed.createComponent(CountHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const count = () =>
      fixture.nativeElement.querySelector('.andes-input__count') as HTMLElement;
    const wrapper = () =>
      fixture.nativeElement.querySelector(
        '.andes-input-wrapper',
      ) as HTMLElement;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, input, count, wrapper, type };
  }

  it('countMax is a soft limit: it is counted against and flagged, never enforced natively', () => {
    const { fixture, input, count, wrapper, type } = createCountHost();

    expect(input.getAttribute('maxlength')).toBeNull();
    type('abc');
    expect(count().textContent?.trim()).toBe('3 / 5');
    expect(wrapper().classList).not.toContain('andes-input-wrapper--invalid');

    type('abcdefg');
    expect(fixture.componentInstance.text()).toBe('abcdefg');
    expect(count().textContent?.trim()).toBe('7 / 5');
    expect(count().classList).toContain('andes-input__count--exceeded');
    expect(wrapper().classList).toContain('andes-input-wrapper--invalid');
    // Over the soft limit is announced as well as painted - the same rule as AndesTextarea.
    expect(input.getAttribute('aria-invalid')).toBe('true');

    type('abcde');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(count().classList).not.toContain('andes-input__count--exceeded');
  });

  it('falls back to maxLength when countMax is not set', () => {
    const { fixture, count, type } = createCountHost();
    fixture.componentInstance.countMax.set(undefined);
    fixture.componentInstance.maxLength.set(10);
    fixture.detectChanges();

    type('abc');

    expect(count().textContent?.trim()).toBe('3 / 10');
  });

  it('measures with countStrategy, and hands the formatter that count and the limit', () => {
    const { fixture, count, type } = createCountHost();
    fixture.componentInstance.strategy.set(graphemes);
    fixture.componentInstance.formatter.set(
      ({ count: used, maxLength }) => `${used} of ${maxLength}`,
    );
    fixture.detectChanges();

    type('🇵🇪👍🏽a');

    expect(count().textContent?.trim()).toBe('3 of 5');
  });

  it('trims an over-limit value with countExceedFormatter, in the model and the element', () => {
    const { fixture, input, count, type } = createCountHost();
    fixture.componentInstance.strategy.set(graphemes);
    fixture.componentInstance.exceedFormatter.set((value, { max }) =>
      Array.from(new Intl.Segmenter().segment(value))
        .slice(0, max)
        .map((part) => part.segment)
        .join(''),
    );
    fixture.detectChanges();

    type('ab👍🏽cdef');

    expect(fixture.componentInstance.text()).toBe('ab👍🏽cd');
    expect(input.value).toBe('ab👍🏽cd');
    expect(count().textContent?.trim()).toBe('5 / 5');
    expect(count().classList).not.toContain('andes-input__count--exceeded');
  });

  it('leaves text mid-IME-composition alone and trims once it is committed', () => {
    const { fixture, input, type } = createCountHost();
    fixture.componentInstance.exceedFormatter.set((value, { max }) =>
      value.slice(0, max),
    );
    fixture.detectChanges();
    type('abcd');

    input.value = 'abcdefg';
    input.dispatchEvent(new InputEvent('input', { isComposing: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.text()).toBe('abcdefg');

    input.dispatchEvent(new CompositionEvent('compositionend'));
    fixture.detectChanges();
    expect(fixture.componentInstance.text()).toBe('abcde');
    expect(input.value).toBe('abcde');
  });
});

describe('AndesInput clearIcon', () => {
  @Component({
    imports: [AndesInput],
    template: `<andes-input
        aria-label="Name"
        clearable
        value="Ana"
        [clearIcon]="icon"
      />
      <ng-template #icon><span class="custom-clear">✕</span></ng-template>`,
  })
  class ClearIconHost {}

  it('draws the template inside the clear button in place of the default icon', () => {
    const fixture = TestBed.createComponent(ClearIconHost);
    fixture.detectChanges();
    const clear = fixture.nativeElement.querySelector(
      '.andes-input__clear',
    ) as HTMLButtonElement;

    expect(clear.querySelector('.custom-clear')).toBeTruthy();
    expect(clear.querySelector('svg')).toBeNull();
    expect(clear.getAttribute('aria-label')).toBe('Clear');
  });
});

describe('AndesInput clear button design', () => {
  const css = () =>
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
      'utf-8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');

  @Component({
    imports: [AndesInput],
    template: `<andes-input
      aria-label="Name"
      clearable
      value="Ana"
      [clearLabel]="label()"
    />`,
  })
  class ClearLabelHost {
    readonly label = signal('Clear');
  }

  function createClearHost() {
    const fixture = TestBed.createComponent(ClearLabelHost);
    fixture.detectChanges();
    const clear = () =>
      fixture.nativeElement.querySelector(
        '[data-slot="input-clear"]',
      ) as HTMLButtonElement;
    return { fixture, clear };
  }

  it('names the button from clearLabel, "Clear" by default', () => {
    const { fixture, clear } = createClearHost();
    expect(clear().getAttribute('aria-label')).toBe('Clear');

    fixture.componentInstance.label.set('Borrar');
    fixture.detectChanges();
    expect(clear().getAttribute('aria-label')).toBe('Borrar');
  });

  it('is a keyboard stop of its own (no negative tabindex)', () => {
    const { clear } = createClearHost();
    expect(clear().tabIndex).toBe(0);
    expect(clear().hasAttribute('tabindex')).toBe(false);
  });

  it('draws the shared glyph: a filled disc with the "x" knocked out of it', () => {
    const { clear } = createClearHost();
    const glyph = clear().querySelector('svg.andes-input__clear-glyph');
    expect(glyph?.querySelector('circle')).toBeTruthy();
    expect(glyph?.querySelector('path')).toBeTruthy();
    expect(css()).toMatch(
      /\.andes-input__clear-glyph circle\s*{[^}]*fill: currentColor;/,
    );
    expect(css()).toMatch(
      /\.andes-input__clear-glyph path\s*{[^}]*stroke: var\(--andes-color-background\);/,
    );
  });

  it('has a 24px hit area that the negative margin takes back out of the layout', () => {
    const rule = css().match(/\.andes-input__clear\s*{[^}]*}/)?.[0] ?? '';
    expect(rule).toContain('padding: calc((1.5rem - 1em) / 2);');
    expect(rule).toContain('margin: calc((1em - 1.5rem) / 2);');
    expect(rule).toContain('visibility: hidden;');
  });

  it('shows on hover or focus-within, and always without hover', () => {
    expect(css()).toMatch(
      /\.andes-input-wrapper:hover \.andes-input__clear,\s*\.andes-input-wrapper:focus-within \.andes-input__clear\s*{\s*visibility: visible;/,
    );
    expect(css()).toMatch(
      /@media \(hover: none\)\s*{\s*\.andes-input__clear\s*{\s*visibility: visible;/,
    );
    expect(css()).toMatch(
      /\.andes-input__clear:focus-visible\s*{[^}]*outline: 2px solid var\(--andes-color-focus-ring\);/,
    );
  });
});

describe('AndesInput focused / blurred', () => {
  @Component({
    imports: [AndesInput],
    template: `<andes-input
      aria-label="Name"
      (focused)="events.push('focused:' + $event.type)"
      (blurred)="events.push('blurred:' + $event.type)"
    />`,
  })
  class FocusHost {
    readonly events: string[] = [];
  }

  it('re-emits the native FocusEvent of the inner input', () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    input.dispatchEvent(new FocusEvent('focus'));
    input.dispatchEvent(new FocusEvent('blur'));

    expect(fixture.componentInstance.events).toEqual([
      'focused:focus',
      'blurred:blur',
    ]);
  });
});

describe('AndesInput text alignment hook', () => {
  it('aligns the typed text from --andes-input-text-align, start by default', () => {
    expect(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), 'input.css'),
        'utf-8',
      ),
    ).toMatch(
      /\.andes-input__control\s*{[^}]*text-align:\s*var\(--andes-input-text-align,\s*start\);/,
    );
  });
});

/** The declarations between the braces of the rule whose selector is exactly `selector`. */
function ruleBody(css: string, selector: string): string {
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector, from);
    if (at < 0) {
      return '';
    }
    const end = at + selector.length;
    const open = css.indexOf('{', end);
    if (open >= 0 && css.slice(end, open).trim() === '') {
      return css.slice(open + 1, css.indexOf('}', open));
    }
    from = at + 1;
  }
}
