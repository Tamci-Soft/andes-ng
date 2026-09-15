/** Visual/semantic status of a toast. `neutral` carries no status color. */
export type AndesToastSeverity =
  'neutral' | 'success' | 'error' | 'warning' | 'info';

/** Corner or edge of the viewport the toast stack is anchored to. */
export type AndesToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** An optional action button rendered inside a toast. */
export interface AndesToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

/** Options accepted by `AndesToastService.show()` and its convenience methods. */
export interface AndesToastConfig {
  /** Optional heading, shown above `message` in a stronger weight. */
  readonly title?: string;
  /** The toast's body text. The only required field. */
  readonly message: string;
  /** Status styling and, by extension, the toast's ARIA role/live politeness. Default `'neutral'`. */
  readonly severity?: AndesToastSeverity;
  /**
   * Auto-dismiss delay in milliseconds. `false` (or `0`/a negative number) disables
   * auto-dismiss entirely, requiring the user or caller to dismiss it. Default `5000`.
   */
  readonly duration?: number | false;
  /** An optional action button. Clicking it invokes `onClick`, then dismisses the toast. */
  readonly action?: AndesToastAction;
  /** Whether a close button is rendered. Default `true`. */
  readonly dismissible?: boolean;
}

/**
 * A toast as tracked by the service and read by `AndesToastViewport` - `show()`'s input
 * config resolved to its concrete defaults, plus the id and creation time.
 */
export interface AndesToast {
  readonly id: string;
  readonly title?: string;
  readonly message: string;
  readonly severity: AndesToastSeverity;
  readonly duration: number | false;
  readonly action?: AndesToastAction;
  readonly dismissible: boolean;
  readonly createdAt: number;
}

/** Default auto-dismiss delay, in milliseconds, when `AndesToastConfig.duration` is omitted. */
export const ANDES_TOAST_DEFAULT_DURATION = 5000;

/** Default number of toasts `AndesToastViewport` shows at once before queuing the rest. */
export const ANDES_TOAST_DEFAULT_MAX_VISIBLE = 5;
