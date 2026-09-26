import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

export type AndesAlertSeverity = 'success' | 'info' | 'warning' | 'danger';
export type AndesAlertRole = 'alert' | 'status';

/** Context handed to every template input (`icon`, `title`, `description`, `action`, `closeIcon`). */
export interface AndesAlertTemplateContext {
  /** The resolved severity - i.e. after `banner`'s `warning` default has been applied. */
  $implicit: AndesAlertSeverity;
  severity: AndesAlertSeverity;
}

/** Content inputs accept plain text for the common case and a template for rich content. */
export type AndesAlertContent =
  string | TemplateRef<AndesAlertTemplateContext> | null | undefined;

/**
 * Emitted by `closing` before the alert starts hiding. Ant Design's `onClose` can only observe
 * the dismissal; exposing `preventDefault()` here also lets a consumer veto it (e.g. to confirm
 * first, or to keep the alert until a request settles) without having to own the visibility
 * state themselves.
 */
export class AndesAlertCloseEvent {
  private prevented = false;

  constructor(
    readonly source: AndesAlert,
    readonly originalEvent: MouseEvent,
  ) {}

  get defaultPrevented(): boolean {
    return this.prevented;
  }

  preventDefault(): void {
    this.prevented = true;
  }
}

/**
 * Collapse duration. There is no motion token in `@andes-ng/tokens` yet, so this lives here
 * rather than in the stylesheet; it is short enough to read as a response to the click rather
 * than as a transition the user has to wait out.
 */
const COLLAPSE_DURATION_MS = 180;

@Component({
  selector: 'andes-alert',
  imports: [NgTemplateOutlet],
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
    // Same trap for `title`: a static `title="..."` would otherwise also become the native
    // tooltip attribute on the host, popping the alert's heading up as a hover tooltip over
    // the whole card.
    '[attr.title]': 'null',
    // Hiding the inner card alone would leave an empty block box behind, which still takes a
    // `gap` slot in the consumer's flex/grid layout after the alert is dismissed.
    '[style.display]': 'visible() ? null : "none"',
  },
})
export class AndesAlert {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  /** Left unset, resolves to `info` - or to `warning` in `banner` mode, matching Ant Design. */
  readonly severity = input<AndesAlertSeverity | undefined>(undefined);
  readonly closable = input(false, { transform: booleanAttribute });
  readonly showIcon = input(true, { transform: booleanAttribute });
  /**
   * Full-width, square-cornered strip for the top of a page or panel. It keeps the card's quiet
   * language - neutral surface, tinted hairline - and only drops what makes it read as a
   * floating card: the radius and the inline-side borders.
   */
  readonly banner = input(false, { transform: booleanAttribute });
  /**
   * Overrides the automatically-picked ARIA role. Leave unset unless the consumer knows
   * better than the component's own default whether this alert is static page content or a
   * dynamically-inserted announcement - see the default logic in `resolvedRole` below.
   */
  readonly role = input<AndesAlertRole | undefined>(undefined);
  readonly closeLabel = input('Close');

  /** Replaces the built-in severity glyph. Still gated by `showIcon`, still severity-tinted. */
  readonly icon = input<TemplateRef<AndesAlertTemplateContext> | null>(null);
  /** Replaces the built-in close (x) glyph. The button keeps `closeLabel` as its name. */
  readonly closeIcon = input<TemplateRef<AndesAlertTemplateContext> | null>(
    null,
  );
  /** Alternative to projecting `[slot=title]`; when set it wins over the slot. */
  readonly title = input<AndesAlertContent>(null);
  /** Alternative to projecting default content; when set it wins over the projection. */
  readonly description = input<AndesAlertContent>(null);
  /** Alternative to projecting `[slot=action]`; when set it wins over the slot. */
  readonly action = input<TemplateRef<AndesAlertTemplateContext> | null>(null);

  /**
   * Fires when the close button is activated, before anything is hidden. Call
   * `preventDefault()` on the event to keep the alert open.
   */
  readonly closing = output<AndesAlertCloseEvent>();
  /** Fires once the alert has finished collapsing and is no longer rendered. */
  readonly afterClose = output<void>();

  protected readonly visible = signal(true);
  private readonly leaving = signal(false);

  protected readonly resolvedSeverity = computed<AndesAlertSeverity>(
    () => this.severity() ?? (this.banner() ? 'warning' : 'info'),
  );

  protected readonly templateContext = computed<AndesAlertTemplateContext>(
    () => ({
      $implicit: this.resolvedSeverity(),
      severity: this.resolvedSeverity(),
    }),
  );

  protected readonly titleTemplate = computed(() => asTemplate(this.title()));
  protected readonly titleText = computed(() => asText(this.title()));
  protected readonly descriptionTemplate = computed(() =>
    asTemplate(this.description()),
  );
  protected readonly descriptionText = computed(() =>
    asText(this.description()),
  );

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
    () =>
      this.role() ??
      (this.resolvedSeverity() === 'danger' ? 'alert' : 'status'),
  );

  /**
   * `no-icon` / `closable` are layout facts the stylesheet can't otherwise derive: the grid
   * has to collapse its icon gutter when no glyph is rendered, and has to reserve inline-end
   * room for the out-of-flow close button. Driving both from a class rather than `:has()`
   * keeps the two layouts assertable from a unit test.
   */
  protected readonly classes = computed(() =>
    clsx('andes-alert', `andes-alert--${this.resolvedSeverity()}`, {
      'andes-alert--no-icon': !this.showIcon(),
      'andes-alert--closable': this.closable(),
      'andes-alert--banner': this.banner(),
    }),
  );

  protected dismiss(event: MouseEvent): void {
    if (this.leaving()) return;

    const closeEvent = new AndesAlertCloseEvent(this, event);
    this.closing.emit(closeEvent);
    if (closeEvent.defaultPrevented) return;

    this.leaving.set(true);
    const animation = this.collapse();
    if (!animation) {
      this.finishClose();
      return;
    }
    animation.finished.then(
      () => this.finishClose(animation),
      // Cancelled (e.g. the host was destroyed mid-collapse) - nothing left to hide.
      () => undefined,
    );
  }

  /**
   * Collapses the host's height and fades it out, so content below slides up instead of
   * jumping. Returns null - hide instantly - when the user asked for reduced motion, or where
   * the Web Animations API isn't available (SSR, jsdom).
   */
  private collapse(): Animation | null {
    const host = this.host.nativeElement;
    const view = this.document.defaultView;
    if (typeof host.animate !== 'function') return null;
    if (view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return null;
    }

    host.style.overflow = 'hidden';
    return host.animate(
      [
        { height: `${host.offsetHeight}px`, opacity: 1 },
        { height: '0px', opacity: 0 },
      ],
      {
        duration: COLLAPSE_DURATION_MS,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        // Hold the collapsed frame until `display: none` has actually been rendered, so the
        // card can't flash back to full height for one frame in between.
        fill: 'forwards',
      },
    );
  }

  private finishClose(animation?: Animation): void {
    this.visible.set(false);
    afterNextRender(
      () => {
        animation?.cancel();
        this.host.nativeElement.style.removeProperty('overflow');
        this.afterClose.emit();
      },
      { injector: this.injector },
    );
  }
}

function asTemplate(
  content: AndesAlertContent,
): TemplateRef<AndesAlertTemplateContext> | null {
  return content instanceof TemplateRef ? content : null;
}

function asText(content: AndesAlertContent): string | null {
  return typeof content === 'string' && content !== '' ? content : null;
}
