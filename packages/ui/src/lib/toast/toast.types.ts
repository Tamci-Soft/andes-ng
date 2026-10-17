import type { TemplateRef } from '@angular/core';

/**
 * Visual/semantic status of a toast. `neutral` carries no status color or icon. `loading`
 * shows a spinner - pair it with `duration: false` and a later key-based update (or
 * `AndesToastRef.update()`) to flip it to `success`/`error` once the work settles.
 */
export type AndesToastSeverity =
  'neutral' | 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Corner or edge of the viewport a toast is anchored to. Edge-centered placements are
 * spelled `top-center`/`bottom-center`, corners in kebab-case.
 */
export type AndesToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** Which of the two toast flavors a toast belongs to - full `notification` vs compact `message`. */
export type AndesToastFlavor = 'notification' | 'message';

/**
 * Screen-reader urgency for a toast's announcement: `'alert'` is announced assertively (interrupting), `'status'` politely.
 */
export type AndesToastRole = 'alert' | 'status';

/**
 * Why a toast closed - the value `AndesToastRef.afterClosed` resolves with. `'swipe'` means
 * the user dragged it off screen.
 */
export type AndesToastCloseReason =
  'timeout' | 'close-button' | 'action' | 'overflow' | 'dismissed' | 'swipe';

/** A direction a toast can be dragged off screen in. */
export type AndesToastSwipeDirection = 'top' | 'right' | 'bottom' | 'left';

/** An action button rendered inside a toast. */
export interface AndesToastAction {
  readonly label: string;
  readonly onClick: () => void;
  /**
   * Visual variant for a button in the `actions` group (ignored by the inline `action` and
   * `cancel` buttons, which have fixed compact styles). Default `'outline'`, except the first
   * button of the group, which defaults to `'primary'`.
   */
  readonly variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Whether clicking the button also closes the toast. Default `true`. */
  readonly dismissOnClick?: boolean;
}

/** Context handed to a custom `icon`/`closeIcon`/content template. */
export interface AndesToastTemplateContext {
  readonly $implicit: AndesToast;
}

/**
 * Extra attributes for a toast's root element - meant for `data-*` (e.g. `data-testid`) and
 * `aria-*` hooks. `class` and `style` are ignored here; use `className`/`style`.
 */
export type AndesToastAttributes = Readonly<Record<string, string>>;

/** Inline styles for a toast's root element, as accepted by Angular's `[style]` binding. */
export type AndesToastStyle = Readonly<
  Record<string, string | number | null | undefined>
>;

/** Options accepted by `AndesToastService.show()` and its convenience methods. */
export interface AndesToastConfig {
  /** Optional heading, shown above `message` in a stronger weight. */
  readonly title?: string;
  /**
   * Rich heading content, rendered instead of the plain `title` text. Set `title` too: it
   * stays the text screen readers announce.
   */
  readonly titleTemplate?: TemplateRef<AndesToastTemplateContext>;
  /**
   * The toast's body text. The only required field - it is also what screen readers
   * announce, even when `messageTemplate` renders richer content in its place.
   */
  readonly message: string;
  /**
   * Rich body content (links, formatted values, a list...) rendered instead of the plain
   * `message` text. The template receives the toast as `$implicit`.
   */
  readonly messageTemplate?: TemplateRef<AndesToastTemplateContext>;
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
  /**
   * A single compact action, rendered as a small solid button at the toast's inline end.
   * Clicking it closes the toast (unless `dismissOnClick: false`).
   */
  readonly action?: AndesToastAction;
  /**
   * A secondary compact button rendered before `action` in a quieter, tinted style - e.g.
   * "Cancel" next to "Confirm". Clicking it closes the toast (unless `dismissOnClick: false`).
   */
  readonly cancel?: AndesToastAction;
  /** An action button group, rendered under the message. */
  readonly actions?: readonly AndesToastAction[];
  /** Whether a close button is rendered. Default `true`. */
  readonly dismissible?: boolean;
  /**
   * Custom leading icon. `undefined` uses the severity's built-in icon; `null` hides the
   * icon entirely. The template receives the toast as `$implicit`.
   */
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  /**
   * Custom glyph for the close button (its accessible name stays "Dismiss ..."). `null`
   * hides the close button, same as `dismissible: false`.
   */
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext> | null;
  /**
   * Pause the auto-dismiss countdown while the pointer is over the toast's stack. Default
   * `true`.
   */
  readonly pauseOnHover?: boolean;
  /** Show a bar that drains over the auto-dismiss countdown. Default `false`. */
  readonly showProgress?: boolean;
  /**
   * Tints the whole toast with its severity colour (background and border), instead of the
   * default neutral card where only the icon carries the colour. No effect on `neutral` and
   * `loading`. Default: the flavor's global `richColors` (built-in `false`).
   */
  readonly richColors?: boolean;
  /**
   * Whether a pointer drag (mouse, pen or touch) can fling the toast off screen to dismiss it
   * (closes with reason `'swipe'`). `false` turns the default swiping off; an explicit
   * `swipeDirections` still opts in. Default: on for dismissible toasts.
   */
  readonly swipeToDismiss?: boolean;
  /**
   * Directions the toast can be dragged off screen in. Default: towards the edges it is
   * anchored to (e.g. `['bottom', 'right']` for `bottom-right`) when it is dismissible, none
   * otherwise. `[]` turns swiping off.
   */
  readonly swipeDirections?: readonly AndesToastSwipeDirection[];
  /** Announcement urgency. Default: `'alert'` for `error`, `'status'` for everything else. */
  readonly role?: AndesToastRole;
  /** Extra CSS class(es) for the toast's root element. */
  readonly className?: string;
  /** Inline styles for the toast's root element, e.g. `{ width: '30rem' }`. */
  readonly style?: AndesToastStyle;
  /** Extra `data-*`/`aria-*` attributes for the toast's root element. */
  readonly attributes?: AndesToastAttributes;
  /** Called when the toast body is clicked (not its buttons). Pointer-only. */
  readonly onClick?: (ref: AndesToastRef<AndesToastConfig>) => void;
  /** Called once when the toast closes, for any reason. Not called on a key-based update. */
  readonly onClose?: (reason: AndesToastCloseReason) => void;
}

/** Options accepted by `AndesMessageService.open()` and its convenience methods. */
export interface AndesMessageConfig {
  /** The message text - also what screen readers announce when `contentTemplate` is set. */
  readonly content: string;
  /**
   * Rich content rendered instead of the plain `content` text. The template receives the
   * message as `$implicit`.
   */
  readonly contentTemplate?: TemplateRef<AndesToastTemplateContext>;
  /** Status styling and icon. Default `'info'`. */
  readonly type?: Exclude<AndesToastSeverity, 'neutral'>;
  /** Auto-dismiss delay in ms; `false`/`0` = persistent. Default `3000`. */
  readonly duration?: number | false;
  readonly key?: string;
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  readonly pauseOnHover?: boolean;
  /** Messages have no close button unless this is `true`. Default `false`. */
  readonly dismissible?: boolean;
  /** Custom close glyph; `null` hides the close button. */
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext> | null;
  readonly showProgress?: boolean;
  /** Tints the message with its type colour. Default: the global `richColors` (`false`). */
  readonly richColors?: boolean;
  /** Whether the message can be dragged away to dismiss it. Default `false` (set `swipeDirections` to opt in). */
  readonly swipeToDismiss?: boolean;
  /** Directions the message can be dragged away in. Default: none, unless `dismissible`. */
  readonly swipeDirections?: readonly AndesToastSwipeDirection[];
  readonly role?: AndesToastRole;
  readonly className?: string;
  /** Inline styles for the message's root element. */
  readonly style?: AndesToastStyle;
  /** Extra `data-*`/`aria-*` attributes for the message's root element. */
  readonly attributes?: AndesToastAttributes;
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
  readonly titleTemplate?: TemplateRef<AndesToastTemplateContext>;
  readonly message: string;
  readonly messageTemplate?: TemplateRef<AndesToastTemplateContext>;
  readonly severity: AndesToastSeverity;
  readonly duration: number | false;
  /** Unresolved - `undefined` means "the viewport's default placement". */
  readonly placement?: AndesToastPosition;
  readonly action?: AndesToastAction;
  readonly cancel?: AndesToastAction;
  readonly actions: readonly AndesToastAction[];
  readonly dismissible: boolean;
  readonly icon?: TemplateRef<AndesToastTemplateContext> | null;
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  readonly pauseOnHover: boolean;
  readonly showProgress: boolean;
  readonly richColors: boolean;
  /** `false` turns the default swiping off; an explicit `swipeDirections` still opts in. */
  readonly swipeToDismiss?: boolean;
  /** Unresolved - `undefined` means "towards the placement's edges, if dismissible". */
  readonly swipeDirections?: readonly AndesToastSwipeDirection[];
  readonly role: AndesToastRole;
  readonly className?: string;
  readonly style?: AndesToastStyle;
  readonly attributes?: AndesToastAttributes;
  /** Typed loosely because a message's handle speaks `AndesMessageConfig`, a notification's `AndesToastConfig`. */
  readonly onClick?: (ref: AndesToastRef<never>) => void;
  readonly onClose?: (reason: AndesToastCloseReason) => void;
  readonly createdAt: number;
  /** Bumped by every key-based/`ref.update()` replacement, so the view can restart its progress bar. */
  readonly revision: number;
}

/**
 * Handle returned by every `show()`/`open()`-style call: a close function plus a
 * completion promise in one object. Deliberately not itself a thenable
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

/**
 * Whether/when to collapse a region's toasts into a stacked deck: `true` collapses as soon as
 * two are open, `{ threshold: n }` once more than `n` are open, `false` keeps a plain list.
 */
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
   * closes the oldest open toast instead, so the newest is always shown.
   */
  readonly overflow: AndesToastOverflow;
  readonly pauseOnHover: boolean;
  readonly showProgress: boolean;
  readonly dismissible: boolean;
  readonly closeIcon?: TemplateRef<AndesToastTemplateContext>;
  /**
   * Collapsed deck (newest in front, older ones peeking out behind it), expanded into a list
   * while hovered or focused. Notifications default `true` (collapse from two toasts on),
   * messages `false`.
   */
  readonly stack: AndesToastStackConfig;
  /** How many cards of a collapsed deck stay visible, the front one included. Default `3`. */
  readonly visibleToasts: number;
  /** Space between expanded toasts, and how far each card of a collapsed deck peeks out, in px. Notifications 14, messages 8. */
  readonly gap: number;
  /** Severity-tinted background and border for every toast of this flavor. Default `false`. */
  readonly richColors: boolean;
  /** Default `swipeToDismiss` for every toast of this flavor (see `AndesToastConfig`). */
  readonly swipeToDismiss?: boolean;
  /** Default `swipeDirections` for every toast of this flavor (see `AndesToastConfig`). */
  readonly swipeDirections?: readonly AndesToastSwipeDirection[];
  /**
   * Distance from the viewport edges (number = px). Default 24px for notifications (16px on
   * screens 600px wide or narrower) and 8px from the top for messages.
   */
  readonly offset?: number | string;
  /** Offset from the top edge for top placements (number = px), overriding `offset`. */
  readonly top?: number | string;
  /** Offset from the bottom edge for bottom placements (number = px), overriding `offset`. */
  readonly bottom?: number | string;
  /**
   * Lays each toast's content out right-to-left (icon on the right, close button on the
   * top-right corner, progress
   * draining leftwards) regardless of the page direction. Placements stay physical.
   * Default `false`: toasts follow the inherited `dir`.
   */
  readonly rtl?: boolean;
}

/** Default auto-dismiss delay, in milliseconds, when `AndesToastConfig.duration` is omitted. */
export const ANDES_TOAST_DEFAULT_DURATION = 5000;

/** Default number of toasts `AndesToastViewport` shows at once before queuing the rest. */
export const ANDES_TOAST_DEFAULT_MAX_VISIBLE = 5;

/** Default auto-dismiss delay for `AndesMessageService`: shorter than notifications, as messages are brief. */
export const ANDES_MESSAGE_DEFAULT_DURATION = 3000;

/** Collapse threshold used when `stack` is `true`: a deck as soon as a second toast opens. */
export const ANDES_TOAST_DEFAULT_STACK_THRESHOLD = 1;

/** Default number of cards a collapsed deck shows. */
export const ANDES_TOAST_DEFAULT_VISIBLE_TOASTS = 3;

/** Default space between notifications, in px. */
export const ANDES_TOAST_DEFAULT_GAP = 14;

/** Messages for `promise()`: one per phase, each a string or built from the settled value. */
export interface AndesToastPromiseMessages<T> {
  readonly loading: string;
  readonly success: string | ((value: T) => string);
  readonly error: string | ((error: unknown) => string);
}
