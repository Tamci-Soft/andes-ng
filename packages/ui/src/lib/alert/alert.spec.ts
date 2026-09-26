import {
  Component,
  ElementRef,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesAlert,
  AndesAlertCloseEvent,
  AndesAlertRole,
  AndesAlertSeverity,
  AndesAlertTemplateContext,
} from './alert';

@Component({
  imports: [AndesAlert],
  template: `<andes-alert
    [severity]="severity()"
    [closable]="closable()"
    [showIcon]="showIcon()"
    [role]="role()"
    [closeLabel]="closeLabel()"
    (closing)="onClosing($event)"
    (afterClose)="afterCloseCount = afterCloseCount + 1"
  >
    <span slot="title">Heads up</span>
    Something you should know.
  </andes-alert>`,
})
class HostComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly severity = signal<AndesAlertSeverity | undefined>('info');
  readonly closable = signal(false);
  readonly showIcon = signal(true);
  readonly role = signal<AndesAlertRole | undefined>(undefined);
  readonly closeLabel = signal('Close');
  closedCount = 0;
  afterCloseCount = 0;
  preventClose = false;
  lastCloseEvent?: AndesAlertCloseEvent;

  onClosing(event: AndesAlertCloseEvent): void {
    this.closedCount++;
    this.lastCloseEvent = event;
    // Observed before hiding: the card must still be on screen when `closing` fires.
    this.visibleWhenClosing = !(
      this.elementRef.nativeElement.querySelector(
        '[data-slot="alert"]',
      ) as HTMLElement
    ).hidden;
    if (this.preventClose) event.preventDefault();
  }
  visibleWhenClosing?: boolean;
}

describe('AndesAlert', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector(
      '[data-slot="alert"]',
    ) as HTMLElement;
    return { fixture, alert };
  }

  it('renders the projected title and description', () => {
    const { alert } = createHost();

    expect(alert.textContent).toContain('Heads up');
    expect(alert.textContent).toContain('Something you should know.');
  });

  it('defaults to the info severity', () => {
    const { alert } = createHost();

    expect(alert.classList).toContain('andes-alert--info');
    expect(alert.getAttribute('data-severity')).toBe('info');
  });

  it.each(['success', 'info', 'warning', 'danger'] as const)(
    'supports the %s severity',
    (severity) => {
      const { fixture, alert } = createHost();
      fixture.componentInstance.severity.set(severity);
      fixture.detectChanges();

      expect(alert.classList).toContain(`andes-alert--${severity}`);
      expect(alert.getAttribute('data-severity')).toBe(severity);
    },
  );

  it('defaults to role="status" for non-danger severities', () => {
    const { fixture, alert } = createHost();

    for (const severity of ['success', 'info', 'warning'] as const) {
      fixture.componentInstance.severity.set(severity);
      fixture.detectChanges();
      expect(alert.getAttribute('role')).toBe('status');
    }
  });

  it('defaults to role="alert" for the danger severity', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.severity.set('danger');
    fixture.detectChanges();

    expect(alert.getAttribute('role')).toBe('alert');
  });

  it('lets a consumer override the resolved role', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.severity.set('info');
    fixture.componentInstance.role.set('alert');
    fixture.detectChanges();

    expect(alert.getAttribute('role')).toBe('alert');
  });

  it('does not duplicate the role attribute onto the host element', () => {
    // Regression test: a static `role="..."` attribute (unlike a `[role]` property binding)
    // matches the `role` input's name, so Angular also writes it onto <andes-alert> itself
    // unless the host metadata explicitly nulls it out - producing two elements (host + inner
    // div) both carrying the same role and duplicate live-region announcements for screen
    // reader users. Only the inner div is supposed to carry it.
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert role="alert">Something went wrong.</andes-alert>`,
    })
    class StaticRoleHost {}

    const fixture = TestBed.createComponent(StaticRoleHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-alert',
    ) as HTMLElement;
    const inner = host.querySelector('[data-slot="alert"]') as HTMLElement;

    expect(host.hasAttribute('role')).toBe(false);
    expect(inner.getAttribute('role')).toBe('alert');
  });

  it('shows the severity icon by default', () => {
    const { alert } = createHost();

    expect(alert.querySelector('.andes-alert__icon')).toBeTruthy();
  });

  it('hides the icon when showIcon is false', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.showIcon.set(false);
    fixture.detectChanges();

    expect(alert.querySelector('.andes-alert__icon')).toBeFalsy();
  });

  describe('severity icons', () => {
    /** The drawn shape of the rendered glyph: its `<circle>` count plus every path's geometry. */
    function iconShape(alert: HTMLElement) {
      const svg = alert.querySelector(
        '.andes-alert__icon svg',
      ) as SVGSVGElement | null;
      if (!svg) return null;
      return {
        circles: svg.querySelectorAll('circle').length,
        paths: Array.from(svg.querySelectorAll('path')).map(
          (p) => p.getAttribute('d') ?? '',
        ),
      };
    }

    function shapeFor(severity: AndesAlertSeverity) {
      const { fixture, alert } = createHost();
      fixture.componentInstance.severity.set(severity);
      fixture.detectChanges();
      return iconShape(alert);
    }

    it('draws a check inside a circle for success', () => {
      const shape = shapeFor('success');

      expect(shape?.circles).toBe(1);
      // A single polyline stroke: down-right into the corner, then up-right - a check mark.
      expect(shape?.paths).toEqual(['m8.25 12.25 2.5 2.5 5-5.5']);
    });

    it('draws an "i" inside a circle for info', () => {
      const shape = shapeFor('info');

      expect(shape?.circles).toBe(1);
      // The stem, then the tittle above it (a zero-length stroke with a round cap = a dot).
      expect(shape?.paths).toEqual(['M12 11.25v5', 'M12 7.75h.01']);
    });

    it('draws an exclamation mark inside a triangle for warning', () => {
      const shape = shapeFor('warning');

      // The triangle is a path, not a circle - warning is the one severity that isn't round.
      expect(shape?.circles).toBe(0);
      expect(shape?.paths).toHaveLength(3);
      expect(shape?.paths[0]).toContain('a2 2 0 0 1 3.4 0');
      expect(shape?.paths.slice(1)).toEqual(['M12 10v3.5', 'M12 16.75h.01']);
    });

    it('draws an X inside a circle for danger', () => {
      const shape = shapeFor('danger');

      expect(shape?.circles).toBe(1);
      // Two strokes crossing at the circle's centre.
      expect(shape?.paths).toEqual(['m14.5 9.5-5 5', 'm9.5 9.5 5 5']);
    });

    it('draws a distinct glyph for every severity', () => {
      // Guards the @switch: a missing @case would silently fall through to the @default (info)
      // glyph, leaving two severities visually identical while every other test still passed.
      const shapes = (['success', 'info', 'warning', 'danger'] as const).map(
        (severity) => JSON.stringify(shapeFor(severity)),
      );

      expect(new Set(shapes).size).toBe(4);
    });

    it.each(['success', 'info', 'warning', 'danger'] as const)(
      'strokes the %s glyph instead of filling it',
      (severity) => {
        // Regression guard for the design decision, not just the markup: a filled disc with a
        // knocked-out mark collapses into an unreadable colored dot at this icon's 1rem size.
        const { fixture, alert } = createHost();
        fixture.componentInstance.severity.set(severity);
        fixture.detectChanges();
        const svg = alert.querySelector(
          '.andes-alert__icon svg',
        ) as SVGSVGElement;

        expect(svg.getAttribute('fill')).toBe('none');
        expect(svg.getAttribute('stroke')).toBe('currentColor');
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      },
    );

    it('renders no glyph at all when showIcon is false', () => {
      const { fixture, alert } = createHost();
      fixture.componentInstance.showIcon.set(false);
      fixture.detectChanges();

      expect(iconShape(alert)).toBeNull();
      expect(alert.querySelectorAll('.andes-alert__icon svg')).toHaveLength(0);
    });

    it('keeps honouring showIcon after the severity changes', () => {
      const { fixture, alert } = createHost();
      fixture.componentInstance.showIcon.set(false);
      fixture.componentInstance.severity.set('danger');
      fixture.detectChanges();

      expect(alert.querySelector('.andes-alert__icon')).toBeFalsy();

      fixture.componentInstance.showIcon.set(true);
      fixture.detectChanges();

      expect(iconShape(alert)?.paths).toEqual([
        'm14.5 9.5-5 5',
        'm9.5 9.5 5 5',
      ]);
    });
  });

  describe('layout modifiers', () => {
    it('collapses the icon gutter when no icon is rendered', () => {
      const { fixture, alert } = createHost();

      expect(alert.classList).not.toContain('andes-alert--no-icon');

      fixture.componentInstance.showIcon.set(false);
      fixture.detectChanges();

      expect(alert.classList).toContain('andes-alert--no-icon');
    });

    it('reserves room for the close button only when closable', () => {
      const { fixture, alert } = createHost();

      expect(alert.classList).not.toContain('andes-alert--closable');

      fixture.componentInstance.closable.set(true);
      fixture.detectChanges();

      expect(alert.classList).toContain('andes-alert--closable');
    });
  });

  it('does not render a close button by default', () => {
    const { alert } = createHost();

    expect(alert.querySelector('.andes-alert__close')).toBeFalsy();
  });

  it('renders a labeled close button when closable', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const close = alert.querySelector(
      '.andes-alert__close',
    ) as HTMLButtonElement;

    expect(close).toBeTruthy();
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.getAttribute('type')).toBe('button');
  });

  it('uses a custom closeLabel for the close button accessible name', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.closeLabel.set('Dismiss');
    fixture.detectChanges();
    const close = alert.querySelector(
      '.andes-alert__close',
    ) as HTMLButtonElement;

    expect(close.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('hides itself and emits closing when the close button is clicked', () => {
    const { fixture, alert } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const close = alert.querySelector(
      '.andes-alert__close',
    ) as HTMLButtonElement;

    close.click();
    fixture.detectChanges();

    expect(alert.hidden).toBe(true);
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('projects custom action content', () => {
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert>
        Body text
        <button slot="action">Undo</button>
      </andes-alert>`,
    })
    class ActionHost {}

    const fixture = TestBed.createComponent(ActionHost);
    fixture.detectChanges();
    const action = fixture.nativeElement.querySelector(
      '.andes-alert__action',
    ) as HTMLElement;

    expect(action.querySelector('button')?.textContent).toBe('Undo');
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert closable showIcon>Body text</andes-alert>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector(
      '[data-slot="alert"]',
    ) as HTMLElement;

    expect(alert.querySelector('.andes-alert__close')).toBeTruthy();
    expect(alert.querySelector('.andes-alert__icon')).toBeTruthy();
  });

  describe('closing and afterClose', () => {
    function clickClose(fixture: ReturnType<typeof createHost>['fixture']) {
      fixture.componentInstance.closable.set(true);
      fixture.detectChanges();
      const close = fixture.nativeElement.querySelector(
        '.andes-alert__close',
      ) as HTMLButtonElement;
      close.click();
      fixture.detectChanges();
    }

    it('emits closing with the originating click before anything is hidden', () => {
      const { fixture } = createHost();

      clickClose(fixture);

      const event = fixture.componentInstance.lastCloseEvent;
      expect(event).toBeInstanceOf(AndesAlertCloseEvent);
      expect(event?.originalEvent).toBeInstanceOf(MouseEvent);
      expect(fixture.componentInstance.visibleWhenClosing).toBe(true);
    });

    it('keeps the alert open when closing is default-prevented', async () => {
      const { fixture, alert } = createHost();
      fixture.componentInstance.preventClose = true;

      clickClose(fixture);
      await fixture.whenStable();

      expect(fixture.componentInstance.lastCloseEvent?.defaultPrevented).toBe(
        true,
      );
      expect(alert.hidden).toBe(false);
      expect(fixture.componentInstance.afterCloseCount).toBe(0);
    });

    it('emits afterClose once the alert is hidden', async () => {
      const { fixture, alert } = createHost();

      clickClose(fixture);
      await fixture.whenStable();

      expect(alert.hidden).toBe(true);
      expect(fixture.componentInstance.afterCloseCount).toBe(1);
    });

    it('takes the host out of layout, not just the inner card', async () => {
      const { fixture } = createHost();
      const host = fixture.nativeElement.querySelector(
        'andes-alert',
      ) as HTMLElement;

      expect(host.style.display).toBe('');

      clickClose(fixture);
      await fixture.whenStable();

      expect(host.style.display).toBe('none');
    });

    describe('collapse animation', () => {
      let animate: ReturnType<typeof vi.fn>;
      let cancel: ReturnType<typeof vi.fn>;
      let finish: () => void;
      let reducedMotion: boolean;

      beforeEach(() => {
        reducedMotion = false;
        cancel = vi.fn();
        animate = vi.fn(() => {
          const finished = new Promise<void>((resolve) => (finish = resolve));
          return { finished, cancel } as unknown as Animation;
        });
        Object.defineProperty(HTMLElement.prototype, 'animate', {
          configurable: true,
          value: animate,
        });
        // jsdom implements neither API, so both are installed for this block only.
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: (query: string) =>
            ({
              matches: query.includes('reduce') && reducedMotion,
              media: query,
            }) as MediaQueryList,
        });
      });

      afterEach(() => {
        delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
        delete (window as Partial<Window>).matchMedia;
      });

      it('collapses the host before hiding it, then emits afterClose', async () => {
        const { fixture, alert } = createHost();

        clickClose(fixture);

        expect(animate).toHaveBeenCalledTimes(1);
        const [keyframes, options] = animate.mock.calls[0];
        expect(keyframes.at(-1)).toEqual({ height: '0px', opacity: 0 });
        expect(options.fill).toBe('forwards');
        // Mid-collapse: still visible, afterClose not yet fired.
        expect(alert.hidden).toBe(false);
        expect(fixture.componentInstance.afterCloseCount).toBe(0);

        finish();
        // Let the component's `finished.then(...)` run before waiting for the render.
        await Promise.resolve();
        await fixture.whenStable();

        expect(alert.hidden).toBe(true);
        expect(cancel).toHaveBeenCalled();
        expect(fixture.componentInstance.afterCloseCount).toBe(1);
      });

      it('ignores repeat clicks while collapsing', async () => {
        const { fixture } = createHost();

        clickClose(fixture);
        (
          fixture.nativeElement.querySelector(
            '.andes-alert__close',
          ) as HTMLButtonElement
        ).click();

        expect(animate).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.closedCount).toBe(1);

        finish();
        // Let the component's `finished.then(...)` run before waiting for the render.
        await Promise.resolve();
        await fixture.whenStable();
        expect(fixture.componentInstance.afterCloseCount).toBe(1);
      });

      it('skips the animation under prefers-reduced-motion', async () => {
        reducedMotion = true;
        const { fixture, alert } = createHost();

        clickClose(fixture);
        await fixture.whenStable();

        expect(animate).not.toHaveBeenCalled();
        expect(alert.hidden).toBe(true);
        expect(fixture.componentInstance.afterCloseCount).toBe(1);
      });
    });
  });

  describe('banner', () => {
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert
        [banner]="banner()"
        [severity]="severity()"
        [showIcon]="showIcon()"
        >Scheduled maintenance tonight.</andes-alert
      >`,
    })
    class BannerHost {
      readonly banner = signal(true);
      readonly severity = signal<AndesAlertSeverity | undefined>(undefined);
      readonly showIcon = signal(true);
    }

    function createBanner() {
      const fixture = TestBed.createComponent(BannerHost);
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector(
        '[data-slot="alert"]',
      ) as HTMLElement;
      return { fixture, alert };
    }

    it('adds the banner modifier', () => {
      const { alert } = createBanner();

      expect(alert.classList).toContain('andes-alert--banner');
    });

    it('defaults to the warning severity (Ant Design parity) and shows its icon', () => {
      const { alert } = createBanner();

      expect(alert.getAttribute('data-severity')).toBe('warning');
      expect(alert.classList).toContain('andes-alert--warning');
      expect(alert.querySelector('.andes-alert__icon svg')).toBeTruthy();
      expect(alert.getAttribute('role')).toBe('status');
    });

    it('still honours an explicit severity', () => {
      const { fixture, alert } = createBanner();
      fixture.componentInstance.severity.set('danger');
      fixture.detectChanges();

      expect(alert.getAttribute('data-severity')).toBe('danger');
      expect(alert.getAttribute('role')).toBe('alert');
    });

    it('falls back to info when neither banner nor severity is set', () => {
      const { fixture, alert } = createBanner();
      fixture.componentInstance.banner.set(false);
      fixture.detectChanges();

      expect(alert.classList).not.toContain('andes-alert--banner');
      expect(alert.getAttribute('data-severity')).toBe('info');
    });
  });

  describe('template inputs', () => {
    @Component({
      imports: [AndesAlert],
      template: `<ng-template #iconTpl let-severity
          ><b class="custom-icon">{{ severity }}</b></ng-template
        >
        <ng-template #closeTpl><i class="custom-close">close</i></ng-template>
        <ng-template #titleTpl let-severity
          ><em class="rich-title">Rich {{ severity }} title</em></ng-template
        >
        <ng-template #descriptionTpl
          ><strong class="rich-description">Rich body</strong></ng-template
        >
        <ng-template #actionTpl
          ><button type="button" class="tpl-action">Retry</button></ng-template
        >
        <andes-alert
          severity="danger"
          closable
          [icon]="useIcon() ? iconTpl : null"
          [closeIcon]="useCloseIcon() ? closeTpl : null"
          [title]="title()"
          [description]="description()"
          [action]="useAction() ? actionTpl : null"
        >
          <span slot="title" class="slot-title">Slot title</span>
          <span class="slot-description">Slot body</span>
          <button slot="action" type="button" class="slot-action">Undo</button>
        </andes-alert>`,
    })
    class TemplateHost {
      readonly titleTpl =
        viewChild.required<TemplateRef<AndesAlertTemplateContext>>('titleTpl');
      readonly descriptionTpl =
        viewChild.required<TemplateRef<AndesAlertTemplateContext>>(
          'descriptionTpl',
        );
      readonly useIcon = signal(false);
      readonly useCloseIcon = signal(false);
      readonly useAction = signal(false);
      readonly title = signal<
        string | TemplateRef<AndesAlertTemplateContext> | null
      >(null);
      readonly description = signal<
        string | TemplateRef<AndesAlertTemplateContext> | null
      >(null);
    }

    function createTemplateHost() {
      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector(
        '[data-slot="alert"]',
      ) as HTMLElement;
      return { fixture, alert, host: fixture.componentInstance };
    }

    it('falls back to the projected slots when no inputs are set', () => {
      const { alert } = createTemplateHost();

      expect(
        alert.querySelector('.andes-alert__title .slot-title'),
      ).toBeTruthy();
      expect(
        alert.querySelector('.andes-alert__description .slot-description'),
      ).toBeTruthy();
      expect(
        alert.querySelector('.andes-alert__action .slot-action'),
      ).toBeTruthy();
    });

    it('renders a custom icon template with the severity as context, inside the tinted icon slot', () => {
      const { fixture, alert, host } = createTemplateHost();
      host.useIcon.set(true);
      fixture.detectChanges();

      const icon = alert.querySelector('.andes-alert__icon') as HTMLElement;
      expect(icon.querySelector('.custom-icon')?.textContent).toBe('danger');
      expect(icon.querySelector('svg')).toBeFalsy();
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not render a custom icon when showIcon is false', () => {
      @Component({
        imports: [AndesAlert],
        template: `<ng-template #tpl><b class="custom-icon">!</b></ng-template>
          <andes-alert [showIcon]="false" [icon]="tpl">Body</andes-alert>`,
      })
      class NoIconHost {}

      const fixture = TestBed.createComponent(NoIconHost);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.custom-icon')).toBeFalsy();
    });

    it('renders a custom close icon while keeping the accessible name', () => {
      const { fixture, alert, host } = createTemplateHost();
      host.useCloseIcon.set(true);
      fixture.detectChanges();

      const close = alert.querySelector('.andes-alert__close') as HTMLElement;
      expect(close.querySelector('.custom-close')).toBeTruthy();
      expect(close.querySelector('svg')).toBeFalsy();
      expect(close.getAttribute('aria-label')).toBe('Close');
    });

    it('renders plain-text title and description inputs over the slots', () => {
      const { fixture, alert, host } = createTemplateHost();
      host.title.set('Text title');
      host.description.set('Text body');
      fixture.detectChanges();

      const title = alert.querySelector('.andes-alert__title') as HTMLElement;
      const description = alert.querySelector(
        '.andes-alert__description',
      ) as HTMLElement;
      expect(title.textContent?.trim()).toBe('Text title');
      expect(description.textContent?.trim()).toBe('Text body');
      expect(alert.querySelector('.slot-title')).toBeFalsy();
      expect(alert.querySelector('.slot-description')).toBeFalsy();
    });

    it('renders title, description and action templates over the slots', () => {
      const { fixture, alert, host } = createTemplateHost();
      host.title.set(host.titleTpl());
      host.description.set(host.descriptionTpl());
      host.useAction.set(true);
      fixture.detectChanges();

      expect(
        alert.querySelector('.andes-alert__title .rich-title')?.textContent,
      ).toBe('Rich danger title');
      expect(
        alert.querySelector('.andes-alert__description .rich-description'),
      ).toBeTruthy();
      expect(
        alert.querySelector('.andes-alert__action .tpl-action'),
      ).toBeTruthy();
      expect(alert.querySelector('.slot-title')).toBeFalsy();
      expect(alert.querySelector('.slot-action')).toBeFalsy();
    });

    it('treats an empty-string title as unset and keeps the slot', () => {
      const { fixture, alert, host } = createTemplateHost();
      host.title.set('');
      fixture.detectChanges();

      expect(alert.querySelector('.slot-title')).toBeTruthy();
    });
  });

  it('keeps a static title attribute off the host (no native tooltip)', () => {
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert title="Saved"
        >Your changes are live.</andes-alert
      >`,
    })
    class StaticTitleHost {}

    const fixture = TestBed.createComponent(StaticTitleHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-alert',
    ) as HTMLElement;

    expect(host.hasAttribute('title')).toBe(false);
    expect(host.querySelector('.andes-alert__title')?.textContent?.trim()).toBe(
      'Saved',
    );
  });

  it('keeps the title and description containers empty (so :empty hides them) when nothing is provided', () => {
    @Component({
      imports: [AndesAlert],
      template: `<andes-alert />`,
    })
    class EmptyHost {}

    const fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();

    for (const part of ['title', 'description', 'action']) {
      const el = fixture.nativeElement.querySelector(
        `.andes-alert__${part}`,
      ) as HTMLElement;
      expect(el.matches(':empty')).toBe(true);
    }
  });
});
