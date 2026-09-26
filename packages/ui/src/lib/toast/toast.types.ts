import type { TemplateRef } from '@angular/core';

/**
 * Visual/semantic status of a toast. `neutral` carries no status color or icon. `loading`
 * shows a spinner - pair it with `duration: false` and a later key-based update (or
 * `AndesToastRef.update()`) to flip it to `success`/`error` once the work settles.
 */
export type AndesToastSeverity =
  'neutral' | 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Corner or edge of the viewport a toast is anchored to. Ant Design's `top`/`bottom`
 * placements are `top-center`/`bottom-center` here; its corner names map 1:1 in kebab-case.
 */
export type AndesToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** Which of the two toast flavors a toast belongs to - Ant's `notification` vs `message`. */
export type AndesToastFlavor = 'notification' | 'message';

/**
 * Screen-reader urgency for a toast's announcement, mirroring Ant Notification's `role`
 * prop: `'alert'` is announced assertively (interrupting), `'status'` politely.
 */
export type AndesToastRole = 'alert' | 'status';

/** Why a toast closed - the value `AndesToastRef.afterClosed` resolves with. */
export type AndesToastCloseReason =
  'timeout' | 'close-button' | 'action' | 'overflow' | 'dismissed';

/** An action button rendered inside a toast. */
export interface AndesToastAction {
  readonly label: string;
  readonly onClick: () => void;
  /**
   * Visual variant for a button in the `actions` group (ignored by the single inline
   * `action`, which always renders as a text link). Default `'outline'`, except the first
   * button of the group, which defaults to `'primary'`.
   */
  readonly variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Whether clicking the button also closes the toast. Default `true`. */
  readonly dismissOnClick?: boolean;
}

/** Context handed to a custom `icon`/`closeIcon` template. */
export interface AndesToastTemplateContext {
  readonly $implicit: AndesToast;
}

/** Options accepted by `AndesToastService.show()` and its convenience methods. */
export interface AndesToastConfig {
  /** Optional heading, shown above `message` in a stronger weight. */
  readonly title?: string;
  /** The toast's body text (Ant Notification's `description`). The only required field. */
  readonly message: string;
  /** Status styling, default icon, and (unless `role` is set) ARIA urgency. Default `'neutral'`. */
  readonly severity?: AndesToastSeverity;
  /**
   * Auto-dismiss delay in milliseconds. `false` (or `0`/a negative number) disables
   * auto-dismiss entirely, requiring the user or caller to dismiss it. Default `5000`
   * (overridable globally via `provideAndesToastConfig()`).
   */
  readonly duration?: number | false;
  /**
   * Identity for update-in-place: showing a toast whose `key` matches one still open
   * replaces that toast's content (same slot, fresh timer, re-announced) instead of adding
   * a second one. `dismiss()`/`destroy()` also accept a key.
   */
  readonly key?: string;
  /** Where this toast renders. Default: the viewport's `position`, then the global `placement`. */
  readonly placement?: AndesToastPosition;
  /** A single compact action, rendered inline as a text link. Clicking it closes the toast. */
  readonly action?: AndesToastAction;
  /** An action button group (Ant's `actions`, formerly `btn`), rendered under the message. */
  readonly actions?: readonly AndesToastAction[];
  /** Whether a close button is rendered (Ant's `closable`). Default `true`. */
  readonly dismissible?: boolean;
  /**
   * Custom leading icon. `undefined` uses the severity's built-in icon; `null` hides the
   * icon entirely. The template receives the toast as `$implicit`.
   */
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  /** Custom glyph for the close button (its accessible name stays "Dismiss ..."). */
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  /** Pause the auto-dismiss countdown while the pointer is over the toast. Default `true`. */
  readonly pauseOnHover?: boolean;
  /** Show a bar that drains over the auto-dismiss countdown. Default `false`. */
  readonly showProgress?: boolean;
  /** Announcement urgency. Default: `'alert'` for `error`, `'status'` for everything else. */
  readonly role?: AndesToastRole;
  /** Extra CSS class(es) for the toast's root element. */
  readonly className?: string;
  /** Called when the toast body is clicked (not its buttons). Pointer-only, like Ant's. */
  readonly onClick?: (ref: AndesToastRef<AndesToastConfig>) => void;
  /** Called once when the toast closes, for any reason. Not called on a key-based update. */
  readonly onClose?: (reason: AndesToastCloseReason) => void;
}

/** Options accepted by `AndesMessageService.open()` - Ant's `message` API, Angular-style. */
export interface AndesMessageConfig {
  /** The message text (Ant's `content`). */
  readonly content: string;
  /** Status styling and icon. Default `'info'`. */
  readonly type?: Exclude<AndesToastSeverity, 'neutral'>;
  /** Auto-dismiss delay in ms; `false`/`0` = persistent. Default `3000`. */
  readonly duration?: number | false;
  readonly key?: string;
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  readonly pauseOnHover?: boolean;
  /** Messages have no close button unless this is `true`. Default `false`. */
  readonly dismissible?: boolean;
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  readonly showProgress?: boolean;
  readonly role?: AndesToastRole;
  readonly className?: string;
  readonly onClick?: (ref: AndesToastRef<AndesMessageConfig>) => void;
  readonly onClose?: (reason: AndesToastCloseReason) => void;
}

/**
 * A toast as tracked by the service and read by `AndesToastViewport` - `show()`'s input
 * config resolved to its concrete defaults, plus the id and creation time.
 */
export interface AndesToast {
  readonly id: string;
  readonly key?: string;
  readonly flavor: AndesToastFlavor;
  readonly title?: string;
  readonly message: string;
  readonly severity: AndesToastSeverity;
  readonly duration: number | false;
  /** Unresolved - `undefined` means "the viewport's default placement". */
  readonly placement?: AndesToastPosition;
  readonly action?: AndesToastAction;
  readonly actions: readonly AndesToastAction[];
  readonly dismissible: boolean;
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  readonly pauseOnHover: boolean;
  readonly showProgress: boolean;
  readonly role: AndesToastRole;
  readonly className?: string;
  /** Typed loosely because a message's handle speaks `AndesMessageConfig`, a notification's `AndesToastConfig`. */
  readonly onClick?: (ref: AndesToastRef<never>) => void;
  readonly onClose?: (reason: AndesToastCloseReason) => void;
  readonly createdAt: number;
  /** Bumped by every key-based/`ref.update()` replacement, so the view can restart its progress bar. */
  readonly revision: number;
}

/**
 * Handle returned by every `show()`/`open()`-style call - the Angular analogue of the
 * thenable/close-function Ant's static methods return. Deliberately not itself a thenable
 * (an `async` function returning it would otherwise silently wait for the toast to close);
 * await `afterClosed` instead.
 */
export interface AndesToastRef<TConfig = AndesToastConfig> {
  readonly id: string;
  readonly key?: string;
  /** Resolves once, with the reason, when the toast closes. */
  readonly afterClosed: Promise<AndesToastCloseReason>;
  /** Closes the toast (reason `'dismissed'`). A no-op once closed. */
  close(): void;
  /** Replaces part of the toast's config in place - same effect as re-showing it by `key`. */
  update(patch: Partial<TConfig>): void;
}

/** Whether/when to collapse a region's toasts into a stacked deck (Ant's `stack`). */
export type AndesToastStackConfig = boolean | { readonly threshold: number };

/** What happens when more than `maxCount` toasts are open at once. */
export type AndesToastOverflow = 'queue' | 'dismiss-oldest';

/** Global defaults for one toast flavor, set via `provideAndesToastConfig()`/`config()`. */
export interface AndesToastGlobalConfig {
  /** Default placement. Notifications: `'bottom-right'`. Messages: always `'top-center'`. */
  readonly placement: AndesToastPosition;
  /** Default auto-dismiss delay in ms (`false` = persistent). Notifications 5000, messages 3000. */
  readonly duration: number | false;
  /** Max toasts shown at once. Notifications 5, messages unlimited. */
  readonly maxCount: number;
  /**
   * `'queue'` (default) holds overflow back until a slot frees up; `'dismiss-oldest'`
   * closes the oldest open toast instead, like Ant's `maxCount`.
   */
  readonly overflow: AndesToastOverflow;
  readonly pauseOnHover: boolean;
  readonly showProgress: boolean;
  readonly dismissible: boolean;
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  /** Collapsed stack, expanded on hover/focus. Default `false`; `true` = `{ threshold: 3 }`. */
  readonly stack: AndesToastStackConfig;
  /** Offset from the top edge for top placements (number = px). Default: `--andes-space-4` (messages 8px). */
  readonly top?: number | string;
  /** Offset from the bottom edge for bottom placements (number = px). Default `--andes-space-4`. */
  readonly bottom?: number | string;
}

/** Default auto-dismiss delay, in milliseconds, when `AndesToastConfig.duration` is omitted. */
export const ANDES_TOAST_DEFAULT_DURATION = 5000;

/** Default number of toasts `AndesToastViewport` shows at once before queuing the rest. */
export const ANDES_TOAST_DEFAULT_MAX_VISIBLE = 5;

/** Default auto-dismiss delay for `AndesMessageService`, matching Ant Message's 3s. */
export const ANDES_MESSAGE_DEFAULT_DURATION = 3000;

/** Collapse threshold used when `stack` is `true`, matching Ant Notification. */
export const ANDES_TOAST_DEFAULT_STACK_THRESHOLD = 3;
