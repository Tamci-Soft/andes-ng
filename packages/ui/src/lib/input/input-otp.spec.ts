import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesInputOtp, AndesInputOtpFormatter } from './input-otp';

describe('AndesInputOtp', () => {
  @Component({
    imports: [AndesInputOtp],
    template: `<andes-input-otp
      aria-label="Verification code"
      [length]="length()"
      [mask]="mask()"
      [formatter]="formatter()"
      [separator]="separator()"
      [(value)]="code"
      (complete)="completed.push($event)"
    />`,
  })
  class HostComponent {
    readonly length = signal(4);
    readonly mask = signal<boolean | string>(false);
    readonly formatter = signal<AndesInputOtpFormatter | undefined>(undefined);
    readonly separator = signal<string | undefined>(undefined);
    readonly code = signal('');
    readonly completed: string[] = [];
  }

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const cells = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.andes-input-otp__cell'),
      ) as HTMLInputElement[];
    const typeInto = (index: number, text: string) => {
      const cell = cells()[index];
      cell.value = text;
      cell.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const keydown = (index: number, key: string) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      cells()[index].dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const paste = (index: number, text: string) => {
      const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => text },
      });
      cells()[index].dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    return { fixture, cells, typeInto, keydown, paste };
  }

  it('renders `length` labelled cells inside a labelled group (6 by default)', () => {
    const { fixture, cells } = createHost();
    const group = fixture.nativeElement.querySelector('[role="group"]');

    expect(cells()).toHaveLength(4);
    expect(group.getAttribute('aria-label')).toBe('Verification code');
    expect(cells()[0].getAttribute('aria-label')).toBe('Character 1 of 4');
    expect(cells()[0].getAttribute('autocomplete')).toBe('one-time-code');
    expect(cells()[1].getAttribute('autocomplete')).toBe('off');

    const defaultFixture = TestBed.createComponent(AndesInputOtp);
    defaultFixture.detectChanges();
    expect(
      defaultFixture.nativeElement.querySelectorAll('.andes-input-otp__cell'),
    ).toHaveLength(6);
  });

  it('writes a typed character and advances focus to the next cell', () => {
    const { fixture, cells, typeInto } = createHost();

    typeInto(0, '1');

    expect(cells()[0].value).toBe('1');
    expect(document.activeElement).toBe(cells()[1]);
    expect(fixture.componentInstance.code()).toBe('1');
  });

  it('replaces the existing character when typing beside it', () => {
    const { fixture, cells, typeInto } = createHost();
    typeInto(0, '1');

    typeInto(0, '17');

    expect(cells()[0].value).toBe('7');
    expect(fixture.componentInstance.code()).toBe('7');
  });

  it('distributes a paste across the cells from the focused one and emits (complete)', () => {
    const { fixture, cells, paste } = createHost();

    const event = paste(0, ' 4821 ');

    expect(event.defaultPrevented).toBe(true);
    expect(cells().map((cell) => cell.value)).toEqual(['4', '8', '2', '1']);
    expect(fixture.componentInstance.code()).toBe('4821');
    expect(fixture.componentInstance.completed).toEqual(['4821']);
    expect(document.activeElement).toBe(cells()[3]);
  });

  it('distributes multi-character input (e.g. SMS autofill) the same way, truncated to length', () => {
    const { fixture, typeInto } = createHost();

    typeInto(0, '123456');

    expect(fixture.componentInstance.code()).toBe('1234');
  });

  it('Backspace clears the current cell, or steps back and clears the previous one when empty', () => {
    const { fixture, cells, paste, keydown } = createHost();
    paste(0, '1234');

    keydown(3, 'Backspace');
    expect(fixture.componentInstance.code()).toBe('123');
    expect(document.activeElement).toBe(cells()[3]);

    const event = keydown(3, 'Backspace');
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.code()).toBe('12');
    expect(document.activeElement).toBe(cells()[2]);
  });

  it('keeps the cells in sync even when two edits land before change detection runs', () => {
    const { cells } = createHost();
    const [first, second] = cells();

    // No fixture.detectChanges() between these: the [value] binding never renders "1", so on
    // its own it would see '' -> '' after the Backspace and leave the stale "1" in the DOM.
    first.value = '1';
    first.dispatchEvent(new Event('input'));
    second.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }),
    );

    expect(first.value).toBe('');
  });

  it('keeps a cleared middle cell as a hole rather than shifting later characters', () => {
    const { fixture, cells, paste, keydown } = createHost();
    paste(0, '1234');

    keydown(1, 'Delete');

    expect(cells().map((cell) => cell.value)).toEqual(['1', '', '3', '4']);
    expect(fixture.componentInstance.code()).toBe('134');
  });

  it('moves between cells with the arrow keys, Home and End', () => {
    const { cells, keydown } = createHost();
    cells()[1].focus();

    keydown(1, 'ArrowRight');
    expect(document.activeElement).toBe(cells()[2]);
    keydown(2, 'ArrowLeft');
    expect(document.activeElement).toBe(cells()[1]);
    keydown(1, 'End');
    expect(document.activeElement).toBe(cells()[3]);
    keydown(3, 'Home');
    expect(document.activeElement).toBe(cells()[0]);
  });

  it('masks filled cells with "•" for `mask`, or with a custom character', () => {
    const { fixture, cells, paste } = createHost();
    fixture.componentInstance.mask.set(true);
    fixture.detectChanges();

    paste(0, '12');
    expect(cells().map((cell) => cell.value)).toEqual(['•', '•', '', '']);
    expect(fixture.componentInstance.code()).toBe('12');

    fixture.componentInstance.mask.set('*');
    fixture.detectChanges();
    expect(cells()[0].value).toBe('*');
  });

  it('runs typed/pasted text through the formatter, which can also filter it', () => {
    const { fixture, cells, paste, typeInto } = createHost();
    fixture.componentInstance.formatter.set((value) =>
      value.replace(/\D/g, ''),
    );
    fixture.detectChanges();

    paste(0, '1a2b');
    expect(fixture.componentInstance.code()).toBe('12');

    typeInto(2, 'x');
    expect(cells()[2].value).toBe('');
    expect(fixture.componentInstance.code()).toBe('12');
  });

  it('renders a decorative separator between cells', () => {
    const { fixture } = createHost();
    fixture.componentInstance.separator.set('-');
    fixture.detectChanges();

    const separators = fixture.nativeElement.querySelectorAll(
      '.andes-input-otp__separator',
    );
    expect(separators).toHaveLength(3);
    expect(separators[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('splits a value set from outside across the cells', () => {
    const { fixture, cells } = createHost();

    fixture.componentInstance.code.set('98');
    fixture.detectChanges();

    expect(cells().map((cell) => cell.value)).toEqual(['9', '8', '', '']);
  });

  it('works as a form control: writes, updates, disables and marks touched on leaving the group', () => {
    @Component({
      imports: [AndesInputOtp, ReactiveFormsModule],
      template: `<andes-input-otp
          aria-label="Code"
          [length]="4"
          [formControl]="control"
        /><button type="button">after</button>`,
    })
    class FormHost {
      readonly control = new FormControl('12');
    }

    const fixture = TestBed.createComponent(FormHost);
    fixture.detectChanges();
    const cells = Array.from(
      fixture.nativeElement.querySelectorAll('.andes-input-otp__cell'),
    ) as HTMLInputElement[];
    const control = fixture.componentInstance.control;

    expect(cells.map((cell) => cell.value)).toEqual(['1', '2', '', '']);

    cells[2].value = '3';
    cells[2].dispatchEvent(new Event('input'));
    expect(control.value).toBe('123');

    // Moving between cells is not leaving the field.
    cells[2].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: cells[3] }),
    );
    expect(control.touched).toBe(false);
    cells[3].dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: fixture.nativeElement.querySelector('button'),
      }),
    );
    expect(control.touched).toBe(true);

    control.disable();
    fixture.detectChanges();
    expect(cells.every((cell) => cell.disabled)).toBe(true);
  });

  it('reflects status on every cell and forwards the id to the first one', () => {
    @Component({
      imports: [AndesInputOtp],
      template: `<andes-input-otp id="otp" status="error" [length]="2" />`,
    })
    class StatusHost {}

    const fixture = TestBed.createComponent(StatusHost);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll(
      '.andes-input-otp__cell',
    );

    expect(
      fixture.nativeElement.querySelector('.andes-input-otp').classList,
    ).toContain('andes-input-otp--invalid');
    expect(cells[0].getAttribute('aria-invalid')).toBe('true');
    expect(cells[1].getAttribute('aria-invalid')).toBe('true');
    expect(cells[0].id).toBe('otp');
    expect(cells[1].hasAttribute('id')).toBe(false);
    expect(
      fixture.nativeElement.querySelector('andes-input-otp').hasAttribute('id'),
    ).toBe(false);
  });

  it('paints exactly one focus ring on the focused cell and sets the font stack on its root', () => {
    const { fixture, cells } = createHost();
    const root = fixture.nativeElement.querySelector('.andes-input-otp');

    cells()[0].focus();

    expect(getComputedStyle(cells()[0]).outline).toBe(
      '2px solid var(--andes-color-focus-ring)',
    );
    expect(getComputedStyle(root).outline).not.toContain('solid');
    expect(getComputedStyle(root).fontFamily).toBe(
      'var(--andes-font-family), sans-serif',
    );
    expect(getComputedStyle(cells()[0]).fontFamily).toBe('inherit');
  });

  it('focus() focuses the first empty cell', () => {
    const fixture = TestBed.createComponent(AndesInputOtp);
    fixture.componentRef.setInput('value', '12');
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll(
      '.andes-input-otp__cell',
    );

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(cells[2]);
  });
});
