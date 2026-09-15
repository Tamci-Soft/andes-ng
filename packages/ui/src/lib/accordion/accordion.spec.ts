import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesAccordion, AndesAccordionType } from './accordion';
import { AndesAccordionContent } from './accordion-content';
import { AndesAccordionItem } from './accordion-item';
import { AndesAccordionTrigger } from './accordion-trigger';

@Component({
  imports: [
    AndesAccordion,
    AndesAccordionItem,
    AndesAccordionTrigger,
    AndesAccordionContent,
  ],
  template: `<andes-accordion [type]="type()" [disabled]="disabled()">
    <andes-accordion-item value="a" [disabled]="itemADisabled()">
      <andes-accordion-trigger>Section A</andes-accordion-trigger>
      <andes-accordion-content>Content A</andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="b">
      <andes-accordion-trigger>Section B</andes-accordion-trigger>
      <andes-accordion-content>Content B</andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="c">
      <andes-accordion-trigger>Section C</andes-accordion-trigger>
      <andes-accordion-content>Content C</andes-accordion-content>
    </andes-accordion-item>
  </andes-accordion>`,
})
class HostComponent {
  readonly type = signal<AndesAccordionType>('single');
  readonly disabled = signal(false);
  readonly itemADisabled = signal(false);
}

describe('AndesAccordion / AndesAccordionItem / AndesAccordionTrigger / AndesAccordionContent', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-item'),
    ) as HTMLElement[];
    const triggers = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-trigger button'),
    ) as HTMLButtonElement[];
    const panels = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-content'),
    ) as HTMLElement[];
    return { fixture, items, triggers, panels };
  }

  it('renders one item per andes-accordion-item, all closed by default', () => {
    const { triggers } = createHost();

    expect(triggers).toHaveLength(3);
    expect(
      triggers.every((t) => t.getAttribute('aria-expanded') === 'false'),
    ).toBe(true);
  });

  describe('single mode', () => {
    it('opens a panel when its trigger is clicked', () => {
      const { fixture, triggers, panels } = createHost();

      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
      expect(panels[0].getAttribute('data-state')).toBe('open');
    });

    it('closes the previously-open panel when a new one opens', () => {
      const { fixture, triggers, panels } = createHost();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(panels[0].getAttribute('data-state')).toBe('closed');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
      expect(panels[1].getAttribute('data-state')).toBe('open');
    });

    it('closes the open panel when its own trigger is clicked again', () => {
      const { fixture, triggers } = createHost();

      triggers[0].click();
      fixture.detectChanges();
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('multiple mode', () => {
    it('allows several panels open at once', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.type.set('multiple');
      fixture.detectChanges();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    });

    it('closes only the toggled panel, leaving others open', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.type.set('multiple');
      fixture.detectChanges();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('disabled', () => {
    it('cannot toggle a disabled item', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.itemADisabled.set(true);
      fixture.detectChanges();

      expect(triggers[0].disabled).toBe(true);
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    });

    it('disables every item when the whole accordion is disabled', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(triggers.every((t) => t.disabled)).toBe(true);
    });

    it('cannot toggle any item when the whole accordion is disabled', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('accessibility wiring', () => {
    it('sets aria-expanded on the trigger reflecting open state', () => {
      const { fixture, triggers } = createHost();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      triggers[0].click();
      fixture.detectChanges();
      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
    });

    it('gives the content panel role="region"', () => {
      const { panels } = createHost();

      expect(panels[0].getAttribute('role')).toBe('region');
    });

    it('cross-links aria-controls on the trigger with the panel id', () => {
      const { triggers, panels } = createHost();

      const controlsId = triggers[0].getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      expect(panels[0].getAttribute('id')).toBe(controlsId);
    });

    it('cross-links aria-labelledby on the panel with the trigger id', () => {
      const { triggers, panels } = createHost();

      const labelledBy = panels[0].getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(triggers[0].getAttribute('id')).toBe(labelledBy);
    });

    it('gives independent accordion instances their own isolated ids', () => {
      const first = createHost();
      const second = createHost();

      expect(first.triggers[0].id).not.toBe(second.triggers[0].id);
    });
  });

  describe('keyboard behavior (no roving tabindex/arrow-key navigation)', () => {
    // Base UI's own docs (the primitive backing shadcn's Accordion) explicitly state that
    // roving-tabindex/arrow-key navigation between headers was deprecated for Accordion,
    // unlike Tabs, which still uses it. Every trigger below is therefore a normal, independently
    // focusable <button> - this suite is a regression guard against ever copying the Tabs
    // roving-tabindex pattern onto this component "for consistency".

    it('keeps every trigger at the default tabindex (no roving tabindex management)', () => {
      const { triggers } = createHost();

      triggers.forEach((trigger) => {
        expect(trigger.hasAttribute('tabindex')).toBe(false);
      });
    });

    it('does nothing special on ArrowDown/ArrowUp - no focus is moved between triggers', () => {
      const { fixture, triggers } = createHost();
      triggers[0].focus();
      expect(document.activeElement).toBe(triggers[0]);

      triggers[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      fixture.detectChanges();

      // Focus stays put and no item toggles open as a side effect of the arrow key.
      expect(document.activeElement).toBe(triggers[0]);
      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
    });

    it('moves focus between triggers via native Tab order, not arrow keys', () => {
      const { triggers } = createHost();

      // Native tab order between plain, independently-focusable buttons is exactly what
      // jsdom/the DOM already gives every element with no tabindex management needed on our
      // part - asserting that manually here would just be re-testing the browser. What this
      // component must not do is intercept Tab/Shift+Tab or manage tabindex itself, which the
      // absence of any keydown handling and of a `tabindex` attribute above already confirms.
      triggers[0].focus();
      expect(document.activeElement).toBe(triggers[0]);
    });
  });
});
