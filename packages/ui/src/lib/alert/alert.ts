import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import clsx from 'clsx';

export type AndesAlertSeverity = 'success' | 'info' | 'warning' | 'danger';
export type AndesAlertRole = 'alert' | 'status';

@Component({
  selector: 'andes-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The `role` input is forwarded to the inner div in the template - a static or bound
    // `role` attribute matching an input's name is otherwise ALSO applied to this host
    // element by Angular, producing two elements (host + inner div) both carrying
    // role="alert"/"status", which assistive tech reads as two separate live regions with
    // duplicate content. Null it out here so only the inner div carries it.
    '[attr.role]': 'null',
  },
})
export class AndesAlert {
  readonly severity = input<AndesAlertSeverity>('info');
  readonly closable = input(false, { transform: booleanAttribute });
  readonly showIcon = input(true, { transform: booleanAttribute });
  /**
   * Overrides the automatically-picked ARIA role. Leave unset unless the consumer knows
   * better than the component's own default whether this alert is static page content or a
   * dynamically-inserted announcement - see the default logic in `resolvedRole` below.
   */
  readonly role = input<AndesAlertRole | undefined>(undefined);
  readonly closeLabel = input('Close');

  readonly closed = output<void>();

  protected readonly visible = signal(true);

  /**
   * Neither shadcn/ui nor Ant Design's own docs confirm a default ARIA role for their base
   * Alert (see docs/research/components/alert.md, section 4). The generally-accepted rule is:
   * `role="status"` (polite) for a non-urgent alert that is part of the page's static/initial
   * content, and `role="alert"` (assertive) for one that appears dynamically and needs
   * immediate announcement. This component can't know at render time whether a consumer is
   * about to *ngIf/@if it into existence in response to a user action (dynamic) or render it
   * as part of the initial page (static) - so it falls back to a severity-driven default
   * (danger implies "something just went wrong, interrupt me" far more often than the other
   * three severities, which are more commonly static/confirmatory) while still letting a
   * consumer who knows better override it via the `role` input.
   */
  protected readonly resolvedRole = computed<AndesAlertRole>(
    () => this.role() ?? (this.severity() === 'danger' ? 'alert' : 'status'),
  );

  /**
   * `no-icon` / `closable` are layout facts the stylesheet can't otherwise derive: the grid
   * has to collapse its icon gutter when no glyph is rendered, and has to reserve inline-end
   * room for the out-of-flow close button. Driving both from a class rather than `:has()`
   * keeps the two layouts assertable from a unit test.
   */
  protected readonly classes = computed(() =>
    clsx('andes-alert', `andes-alert--${this.severity()}`, {
      'andes-alert--no-icon': !this.showIcon(),
      'andes-alert--closable': this.closable(),
    }),
  );

  protected dismiss(): void {
    this.visible.set(false);
    this.closed.emit();
  }
}
