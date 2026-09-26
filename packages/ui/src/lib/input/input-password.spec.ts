import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesInputPassword } from './input-password';

describe('AndesInputPassword', () => {
  @Component({
    imports: [AndesInputPassword],
    template: `<andes-input-password
      aria-label="Password"
      [visibilityToggle]="visibilityToggle()"
      [(visible)]="visible"
      [disabled]="disabled()"
    />`,
  })
  class HostComponent {
    readonly visibilityToggle = signal(true);
    readonly visible = signal(false);
    readonly disabled = signal(false);
  }

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const toggle = () =>
      fixture.nativeElement.querySelector(
        '.andes-input__password-toggle',
      ) as HTMLButtonElement | null;
    return { fixture, input, toggle };
  }

  it('renders a password field with a show/hide toggle by default', () => {
    const { input, toggle } = createHost();

    expect(input.getAttribute('type')).toBe('password');
    expect(toggle()).toBeTruthy();
    expect(toggle()?.getAttribute('aria-label')).toBe('Show password');
    expect(toggle()?.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles the visibility on click, and reports it through [(visible)]', () => {
    const { fixture, input, toggle } = createHost();

    toggle()?.click();
    fixture.detectChanges();

    expect(input.getAttribute('type')).toBe('text');
    expect(toggle()?.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.visible()).toBe(true);

    toggle()?.click();
    fixture.detectChanges();

    expect(input.getAttribute('type')).toBe('password');
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('is controllable from the outside via [(visible)]', () => {
    const { fixture, input } = createHost();

    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();

    expect(input.getAttribute('type')).toBe('text');
  });

  it('hides the toggle when visibilityToggle is false', () => {
    const { fixture, input, toggle } = createHost();

    fixture.componentInstance.visibilityToggle.set(false);
    fixture.detectChanges();

    expect(toggle()).toBeNull();
    expect(input.getAttribute('type')).toBe('password');
  });

  it('keeps focus in the field when the toggle is pressed with a mouse', () => {
    const { toggle } = createHost();
    const mousedown = new MouseEvent('mousedown', { cancelable: true });

    toggle()?.dispatchEvent(mousedown);

    expect(mousedown.defaultPrevented).toBe(true);
  });

  it('disables the toggle along with the field', () => {
    const { fixture, toggle } = createHost();

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(toggle()?.disabled).toBe(true);
  });

  it('normalises an empty-string `visible` (a bare attribute) to true', () => {
    // `model()` takes no transform, so this is handled by a computed booleanAttribute instead.
    const fixture = TestBed.createComponent(AndesInputPassword);
    fixture.componentRef.setInput('visible', '');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('input').getAttribute('type'),
    ).toBe('text');
  });

  it('works as a form control', () => {
    @Component({
      imports: [AndesInputPassword, ReactiveFormsModule],
      template: `<andes-input-password
        aria-label="Password"
        [formControl]="control"
      />`,
    })
    class FormHost {
      readonly control = new FormControl('secret');
    }

    const fixture = TestBed.createComponent(FormHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input');

    expect(input.value).toBe('secret');

    input.value = 'hunter2';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('hunter2');
  });
});
