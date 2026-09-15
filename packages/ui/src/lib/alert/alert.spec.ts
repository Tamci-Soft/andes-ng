import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesAlert, AndesAlertRole, AndesAlertSeverity } from './alert';

@Component({
  imports: [AndesAlert],
  template: `<andes-alert
    [severity]="severity()"
    [closable]="closable()"
    [showIcon]="showIcon()"
    [role]="role()"
    [closeLabel]="closeLabel()"
    (closed)="onClosed()"
  >
    <span slot="title">Heads up</span>
    Something you should know.
  </andes-alert>`,
})
class HostComponent {
  readonly severity = signal<AndesAlertSeverity>('info');
  readonly closable = signal(false);
  readonly showIcon = signal(true);
  readonly role = signal<AndesAlertRole | undefined>(undefined);
  readonly closeLabel = signal('Close');
  closedCount = 0;

  onClosed(): void {
    this.closedCount++;
  }
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

  it('hides itself and emits closed when the close button is clicked', () => {
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
});
