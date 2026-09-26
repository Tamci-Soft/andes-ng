import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayPreset,
} from '@andes-ng/primitives';
import {
  ApplicationRef,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  type EmbeddedViewRef,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  signal,
  type Signal,
  type TemplateRef,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { AndesButtonVariant } from '../button/button';

/**
 * Max-width step of a dialog surface. Neither reference library exposes a size
 * enum (shadcn styles `DialogContent` with utility classes, Ant takes a free-form
 * `width`), but a token-driven scale is the andes-ng equivalent of both and keeps
 * consumers off magic pixel values.
 */
export type AndesDialogSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Extra class both dialog roots put on their backdrop, so `dialog.css` can retime the
 * scrim's fade without reaching the backdrop of every other overlay through the shared
 * `andes-overlay-backdrop` hook.
 */
export const ANDES_DIALOG_BACKDROP_CLASS = 'andes-dialog-backdrop';

/**
 * Viewport breakpoints a responsive `width` can key on. Same names and thresholds as
 * Ant's grid (`xs` < 576px, `sm` >= 576px, `md` >= 768px, `lg` >= 992px,
 * `xl` >= 1200px, `xxl` >= 1600px, `xxxl` >= 1920px), so a width object ports
 * across unchanged.
 */
export type AndesDialogBreakpoint =
  'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

const DIALOG_BREAKPOINTS: readonly AndesDialogBreakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
  'xxxl',
];

/**
 * Explicit surface width, overriding the `size` step: a number (px), any CSS length,
 * or a per-breakpoint map of either. Mirrors Ant's `width`, including its responsive
 * object form. The surface still never grows past the viewport.
 */
export type AndesDialogWidth =
  number | string | Partial<Record<AndesDialogBreakpoint, number | string>>;

/** Which built-in footer button receives initial focus. Mirrors Ant's `autoFocusButton`. */
export type AndesDialogAutoFocusButton = 'ok' | 'cancel' | null;

/**
 * What a custom `footer` template receives: the two actions the built-in footer would
 * have wired, so a bespoke footer (three buttons, a checkbox beside the actions) keeps
 * the same OK/Cancel semantics. The Angular counterpart of the `{ OkBtn, CancelBtn }`
 * argument Ant passes to a footer render function.
 */
export interface AndesDialogFooterContext {
  /** The same object as the named fields, for `let-actions`. */
  readonly $implicit: AndesDialogFooterActions;
  /** Runs the OK action (the root's `ok` output, or a service dialog's `onOk`). */
  readonly ok: () => void;
  /** Runs the Cancel action: emits `cancelled` and closes. */
  readonly cancel: () => void;
}

/** The pair of actions handed to a custom footer template. */
export interface AndesDialogFooterActions {
  readonly ok: () => void;
  readonly cancel: () => void;
}

/**
 * The footer a root renders under the consumer's content.
 *
 * - `null` (default): nothing - compose your own `andesDialogFooter` part, the
 *   shadcn way. Also Ant's `footer={null}`.
 * - `'default'`: the built-in Cancel/OK pair, driven by `okText`, `okType`,
 *   `confirmLoading` and friends.
 * - a `TemplateRef`: custom footer content, laid out in the standard footer box and
 *   given `AndesDialogFooterContext`.
 */
export type AndesDialogFooterOption =
  'default' | TemplateRef<AndesDialogFooterContext> | null;

/**
 * Close reasons that count as the user backing out, and so emit `cancelled`. Mirrors
 * the set of paths Ant routes through `onCancel` (Esc, mask click, the "x", Cancel).
 * A consumer's own `andesDialogClose` control is deliberately not in it: it reports
 * `'close-button'` too, but a "Save" wired to close must not read as a cancel.
 */
const CANCEL_REASONS: ReadonlySet<AndesOverlayCloseReason> = new Set([
  'escape-key',
  'outside-click',
  'backdrop-click',
]);

/** Normalizes a width value to a CSS length: bare numbers are pixels, as in Ant. */
function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * The custom properties `dialog.css` reads for an explicit `width`, one per
 * breakpoint. Each breakpoint inherits the nearest smaller one that was given, and
 * breakpoints below the smallest given one reuse it - the surface is capped at the
 * viewport anyway, so a narrow screen never overflows.
 */
export function dialogWidthStyles(
  width: AndesDialogWidth | null,
): Record<string, string> | null {
  if (width === null || width === '') {
    return null;
  }
  if (typeof width !== 'object') {
    const length = toCssLength(width);
    return Object.fromEntries(
      DIALOG_BREAKPOINTS.map((bp) => [`--andes-dialog-width-${bp}`, length]),
    );
  }

  const first = DIALOG_BREAKPOINTS.find((bp) => width[bp] !== undefined);
  if (!first) {
    return null;
  }
  let carried = toCssLength(width[first] as number | string);
  const styles: Record<string, string> = {};
  for (const bp of DIALOG_BREAKPOINTS) {
    const value = width[bp];
    if (value !== undefined) {
      carried = toCssLength(value);
    }
    styles[`--andes-dialog-width-${bp}`] = carried;
  }
  return styles;
}

/** `numberAttribute`, but an absent value stays `null` rather than becoming `NaN`. */
function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = numberAttribute(value, NaN);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Carries a kept-alive surface view into the component the overlay attaches. */
const KEEP_ALIVE_VIEW = new InjectionToken<EmbeddedViewRef<void>>(
  'AndesDialogKeepAliveView',
);

/**
 * What the overlay attaches instead of the consumer's template when the surface is
 * kept alive (`destroyOnClose` off, or `forceRender`). It owns no content: it adopts
 * the DOM of a view the root created once and keeps, so state inside the surface
 * (typed input, scroll position, child component state) survives a close.
 *
 * `display: contents` keeps the surface a direct flex item of the pane, so layout and
 * the pane-level CSS hooks behave exactly as in the destroy-on-close path.
 */
@Component({
  selector: 'andes-dialog-keep-alive',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-dialog-keep-alive' },
})
export class AndesDialogKeepAlive {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Constructed synchronously inside the overlay's attach, before the focus trap
    // looks for its initial target, so the adopted controls are already there to find.
    for (const node of inject(KEEP_ALIVE_VIEW).rootNodes) {
      host.appendChild(node as Node);
    }
  }
}

/**
 * The root of a dialog compound, as seen by its sub-parts.
 *
 * Both `AndesDialog` and `AndesAlertDialog` provide themselves under this token, so
 * a trigger/close/action directive drives whichever root it happens to sit inside
 * without importing either of them (and without a circular import).
 */
export abstract class AndesDialogRoot {
  /** Whether the dialog is currently open. */
  abstract readonly isOpen: Signal<boolean>;
  /** The surface's max-width step. */
  abstract readonly size: Signal<AndesDialogSize>;
  /** Explicit surface width, overriding `size`. */
  abstract readonly width: Signal<AndesDialogWidth | null>;
  /** Centre the surface vertically; off parks it near the top, the way Ant does. */
  abstract readonly centered: Signal<boolean>;
  /** Show a skeleton in place of the body while content loads. */
  abstract readonly loading: Signal<boolean>;
  /** The footer the surface renders after the consumer's content. */
  abstract readonly footer: Signal<AndesDialogFooterOption>;
  /** Built-in footer: OK label. */
  abstract readonly okText: Signal<string>;
  /** Built-in footer: Cancel label. */
  abstract readonly cancelText: Signal<string>;
  /** Built-in footer: OK button variant. */
  abstract readonly okType: Signal<AndesButtonVariant>;
  /** Built-in footer: disable OK. */
  abstract readonly okDisabled: Signal<boolean>;
  /** Built-in footer: disable Cancel. */
  abstract readonly cancelDisabled: Signal<boolean>;
  /** Built-in footer: OK shows a spinner and is inert. */
  abstract readonly confirmLoading: Signal<boolean>;
  /** Built-in footer: Cancel shows a spinner and is inert. */
  abstract readonly cancelLoading: Signal<boolean>;
  /** Built-in footer: render the Cancel button at all. */
  abstract readonly showCancel: Signal<boolean>;
  /** Built-in footer: which button receives initial focus. */
  abstract readonly autoFocusButton: Signal<AndesDialogAutoFocusButton>;
  /** Context handed to a custom `footer` template. */
  abstract readonly footerContext: AndesDialogFooterContext;
  /** Opens the dialog. */
  abstract show(): void;
  /** Closes the dialog, reporting `reason` on the `closed` output. */
  abstract hide(reason?: AndesOverlayCloseReason): void;
  /** Opens the dialog if closed, closes it if open. */
  abstract toggle(): void;
  /** The built-in OK action: emits `ok`. Does not close, as in Ant. */
  abstract requestOk(): void;
  /**
   * The built-in Cancel/"x" action: emits `cancelled` and closes, reporting
   * `'close-button'`.
   */
  abstract requestCancel(): void;
}

/**
 * The surface element of a dialog compound, as seen by the parts rendered inside
 * it. Title and description register their ids here so the surface can point
 * `aria-labelledby`/`aria-describedby` at them — the relationship both reference
 * libraries treat as mandatory rather than optional for a dialog.
 */
export abstract class AndesDialogSurface {
  /** Registers (or, with `null`, clears) the element labelling the surface. */
  abstract registerTitleId(id: string | null): void;
  /** Registers (or, with `null`, clears) the element describing the surface. */
  abstract registerDescriptionId(id: string | null): void;
}

/**
 * Everything `AndesDialog` and `AndesAlertDialog` share: the overlay instance, the
 * open-state contract and the mapping from inputs onto the overlay's behavior
 * config. Subclasses only choose an overlay preset and say where their surface
 * template comes from.
 */
@Directive({
  host: {
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
  },
})
export abstract class AndesDialogRootBase implements AndesDialogRoot {
  /** The overlay this root owns. Provided by the concrete component. */
  protected readonly overlay = inject(AndesOverlayPrimitive);

  private readonly injector = inject(Injector);
  private readonly appRef = inject(ApplicationRef);

  /** Two-way open state, the equivalent of shadcn's `open`/`onOpenChange`. */
  readonly open = model(false);
  /** Escape closes the dialog. Mirrors Ant's `keyboard`. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** Block document scroll while open. Mirrors Ant's `scrollLock`. */
  readonly lockScroll = input(true, { transform: booleanAttribute });
  /** Max-width step of the surface. */
  readonly size = input<AndesDialogSize>('md');
  /**
   * Explicit surface width, overriding `size`: px number, CSS length, or a
   * per-breakpoint map (`{ xs: '90%', md: 640 }`). Mirrors Ant's `width`.
   */
  readonly width = input<AndesDialogWidth | null>(null);
  /**
   * Centre the surface vertically. On by default - the shadcn placement this
   * component shipped with; set it off for Ant's default, a surface parked near the
   * top of the viewport that does not jump as its content grows.
   */
  readonly centered = input(true, { transform: booleanAttribute });
  /**
   * Render the backdrop scrim. Mirrors Ant's `mask`. Takes effect on the next open.
   * Without it the page behind stays visible but is still inert: focus stays
   * trapped and scroll stays locked.
   */
  readonly mask = input(true, { transform: booleanAttribute });
  /**
   * Explicit `z-index` for the dialog and its backdrop, overriding the
   * `--andes-z-index-modal` layer. Mirrors Ant's `zIndex`; reach for it only to
   * stack above third-party overlays, since the token layers already order andes-ng's
   * own.
   */
  readonly zIndex = input<number | null, unknown>(null, {
    transform: optionalNumber,
  });
  /**
   * Replace the body with a skeleton while its data loads, keeping the header (so the
   * dialog stays labelled) and hiding the footer. Mirrors Ant's `loading`.
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /**
   * Destroy the surface's content when the dialog closes, re-creating it on the next
   * open. On by default - the reverse of Ant's `destroyOnHidden` default, because an
   * Angular template view only exists while attached and lazy creation is what this
   * component always did. Turn it off to keep form state and child components alive
   * across a close.
   */
  readonly destroyOnClose = input(true, { transform: booleanAttribute });
  /**
   * Create the surface's content up front, before the first open, and keep it alive
   * from then on. Mirrors Ant's `forceRender`: child components are constructed (and
   * can start loading data) before the user asks for the dialog.
   */
  readonly forceRender = input(false, { transform: booleanAttribute });
  /**
   * Element focus returns to on close, overriding the trigger. The equivalent of
   * Base UI's `finalFocus`.
   */
  readonly restoreFocusTo = input<HTMLElement | null>(null);

  /** The footer rendered after the content. See `AndesDialogFooterOption`. */
  readonly footer = input<AndesDialogFooterOption>(null);
  /** Built-in footer: OK label. Mirrors Ant's `okText`. */
  readonly okText = input('OK');
  /** Built-in footer: Cancel label. Mirrors Ant's `cancelText`. */
  readonly cancelText = input('Cancel');
  /**
   * Built-in footer: OK button variant. Mirrors Ant's `okType`; `'danger'` is the
   * equivalent of `okButtonProps={{ danger: true }}`.
   */
  readonly okType = input<AndesButtonVariant>('primary');
  /** Built-in footer: disable OK. Ant's `okButtonProps.disabled`. */
  readonly okDisabled = input(false, { transform: booleanAttribute });
  /** Built-in footer: disable Cancel. Ant's `cancelButtonProps.disabled`. */
  readonly cancelDisabled = input(false, { transform: booleanAttribute });
  /** Built-in footer: OK shows a spinner and is inert. Mirrors Ant's `confirmLoading`. */
  readonly confirmLoading = input(false, { transform: booleanAttribute });
  /** Built-in footer: Cancel shows a spinner. Ant's `cancelButtonProps.loading`. */
  readonly cancelLoading = input(false, { transform: booleanAttribute });
  /** Built-in footer: render the Cancel button. Off gives an OK-only acknowledgement. */
  readonly showCancel = input(true, { transform: booleanAttribute });
  /**
   * Built-in footer: button that receives initial focus instead of the first tabbable
   * element. Mirrors Ant's `autoFocusButton`.
   */
  readonly autoFocusButton = input<AndesDialogAutoFocusButton>(null);

  /** Emits after the dialog has opened. */
  readonly opened = output<void>();
  /**
   * Emits why the dialog closed, after it has closed and focus has been restored.
   * This is Ant's `afterClose`: there is no exit animation to wait for.
   */
  readonly closed = output<AndesOverlayCloseReason>();
  /**
   * The built-in OK button (or a custom footer's `ok()`) was activated. Mirrors
   * Ant's `onOk`, and like it does not close the dialog: set `open` to false when the
   * work is done, typically after toggling `confirmLoading` around it.
   */
  readonly ok = output<void>();
  /**
   * The user backed out: Escape, a backdrop/outside click, the built-in "x" or the
   * built-in Cancel. Emits the close reason, just before `closed`. Mirrors Ant's
   * `onCancel`.
   */
  readonly cancelled = output<AndesOverlayCloseReason>();
  /**
   * Emits `true` once the open transition has finished and `false` once the dialog
   * has closed. Mirrors Ant's `afterOpenChange`.
   */
  readonly afterOpenChange = output<boolean>();

  /** Whether the dialog is currently open. */
  readonly isOpen = this.overlay.isOpen;

  readonly footerContext: AndesDialogFooterContext = (() => {
    const actions: AndesDialogFooterActions = {
      ok: () => this.requestOk(),
      cancel: () => this.requestCancel(),
    };
    return { $implicit: actions, ...actions };
  })();

  /** The kept-alive surface view, while `destroyOnClose` is off or `forceRender` on. */
  private keptView: EmbeddedViewRef<void> | null = null;
  /** Set by `requestCancel()` so the close it triggers reports as a cancel. */
  private cancelRequested = false;
  /** Bumped per open, so a slow open-transition wait cannot report a stale open. */
  private openGeneration = 0;

  /** Which overlay preset this root drives. */
  protected abstract overlayPreset(): AndesOverlayPreset;

  /** The surface template to portal, once the consumer has declared one. */
  protected abstract surfaceTemplate(): TemplateRef<void> | undefined;

  /**
   * Config a subclass layers on top of its preset and the shared inputs. Read
   * inside an effect, so it may read signals.
   */
  protected configOverrides(): Partial<AndesOverlayConfig> {
    return {};
  }

  constructor() {
    // The presets were designed for exactly these two components; deriving the
    // config field by field here would be a second, drifting source of truth.
    this.overlay.configure(andesOverlayPreset(this.overlayPreset()));

    effect(() => {
      this.overlay.configure({
        closeOnEscape: this.closeOnEscape(),
        lockScroll: this.lockScroll(),
        hasBackdrop: this.mask(),
        ...this.configOverrides(),
      });
    });

    // `forceRender` builds the kept-alive view before anyone opens the dialog.
    effect(() => {
      const template = this.surfaceTemplate();
      if (template && this.forceRender()) {
        untracked(() => this.ensureKeptView(template));
      }
    });

    // Turning keep-alive off while closed drops the kept view right away; while open,
    // the close handler below drops it once the surface is off screen.
    effect(() => {
      if (!this.keepsAlive() && !this.overlay.isOpen()) {
        untracked(() => this.destroyKeptView());
      }
    });

    effect(() => {
      const shouldOpen = this.open();
      const template = this.surfaceTemplate();

      if (!shouldOpen) {
        this.overlay.close();
        return;
      }
      // A `show()` that lands before the content query has resolved is not lost:
      // this effect re-runs when the template arrives.
      if (!template) {
        return;
      }
      const restoreFocusTo = this.restoreFocusTo();
      if (this.keepsAlive()) {
        const view = untracked(() => this.ensureKeptView(template));
        this.overlay.open(AndesDialogKeepAlive, {
          restoreFocusTo,
          injector: Injector.create({
            providers: [{ provide: KEEP_ALIVE_VIEW, useValue: view }],
            parent: this.injector,
          }),
        });
      } else {
        this.overlay.open(template, { restoreFocusTo });
      }
    });

    // The primitive re-applies the layer's z-index whenever it is reconfigured, so
    // this tracks `config` to re-assert an explicit value right after it.
    effect(() => {
      this.overlay.config();
      const zIndex = this.zIndex();
      const pane = this.overlay.panelElement();
      if (zIndex === null || !pane) {
        return;
      }
      pane.parentElement?.style.setProperty('z-index', String(zIndex));
      this.overlay
        .backdropElement()
        ?.style.setProperty('z-index', String(zIndex));
    });

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.opened.emit();
      const generation = ++this.openGeneration;
      void this.whenEntered().then(() => {
        if (generation === this.openGeneration && this.overlay.isOpen()) {
          this.afterOpenChange.emit(true);
        }
      });
    });

    // Every close path - Escape, backdrop, close button, destruction - funnels
    // through here, so the two-way `open` cannot drift out of sync with reality.
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      const cancelled = this.cancelRequested || CANCEL_REASONS.has(reason);
      this.cancelRequested = false;
      this.openGeneration++;
      this.open.set(false);
      if (!this.keepsAlive()) {
        this.destroyKeptView();
      }
      if (cancelled) {
        this.cancelled.emit(reason);
      }
      this.closed.emit(reason);
      this.afterOpenChange.emit(false);
    });

    inject(DestroyRef).onDestroy(() => this.destroyKeptView());
  }

  show(): void {
    this.open.set(true);
  }

  hide(reason: AndesOverlayCloseReason = 'imperative'): void {
    this.overlay.close(reason);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.hide('trigger');
    } else {
      this.show();
    }
  }

  requestOk(): void {
    if (this.isOpen()) {
      this.ok.emit();
    }
  }

  requestCancel(): void {
    if (!this.isOpen()) {
      return;
    }
    this.cancelRequested = true;
    this.hide('close-button');
  }

  /** Whether the surface view outlives a close. */
  private keepsAlive(): boolean {
    return this.forceRender() || !this.destroyOnClose();
  }

  private ensureKeptView(template: TemplateRef<void>): EmbeddedViewRef<void> {
    if (!this.keptView) {
      // Created from the TemplateRef rather than through a ViewContainerRef, so its
      // nodes are never inserted into the page next to the root; DI still resolves
      // from where the template was declared. Attaching it to the ApplicationRef is
      // what keeps it change-detected while it is detached from the document.
      this.keptView = template.createEmbeddedView(undefined);
      this.appRef.attachView(this.keptView);
    }
    return this.keptView;
  }

  private destroyKeptView(): void {
    this.keptView?.destroy();
    this.keptView = null;
  }

  /**
   * Resolves once the pane's entry animation has finished (immediately when there is
   * none, e.g. under `prefers-reduced-motion`, or in a DOM without Web Animations).
   */
  private whenEntered(): Promise<unknown> {
    const pane = this.overlay.panelElement();
    const animations =
      typeof pane?.getAnimations === 'function' ? pane.getAnimations() : [];
    return Promise.allSettled(
      animations.map((animation) => animation.finished),
    );
  }
}

/**
 * Shared surface behavior: collecting the ids of the title and description parts
 * rendered inside, so the concrete surface can expose them as
 * `aria-labelledby`/`aria-describedby`.
 */
@Directive({})
export abstract class AndesDialogSurfaceBase implements AndesDialogSurface {
  private readonly _titleId = signal<string | null>(null);
  private readonly _descriptionId = signal<string | null>(null);

  /** Id of the registered title part, if any. */
  readonly titleId = this._titleId.asReadonly();
  /** Id of the registered description part, if any. */
  readonly descriptionId = this._descriptionId.asReadonly();

  registerTitleId(id: string | null): void {
    this._titleId.set(id);
  }

  registerDescriptionId(id: string | null): void {
    this._descriptionId.set(id);
  }
}

let nextLabelId = 0;

/**
 * Registers the host element as a dialog surface's label or description.
 *
 * Reuses an author-supplied `id` when there is one, so a consumer that already
 * wires `aria-labelledby` by hand keeps their own id rather than having it
 * silently replaced.
 */
export function registerDialogLabel(part: 'title' | 'description'): string {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const surface = inject(AndesDialogSurface);
  const id = element.id || `andes-dialog-${part}-${nextLabelId++}`;

  if (part === 'title') {
    surface.registerTitleId(id);
    inject(DestroyRef).onDestroy(() => surface.registerTitleId(null));
  } else {
    surface.registerDescriptionId(id);
    inject(DestroyRef).onDestroy(() => surface.registerDescriptionId(null));
  }

  return id;
}

/**
 * The classes both surfaces derive from their root: size step, explicit width, top
 * placement and the loading state. Kept in one place so Dialog and Alert Dialog cannot
 * drift apart on what an input means visually.
 */
export function dialogSurfaceClasses(root: AndesDialogRoot): string[] {
  const classes = ['andes-dialog', `andes-dialog--${root.size()}`];
  if (root.width() !== null) {
    classes.push('andes-dialog--custom-width');
  }
  if (!root.centered()) {
    classes.push('andes-dialog--top');
  }
  if (root.loading()) {
    classes.push('andes-dialog--loading');
  }
  return classes;
}
