import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesButton } from '../button/button';
import { AndesInput } from './input';
import { AndesInputGroup } from './input-group';

describe('AndesInputGroup', () => {
  @Component({
    imports: [AndesInputGroup, AndesInput, AndesButton],
    template: `<andes-input-group aria-label="Convert amount" [block]="block()">
      <andes-input aria-label="Amount" />
      <andes-button>Convert</andes-button>
    </andes-input-group>`,
  })
  class HostComponent {
    readonly block = signal(false);
  }

  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'input-group.css'),
    'utf-8',
  );

  it('is a labelled group that projects its children', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector(
      'andes-input-group',
    ) as HTMLElement;

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Convert amount');
    expect(group.classList).toContain('andes-input-compact');
    expect(group.querySelector('andes-input input')).toBeTruthy();
    expect(group.querySelector('andes-button button')).toBeTruthy();
  });

  it('toggles the full-width modifier with `block`', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('andes-input-group');

    expect(group.classList).not.toContain('andes-input-compact--block');

    fixture.componentInstance.block.set(true);
    fixture.detectChanges();

    expect(group.classList).toContain('andes-input-compact--block');
  });

  it('overlaps neighbouring borders and squares off only the inner corners', () => {
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:first-child\) {\s*margin-inline-start: -1px;/,
    );
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:first-child\) :is\([^)]*\.andes-input-wrapper[^)]*\.andes-button[^)]*\) {\s*border-start-start-radius: 0;\s*border-end-start-radius: 0;/,
    );
    expect(css).toMatch(
      /:host ::ng-deep > :not\(:last-child\) :is\([^)]*\.andes-input-wrapper[^)]*\.andes-button[^)]*\) {\s*border-start-end-radius: 0;\s*border-end-end-radius: 0;/,
    );
  });

  it('stretches buttons to the field height only when the row holds a field', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('andes-input-group').classList,
    ).toContain('andes-input-compact--fields');
    expect(css).toMatch(
      /:host\(\.andes-input-compact--fields\) ::ng-deep > andes-button \.andes-button {\s*height: auto;/,
    );

    @Component({
      imports: [AndesInputGroup, AndesButton],
      template: `<andes-input-group
        ><andes-button>A</andes-button
        ><andes-button>B</andes-button></andes-input-group
      >`,
    })
    class ButtonsOnlyHost {}
    const buttonsOnly = TestBed.createComponent(ButtonsOnlyHost);
    buttonsOnly.detectChanges();

    expect(
      buttonsOnly.nativeElement.querySelector('andes-input-group').classList,
    ).not.toContain('andes-input-compact--fields');
  });

  it('lifts the hovered child, and the focused one above it, so the overlap clips neither', () => {
    expect(css).toMatch(
      /:host ::ng-deep > :hover {\s*position: relative;\s*z-index: 1;/,
    );
    expect(css).toMatch(
      /:host ::ng-deep > :focus-within {\s*position: relative;\s*z-index: 2;/,
    );
  });

  it('never splits a selector before a combinator (the style shim would mis-scope it)', () => {
    expect(css).not.toMatch(/\n\s*[>+~]/);
  });
});
