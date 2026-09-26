import type { AndesOverlayCloseReason } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  input,
  signal,
  type Signal,
  TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';

import type { AndesButtonVariant } from '../button/button';
import {
  AndesAlertDialog,
  AndesAlertDialogContent,
  AndesAlertDialogContentTemplate,
  AndesAlertDialogDescription,
  AndesAlertDialogTitle,
} from './alert-dialog';
import { AndesDialogActions } from './dialog-actions';
import type {
  AndesDialogAutoFocusButton,
  AndesDialogFooterContext,
  AndesDialogSize,
  AndesDialogWidth,
} from './dialog-base';

/** The five imperative flavours. Mirrors `Modal.confirm/info/success/error/warning`. */
export type AndesDialogMethodKind =
  'confirm' | 'info' | 'success' | 'error' | 'warning';

/** Text, or a template for rich content. Templates receive the dialog's ref. */
export type AndesDialogMethodContent =
  string | TemplateRef<{ $implicit: AndesDialogMethodRef }>;

/**
 * Configuration for `AndesDialogService.confirm()` and its siblings. Mirrors the
 * `Modal.method()` config; field names are Ant's wherever the concept carries over.
 */
export interface AndesDialogMethodConfig {
  /** Heading, wired as the dialog's accessible name. */
  readonly title?: AndesDialogMethodContent;
  /** Body copy, wired as the dialog's accessible description. */
  readonly content?: AndesDialogMethodContent;
  /**
   * Replaces the kind's status icon. `null` renders none. Put `aria-hidden="true"`
   * on a decorative icon - the kind is conveyed by the title, not the glyph.
   */
  readonly icon?: TemplateRef<unknown> | null;
  /** OK label. Default `'OK'`. */
  readonly okText?: string;
  /** Cancel label. Default `'Cancel'`. */
  readonly cancelText?: string;
  /** OK button variant. Default `'primary'`; `'danger'` for a destructive confirm. */
  readonly okType?: AndesButtonVariant;
  /** Disable OK. Ant's `okButtonProps.disabled`. */
  readonly okDisabled?: boolean;
  /** Disable Cancel. Ant's `cancelButtonProps.disabled`. */
  readonly cancelDisabled?: boolean;
  /**
   * Show Cancel next to OK. Defaults to `true` for `confirm` and `false` for the
   * four acknowledgement kinds, as in Ant.
   */
  readonly okCancel?: boolean;
  /**
   * Runs when OK is activated. Return a promise to keep the dialog open with OK in
   * its loading state until it settles: resolving closes the dialog, rejecting keeps
   * it open so the user can retry.
   */
  readonly onOk?: () => unknown;
  /**
   * Runs when the user backs out - Cancel, the "x", or Escape. From the Cancel button
   * a returned promise works like `onOk`'s; from the "x" or Escape the dialog has
   * already closed and the result is ignored.
   */
  readonly onCancel?: () => unknown;
  /** Runs once the dialog has closed and been torn down, whatever the outcome. */
  readonly afterClose?: () => void;
  /**
   * Which footer button receives initial focus. Defaults to `'cancel'` for
   * `confirm` - the safe choice, the one a stray Enter should land on - and to
   * `'ok'`, the only button, for the other kinds.
   */
  readonly autoFocusButton?: AndesDialogAutoFocusButton;
  /** Render a close ("x") control. Default `false`, as in Ant. */
  readonly closable?: boolean;
  /** Accessible label for the "x". Default `'Close'`. */
  readonly closeLabel?: string;
  /** Escape closes the dialog (as a cancel). Default `true`. Ant's `keyboard`. */
  readonly keyboard?: boolean;
  /** Render the backdrop scrim. Default `true`. */
  readonly mask?: boolean;
  /** Block document scroll while open. Default `true`. Ant's `scrollLock`. */
  readonly lockScroll?: boolean;
  /** Centre vertically. Default `true`; `false` parks it near the top. */
  readonly centered?: boolean;
  /** Surface max-width step. Default `'md'` (26rem, Ant's 416px method width). */
  readonly size?: AndesDialogSize;
  /** Explicit width, overriding `size`. */
  readonly width?: AndesDialogWidth | null;
  /** Explicit z-index, overriding the modal layer. */
  readonly zIndex?: number | null;
  /**
   * Custom footer, given `ok()`/`cancel()` that run the same handlers as the
   * built-in buttons. `null` renders no footer (then keep `keyboard` or `closable`
   * on, or the dialog has no way out).
   */
  readonly footer?: TemplateRef<AndesDialogFooterContext> | null;
  /** Extra classes on the surface. Ant's `className`. */
  readonly className?: string;
}

/**
 * Handle to one imperative dialog. Mirrors what `Modal.confirm()` returns
 * (`update`/`destroy`), plus a `result` promise - the counterpart of awaiting a
 * `useModal` instance.
 */
export class AndesDialogMethodRef {
  private readonly _config: WritableSignal<AndesDialogMethodConfig>;
  private readonly _closed = signal(false);
  private resolveResult!: (confirmed: boolean) => void;
  private closeHandler: (() => void) | null = null;

  /**
   * Settles when the dialog closes: `true` if it closed through OK, `false` for any
   * other way out (Cancel, "x", Escape, `destroy()`).
   */
  readonly result: Promise<boolean>;

  /** The dialog's current configuration. */
  readonly config: Signal<AndesDialogMethodConfig>;
  /** Whether the dialog has closed. */
  readonly closed = this._closed.asReadonly();

  constructor(
    /** Which flavour this dialog is. */
    readonly kind: AndesDialogMethodKind,
    config: AndesDialogMethodConfig,
  ) {
    this._config = signal(config);
    this.config = this._config.asReadonly();
    this.result = new Promise<boolean>((resolve) => {
      this.resolveResult = resolve;
    });
  }

  /**
   * Merges new configuration into the open dialog - retitle it, flip `okDisabled`,
   * swap its content. Accepts a patch or a function of the previous config, as
   * Ant's `update` does.
   */
  update(
    patch:
      | Partial<AndesDialogMethodConfig>
      | ((
          previous: AndesDialogMethodConfig,
        ) => Partial<AndesDialogMethodConfig>),
  ): void {
    this._config.update((previous) => ({
      ...previous,
      ...(typeof patch === 'function' ? patch(previous) : patch),
    }));
  }

  /** Closes the dialog without running `onOk`/`onCancel`. `result` settles `false`. */
  destroy(): void {
    if (this.closeHandler) {
      this.closeHandler();
    } else {
      // Not rendered yet (destroyed in the same tick it was created).
      this.settle(false);
    }
  }

  /** @internal Wires `destroy()` to the rendered dialog. */
  attach(close: () => void): void {
    this.closeHandler = close;
  }

  /** @internal Records the outcome. Idempotent. */
  settle(confirmed: boolean): void {
    if (this._closed()) {
      return;
    }
    this._closed.set(true);
    this.closeHandler = null;
    this.resolveResult(confirmed);
  }
}

const METHOD_ICON_PATHS: Record<AndesDialogMethodKind, string> = {
  // Ant draws `confirm` with the same exclamation glyph as `warning`.
  confirm: 'M12 7.5v5.5M12 16.5h.01',
  warning: 'M12 7.5v5.5M12 16.5h.01',
  error: 'M9 9l6 6M15 9l-6 6',
  info: 'M12 11v5.5M12 7.5h.01',
  success: 'M8 12.5l2.75 2.75L16 10',
};

/**
 * The component `AndesDialogService` instantiates per call: an `AndesAlertDialog` -
 * `role="alertdialog"`, no outside-click dismissal - laid out as Ant's method
 * dialogs are (status icon beside title and content, actions below).
 *
 * Internal: created only by the service.
 */
@Component({
  selector: 'andes-dialog-method',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AndesAlertDialog,
    AndesAlertDialogContent,
    AndesAlertDialogContentTemplate,
    AndesAlertDialogTitle,
    AndesAlertDialogDescription,
    AndesDialogActions,
    NgTemplateOutlet,
  ],
  template: `
    @let cfg = ref().config();
    <andes-alert-dialog
      [(open)]="open"
      [closeOnEscape]="cfg.keyboard ?? true"
      [lockScroll]="cfg.lockScroll ?? true"
      [mask]="cfg.mask ?? true"
      [centered]="cfg.centered ?? true"
      [size]="cfg.size ?? 'md'"
      [width]="cfg.width ?? null"
      [zIndex]="cfg.zIndex ?? null"
      (closed)="onClosed($event)"
    >
      <andes-alert-dialog-content
        *andesAlertDialogContent
        [class]="surfaceClass()"
        [attr.aria-label]="cfg.title ? null : defaultLabel()"
      >
        <div class="andes-dialog__method" data-slot="dialog-method-body">
          @if (cfg.icon !== null) {
            <span
              class="andes-dialog__method-icon"
              data-slot="dialog-method-icon"
              aria-hidden="true"
            >
              @if (cfg.icon) {
                <ng-container *ngTemplateOutlet="cfg.icon" />
              } @else {
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="12" r="9.25" />
                  <path [attr.d]="iconPath()" />
                </svg>
              }
            </span>
          }
          <div class="andes-dialog__method-text">
            @if (cfg.title; as title) {
              <h2 andesAlertDialogTitle>
                <ng-container
                  *ngTemplateOutlet="
                    asTemplate(title) ?? textTpl;
                    context: { $implicit: ref(), text: title }
                  "
                />
              </h2>
            }
            @if (cfg.content; as content) {
              <div andesAlertDialogDescription>
                <ng-container
                  *ngTemplateOutlet="
                    asTemplate(content) ?? textTpl;
                    context: { $implicit: ref(), text: content }
                  "
                />
              </div>
            }
          </div>
        </div>

        @if (cfg.footer !== null) {
          <andes-dialog-actions
            slot="alert-dialog-footer"
            [template]="cfg.footer ?? null"
            [context]="footerContext"
            [okText]="cfg.okText ?? 'OK'"
            [cancelText]="cfg.cancelText ?? 'Cancel'"
            [okType]="cfg.okType ?? 'primary'"
            [okDisabled]="cfg.okDisabled ?? false"
            [cancelDisabled]="cfg.cancelDisabled ?? false"
            [okLoading]="okLoading()"
            [cancelLoading]="cancelLoading()"
            [showCancel]="showCancel()"
            [autoFocusButton]="autoFocusButton()"
            (okClick)="runOk()"
            (cancelClick)="runCancel()"
          />
        }

        @if (cfg.closable) {
          <button
            type="button"
            class="andes-dialog__close"
            data-slot="dialog-close-button"
            [attr.aria-label]="cfg.closeLabel ?? 'Close'"
            (click)="dismiss()"
          >
            <svg
              class="andes-dialog__close-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        }
      </andes-alert-dialog-content>
    </andes-alert-dialog>

    <ng-template #textTpl let-text="text">{{ text }}</ng-template>
  `,
})
export class AndesDialogMethod {
  /** The handle this dialog renders and reports to. */
  readonly ref = input.required<AndesDialogMethodRef>();

  protected readonly open = signal(true);
  private readonly root = viewChild(AndesAlertDialog);
  protected readonly okLoading = signal(false);
  protected readonly cancelLoading = signal(false);

  protected readonly showCancel = computed(
    () => this.ref().config().okCancel ?? this.ref().kind === 'confirm',
  );

  protected readonly autoFocusButton = computed(() => {
    const configured = this.ref().config().autoFocusButton;
    if (configured !== undefined) {
      return configured;
    }
    return this.showCancel() ? 'cancel' : 'ok';
  });

  protected readonly surfaceClass = computed(() => {
    const cfg = this.ref().config();
    return [
      'andes-dialog--method',
      `andes-dialog--method-${this.ref().kind}`,
      cfg.closable ? 'andes-dialog--method-closable' : '',
      cfg.className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  protected readonly iconPath = computed(
    () => METHOD_ICON_PATHS[this.ref().kind],
  );

  /** Accessible name when no title is given, so the alertdialog is never unnamed. */
  protected readonly defaultLabel = computed(() => {
    const kind = this.ref().kind;
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  });

  protected readonly footerContext: AndesDialogFooterContext = (() => {
    const actions = {
      ok: () => this.runOk(),
      cancel: () => this.runCancel(),
    };
    return { $implicit: actions, ...actions };
  })();

  /** How the pending close should settle `result`. */
  private outcome: boolean | null = null;
  private cancelHandled = false;

  protected asTemplate(
    value: AndesDialogMethodContent,
  ): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null;
  }

  protected async runOk(): Promise<void> {
    if (this.okLoading() || this.cancelLoading()) {
      return;
    }
    if (await this.settleThrough(this.ref().config().onOk, this.okLoading)) {
      this.close(true);
    }
  }

  protected async runCancel(): Promise<void> {
    if (this.okLoading() || this.cancelLoading()) {
      return;
    }
    this.cancelHandled = true;
    const done = await this.settleThrough(
      this.ref().config().onCancel,
      this.cancelLoading,
    );
    if (done) {
      this.close(false);
    } else {
      this.cancelHandled = false;
    }
  }

  /** The "x": a cancel that does not wait on `onCancel`. */
  protected dismiss(): void {
    this.open.set(false);
  }

  /** @internal */
  close(confirmed: boolean): void {
    this.outcome = confirmed;
    this.open.set(false);
  }

  /** @internal Closes without running any handler, for `destroy()`. */
  destroy(): void {
    this.cancelHandled = true;
    if (this.root()?.isOpen()) {
      this.close(false);
    } else {
      // Destroyed before the overlay attached: there is no close to wait for.
      this.open.set(false);
      this.ref().settle(false);
    }
  }

  protected onClosed(reason: AndesOverlayCloseReason): void {
    const confirmed = this.outcome ?? false;
    // Escape and the "x" close the overlay before any handler runs, so they are the
    // one path that still owes `onCancel` a call. Its result cannot keep the dialog
    // open any more, but a rejection must not go unhandled either.
    if (!confirmed && !this.cancelHandled && reason !== 'destroyed') {
      Promise.resolve()
        .then(() => this.ref().config().onCancel?.())
        .catch((error: unknown) => console.error(error));
    }
    this.ref().settle(confirmed);
  }

  /**
   * Runs a handler, holding `loading` while a returned promise is pending. Resolves
   * whether the dialog should now close: a rejected promise keeps it open (Ant's
   * retry behavior) and is logged rather than swallowed.
   */
  private async settleThrough(
    handler: (() => unknown) | undefined,
    loading: WritableSignal<boolean>,
  ): Promise<boolean> {
    let result: unknown;
    try {
      result = handler?.();
    } catch (error) {
      console.error(error);
      return false;
    }
    if (!isPromiseLike(result)) {
      return true;
    }
    loading.set(true);
    try {
      await result;
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      loading.set(false);
    }
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Imperative dialogs: the Angular counterpart of Ant's `Modal.confirm()`,
 * `Modal.info()`, `Modal.success()`, `Modal.error()` and `Modal.warning()`.
 *
 * Each call renders an `AndesAlertDialog` and returns an `AndesDialogMethodRef` to
 * update, destroy or await it. Because the service is injected, dialogs it opens
 * already live inside the app's injector tree - the job Ant's `Modal.useModal()`
 * context holder exists to do in React.
 *
 * ```ts
 * private readonly dialogs = inject(AndesDialogService);
 *
 * async delete() {
 *   const ref = this.dialogs.confirm({
 *     title: 'Delete this project?',
 *     content: 'This cannot be undone.',
 *     okText: 'Delete',
 *     okType: 'danger',
 *     onOk: () => this.api.delete(this.id), // OK spins until this settles
 *   });
 *   if (await ref.result) {
 *     this.router.navigate(['/projects']);
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AndesDialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly open = new Set<AndesDialogMethodRef>();

  /** A confirmation with OK and Cancel. */
  confirm(config: AndesDialogMethodConfig): AndesDialogMethodRef {
    return this.show('confirm', config);
  }

  /** An informational acknowledgement (OK only). */
  info(config: AndesDialogMethodConfig): AndesDialogMethodRef {
    return this.show('info', config);
  }

  /** A success acknowledgement (OK only). */
  success(config: AndesDialogMethodConfig): AndesDialogMethodRef {
    return this.show('success', config);
  }

  /** An error acknowledgement (OK only). */
  error(config: AndesDialogMethodConfig): AndesDialogMethodRef {
    return this.show('error', config);
  }

  /** A warning acknowledgement (OK only). */
  warning(config: AndesDialogMethodConfig): AndesDialogMethodRef {
    return this.show('warning', config);
  }

  /** Destroys every dialog this service has open. Ant's `Modal.destroyAll()`. */
  destroyAll(): void {
    for (const ref of [...this.open]) {
      ref.destroy();
    }
  }

  private show(
    kind: AndesDialogMethodKind,
    config: AndesDialogMethodConfig,
  ): AndesDialogMethodRef {
    const ref = new AndesDialogMethodRef(kind, config);
    const componentRef = createComponent(AndesDialogMethod, {
      environmentInjector: this.environmentInjector,
    });
    componentRef.setInput('ref', ref);
    ref.attach(() => componentRef.instance.destroy());
    this.appRef.attachView(componentRef.hostView);
    this.open.add(ref);

    void ref.result.then(() => {
      this.open.delete(ref);
      // Deferred a task: the close that settled `result` is still unwinding
      // through the dialog being torn down here.
      setTimeout(() => {
        componentRef.destroy();
        ref.config().afterClose?.();
      });
    });

    return ref;
  }
}
