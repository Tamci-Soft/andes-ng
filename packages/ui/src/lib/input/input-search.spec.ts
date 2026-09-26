import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesInputSearch, AndesInputSearchEvent } from './input-search';

describe('AndesInputSearch', () => {
  @Component({
    imports: [AndesInputSearch, ReactiveFormsModule],
    template: `<andes-input-search
      aria-label="Search"
      clearable
      [formControl]="control"
      [enterButton]="enterButton()"
      [loading]="loading()"
      (searched)="searches.push($event)"
      (pressEnter)="enters = enters + 1"
    />`,
  })
  class HostComponent {
    readonly control = new FormControl('');
    readonly enterButton = signal<boolean | string>(false);
    readonly loading = signal(false);
    readonly searches: AndesInputSearchEvent[] = [];
    enters = 0;
  }

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const button = () =>
      fixture.nativeElement.querySelector(
        '.andes-input__search-button button',
      ) as HTMLButtonElement;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, input, button, type };
  }

  it('renders a type="search" field with an attached, labelled icon button', () => {
    const { input, button } = createHost();

    expect(input.getAttribute('type')).toBe('search');
    expect(button().getAttribute('aria-label')).toBe('Search');
    expect(button().classList).toContain('andes-button--outline');
  });

  it('emits (searched) on Enter, alongside (pressEnter)', () => {
    const { fixture, input, type } = createHost();
    type('angular');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(fixture.componentInstance.searches).toHaveLength(1);
    expect(fixture.componentInstance.searches[0]).toMatchObject({
      value: 'angular',
      source: 'input',
    });
    expect(fixture.componentInstance.enters).toBe(1);
  });

  it('emits (searched) on a button click', () => {
    const { fixture, button, type } = createHost();
    type('signals');

    button().click();

    expect(fixture.componentInstance.searches).toEqual([
      expect.objectContaining({ value: 'signals', source: 'input' }),
    ]);
  });

  it('emits (searched) with source "clear" when cleared', () => {
    const { fixture, type } = createHost();
    type('something');

    (
      fixture.nativeElement.querySelector(
        '.andes-input__clear',
      ) as HTMLButtonElement
    ).click();

    expect(fixture.componentInstance.searches).toEqual([
      expect.objectContaining({ value: '', source: 'clear' }),
    ]);
    expect(fixture.componentInstance.control.value).toBe('');
  });

  it('uses a primary button for enterButton, with a text label when given a string', () => {
    const { fixture, button } = createHost();

    fixture.componentInstance.enterButton.set(true);
    fixture.detectChanges();

    expect(button().classList).toContain('andes-button--primary');
    expect(button().getAttribute('aria-label')).toBe('Search');

    fixture.componentInstance.enterButton.set('Go');
    fixture.detectChanges();

    expect(button().textContent?.trim()).toBe('Go');
    expect(button().hasAttribute('aria-label')).toBe(false);
  });

  it('treats a bare enterButton attribute as true', () => {
    @Component({
      imports: [AndesInputSearch],
      template: `<andes-input-search aria-label="Search" enterButton />`,
    })
    class BareHost {}

    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-input__search-button button')
        .classList,
    ).toContain('andes-button--primary');
  });

  it('shows the loading state on the button and suppresses (searched) while loading', () => {
    const { fixture, input, button } = createHost();

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(button().disabled).toBe(true);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(fixture.componentInstance.searches).toHaveLength(0);
  });

  it('disables the button with the field', () => {
    const { fixture, button } = createHost();

    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
  });
});
