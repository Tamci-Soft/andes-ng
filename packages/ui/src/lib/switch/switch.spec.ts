import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AndesSwitch, AndesSwitchChangeEvent, AndesSwitchSize } from './switch';

@Component({
  imports: [AndesSwitch],
  template: `<andes-switch
    [checked]="checked()"
    [disabled]="disabled()"
    [required]="required()"
    [readonly]="readonly()"
    [size]="size()"
  />`,
})
class HostComponent {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly required = signal(false);
  readonly readonly = signal(false);
  readonly size = signal<AndesSwitchSize>('md');
}

describe('AndesSwitch', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    return { fixture, button };
  }

  it('renders a native button with role="switch"', () => {
    const { button } = createHost();

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('defaults to unchecked, medium size', () => {
    const { button } = createHost();

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.hasAttribute('data-unchecked')).toBe(true);
    expect(button.hasAttribute('data-checked')).toBe(false);
    expect(button.classList).toContain('andes-switch--md');
  });

  it('resyncs to a validation rollback re-asserting checked after a click (regression)', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        [checked]="checked()"
        (checkedChange)="onChange($event)"
      />`,
    })
    class RollbackHost {
      readonly checked = signal(false);
      onChange(value: boolean): void {
        this.checked.set(value);
      }
    }

    const fixture = TestBed.createComponent(RollbackHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;

    // User clicks: emits checkedChange(true), which the host optimistically applies back
    // onto its own `checked` signal.
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');

    // Parent rejects the change (e.g. failed validation) and re-asserts `checked=false`.
    fixture.componentInstance.checked.set(false);
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.hasAttribute('data-checked')).toBe(false);
    expect(button.hasAttribute('data-unchecked')).toBe(true);
  });

  it('re-syncs to an external checked=false set directly after a click (regression)', () => {
    // The gap the earlier `linkedSignal` fix left open: with `linkedSignal`, the click only
    // ever wrote to the *derived* `isChecked` signal, never to the `checked` input signal
    // itself - so `checked` (the linkedSignal's "source") stayed at `false` the entire time,
    // and a later external write of `false` back onto it was a same-value no-op that never
    // reached the derived signal at all. `checked` is now the single `model()` signal that
    // both the click and an external write land on directly, so this write is a genuine
    // true -> false transition on the one signal that drives rendering, not a no-op against a
    // value nothing ever actually changed.
    //
    // This is exercised via `componentRef.setInput`, which writes straight to the component's
    // input the way Angular does for components created imperatively (e.g. via
    // `ViewContainerRef.createComponent`, as overlay/portal-based components in this library
    // are) - a realistic path that does not go through a parent template binding at all.
    const fixture = TestBed.createComponent(AndesSwitch);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');

    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.hasAttribute('data-checked')).toBe(false);
    expect(button.hasAttribute('data-unchecked')).toBe(true);
  });

  it('reflects the checked input on aria-checked and data-checked', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.hasAttribute('data-checked')).toBe(true);
    expect(button.hasAttribute('data-unchecked')).toBe(false);
  });

  it('applies the requested size', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-switch--sm');
  });

  it('toggles checked state on click and emits checkedChange', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch (checkedChange)="onChange($event)" />`,
    })
    class ClickHost {
      lastValue: boolean | undefined;
      onChange(value: boolean): void {
        this.lastValue = value;
      }
    }

    const fixture = TestBed.createComponent(ClickHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.lastValue).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(fixture.componentInstance.lastValue).toBe(false);
  });

  it('reflects disabled state on the native button and blocks toggling', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('data-disabled')).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('blocks toggling when readonly without disabling the control', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-readonly')).toBe('true');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('reflects aria-required when required', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.required.set(true);
    fixture.detectChanges();

    expect(button.getAttribute('aria-required')).toBe('true');
    expect(button.hasAttribute('data-required')).toBe(true);
  });

  it('forwards aria-label and aria-invalid to the real button, not the host', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        aria-label="Notifications"
        aria-invalid="true"
      />`,
    })
    class AriaHost {}

    const fixture = TestBed.createComponent(AriaHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-switch');
    const button = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-label')).toBe('Notifications');
    expect(button.getAttribute('aria-invalid')).toBe('true');
    expect(button.classList).toContain('andes-switch--invalid');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-invalid')).toBe(false);
  });

  it('projects checked/unchecked slot content depending on state', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch [checked]="checked()">
        <span slot="checked">On</span>
        <span slot="unchecked">Off</span>
      </andes-switch>`,
    })
    class ContentHost {
      readonly checked = signal(false);
    }

    const fixture = TestBed.createComponent(ContentHost);
    fixture.detectChanges();

    // Both labels stay in the DOM (stacked, so the track is sized to the wider one); only the
    // one for the current state is marked active and visible.
    const active = () =>
      (
        fixture.nativeElement.querySelector(
          '.andes-switch__content[data-active]',
        ) as HTMLElement
      ).textContent?.trim();

    expect(active()).toBe('Off');
    expect(
      fixture.nativeElement.querySelectorAll(
        '.andes-switch__content[data-active]',
      ).length,
    ).toBe(1);

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();

    expect(active()).toBe('On');
  });

  it('hides track content from assistive tech so the accessible name never flips with state', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        checkedChildren="On"
        unCheckedChildren="Off"
        aria-label="Wi-Fi"
      />`,
    })
    class HiddenContentHost {}

    const fixture = TestBed.createComponent(HiddenContentHost);
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.andes-switch__inner');

    expect(inner.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders checkedChildren/unCheckedChildren strings as track content', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        [(checked)]="checked"
        checkedChildren="Enabled"
        unCheckedChildren="Disabled"
      />`,
    })
    class StringContentHost {
      readonly checked = signal(false);
    }

    const fixture = TestBed.createComponent(StringContentHost);
    fixture.detectChanges();
    const content = (modifier: string) =>
      fixture.nativeElement.querySelector(
        `.andes-switch__content--${modifier}`,
      );

    expect(content('checked').textContent.trim()).toBe('Enabled');
    expect(content('unchecked').textContent.trim()).toBe('Disabled');
    expect(content('unchecked').hasAttribute('data-active')).toBe(true);

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(content('checked').hasAttribute('data-active')).toBe(true);
    expect(content('unchecked').hasAttribute('data-active')).toBe(false);
  });

  it('lets a projected slot override the string fallback for that state only', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        checkedChildren="ignored"
        unCheckedChildren="Off"
      >
        <b slot="checked">ON</b>
      </andes-switch>`,
    })
    class OverrideHost {}

    const fixture = TestBed.createComponent(OverrideHost);
    fixture.detectChanges();
    const checked = fixture.nativeElement.querySelector(
      '.andes-switch__content--checked',
    );
    const unchecked = fixture.nativeElement.querySelector(
      '.andes-switch__content--unchecked',
    );

    expect(checked.textContent.trim()).toBe('ON');
    expect(checked.querySelector('b')).not.toBeNull();
    expect(unchecked.textContent.trim()).toBe('Off');
  });

  describe('loading', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        [checked]="false"
        [loading]="loading()"
        (changed)="changes = changes + 1"
        (clicked)="clicks = clicks + 1"
      />`,
    })
    class LoadingHost {
      readonly loading = signal(true);
      changes = 0;
      clicks = 0;
    }

    function createLoadingHost() {
      const fixture = TestBed.createComponent(LoadingHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;
      return { fixture, button };
    }

    it('marks the switch busy and renders a spinner inside the thumb', () => {
      const { button } = createLoadingHost();

      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.hasAttribute('data-loading')).toBe(true);
      expect(button.classList).toContain('andes-switch--loading');
      expect(
        button.querySelector('.andes-switch__thumb .andes-switch__spinner'),
      ).not.toBeNull();
    });

    it('blocks toggling and both outputs, but stays enabled and focusable', () => {
      const { fixture, button } = createLoadingHost();

      expect(button.disabled).toBe(false);
      button.focus();
      expect(document.activeElement).toBe(button);

      button.click();
      fixture.detectChanges();

      expect(button.getAttribute('aria-checked')).toBe('false');
      expect(fixture.componentInstance.changes).toBe(0);
      expect(fixture.componentInstance.clicks).toBe(0);
    });

    it('drops aria-busy and the spinner and toggles again once loading clears', () => {
      const { fixture, button } = createLoadingHost();
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      expect(button.hasAttribute('aria-busy')).toBe(false);
      expect(button.hasAttribute('data-loading')).toBe(false);
      expect(button.querySelector('.andes-switch__spinner')).toBeNull();

      button.click();
      fixture.detectChanges();

      expect(button.getAttribute('aria-checked')).toBe('true');
      expect(fixture.componentInstance.changes).toBe(1);
    });
  });

  describe('changed / clicked outputs', () => {
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch
        [(checked)]="checked"
        [readonly]="readonly()"
        [disabled]="disabled()"
        (changed)="changes.push($event)"
        (clicked)="clicks.push($event)"
      />`,
    })
    class OutputHost {
      readonly checked = signal(false);
      readonly readonly = signal(false);
      readonly disabled = signal(false);
      readonly changes: AndesSwitchChangeEvent[] = [];
      readonly clicks: AndesSwitchChangeEvent[] = [];
    }

    function createOutputHost() {
      const fixture = TestBed.createComponent(OutputHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        'button',
      ) as HTMLButtonElement;
      return { fixture, button, host: fixture.componentInstance };
    }

    it('emits changed and clicked with the new state and the originating event on a user toggle', () => {
      const { fixture, button, host } = createOutputHost();

      button.click();
      fixture.detectChanges();

      expect(host.changes).toHaveLength(1);
      expect(host.changes[0].checked).toBe(true);
      expect(host.changes[0].event).toBeInstanceOf(MouseEvent);
      expect(host.changes[0].event.type).toBe('click');
      expect(host.clicks).toEqual([host.changes[0]]);

      button.click();
      fixture.detectChanges();

      expect(host.changes.map((c) => c.checked)).toEqual([true, false]);
    });

    it('does not emit changed for a parent-driven checked change', () => {
      const { fixture, host, button } = createOutputHost();

      host.checked.set(true);
      fixture.detectChanges();

      expect(button.getAttribute('aria-checked')).toBe('true');
      expect(host.changes).toHaveLength(0);
    });

    it('emits clicked (unchanged state) but not changed when readonly', () => {
      const { fixture, button, host } = createOutputHost();
      host.readonly.set(true);
      fixture.detectChanges();

      button.click();
      fixture.detectChanges();

      expect(host.changes).toHaveLength(0);
      expect(host.clicks).toHaveLength(1);
      expect(host.clicks[0].checked).toBe(false);
    });

    it('emits nothing when disabled', () => {
      const { fixture, button, host } = createOutputHost();
      host.disabled.set(true);
      fixture.detectChanges();

      button.click();
      fixture.detectChanges();

      expect(host.changes).toHaveLength(0);
      expect(host.clicks).toHaveLength(0);
    });

    it('does not emit changed for a ControlValueAccessor writeValue', () => {
      @Component({
        imports: [AndesSwitch, ReactiveFormsModule],
        template: `<andes-switch
          [formControl]="control"
          (changed)="changes = changes + 1"
        />`,
      })
      class CvaOutputHost {
        readonly control = new FormControl(false, { nonNullable: true });
        changes = 0;
      }

      const fixture = TestBed.createComponent(CvaOutputHost);
      fixture.detectChanges();
      fixture.componentInstance.control.setValue(true);
      fixture.detectChanges();

      expect(fixture.componentInstance.changes).toBe(0);
    });
  });

  describe('focus management', () => {
    it('focus() and blur() move focus to and from the real button', () => {
      const fixture = TestBed.createComponent(AndesSwitch);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');

      fixture.componentInstance.focus();
      expect(document.activeElement).toBe(button);

      fixture.componentInstance.blur();
      expect(document.activeElement).not.toBe(button);
    });

    it('focuses the button on mount when autoFocus is set', async () => {
      @Component({
        imports: [AndesSwitch],
        template: `<andes-switch autoFocus />`,
      })
      class AutoFocusHost {}

      const fixture = TestBed.createComponent(AutoFocusHost);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(
        fixture.nativeElement.querySelector('button'),
      );
    });

    it('does not steal focus on mount without autoFocus', async () => {
      const fixture = TestBed.createComponent(AndesSwitch);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).not.toBe(
        fixture.nativeElement.querySelector('button'),
      );
    });
  });

  it('treats a bare "disabled" attribute (no brackets) as true, not the string ""', () => {
    // `checked` is now a `model()`, and `model()` does not support the `transform` option that
    // makes a bare boolean attribute work on `input()` fields (see the doc comment on
    // `checked`) - so it is exercised here via a property binding instead, while `disabled`
    // (still a plain `input()` with `booleanAttribute`) keeps its bare-attribute coverage.
    @Component({
      imports: [AndesSwitch],
      template: `<andes-switch [checked]="true" disabled />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.disabled).toBe(true);
  });

  it('treats a bare "checked" attribute (no brackets) as true, not the string "" (regression)', () => {
    // `checked` is a `model()`, and `model()` intentionally has no `transform` option (see the
    // doc comments on `checked`/`isChecked` in switch.ts) - a two-way binding's output must
    // emit exactly the type its input accepts, so it can't silently coerce values on the way
    // in. That means Angular's own template type checker rejects a bare, bracket-less
    // `checked` attribute as a compile error (`string` is not assignable to `boolean`) when it
    // appears directly in a `@Component({ template })` literal - the same reason
    // `AndesCheckbox`'s own regression test for this exercises the bracket-bound form instead.
    //
    // But that static check is exactly what `switch.stories.ts` (and any consumer building a
    // template as a runtime string, the way Storybook does) does NOT go through: `<andes-switch
    // checked>` there compiles and runs, silently writing the literal string `""` into the
    // `checked` model - which is the actual regression a QA judge found (`aria-checked=""`,
    // switch rendered OFF despite the obvious "on" intent). `TestBed.overrideTemplate` lets this
    // test reproduce that exact runtime path - a template string assembled and JIT-compiled at
    // run time, bypassing ngtsc's static template diagnostics - instead of only covering the
    // bracket-bound case Checkbox's suite already covers.
    @Component({ imports: [AndesSwitch], template: `` })
    class BareCheckedHost {}

    TestBed.overrideTemplate(BareCheckedHost, `<andes-switch checked />`);
    const fixture = TestBed.createComponent(BareCheckedHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.hasAttribute('data-checked')).toBe(true);
    expect(button.hasAttribute('data-unchecked')).toBe(false);

    // And the first click must turn it OFF: toggling the raw model (`!""` === true) instead of
    // the coerced state left it stuck on.
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(button.hasAttribute('data-unchecked')).toBe(true);
  });

  describe('ControlValueAccessor', () => {
    it('works with [formControl]', () => {
      @Component({
        imports: [AndesSwitch, ReactiveFormsModule],
        template: `<andes-switch [formControl]="control" />`,
      })
      class FormControlHost {
        readonly control = new FormControl(false, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(FormControlHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');
      const { control } = fixture.componentInstance;

      expect(button.getAttribute('aria-checked')).toBe('false');

      control.setValue(true);
      fixture.detectChanges();
      expect(button.getAttribute('aria-checked')).toBe('true');

      button.click();
      fixture.detectChanges();
      expect(control.value).toBe(false);

      control.disable();
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
    });

    it('renders checked when [formControl] starts with an initial value of true (regression)', () => {
      @Component({
        imports: [AndesSwitch, ReactiveFormsModule],
        template: `<andes-switch [formControl]="control" />`,
      })
      class InitiallyCheckedFormControlHost {
        readonly control = new FormControl(true, { nonNullable: true });
      }

      const fixture = TestBed.createComponent(InitiallyCheckedFormControlHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');
      const switchDebugEl = fixture.debugElement.query(
        (debugEl) => debugEl.componentInstance instanceof AndesSwitch,
      );
      const switchInstance = switchDebugEl.componentInstance as AndesSwitch;

      // The rendered DOM must reflect checked...
      expect(button.getAttribute('aria-checked')).toBe('true');
      expect(button.hasAttribute('data-checked')).toBe(true);
      // ...and so must the component's own `checked` model signal, not just the FormControl's
      // value (which would still read `true` even if writeValue's write had been clobbered -
      // it's this signal that drives what actually renders).
      expect(switchInstance.checked()).toBe(true);
      expect(fixture.componentInstance.control.value).toBe(true);
    });

    it('works with [(ngModel)]', async () => {
      @Component({
        imports: [AndesSwitch, FormsModule],
        template: `<andes-switch [(ngModel)]="value" />`,
      })
      class NgModelHost {
        value = false;
      }

      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const button = fixture.nativeElement.querySelector('button');

      button.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value).toBe(true);
      expect(button.getAttribute('aria-checked')).toBe('true');
    });
  });
});
