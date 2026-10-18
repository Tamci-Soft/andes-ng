import { Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { readFileSync } from 'node:fs';

import { AndesToggle } from './toggle';
import { AndesToggleGroup } from './toggle-group';
import {
  AndesToggleGroupOrientation,
  AndesToggleGroupType,
  AndesToggleSize,
  AndesToggleVariant,
} from './toggle-types';

function key(target: HTMLElement, name: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

@Component({
  imports: [AndesToggle],
  template: `<andes-toggle
    aria-label="Bold"
    [(pressed)]="pressed"
    [variant]="variant()"
    [size]="size()"
    [disabled]="disabled()"
    tooltip="Toggle bold"
    >B</andes-toggle
  >`,
})
class SingleHostComponent {
  readonly pressed = signal(false);
  readonly variant = signal<AndesToggleVariant>('default');
  readonly size = signal<AndesToggleSize>('md');
  readonly disabled = signal(false);
}

@Component({
  imports: [AndesToggle, ReactiveFormsModule],
  template: `<andes-toggle aria-label="Italic" [formControl]="control"
    >I</andes-toggle
  >`,
})
class ReactiveToggleComponent {
  readonly control = new FormControl(true);
}

@Component({
  imports: [AndesToggle, FormsModule],
  template: `<andes-toggle aria-label="Underline" [(ngModel)]="on"
    >U</andes-toggle
  >`,
})
class NgModelToggleComponent {
  on = false;
}

@Component({
  imports: [AndesToggleGroup, AndesToggle],
  template: `<andes-toggle-group
    aria-label="Text style"
    [type]="type()"
    [(value)]="value"
    [variant]="variant()"
    [size]="size()"
    [orientation]="orientation()"
    [spacing]="spacing()"
    [disabled]="disabled()"
    [allowEmpty]="allowEmpty()"
  >
    <andes-toggle value="bold" aria-label="Bold">B</andes-toggle>
    <andes-toggle value="italic" aria-label="Italic">I</andes-toggle>
    <andes-toggle
      value="strike"
      aria-label="Strike"
      [disabled]="strikeDisabled()"
      >S</andes-toggle
    >
    <andes-toggle value="code" aria-label="Code" size="sm" variant="outline"
      >C</andes-toggle
    >
  </andes-toggle-group>`,
})
class GroupHostComponent {
  readonly type = signal<AndesToggleGroupType>('single');
  readonly value = signal<unknown>(null);
  readonly variant = signal<AndesToggleVariant>('default');
  readonly size = signal<AndesToggleSize>('md');
  readonly orientation = signal<AndesToggleGroupOrientation>('horizontal');
  readonly spacing = signal(0);
  readonly disabled = signal(false);
  readonly allowEmpty = signal(true);
  readonly strikeDisabled = signal(false);
}

@Component({
  imports: [AndesToggleGroup, AndesToggle, ReactiveFormsModule],
  template: `<andes-toggle-group type="multiple" [formControl]="control">
    <andes-toggle value="a">A</andes-toggle>
    <andes-toggle value="b">B</andes-toggle>
  </andes-toggle-group>`,
})
class GroupFormHostComponent {
  readonly control = new FormControl<string[]>(['a']);
}

const buttonsOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];

describe('AndesToggle (standalone)', () => {
  function setup() {
    const fixture = TestBed.createComponent(SingleHostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    return { fixture, host: fixture.componentInstance, button };
  }

  it('renders a button with aria-pressed and the label on the button', () => {
    const { button } = setup();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Bold');
    expect(button.getAttribute('title')).toBe('Toggle bold');
    const host = button.closest('andes-toggle') as HTMLElement;
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('flips pressed on click and reflects data-state', () => {
    const { fixture, host, button } = setup();
    button.click();
    fixture.detectChanges();
    expect(host.pressed()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.closest('andes-toggle')?.getAttribute('data-state')).toBe(
      'on',
    );

    button.click();
    fixture.detectChanges();
    expect(host.pressed()).toBe(false);
  });

  it('follows the pressed model from outside', () => {
    const { fixture, host, button } = setup();
    host.pressed.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('applies variant and size and the disabled state', () => {
    const { fixture, host, button } = setup();
    host.variant.set('outline');
    host.size.set('lg');
    host.disabled.set(true);
    fixture.detectChanges();
    const el = button.closest('andes-toggle') as HTMLElement;
    expect(el.getAttribute('data-variant')).toBe('outline');
    expect(el.getAttribute('data-size')).toBe('lg');
    expect(button.disabled).toBe(true);
    button.click();
    expect(host.pressed()).toBe(false);
  });

  it('is a form control: reactive forms', () => {
    const fixture = TestBed.createComponent(ReactiveToggleComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe(false);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('is a form control: ngModel', async () => {
    const fixture = TestBed.createComponent(NgModelToggleComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on).toBe(true);
  });
});

describe('AndesToggleGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(GroupHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      group: root.querySelector('andes-toggle-group') as HTMLElement,
      buttons: () => buttonsOf(root),
    };
  }

  it('is a labelled group of aria-pressed buttons', () => {
    const { group, buttons } = setup();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Text style');
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
      'false',
    ]);
  });

  describe('type single', () => {
    it('presses one toggle at a time', () => {
      const { fixture, host, buttons } = setup();
      buttons()[0].click();
      fixture.detectChanges();
      expect(host.value()).toBe('bold');

      buttons()[1].click();
      fixture.detectChanges();
      expect(host.value()).toBe('italic');
      expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
        'false',
        'true',
        'false',
        'false',
      ]);
    });

    it('clears the value when the pressed toggle is pressed again', () => {
      const { fixture, host, buttons } = setup();
      buttons()[0].click();
      buttons()[0].click();
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });

    it('keeps the value with allowEmpty off', () => {
      const { fixture, host, buttons } = setup();
      host.allowEmpty.set(false);
      fixture.detectChanges();
      buttons()[0].click();
      buttons()[0].click();
      fixture.detectChanges();
      expect(host.value()).toBe('bold');
    });
  });

  describe('type multiple', () => {
    it('presses any number of toggles and keeps an array', () => {
      const { fixture, host, buttons } = setup();
      host.type.set('multiple');
      host.value.set([]);
      fixture.detectChanges();

      buttons()[0].click();
      buttons()[2].click();
      fixture.detectChanges();
      expect(host.value()).toEqual(['bold', 'strike']);
      expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons()[2].getAttribute('aria-pressed')).toBe('true');

      buttons()[0].click();
      fixture.detectChanges();
      expect(host.value()).toEqual(['strike']);
    });
  });

  it('gives the toggles the group variant and size unless they set their own', () => {
    const { fixture, host, group } = setup();
    host.variant.set('outline');
    host.size.set('lg');
    fixture.detectChanges();
    const toggles = Array.from(
      group.querySelectorAll('andes-toggle'),
    ) as HTMLElement[];
    expect(toggles[0].getAttribute('data-variant')).toBe('outline');
    expect(toggles[0].getAttribute('data-size')).toBe('lg');
    expect(toggles[3].getAttribute('data-size')).toBe('sm');
    expect(toggles[3].getAttribute('data-variant')).toBe('outline');
  });

  it('disables every toggle with the group', () => {
    const { fixture, host, buttons } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('joins toggles by default and separates them with spacing', () => {
    const { fixture, host, group } = setup();
    expect(group.hasAttribute('data-joined')).toBe(true);
    host.spacing.set(8);
    fixture.detectChanges();
    expect(group.hasAttribute('data-joined')).toBe(false);
    expect(group.style.gap).toBe('8px');
  });

  describe('keyboard', () => {
    it('has a single tab stop on the first toggle, then on the pressed one', () => {
      const { fixture, host, buttons } = setup();
      expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        '-1',
        '-1',
      ]);

      host.value.set('italic');
      fixture.detectChanges();
      expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
        '-1',
      ]);
    });

    it('moves focus with the arrow keys without changing the value, skipping disabled', () => {
      const { fixture, host, buttons } = setup();
      host.strikeDisabled.set(true);
      fixture.detectChanges();

      buttons()[0].focus();
      const event = key(buttons()[0], 'ArrowRight');
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(buttons()[1]);

      key(buttons()[1], 'ArrowRight');
      expect(document.activeElement).toBe(buttons()[3]);

      key(buttons()[3], 'ArrowRight');
      expect(document.activeElement).toBe(buttons()[0]);

      key(buttons()[0], 'ArrowLeft');
      expect(document.activeElement).toBe(buttons()[3]);

      expect(host.value()).toBeNull();
    });

    it('jumps with Home and End', () => {
      const { buttons } = setup();
      buttons()[1].focus();
      key(buttons()[1], 'End');
      expect(document.activeElement).toBe(buttons()[3]);
      key(buttons()[3], 'Home');
      expect(document.activeElement).toBe(buttons()[0]);
    });

    it('uses the vertical arrows for a vertical group', () => {
      const { fixture, host, buttons } = setup();
      host.orientation.set('vertical');
      fixture.detectChanges();
      buttons()[0].focus();
      expect(key(buttons()[0], 'ArrowRight').defaultPrevented).toBe(false);
      key(buttons()[0], 'ArrowDown');
      expect(document.activeElement).toBe(buttons()[1]);
      key(buttons()[1], 'ArrowUp');
      expect(document.activeElement).toBe(buttons()[0]);
    });

    it('mirrors the horizontal arrows in right-to-left layouts', () => {
      TestBed.overrideProvider(Directionality, {
        useValue: {
          value: 'rtl',
          change: { subscribe: () => ({ unsubscribe: () => undefined }) },
        },
      });
      const { buttons } = setup();
      buttons()[0].focus();
      key(buttons()[0], 'ArrowLeft');
      expect(document.activeElement).toBe(buttons()[1]);
    });

    it('presses the focused toggle with a native click (Space/Enter)', () => {
      const { fixture, host, buttons } = setup();
      buttons()[1].focus();
      buttons()[1].click();
      fixture.detectChanges();
      expect(host.value()).toBe('italic');
    });
  });
});

describe('AndesToggleGroup forms integration', () => {
  it('writes and reads an array through a reactive control', () => {
    const fixture = TestBed.createComponent(GroupFormHostComponent);
    fixture.detectChanges();
    const buttons = buttonsOf(fixture.nativeElement);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    buttons[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toEqual(['a', 'b']);

    fixture.componentInstance.control.setValue([]);
    fixture.detectChanges();
    expect(
      buttons.every((b) => b.getAttribute('aria-pressed') === 'false'),
    ).toBe(true);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});

describe('toggle stylesheet contract', () => {
  const toggle = readFileSync('packages/ui/src/lib/toggle/toggle.css', 'utf8');
  const group = readFileSync(
    'packages/ui/src/lib/toggle/toggle-group.css',
    'utf8',
  );

  it('sizes the control 24 / 32 / 40px with 14px text (16px at lg)', () => {
    expect(toggle).toContain('--_h: 2rem');
    expect(toggle).toMatch(/data-size='sm'\]\)\s*\{[^}]*--_h: 1.5rem/);
    expect(toggle).toMatch(
      /data-size='lg'\]\)\s*\{[^}]*--_h: 2.5rem[^}]*--_fs: 1rem/,
    );
    expect(toggle).toContain('--_fs: 0.875rem');
  });

  it('draws the outline variant with the input border token and a focus ring', () => {
    expect(toggle).toMatch(
      /data-variant='outline'\][^{]*\{[^}]*--andes-color-input/,
    );
    expect(toggle).toContain('outline: 2px solid var(--andes-color-focus-ring');
  });

  it('shares borders in a joined group with logical properties', () => {
    expect(group).toContain('margin-inline-start: -1px');
    expect(group).toContain('border-start-start-radius');
    expect(group).not.toMatch(
      /margin-left|margin-right|border-top-left|border-top-right/,
    );
  });
});
