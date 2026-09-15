import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  AndesTextarea,
  AndesTextareaResize,
  AndesTextareaSize,
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
    [autoSizeMinRows]="autoSizeMinRows()"
    [autoSizeMaxRows]="autoSizeMaxRows()"
  />`,
})
class HostComponent {
  readonly size = signal<AndesTextareaSize>('md');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly rows = signal(3);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly showCount = signal(false);
  readonly resize = signal<AndesTextareaResize>('vertical');
  readonly autoSize = signal(false);
  readonly autoSizeMinRows = signal<number | undefined>(undefined);
  readonly autoSizeMaxRows = signal<number | undefined>(undefined);
}

describe('AndesTextarea', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    return { fixture, textarea };
  }

  it('renders a native textarea', () => {
    const { textarea } = createHost();

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.getAttribute('data-slot')).toBe('textarea');
  });

  it('defaults to the medium size and vertical resize', () => {
    const { textarea } = createHost();

    expect(textarea.classList).toContain('andes-textarea--md');
    expect(textarea.classList).toContain('andes-textarea--resize-vertical');
  });

  it.each(['sm', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(textarea.classList).toContain(`andes-textarea--${size}`);
  });

  it.each(['none', 'horizontal', 'both'] as const)(
    'supports the %s resize mode',
    (resize) => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.resize.set(resize);
      fixture.detectChanges();

      expect(textarea.classList).toContain(`andes-textarea--resize-${resize}`);
    },
  );

  it('forces resize none when autoSize is enabled, regardless of resize', () => {
    const { fixture, textarea } = createHost();
    fixture.componentInstance.resize.set('both');
    fixture.componentInstance.autoSize.set(true);
    fixture.detectChanges();

    expect(textarea.classList).toContain('andes-textarea--resize-none');
    expect(textarea.classList).not.toContain('andes-textarea--resize-both');
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
    expect(textarea.classList).toContain('andes-textarea--invalid');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-invalid')).toBe(false);
  });

  describe('auto-size', () => {
    it('grows to fit content up to autoSizeMaxRows', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.autoSize.set(true);
      fixture.componentInstance.autoSizeMinRows.set(2);
      fixture.componentInstance.autoSizeMaxRows.set(4);
      fixture.detectChanges();

      setScrollHeight(textarea, 200);
      textarea.value = 'a lot of text\n'.repeat(10);
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // 4 rows at the jsdom fallback line-height (20px) = 80px ceiling.
      expect(textarea.style.height).toBe('80px');
      expect(textarea.style.overflowY).toBe('auto');
    });

    it('never shrinks below autoSizeMinRows', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.autoSize.set(true);
      fixture.componentInstance.autoSizeMinRows.set(3);
      fixture.detectChanges();

      setScrollHeight(textarea, 10);
      textarea.value = 'x';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // 3 rows at the jsdom fallback line-height (20px) = 60px floor.
      expect(textarea.style.height).toBe('60px');
      expect(textarea.style.overflowY).toBe('hidden');
    });

    it('falls back to `rows` for the minimum when autoSizeMinRows is not set', () => {
      const { fixture, textarea } = createHost();
      fixture.componentInstance.rows.set(5);
      fixture.componentInstance.autoSize.set(true);
      fixture.detectChanges();

      setScrollHeight(textarea, 0);
      fixture.detectChanges();

      expect(textarea.style.height).toBe('100px');
    });

    it('does not touch the inline height when autoSize is disabled', () => {
      const { fixture, textarea } = createHost();
      fixture.detectChanges();

      expect(textarea.style.height).toBe('');
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
