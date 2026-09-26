import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesCheckableTagGroup,
  AndesCheckableTagGroupValue,
  AndesCheckableTagOption,
  AndesCheckableTagValue,
} from './checkable-tag-group';

@Component({
  imports: [AndesCheckableTagGroup],
  template: `<andes-checkable-tag-group
    aria-label="Categories"
    [options]="options()"
    [multiple]="multiple()"
    [disabled]="disabled()"
    [(value)]="value"
  />`,
})
class HostComponent {
  readonly options = signal<
    readonly (AndesCheckableTagOption | AndesCheckableTagValue)[]
  >([
    { value: 'movies', label: 'Movies' },
    { value: 'books', label: 'Books' },
    { value: 'music', label: 'Music', disabled: true },
    'sports',
  ]);
  readonly multiple = signal(false);
  readonly disabled = signal(false);
  readonly value = signal<AndesCheckableTagGroupValue>(null);
}

describe('AndesCheckableTagGroup', () => {
  function create(apply: (host: HostComponent) => void = () => undefined) {
    const fixture = TestBed.createComponent(HostComponent);
    apply(fixture.componentInstance);
    fixture.detectChanges();
    const tags = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('[data-slot="tag"]'),
      ) as HTMLButtonElement[];
    const click = (index: number) => {
      tags()[index].click();
      fixture.detectChanges();
    };
    const pressed = () => tags().map((t) => t.getAttribute('aria-pressed'));
    return { fixture, tags, click, pressed };
  }

  it('renders one checkable toggle button per option, bare values labelled by themselves', () => {
    const { tags } = create();

    expect(tags().map((t) => t.tagName)).toEqual([
      'BUTTON',
      'BUTTON',
      'BUTTON',
      'BUTTON',
    ]);
    expect(tags().map((t) => t.textContent?.trim())).toEqual([
      'Movies',
      'Books',
      'Music',
      'sports',
    ]);
  });

  it('exposes role=group with the consumer aria-label', () => {
    const { fixture } = create();
    const group = fixture.nativeElement.querySelector(
      'andes-checkable-tag-group',
    );

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Categories');
  });

  it('reflects the initial value', () => {
    const { pressed } = create((host) => host.value.set('books'));

    expect(pressed()).toEqual(['false', 'true', 'false', 'false']);
  });

  it('single mode: selecting a tag replaces the previous selection', () => {
    const { fixture, click, pressed } = create();
    click(0);

    expect(fixture.componentInstance.value()).toBe('movies');

    click(1);

    expect(fixture.componentInstance.value()).toBe('books');
    expect(pressed()).toEqual(['false', 'true', 'false', 'false']);
  });

  it('single mode: clicking the selected tag clears the selection to null (Ant behavior)', () => {
    const { fixture, click, pressed } = create((host) =>
      host.value.set('books'),
    );
    click(1);

    expect(fixture.componentInstance.value()).toBeNull();
    expect(pressed()).toEqual(['false', 'false', 'false', 'false']);
  });

  it('multiple mode: toggles values in and out, keeping option order', () => {
    const { fixture, click, pressed } = create((host) =>
      host.multiple.set(true),
    );
    click(3);
    click(0);

    expect(fixture.componentInstance.value()).toEqual(['movies', 'sports']);
    expect(pressed()).toEqual(['true', 'false', 'false', 'true']);

    click(3);

    expect(fixture.componentInstance.value()).toEqual(['movies']);
  });

  it('reflects external value writes', () => {
    const { fixture, pressed } = create((host) => host.multiple.set(true));
    fixture.componentInstance.value.set(['books', 'sports']);
    fixture.detectChanges();

    expect(pressed()).toEqual(['false', 'true', 'false', 'true']);
  });

  it('a disabled option cannot be toggled', () => {
    const { fixture, tags, click } = create();

    expect(tags()[2].disabled).toBe(true);
    click(2);

    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('disabled disables every tag and marks the group aria-disabled', () => {
    const { fixture, tags } = create((host) => host.disabled.set(true));

    expect(tags().every((t) => t.disabled)).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('andes-checkable-tag-group')
        .getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
