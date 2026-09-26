import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AndesTextarea,
  AndesTextareaAutoSize,
  AndesTextareaCountInfo,
  AndesTextareaResize,
  AndesTextareaSize,
  AndesTextareaStatus,
  AndesTextareaVariant,
} from './textarea';

function setScrollHeight(textarea: HTMLTextAreaElement, value: number): void {
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    value,
  });
}

@Component({
  imports: [AndesTextarea],
  template: `<andes-textarea
    [id]="id()"
    [size]="size()"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [required]="required()"
    [placeholder]="placeholder()"
    [rows]="rows()"
    [maxLength]="maxLength()"
    [showCount]="showCount()"
    [resize]="resize()"
    [autoSize]="autoSize()"
    [variant]="variant()"
    [status]="status()"
    [clearable]="clearable()"
  />`,
})
class HostComponent {
  readonly id = signal<string | undefined>(undefined);
  readonly size = signal<AndesTextareaSize>('md');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly rows = signal(3);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly showCount = signal(false);
  readonly resize = signal<AndesTextareaResize>('vertical');
  readonly autoSize = signal<boolean | AndesTextareaAutoSize>(false);
  readonly variant = signal<AndesTextareaVariant>('outlined');
  readonly status = signal<AndesTextareaStatus | undefined>(undefined);
  readonly clearable = signal(false);
}

describe('AndesTextarea', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    const wrapper = fixture.nativeElement.querySelector(
      '.andes-textarea-wrapper',
    ) as HTMLElement;
    return { fixture, textarea, wrapper };
  }

  it('renders a native textarea', () => {
    const { textarea } = createHost();

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.getAttribute('data-slot')).toBe('textarea');
  });

  it('does not render an id attribute when none is provided, instead of the string "undefined"', () => {
    const { textarea } = createHost();

    // `[id]="id()"` is a DOM property binding: setting the native `id` property to
    // `undefined` string-coerces to the literal "undefined". `[attr.id]` must be used
    // instead so an unset id omits the attribute entirely (and stays a valid, unique
    // element when nothing was provided).
    expect(textarea.getAttribute('id')).toBeNull();
    expect(textarea.id).toBe('');
  });

  it('renders the real id when one is provided', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.id.set('comments');
    fixture.detectChanges();

    expect(textarea.getAttribute('id')).toBe('comments');
  });

  it('defaults to the medium size, outlined variant and vertical resize', () => {
    const { wrapper } = createHost();

    expect(wrapper.classList).toContain('andes-textarea-wrapper--md');
    expect(wrapper.classList).toContain('andes-textarea-wrapper--outlined');
    expect(wrapper.classList).toContain(
      'andes-textarea-wrapper--resize-vertical',
    );
  });

  it.each(['sm', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, wrapper } = createHost();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(wrapper.classList).toContain(`andes-textarea-wrapper--${size}`);
  });

  it.each(['none', 'horizontal', 'both'] as const)(
    'supports the %s resize mode',
    (resize) => {
      const { fixture, wrapper } = createHost();
      fixture.componentInstance.resize.set(resize);
      fixture.detectChanges();

      expect(wrapper.classList).toContain(
        `andes-textarea-wrapper--resize-${resize}`,
      );
    },
  );

  it('forces resize none when autoSize is enabled, regardless of resize', () => {
    const { fixture, wrapper } = createHost();
    fixture.componentInstance.resize.set('both');
    fixture.componentInstance.autoSize.set(true);
    fixture.detectChanges();

    expect(wrapper.classList).toContain('andes-textarea-wrapper--resize-none');
    expect(wrapper.classList).not.toContain(
      'andes-textarea-wrapper--resize-both',
    );
  });

  it('reflects the rows attribute when autoSize is off', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.rows.set(6);
    fixture.detectChanges();

    expect(textarea.rows).toBe(6);
  });

  it('collapses to a single row when autoSize is on, letting measurement drive height', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.rows.set(6);
    fixture.componentInstance.autoSize.set(true);
    fixture.detectChanges();

    expect(textarea.rows).toBe(1);
  });

  it('forwards the placeholder', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.placeholder.set('Tell us more');
    fixture.detectChanges();

    expect(textarea.getAttribute('placeholder')).toBe('Tell us more');
  });

  it('forwards maxlength', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.maxLength.set(140);
    fixture.detectChanges();

    expect(textarea.getAttribute('maxlength')).toBe('140');
  });

  it('reflects disabled state on the native textarea', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(textarea.disabled).toBe(true);
  });

  it('reflects readonly state on the native textarea', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(textarea.readOnly).toBe(true);
  });

  it('reflects required state on the native textarea', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();

    expect(textarea.required).toBe(true);
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea disabled readonly required />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea');

    expect(textarea.disabled).toBe(true);
    expect(textarea.readOnly).toBe(true);
    expect(textarea.required).toBe(true);
  });

  it('shows a character count when showCount is enabled', async () => {
    @Component({
      imports: [AndesTextarea, FormsModule],
      template: `<andes-textarea
        [showCount]="true"
        [maxLength]="10"
        [(ngModel)]="value"
      />`,
    })
    class CountHost {
      value = 'hello';
    }

    const fixture = TestBed.createComponent(CountHost);
    fixture.detectChanges();
    // NgModel writes its initial value in a microtask to avoid an
    // ExpressionChangedAfterItHasBeenCheckedError, so give it a turn before asserting.
    await fixture.whenStable();
    fixture.detectChanges();
    const count = fixture.nativeElement.querySelector('.andes-textarea__count');

    expect(count.textContent).toBe('5/10');
  });

  it('does not render a count when showCount is disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.showCount.set(false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-textarea__count'),
    ).toBeFalsy();
  });

  it('forwards aria-label and aria-invalid to the real textarea, not the host', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea aria-label="Comments" aria-invalid="true" />`,
    })
    class AriaHost {}

    const fixture = TestBed.createComponent(AriaHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-textarea');
    const textarea = fixture.nativeElement.querySelector('textarea');

    expect(textarea.getAttribute('aria-label')).toBe('Comments');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.andes-textarea-wrapper').classList,
    ).toContain('andes-textarea-wrapper--invalid');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-invalid')).toBe(false);
  });

  it('moves a static id/name to the textarea without leaving a duplicate on the host', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<label for="notes">Notes</label
        ><andes-textarea id="notes" name="notes" />`,
    })
    class IdHost {}

    const fixture = TestBed.createComponent(IdHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-textarea');
    const textarea = fixture.nativeElement.querySelector('textarea');

    expect(host.hasAttribute('id')).toBe(false);
    expect(host.hasAttribute('name')).toBe(false);
    expect(textarea.id).toBe('notes');
    expect(textarea.name).toBe('notes');
    expect(fixture.nativeElement.querySelector('label').control).toBe(textarea);
  });

  it.each(['filled', 'borderless', 'underlined'] as const)(
    'supports the %s variant',
    (variant) => {
      const { fixture, wrapper } = createHost();
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(wrapper.classList).toContain(`andes-textarea-wrapper--${variant}`);
      expect(wrapper.classList).not.toContain(
        'andes-textarea-wrapper--outlined',
      );
    },
  );

  describe('status', () => {
    it('marks the wrapper invalid and sets aria-invalid for status="error"', () => {
      const { fixture, textarea, wrapper } = createHost();
      fixture.componentInstance.status.set('error');
      fixture.detectChanges();

      expect(wrapper.classList).toContain('andes-textarea-wrapper--invalid');
      expect(textarea.getAttribute('aria-invalid')).toBe('true');
    });

    it('styles status="warning" without claiming the value is invalid', () => {
      const { fixture, textarea, wrapper } = createHost();
      fixture.componentInstance.status.set('warning');
      fixture.detectChanges();

      expect(wrapper.classList).toContain('andes-textarea-wrapper--warning');
      expect(wrapper.classList).not.toContain(
        'andes-textarea-wrapper--invalid',
      );
      expect(textarea.hasAttribute('aria-invalid')).toBe(false);
    });

    it('lets an explicit aria-invalid win over status="warning"', () => {
      @Component({
        imports: [AndesTextarea],
        template: `<andes-textarea status="warning" aria-invalid="true" />`,
      })
      class BothHost {}

      const fixture = TestBed.createComponent(BothHost);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        '.andes-textarea-wrapper',
      );

      expect(wrapper.classList).toContain('andes-textarea-wrapper--invalid');
      expect(wrapper.classList).not.toContain(
        'andes-textarea-wrapper--warning',
      );
    });
  });

  it('reflects disabled and readonly on the wrapper for the visual state', () => {
    const { fixture, wrapper } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(wrapper.classList).toContain('andes-textarea-wrapper--disabled');
    expect(wrapper.classList).toContain('andes-textarea-wrapper--readonly');
  });

  describe('[(value)]', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea [(value)]="text" />`,
    })
    class ValueHost {
      readonly text = signal('initial');
    }

    it('renders the bound value and writes typing back', () => {
      const fixture = TestBed.createComponent(ValueHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      expect(textarea.value).toBe('initial');

      textarea.value = 'typed';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.text()).toBe('typed');
    });

    it('reflects a value changed by the parent', () => {
      const fixture = TestBed.createComponent(ValueHost);
      fixture.detectChanges();
      fixture.componentInstance.text.set('from parent');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('textarea').value).toBe(
        'from parent',
      );
    });
  });

  describe('character count', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea
        showCount
        aria-describedby="hint"
        [maxLength]="maxLength()"
        [countFormatter]="formatter()"
        [(value)]="text"
      />`,
    })
    class CountHost {
      readonly text = signal('hello');
      readonly maxLength = signal<number | undefined>(10);
      readonly formatter = signal<
        ((info: AndesTextareaCountInfo) => string) | undefined
      >(undefined);
    }

    function createCountHost() {
      const fixture = TestBed.createComponent(CountHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        textarea: el.querySelector('textarea') as HTMLTextAreaElement,
        count: () => el.querySelector('.andes-textarea__count') as HTMLElement,
      };
    }

    it('links the count to the textarea via aria-describedby, keeping the consumer id', () => {
      const { textarea, count } = createCountHost();
      const ids = textarea.getAttribute('aria-describedby')?.split(' ');

      expect(count().id).toMatch(/^andes-textarea-count-\d+$/);
      expect(ids).toEqual(['hint', count().id]);
      expect(count().hasAttribute('aria-hidden')).toBe(false);
    });

    it('omits the count from aria-describedby when showCount is off', () => {
      const { fixture, textarea } = createHost();
      fixture.detectChanges();

      expect(textarea.hasAttribute('aria-describedby')).toBe(false);
    });

    it('shows just the count when there is no maxLength', () => {
      const { fixture, count } = createCountHost();
      fixture.componentInstance.maxLength.set(undefined);
      fixture.detectChanges();

      expect(count().textContent).toBe('5');
    });

    it('flags the count once the value exceeds maxLength', () => {
      const { fixture, count } = createCountHost();

      expect(count().classList).not.toContain(
        'andes-textarea__count--exceeded',
      );

      fixture.componentInstance.text.set('longer than ten');
      fixture.detectChanges();

      expect(count().textContent).toBe('15/10');
      expect(count().classList).toContain('andes-textarea__count--exceeded');
    });

    it('renders countFormatter output, passing value, count and maxLength', () => {
      const { fixture, count } = createCountHost();
      const formatter = vi.fn(
        ({ count: n, maxLength }: AndesTextareaCountInfo) =>
          `${(maxLength ?? 0) - n} left`,
      );
      fixture.componentInstance.formatter.set(formatter);
      fixture.detectChanges();

      expect(count().textContent).toBe('5 left');
      expect(formatter).toHaveBeenLastCalledWith({
        value: 'hello',
        count: 5,
        maxLength: 10,
      });
    });
  });

  describe('clearable', () => {
    const control = () => new FormControl('some text');

    @Component({
      imports: [AndesTextarea, ReactiveFormsModule],
      template: `<andes-textarea
        clearable
        [formControl]="control"
        [readonly]="readonly()"
        (cleared)="clearedCount = clearedCount + 1"
      />`,
    })
    class ClearHost {
      readonly control = control();
      readonly readonly = signal(false);
      clearedCount = 0;
    }

    function createClearHost() {
      const fixture = TestBed.createComponent(ClearHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      return {
        fixture,
        textarea: el.querySelector('textarea') as HTMLTextAreaElement,
        button: () =>
          el.querySelector(
            '.andes-textarea__clear',
          ) as HTMLButtonElement | null,
      };
    }

    it('does not render the clear button unless clearable', () => {
      const { fixture } = createHost();
      fixture.componentInstance.clearable.set(false);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.andes-textarea__clear'),
      ).toBeNull();
    });

    it('renders an accessible, non-submitting clear button when there is a value', () => {
      const { button } = createClearHost();

      expect(button()).not.toBeNull();
      expect(button()?.type).toBe('button');
      expect(button()?.getAttribute('aria-label')).toBe('Clear');
    });

    it('clears through the form control, emits cleared and refocuses the textarea', () => {
      const { fixture, textarea, button } = createClearHost();

      button()?.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBe('');
      expect(textarea.value).toBe('');
      expect(fixture.componentInstance.clearedCount).toBe(1);
      expect(document.activeElement).toBe(textarea);
      expect(button()).toBeNull();
    });

    it('hides the clear button when empty, disabled or readonly', () => {
      const { fixture, button } = createClearHost();

      fixture.componentInstance.readonly.set(true);
      fixture.detectChanges();
      expect(button()).toBeNull();

      fixture.componentInstance.readonly.set(false);
      fixture.componentInstance.control.disable();
      fixture.detectChanges();
      expect(button()).toBeNull();

      fixture.componentInstance.control.enable();
      fixture.componentInstance.control.setValue('');
      fixture.detectChanges();
      expect(button()).toBeNull();
    });
  });

  describe('pressEnter', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea (pressEnter)="events.push($event)" />`,
    })
    class EnterHost {
      readonly events: KeyboardEvent[] = [];
    }

    function press(init: KeyboardEventInit & { keyCode?: number }) {
      const fixture = TestBed.createComponent(EnterHost);
      fixture.detectChanges();
      const event = new KeyboardEvent('keydown', { bubbles: true, ...init });
      if (init.keyCode !== undefined) {
        Object.defineProperty(event, 'keyCode', { value: init.keyCode });
      }
      fixture.nativeElement.querySelector('textarea').dispatchEvent(event);
      return { events: fixture.componentInstance.events, event };
    }

    it('emits the keyboard event on Enter', () => {
      const { events, event } = press({ key: 'Enter' });

      expect(events).toEqual([event]);
    });

    it('also emits on Shift+Enter', () => {
      expect(press({ key: 'Enter', shiftKey: true }).events).toHaveLength(1);
    });

    it('ignores other keys', () => {
      expect(press({ key: 'a' }).events).toHaveLength(0);
    });

    it('ignores the Enter that confirms an IME composition', () => {
      expect(press({ key: 'Enter', isComposing: true }).events).toHaveLength(0);
      expect(press({ key: 'Enter', keyCode: 229 }).events).toHaveLength(0);
    });
  });

  describe('focus() / blur()', () => {
    @Component({
      imports: [AndesTextarea],
      template: `<andes-textarea value="hello world" />`,
    })
    class FocusHost {
      readonly textarea = viewChild.required(AndesTextarea);
    }

    function createFocusHost() {
      const fixture = TestBed.createComponent(FocusHost);
      fixture.detectChanges();
      return {
        api: fixture.componentInstance.textarea(),
        textarea: fixture.nativeElement.querySelector(
          'textarea',
        ) as HTMLTextAreaElement,
      };
    }

    it('focuses the native textarea', () => {
      const { api, textarea } = createFocusHost();
      api.focus();

      expect(document.activeElement).toBe(textarea);
    });

    it.each([
      ['start', 0, 0],
      ['end', 11, 11],
      ['all', 0, 11],
    ] as const)('places the cursor for cursor=%s', (cursor, start, end) => {
      const { api, textarea } = createFocusHost();
      api.focus({ cursor });

      expect(textarea.selectionStart).toBe(start);
      expect(textarea.selectionEnd).toBe(end);
    });

    it('blurs the native textarea', () => {
      const { api, textarea } = createFocusHost();
      api.focus();
      api.blur();

      expect(document.activeElement).not.toBe(textarea);
    });
  });

  describe('auto-size', () => {
    // The `md` size declares `line-height: 1.5rem` (see textarea.css), which is what
    // `getComputedStyle(...).lineHeight` resolves to for these host fixtures (default
    // size 'md'). `parseFloat('1.5rem')` reads as `1.5`, so that - not the old hard-coded
    // `20` fallback - is the real per-row multiplier the row math below is built on.
    const MD_LINE_HEIGHT = 1.5;

    it('grows to fit content up to autoSize maxRows', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.autoSize.set({ minRows: 2, maxRows: 4 });
      fixture.detectChanges();

      setScrollHeight(textarea, 200);
      textarea.value = 'a lot of text\n'.repeat(10);
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // 4 rows at the real computed line-height (1.5) = 6px ceiling.
      expect(textarea.style.height).toBe(`${4 * MD_LINE_HEIGHT}px`);
      expect(textarea.style.overflowY).toBe('auto');
    });

    it('never shrinks below autoSize minRows', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.autoSize.set({ minRows: 3 });
      fixture.detectChanges();

      // The floor (3 rows * 1.5 = 4.5px) is now small enough that it must be exercised
      // with a scrollHeight below it, or the content height would dominate instead.
      setScrollHeight(textarea, 0);
      textarea.value = 'x';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // 3 rows at the real computed line-height (1.5) = 4.5px floor.
      expect(textarea.style.height).toBe(`${3 * MD_LINE_HEIGHT}px`);
      expect(textarea.style.overflowY).toBe('hidden');
    });

    it('falls back to `rows` for the minimum when autoSize minRows is not set', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.rows.set(5);
      fixture.componentInstance.autoSize.set(true);
      fixture.detectChanges();

      setScrollHeight(textarea, 0);
      fixture.detectChanges();

      // 5 rows at the real computed line-height (1.5) = 7.5px floor.
      expect(textarea.style.height).toBe(`${5 * MD_LINE_HEIGHT}px`);
    });

    it('accepts a bare autoSize attribute as true', () => {
      @Component({
        imports: [AndesTextarea],
        template: `<andes-textarea autoSize resize="both" />`,
      })
      class BareAutoSizeHost {}

      const fixture = TestBed.createComponent(BareAutoSizeHost);
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector(
        '.andes-textarea-wrapper',
      );

      expect(wrapper.classList).toContain('andes-textarea-wrapper--auto-size');
      expect(wrapper.classList).toContain(
        'andes-textarea-wrapper--resize-none',
      );
      expect(fixture.nativeElement.querySelector('textarea').rows).toBe(1);
    });

    it('treats autoSize="false" as off', () => {
      @Component({
        imports: [AndesTextarea],
        template: `<andes-textarea autoSize="false" />`,
      })
      class OffHost {}

      const fixture = TestBed.createComponent(OffHost);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('textarea').rows).toBe(3);
    });

    it('clamps the rows fallback to maxRows instead of inverting the bounds', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.rows.set(5);
      fixture.componentInstance.autoSize.set({ maxRows: 2 });
      fixture.detectChanges();

      expect(textarea.style.height).toBe(`${2 * MD_LINE_HEIGHT}px`);
    });

    it('re-measures when a value is written programmatically', () => {
      const control = new FormControl('');

      @Component({
        imports: [AndesTextarea, ReactiveFormsModule],
        template: `<andes-textarea
          [autoSize]="{ minRows: 1, maxRows: 10 }"
          [formControl]="control"
        />`,
      })
      class WriteHost {
        readonly control = control;
      }

      const fixture = TestBed.createComponent(WriteHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');
      setScrollHeight(textarea, 4 * MD_LINE_HEIGHT);

      control.setValue('one\ntwo\nthree\nfour');
      fixture.detectChanges();

      expect(textarea.value).toBe('one\ntwo\nthree\nfour');
      expect(textarea.style.height).toBe(`${4 * MD_LINE_HEIGHT}px`);
    });

    it('releases the inline height when autoSize is turned off again', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.autoSize.set(true);
      fixture.detectChanges();
      expect(textarea.style.height).not.toBe('');

      fixture.componentInstance.autoSize.set(false);
      fixture.detectChanges();

      expect(textarea.style.height).toBe('');
      expect(textarea.style.overflowY).toBe('');
    });

    it('re-measures on a width change and emits resized', () => {
      let trigger: () => void = () => undefined;
      class FakeResizeObserver {
        constructor(callback: () => void) {
          trigger = callback;
        }
        observe(): void {
          /* noop */
        }
        disconnect(): void {
          /* noop */
        }
      }
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);

      @Component({
        imports: [AndesTextarea],
        template: `<andes-textarea
          [autoSize]="{ minRows: 1, maxRows: 10 }"
          (resized)="sizes.push($event)"
        />`,
      })
      class ResizeHost {
        readonly sizes: { width: number; height: number }[] = [];
      }

      try {
        const fixture = TestBed.createComponent(ResizeHost);
        fixture.detectChanges();
        const textarea = fixture.nativeElement.querySelector('textarea');

        // Narrower box -> the same text wraps onto more lines.
        Object.defineProperty(textarea, 'offsetWidth', {
          configurable: true,
          value: 120,
        });
        setScrollHeight(textarea, 3 * MD_LINE_HEIGHT);
        trigger();

        expect(textarea.style.height).toBe(`${3 * MD_LINE_HEIGHT}px`);
        expect(fixture.componentInstance.sizes).toEqual([
          { width: 120, height: 0 },
        ]);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('does not touch the inline height when autoSize is disabled', () => {
      const { fixture, textarea } = createHost();
      fixture.detectChanges();

      expect(textarea.style.height).toBe('');
    });

    function heightForSize(size: AndesTextareaSize, rows: number): string {
      const { fixture, textarea } = createHost();
      // Apply the size on its own change-detection pass first, so the `--sm`/`--md`/`--lg`
      // class (and the line-height it carries) is fully committed to the DOM before
      // `autoSize` flips on and the row-height measurement effect reads it.
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      fixture.componentInstance.rows.set(rows);
      fixture.componentInstance.autoSize.set(true);
      fixture.detectChanges();
      setScrollHeight(textarea, 0);
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      return textarea.style.height;
    }

    it('produces different, proportional heights per size instead of converging on one fallback number', () => {
      // Each size declares its own line-height (sm: 1.3125rem, md: 1.5rem, lg: 1.6875rem -
      // each size's font-size * 1.5), so the same `rows` count must yield genuinely
      // different computed heights per size rather than all landing on the same value.
      const smHeight = heightForSize('sm', 4);
      const mdHeight = heightForSize('md', 4);
      const lgHeight = heightForSize('lg', 4);

      expect(smHeight).toBe(`${4 * 1.3125}px`);
      expect(mdHeight).toBe(`${4 * 1.5}px`);
      expect(lgHeight).toBe(`${4 * 1.6875}px`);
      expect(new Set([smHeight, mdHeight, lgHeight]).size).toBe(3);
    });
  });

  describe('ControlValueAccessor', () => {
    it('propagates a [formControl] value into the textarea', () => {
      const control = new FormControl('initial');

      @Component({
        imports: [AndesTextarea, ReactiveFormsModule],
        template: `<andes-textarea [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly control = control;
      }

      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      expect(textarea.value).toBe('initial');
    });

    it('propagates typing back into the [formControl]', () => {
      const control = new FormControl('');

      @Component({
        imports: [AndesTextarea, ReactiveFormsModule],
        template: `<andes-textarea [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly control = control;
      }

      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      textarea.value = 'typed value';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(control.value).toBe('typed value');
    });

    it('disables the textarea when the formControl is disabled', () => {
      const control = new FormControl({ value: '', disabled: true });

      @Component({
        imports: [AndesTextarea, ReactiveFormsModule],
        template: `<andes-textarea [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly control = control;
      }

      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      expect(textarea.disabled).toBe(true);

      control.enable();
      fixture.detectChanges();

      expect(textarea.disabled).toBe(false);
    });

    it('marks the formControl as touched on blur', () => {
      const control = new FormControl('');

      @Component({
        imports: [AndesTextarea, ReactiveFormsModule],
        template: `<andes-textarea [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly control = control;
      }

      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      expect(control.touched).toBe(false);
      textarea.dispatchEvent(new Event('blur'));

      expect(control.touched).toBe(true);
    });

    it('propagates a [(ngModel)] value into the textarea', async () => {
      @Component({
        imports: [AndesTextarea, FormsModule],
        template: `<andes-textarea [(ngModel)]="value" />`,
      })
      class NgModelHost {
        value = 'from ngModel';
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      // NgModel writes its initial value in a microtask to avoid an
      // ExpressionChangedAfterItHasBeenCheckedError, so give it a turn before asserting.
      await fixture.whenStable();
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      expect(textarea.value).toBe('from ngModel');
    });

    it('propagates typing back through [(ngModel)]', async () => {
      @Component({
        imports: [AndesTextarea, FormsModule],
        template: `<andes-textarea [(ngModel)]="value" />`,
      })
      class NgModelHost {
        value = '';
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea');

      textarea.value = 'typed via ngModel';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value).toBe('typed via ngModel');
    });
  });
});
