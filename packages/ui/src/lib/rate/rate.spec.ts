import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesRate, AndesRateCharacterInput, AndesRateSize } from './rate';
import { AndesRateCharacter } from './rate-character';

@Component({
  imports: [AndesRate],
  template: `
    <ng-template #tpl let-index="index" let-filled="filled"
      ><b data-test="glyph">{{ index }}{{ filled ? 'f' : 'e' }}</b></ng-template
    >
    <andes-rate
      [(value)]="value"
      [count]="count()"
      [allowHalf]="allowHalf()"
      [allowClear]="allowClear()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [size]="size()"
      [character]="character()"
      [tooltips]="tooltips()"
      [color]="color()"
      aria-label="Rating"
      (hoverChange)="hovers.push($event)"
    />
  `,
})
class HostComponent {
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
  readonly value = signal(0);
  readonly count = signal(5);
  readonly allowHalf = signal(false);
  readonly allowClear = signal(true);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly size = signal<AndesRateSize>('md');
  readonly character = signal<AndesRateCharacterInput | undefined>(undefined);
  readonly tooltips = signal<readonly string[]>([]);
  readonly color = signal<string | undefined>(undefined);
  readonly hovers: (number | undefined)[] = [];
}

@Component({
  imports: [AndesRate, AndesRateCharacter],
  template: `<andes-rate [value]="2">
    <ng-template andesRateCharacter let-index
      ><i data-test="own">{{ index + 1 }}</i></ng-template
    >
  </andes-rate>`,
})
class DirectiveHostComponent {}

@Component({
  imports: [AndesRate, ReactiveFormsModule],
  template: `<andes-rate [formControl]="control" aria-label="Score" />`,
})
class FormHostComponent {
  readonly control = new FormControl(3);
}

function stubRect(element: HTMLElement, left: number, width: number): void {
  element.getBoundingClientRect = () =>
    ({
      left,
      right: left + width,
      width,
      top: 0,
      bottom: 20,
      height: 20,
      x: left,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;
}

function pointer(type: string, clientX = 0): MouseEvent {
  return new MouseEvent(type, { bubbles: true, clientX });
}

describe('AndesRate', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-rate',
    ) as HTMLElement;
    const slider = host.querySelector('[role="slider"]') as HTMLElement;
    const stars = () =>
      Array.from(host.querySelectorAll<HTMLElement>('[data-slot="rate-star"]'));
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      slider.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    return { fixture, host, slider, stars, press };
  }

  describe('rendering and semantics', () => {
    it('draws five characters by default and any count', () => {
      const { fixture, stars } = create();
      expect(stars()).toHaveLength(5);

      fixture.componentInstance.count.set(10);
      fixture.detectChanges();
      expect(stars()).toHaveLength(10);
    });

    it('is a single slider from 0 to count with the current value', () => {
      const { fixture, slider } = create();
      fixture.componentInstance.value.set(3);
      fixture.detectChanges();

      expect(slider.getAttribute('aria-valuemin')).toBe('0');
      expect(slider.getAttribute('aria-valuemax')).toBe('5');
      expect(slider.getAttribute('aria-valuenow')).toBe('3');
      expect(slider.getAttribute('aria-valuetext')).toBe('3 of 5');
      expect(slider.getAttribute('aria-label')).toBe('Rating');
      expect(slider.tabIndex).toBe(0);
    });

    it('keeps ARIA and id off the host', () => {
      const { host } = create();
      expect(host.hasAttribute('aria-label')).toBe(false);
      expect(host.hasAttribute('role')).toBe(false);
    });

    it('hides the characters from assistive technology', () => {
      const { host } = create();
      const layers = host.querySelectorAll('.andes-rate__layer');
      expect(layers.length).toBe(10);
      layers.forEach((layer) =>
        expect(layer.getAttribute('aria-hidden')).toBe('true'),
      );
    });

    it('uses tooltip text as the spoken value', () => {
      const { fixture, slider } = create();
      fixture.componentInstance.tooltips.set([
        'Terrible',
        'Bad',
        'Normal',
        'Good',
        'Wonderful',
      ]);
      fixture.componentInstance.value.set(4);
      fixture.detectChanges();

      expect(slider.getAttribute('aria-valuetext')).toBe('Good');
    });

    it('sizes by preset, number or CSS length', () => {
      const { fixture, host } = create();
      expect(host.style.getPropertyValue('--andes-rate-size')).toBe('20px');

      fixture.componentInstance.size.set('lg');
      fixture.detectChanges();
      expect(host.style.getPropertyValue('--andes-rate-size')).toBe('28px');

      fixture.componentInstance.size.set(36);
      fixture.detectChanges();
      expect(host.style.getPropertyValue('--andes-rate-size')).toBe('36px');

      fixture.componentInstance.size.set('2rem');
      fixture.detectChanges();
      expect(host.style.getPropertyValue('--andes-rate-size')).toBe('2rem');
    });

    it('applies the color hook', () => {
      const { fixture, host } = create();
      fixture.componentInstance.color.set('#e11d48');
      fixture.detectChanges();

      expect(host.style.getPropertyValue('--andes-rate-color')).toBe('#e11d48');
    });
  });

  describe('fill', () => {
    const fills = (stars: () => HTMLElement[]) =>
      stars().map(
        (star) =>
          (star.querySelector('.andes-rate__layer--filled') as HTMLElement)
            .style.inlineSize,
      );

    it('fills whole characters up to the value', () => {
      const { fixture, stars } = create();
      fixture.componentInstance.value.set(2);
      fixture.detectChanges();

      expect(fills(stars)).toEqual(['100%', '100%', '0%', '0%', '0%']);
      expect(stars().map((s) => s.dataset['state'])).toEqual([
        'full',
        'full',
        'empty',
        'empty',
        'empty',
      ]);
    });

    it('clips the filled layer for fractional values', () => {
      const { fixture, stars } = create();
      fixture.componentInstance.value.set(3.7);
      fixture.detectChanges();

      expect(fills(stars)).toEqual(['100%', '100%', '100%', '70%', '0%']);
      expect(stars()[3].dataset['state']).toBe('partial');
    });

    it('fills a half character at 50%', () => {
      const { fixture, stars } = create();
      fixture.componentInstance.value.set(1.5);
      fixture.detectChanges();

      expect(fills(stars)[1]).toBe('50%');
    });
  });

  describe('pointer', () => {
    it('sets the value on click and emits through the model', () => {
      const { fixture, stars } = create();
      stars()[3].dispatchEvent(pointer('click'));
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe(4);
    });

    it('clears when the same character is clicked again (allowClear)', () => {
      const { fixture, stars } = create();
      stars()[2].dispatchEvent(pointer('click'));
      stars()[2].dispatchEvent(pointer('click'));
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe(0);
    });

    it('keeps the value when allowClear is off', () => {
      const { fixture, stars } = create();
      fixture.componentInstance.allowClear.set(false);
      fixture.detectChanges();
      stars()[2].dispatchEvent(pointer('click'));
      stars()[2].dispatchEvent(pointer('click'));

      expect(fixture.componentInstance.value()).toBe(3);
    });

    it('selects the first half of a character with allowHalf', () => {
      const { fixture, stars } = create();
      fixture.componentInstance.allowHalf.set(true);
      fixture.detectChanges();
      stubRect(stars()[1], 100, 20);

      stars()[1].dispatchEvent(pointer('click', 104));
      expect(fixture.componentInstance.value()).toBe(1.5);

      stars()[1].dispatchEvent(pointer('click', 116));
      expect(fixture.componentInstance.value()).toBe(2);
    });

    it('measures halves from the right in right-to-left layouts', () => {
      const { fixture, host, stars } = create();
      host.setAttribute('dir', 'rtl');
      fixture.componentInstance.allowHalf.set(true);
      fixture.detectChanges();
      stubRect(stars()[1], 100, 20);

      // Near the right edge is the START of the character in RTL: a half.
      stars()[1].dispatchEvent(pointer('click', 116));
      expect(fixture.componentInstance.value()).toBe(1.5);

      stars()[1].dispatchEvent(pointer('click', 104));
      expect(fixture.componentInstance.value()).toBe(2);
    });

    it('previews on hover, emits hoverChange and restores on leave', () => {
      const { fixture, slider, stars } = create();
      fixture.componentInstance.value.set(1);
      fixture.detectChanges();

      stars()[3].dispatchEvent(pointer('pointermove'));
      fixture.detectChanges();
      expect(
        (stars()[3].querySelector('.andes-rate__layer--filled') as HTMLElement)
          .style.inlineSize,
      ).toBe('100%');
      expect(fixture.componentInstance.hovers).toEqual([4]);
      expect(slider.getAttribute('aria-valuenow')).toBe('1');

      slider.dispatchEvent(new MouseEvent('pointerleave'));
      fixture.detectChanges();
      expect(
        (stars()[3].querySelector('.andes-rate__layer--filled') as HTMLElement)
          .style.inlineSize,
      ).toBe('0%');
      expect(fixture.componentInstance.hovers).toEqual([4, undefined]);
    });

    it("shows the hovered character's tooltip", () => {
      const { fixture, host, stars } = create();
      fixture.componentInstance.tooltips.set(['a', 'b', 'c', 'd', 'e']);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="rate-tooltip"]')).toBeNull();

      stars()[2].dispatchEvent(pointer('pointermove'));
      fixture.detectChanges();
      expect(
        host.querySelector('[data-slot="rate-tooltip"]')?.textContent,
      ).toBe('c');
    });

    it('ignores touch hover', () => {
      const { fixture, stars } = create();
      const touch = new MouseEvent('pointermove', { bubbles: true });
      Object.defineProperty(touch, 'pointerType', { value: 'touch' });
      stars()[2].dispatchEvent(touch);

      expect(fixture.componentInstance.hovers).toEqual([]);
    });
  });

  describe('readonly and disabled', () => {
    it('readonly neither changes on click, previews, nor loses focusability', () => {
      const { fixture, slider, stars } = create();
      fixture.componentInstance.value.set(2);
      fixture.componentInstance.readonly.set(true);
      fixture.detectChanges();

      stars()[4].dispatchEvent(pointer('click'));
      stars()[4].dispatchEvent(pointer('pointermove'));

      expect(fixture.componentInstance.value()).toBe(2);
      expect(fixture.componentInstance.hovers).toEqual([]);
      expect(slider.getAttribute('aria-readonly')).toBe('true');
      expect(slider.tabIndex).toBe(0);
    });

    it('disabled blocks everything and leaves the tab order', () => {
      const { fixture, slider, stars, press } = create();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      stars()[1].dispatchEvent(pointer('click'));
      press('ArrowRight');

      expect(fixture.componentInstance.value()).toBe(0);
      expect(slider.getAttribute('aria-disabled')).toBe('true');
      expect(slider.tabIndex).toBe(-1);
    });
  });

  describe('keyboard', () => {
    it('moves by one with the arrow keys and stays within the range', () => {
      const { fixture, press } = create();
      press('ArrowRight');
      press('ArrowUp');
      expect(fixture.componentInstance.value()).toBe(2);

      press('ArrowLeft');
      press('ArrowDown');
      press('ArrowDown');
      expect(fixture.componentInstance.value()).toBe(0);

      fixture.componentInstance.value.set(5);
      fixture.detectChanges();
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe(5);
    });

    it('moves by half with allowHalf', () => {
      const { fixture, press } = create();
      fixture.componentInstance.allowHalf.set(true);
      fixture.detectChanges();
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe(0.5);
      press('ArrowRight');
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe(1.5);
      press('ArrowLeft');
      expect(fixture.componentInstance.value()).toBe(1);
    });

    it('snaps a fractional value to the next step', () => {
      const { fixture, press } = create();
      fixture.componentInstance.value.set(3.7);
      fixture.detectChanges();
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe(4);

      fixture.componentInstance.value.set(3.7);
      fixture.detectChanges();
      press('ArrowLeft');
      expect(fixture.componentInstance.value()).toBe(3);
    });

    it('flips Left and Right in right-to-left layouts', () => {
      const { fixture, host, press } = create();
      host.setAttribute('dir', 'rtl');
      press('ArrowLeft');
      expect(fixture.componentInstance.value()).toBe(1);
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe(0);
    });

    it('jumps with Home and End, and sets a digit', () => {
      const { fixture, press } = create();
      press('End');
      expect(fixture.componentInstance.value()).toBe(5);
      press('Home');
      expect(fixture.componentInstance.value()).toBe(0);
      press('4');
      expect(fixture.componentInstance.value()).toBe(4);
      press('9');
      expect(fixture.componentInstance.value()).toBe(4);
    });

    it('prevents the default only for keys it handles', () => {
      const { press } = create();
      expect(press('ArrowRight').defaultPrevented).toBe(true);
      expect(press('Tab').defaultPrevented).toBe(false);
      expect(press('a').defaultPrevented).toBe(false);
    });

    it('is inert for readonly', () => {
      const { fixture, press } = create();
      fixture.componentInstance.readonly.set(true);
      fixture.detectChanges();
      press('End');
      expect(fixture.componentInstance.value()).toBe(0);
    });
  });

  describe('focus', () => {
    it('focuses and blurs the slider through the public methods', () => {
      const { fixture, slider } = create();
      const rate = fixture.debugElement.children[0]
        .componentInstance as AndesRate;
      rate.focus();
      expect(document.activeElement).toBe(slider);
      rate.blur();
      expect(document.activeElement).not.toBe(slider);
    });

    it('does not focus when disabled', () => {
      const { fixture, slider } = create();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      (fixture.debugElement.children[0].componentInstance as AndesRate).focus();

      expect(document.activeElement).not.toBe(slider);
    });
  });

  describe('custom character', () => {
    it('draws a string character', () => {
      const { fixture, host } = create();
      fixture.componentInstance.character.set('♥');
      fixture.detectChanges();

      expect(host.querySelectorAll('.andes-rate__text')).toHaveLength(10);
      expect(host.querySelector('svg')).toBeNull();
    });

    it('calls a function per position', () => {
      const { fixture, host } = create();
      fixture.componentInstance.character.set((index) => String(index + 1));
      fixture.detectChanges();

      const texts = Array.from(
        host.querySelectorAll('.andes-rate__layer--empty .andes-rate__text'),
      ).map((node) => node.textContent);
      expect(texts).toEqual(['1', '2', '3', '4', '5']);
    });

    it('draws a template for both layers, with its context', () => {
      const { fixture, host } = create();
      fixture.componentInstance.character.set(
        fixture.componentInstance.tpl() as TemplateRef<never>,
      );
      fixture.componentInstance.value.set(1);
      fixture.detectChanges();

      const glyphs = Array.from(
        host.querySelectorAll('[data-test="glyph"]'),
      ).map((node) => node.textContent);
      expect(glyphs).toContain('0e');
      expect(glyphs).toContain('0f');
    });

    it('accepts an andesRateCharacter template child', () => {
      const fixture = TestBed.createComponent(DirectiveHostComponent);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelectorAll('[data-test="own"]'),
      ).toHaveLength(10);
    });
  });

  describe('forms', () => {
    function createForm() {
      const fixture = TestBed.createComponent(FormHostComponent);
      fixture.detectChanges();
      const slider = fixture.nativeElement.querySelector(
        '[role="slider"]',
      ) as HTMLElement;
      return { fixture, slider };
    }

    it('writes the control value in and out', () => {
      const { fixture, slider } = createForm();
      expect(slider.getAttribute('aria-valuenow')).toBe('3');

      fixture.componentInstance.control.setValue(5);
      fixture.detectChanges();
      expect(slider.getAttribute('aria-valuenow')).toBe('5');

      slider.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      expect(fixture.componentInstance.control.value).toBe(4);
    });

    it('treats null and garbage as 0 and clamps to the count', () => {
      const { fixture, slider } = createForm();
      fixture.componentInstance.control.setValue(null);
      fixture.detectChanges();
      expect(slider.getAttribute('aria-valuenow')).toBe('0');

      fixture.componentInstance.control.setValue(99);
      fixture.detectChanges();
      expect(slider.getAttribute('aria-valuenow')).toBe('5');
    });

    it('follows the control disabled state', () => {
      const { fixture, slider } = createForm();
      fixture.componentInstance.control.disable();
      fixture.detectChanges();

      expect(slider.getAttribute('aria-disabled')).toBe('true');
    });

    it('marks the control touched on blur', () => {
      const { fixture, slider } = createForm();
      slider.dispatchEvent(new FocusEvent('blur'));

      expect(fixture.componentInstance.control.touched).toBe(true);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/rate/rate.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('scales a hovered character calmly: 1.1 over 120ms', () => {
      expect(css).toContain(
        '.andes-rate__star:hover { transform: scale(1.1); }',
      );
      expect(css).toContain('var(--andes-motion-duration-fast, 120ms)');
    });

    it('turns the hover scale and its transition off under reduced motion', () => {
      const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
      expect(reduced).toContain('transition: none');
      expect(reduced).toContain('transform: none');
    });

    it('shows a focus ring only for keyboard focus, from the focus-ring token', () => {
      expect(css).toContain(
        '.andes-rate__stars:focus-visible { outline: 2px solid var(--andes-color-focus-ring);',
      );
    });

    it('fills with logical properties so right-to-left mirrors by itself', () => {
      expect(css).toContain('inset-inline-start: 0');
      expect(css).not.toMatch(/\b(left|right):/);
    });
  });
});
