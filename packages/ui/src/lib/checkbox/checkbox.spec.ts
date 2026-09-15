import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesCheckbox } from './checkbox';

@Component({
  imports: [AndesCheckbox],
  template: `<andes-checkbox
    [checked]="checked()"
    [disabled]="disabled()"
    [indeterminate]="indeterminate()"
    [required]="required()"
    [readOnly]="readOnly()"
    [name]="name()"
    [value]="value()"
    (checkedChange)="checkedChange($event)"
    (indeterminateChange)="indeterminateChange($event)"
    >Accept terms</andes-checkbox
  >`,
})
class HostComponent {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly indeterminate = signal(false);
  readonly required = signal(false);
  readonly readOnly = signal(false);
  readonly name = signal<string | undefined>(undefined);
  readonly value = signal<string | undefined>(undefined);

  lastCheckedChange: boolean | undefined;
  lastIndeterminateChange: boolean | undefined;

  checkedChange(value: boolean): void {
    this.lastCheckedChange = value;
  }

  indeterminateChange(value: boolean): void {
    this.lastIndeterminateChange = value;
  }
}

describe('AndesCheckbox', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input[type=checkbox]',
    ) as HTMLInputElement;
    const label = fixture.nativeElement.querySelector(
      'label',
    ) as HTMLLabelElement;
    return { fixture, input, label };
  }

  it('renders a native checkbox input', () => {
    const { input } = createHost();

    expect(input).toBeTruthy();
    expect(input.type).toBe('checkbox');
  });

  it('projects the label content', () => {
    const { fixture } = createHost();

    expect(fixture.nativeElement.textContent.trim()).toBe('Accept terms');
  });

  it('is unchecked by default', () => {
    const { input } = createHost();

    expect(input.checked).toBe(false);
  });

  it('reflects the checked input', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();

    expect(input.checked).toBe(true);
  });

  it('reflects checked live when the bound signal changes back and forth', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    expect(input.checked).toBe(true);

    fixture.componentInstance.checked.set(false);
    fixture.detectChanges();
    expect(input.checked).toBe(false);
  });

  it('resyncs checked from the bound input after a user click diverged it (linkedSignal regression)', () => {
    // Regression test for the "controlled-but-locally-overridable" pattern `checkedState`
    // implements: a user click is allowed to locally diverge it from the `checked` input
    // (see `onNativeChange`), but the parent must still be able to win back control the next
    // time it asserts a value on `checked` - it must never get permanently stuck reflecting
    // the stale, click-driven value. A plain `signal()` + `effect()` mirror is prone to
    // exactly this kind of staleness because the effect only mutates `checkedState` and
    // never resets it against a fresh read the way a derived `linkedSignal` does.
    const { fixture, input } = createHost();
    expect(input.checked).toBe(false);

    // User clicks the checkbox: internal state diverges to `true` while the bound `checked`
    // input is still `false`.
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(input.checked).toBe(true);

    // The parent, unaware of (or rejecting) that local change, asserts its own `checked`
    // value on the control. It must win over the diverged, click-driven state every time
    // its value changes - here first re-affirming `true`, then flipping to `false`.
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    expect(input.checked).toBe(true);

    fixture.componentInstance.checked.set(false);
    fixture.detectChanges();

    // The `checked` DOM property is this component's single source of visual truth - the
    // `:checked` box/checkmark styling in checkbox.css is driven entirely off it, there is
    // no separate `andes-checkbox--checked` class to assert on.
    expect(input.checked).toBe(false);
  });

  it('toggles checked and emits checkedChange on user interaction', () => {
    const { fixture, input } = createHost();

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.lastCheckedChange).toBe(true);
  });

  it('reflects disabled on the native input', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
  });

  it('forwards required, name and value attributes', () => {
    const { fixture, input } = createHost();
    fixture.componentInstance.required.set(true);
    fixture.componentInstance.name.set('terms');
    fixture.componentInstance.value.set('accepted');
    fixture.detectChanges();

    expect(input.hasAttribute('required')).toBe(true);
    expect(input.getAttribute('name')).toBe('terms');
    expect(input.getAttribute('value')).toBe('accepted');
  });

  describe('readOnly', () => {
    it('stays focusable and visually enabled, unlike disabled', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.readOnly.set(true);
      fixture.detectChanges();

      expect(input.disabled).toBe(false);
      expect(input.getAttribute('aria-readonly')).toBe('true');
    });

    it('prevents toggling checked on click', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.readOnly.set(true);
      fixture.detectChanges();

      input.dispatchEvent(new MouseEvent('click', { cancelable: true }));
      fixture.detectChanges();

      expect(input.checked).toBe(false);
      expect(fixture.componentInstance.lastCheckedChange).toBeUndefined();
    });

    it('still allows toggling once readOnly is cleared', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.readOnly.set(true);
      fixture.detectChanges();
      input.dispatchEvent(new MouseEvent('click', { cancelable: true }));
      fixture.detectChanges();
      expect(input.checked).toBe(false);

      fixture.componentInstance.readOnly.set(false);
      fixture.detectChanges();

      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(fixture.componentInstance.lastCheckedChange).toBe(true);
    });
  });

  describe('indeterminate', () => {
    it('sets the DOM property (not just an attribute) when indeterminate is true', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();

      // A DOM property read, not `hasAttribute` - `[attr.indeterminate]` would be a no-op
      // on a native checkbox, so this is the assertion that actually catches that mistake.
      expect(input.indeterminate).toBe(true);
      // Angular's `[indeterminate]` binding sets the property only; it must not also
      // reflect a spurious `indeterminate` HTML attribute onto the element.
      expect(input.hasAttribute('indeterminate')).toBe(false);
    });

    it('clears indeterminate and emits indeterminateChange on user interaction', () => {
      const { fixture, input } = createHost();
      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();
      expect(input.indeterminate).toBe(true);

      // Simulate the browser's own native behavior: clicking an indeterminate checkbox
      // clears the `indeterminate` property and toggles `checked` to true.
      input.indeterminate = false;
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(input.indeterminate).toBe(false);
      expect(fixture.componentInstance.lastIndeterminateChange).toBe(false);
      expect(fixture.componentInstance.lastCheckedChange).toBe(true);
    });

    it('resyncs indeterminate from the bound input after a user click diverged it (linkedSignal regression)', () => {
      // Same "controlled-but-locally-overridable" regression as the `checked` test above,
      // but for `indeterminate`: a user click clears the native `indeterminate` property
      // (the browser's own behavior), locally diverging `indeterminateState` from whatever
      // the `indeterminate` input currently holds. The parent must still be able to win
      // back control - re-showing the "mixed" dash - the next time it asserts a value,
      // rather than the checkbox getting stuck on the click-cleared state forever.
      const { fixture, input } = createHost();
      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();
      expect(input.indeterminate).toBe(true);

      // Simulate the browser's own native behavior: clicking an indeterminate checkbox
      // clears the DOM property itself, independent of the bound `indeterminate` input.
      input.indeterminate = false;
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(input.indeterminate).toBe(false);

      // Parent flips `indeterminate` off then on again - it must win over the diverged,
      // click-cleared state every time its value changes.
      fixture.componentInstance.indeterminate.set(false);
      fixture.detectChanges();
      expect(input.indeterminate).toBe(false);

      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();

      expect(input.indeterminate).toBe(true);
    });

    it('does not emit indeterminateChange when it was already false', () => {
      const { fixture, input } = createHost();

      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(fixture.componentInstance.lastIndeterminateChange).toBeUndefined();
    });
  });

  describe('ARIA forwarding', () => {
    it('forwards aria-label, aria-describedby and aria-invalid to the native input, not the host', () => {
      @Component({
        imports: [AndesCheckbox],
        template: `<andes-checkbox
          aria-label="Accept terms"
          aria-describedby="terms-hint"
          aria-invalid="true"
        />`,
      })
      class AriaHost {}

      const fixture = TestBed.createComponent(AriaHost);
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('andes-checkbox');
      const input = fixture.nativeElement.querySelector('input');
      const label = fixture.nativeElement.querySelector('label');

      expect(input.getAttribute('aria-label')).toBe('Accept terms');
      expect(input.getAttribute('aria-describedby')).toBe('terms-hint');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(label.classList).toContain('andes-checkbox--invalid');
      expect(host.hasAttribute('aria-label')).toBe(false);
      expect(host.hasAttribute('aria-describedby')).toBe(false);
      expect(host.hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('bare boolean attributes (no brackets)', () => {
    it('treats bare checked, disabled and indeterminate as true, not the string ""', () => {
      @Component({
        imports: [AndesCheckbox],
        template: `<andes-checkbox checked disabled indeterminate
          >Save</andes-checkbox
        >`,
      })
      class BareAttrHost {}

      const fixture = TestBed.createComponent(BareAttrHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.checked).toBe(true);
      expect(input.disabled).toBe(true);
      expect(input.indeterminate).toBe(true);
    });
  });

  describe('ControlValueAccessor', () => {
    it('works with [formControl]', () => {
      @Component({
        imports: [AndesCheckbox, ReactiveFormsModule],
        template: `<andes-checkbox [formControl]="control"
          >Save</andes-checkbox
        >`,
      })
      class FormControlHost {
        readonly control = new FormControl(false, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(FormControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.checked).toBe(false);

      fixture.componentInstance.control.setValue(true);
      fixture.detectChanges();
      expect(input.checked).toBe(true);

      input.checked = false;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toBe(false);
    });

    it('marks the control as touched on blur', () => {
      @Component({
        imports: [AndesCheckbox, ReactiveFormsModule],
        template: `<andes-checkbox [formControl]="control"
          >Save</andes-checkbox
        >`,
      })
      class FormControlHost {
        readonly control = new FormControl(false, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(FormControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(fixture.componentInstance.control.touched).toBe(false);
      input.dispatchEvent(new Event('blur'));

      expect(fixture.componentInstance.control.touched).toBe(true);
    });

    it('disables the native input via setDisabledState', () => {
      @Component({
        imports: [AndesCheckbox, ReactiveFormsModule],
        template: `<andes-checkbox [formControl]="control"
          >Save</andes-checkbox
        >`,
      })
      class FormControlHost {
        readonly control = new FormControl({ value: false, disabled: true });
      }

      const fixture = TestBed.createComponent(FormControlHost);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');

      expect(input.disabled).toBe(true);
    });

    it('works with [(ngModel)]', async () => {
      @Component({
        imports: [AndesCheckbox, FormsModule],
        template: `<andes-checkbox [(ngModel)]="value">Save</andes-checkbox>`,
      })
      class NgModelHost {
        value = false;
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const input = fixture.nativeElement.querySelector('input');

      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value).toBe(true);
    });
  });
});
