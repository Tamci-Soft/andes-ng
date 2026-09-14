import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesButtonPrimitive } from './button-primitive';

describe('AndesButtonPrimitive', () => {
  describe('on a button element', () => {
    @Component({
      imports: [AndesButtonPrimitive],
      template: `<button andesButtonPrimitive [disabled]="disabled()">
        Save
      </button>`,
    })
    class ButtonHost {
      readonly disabled = signal(false);
    }

    function createHost() {
      const fixture = TestBed.createComponent(ButtonHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;
      return { fixture, button };
    }

    it('is enabled by default', () => {
      const { button } = createHost();

      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('data-disabled')).toBe(false);
    });

    it('reflects disabled as a native attribute and data-disabled', () => {
      const { fixture, button } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(button.disabled).toBe(true);
      expect(button.getAttribute('data-disabled')).toBe('');
      expect(button.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('on an anchor element', () => {
    @Component({
      imports: [AndesButtonPrimitive],
      template: `<a
        andesButtonPrimitive
        href="https://andes-ng.dev"
        [disabled]="disabled()"
        >Save</a
      >`,
    })
    class AnchorHost {
      readonly disabled = signal(false);
    }

    function createHost() {
      const fixture = TestBed.createComponent(AnchorHost);
      fixture.detectChanges();
      const anchor = fixture.nativeElement.querySelector(
        'a',
      ) as HTMLAnchorElement;
      return { fixture, anchor };
    }

    it('never sets the native disabled attribute, since anchors do not support it', () => {
      const { fixture, anchor } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(anchor.hasAttribute('disabled')).toBe(false);
      expect(anchor.getAttribute('data-disabled')).toBe('');
    });

    it('prevents navigation when disabled', () => {
      const { fixture, anchor } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      const event = new MouseEvent('click', { cancelable: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('allows navigation when enabled', () => {
      const { anchor } = createHost();

      const event = new MouseEvent('click', { cancelable: true });
      anchor.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });
});
