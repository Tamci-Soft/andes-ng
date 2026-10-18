import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';

/** Which box of an element is measured. */
export type AndesElementBox = 'content-box' | 'border-box';

/** A measured width and height, in CSS pixels. */
export interface AndesElementMeasure {
  readonly width: number;
  readonly height: number;
}

/** Options for {@link AndesResizeObserver.observe}. */
export interface AndesResizeObserveOptions {
  /**
   * The box to measure. `content-box` (default) excludes padding and border, which is what a
   * component laying out its children cares about; `border-box` is the space the element takes
   * in its parent.
   */
  readonly box?: AndesElementBox;
}

interface Subscription {
  readonly element: Element;
  readonly callback: (measure: AndesElementMeasure) => void;
  /** Whether the first measurement has already been handed to the callback. */
  delivered: boolean;
  last: AndesElementMeasure | null;
  pending: AndesElementMeasure | null;
  closed: boolean;
}

/** One native observer and the subscriptions behind it. */
interface Channel {
  readonly box: AndesElementBox;
  observer: ResizeObserver | null;
  readonly subscriptions: Map<Element, Set<Subscription>>;
}

function sameMeasure(a: AndesElementMeasure, b: AndesElementMeasure): boolean {
  return a.width === b.width && a.height === b.height;
}

/**
 * Reads the physical width and height of an observed box. `borderBoxSize` reports logical
 * (inline/block) sizes, so in a vertical writing mode they are swapped back; the content box
 * comes from `contentRect`, which is already physical.
 */
function measureEntry(
  entry: ResizeObserverEntry,
  box: AndesElementBox,
): AndesElementMeasure {
  if (box === 'border-box') {
    const size = entry.borderBoxSize?.[0];
    if (size) {
      const mode =
        typeof getComputedStyle === 'function'
          ? getComputedStyle(entry.target).writingMode
          : '';
      const vertical =
        typeof mode === 'string' &&
        (mode.startsWith('vertical') || mode.startsWith('sideways'));
      return vertical
        ? { width: size.blockSize, height: size.inlineSize }
        : { width: size.inlineSize, height: size.blockSize };
    }
    const target = entry.target as HTMLElement;
    if (typeof target.offsetWidth === 'number') {
      return { width: target.offsetWidth, height: target.offsetHeight };
    }
  }
  return {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  };
}

/**
 * One shared `ResizeObserver` (per measured box) for every element Andes watches, instead of
 * each component creating, guarding and disconnecting its own.
 *
 * Why it is shared: a single observer delivers all changes of a frame together, and the
 * bookkeeping that is easy to get wrong in each component (server guard, missing
 * `ResizeObserver`, disconnect on destroy) lives here once. The native observer is created with
 * the first subscription and disconnected with the last, so an idle page holds none.
 *
 * Why it is coalesced: bursts of changes within a frame (a window being dragged, a loop of
 * layout-triggered resizes) are reduced to the latest measurement per subscription and
 * delivered in one animation frame, so consumers write their state once per frame. The first
 * measurement of a subscription is the exception and is delivered at once, otherwise the first
 * paint would show the unmeasured state for an extra frame.
 *
 * It does nothing on the server or where `ResizeObserver` does not exist.
 */
@Injectable({ providedIn: 'root' })
export class AndesResizeObserver {
  private readonly browser = inject(PLATFORM_ID) === 'browser';
  private readonly channels: Record<AndesElementBox, Channel> = {
    'content-box': {
      box: 'content-box',
      observer: null,
      subscriptions: new Map(),
    },
    'border-box': {
      box: 'border-box',
      observer: null,
      subscriptions: new Map(),
    },
  };
  private frame: number | null = null;
  private readonly dirty = new Set<Subscription>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const channel of Object.values(this.channels)) {
        for (const subscriptions of channel.subscriptions.values()) {
          for (const subscription of subscriptions) {
            subscription.closed = true;
          }
        }
        channel.subscriptions.clear();
        channel.observer?.disconnect();
        channel.observer = null;
      }
      this.cancelFrame();
      this.dirty.clear();
    });
  }

  /**
   * Calls `callback` with the element's size now (once the browser reports it) and whenever it
   * changes. Returns the function that stops observing; calling it twice is harmless.
   */
  observe(
    element: Element,
    callback: (measure: AndesElementMeasure) => void,
    options: AndesResizeObserveOptions = {},
  ): () => void {
    if (!this.browser || typeof ResizeObserver === 'undefined') {
      return () => undefined;
    }
    const channel = this.channels[options.box ?? 'content-box'];
    const subscription: Subscription = {
      element,
      callback,
      delivered: false,
      last: null,
      pending: null,
      closed: false,
    };

    channel.observer ??= new ResizeObserver((entries) =>
      this.receive(channel, entries),
    );
    let siblings = channel.subscriptions.get(element);
    if (!siblings) {
      siblings = new Set();
      channel.subscriptions.set(element, siblings);
    } else {
      // The browser only reports an element's size when observation starts, so a late
      // subscriber to an already-watched element restarts it to get its first measurement.
      channel.observer.unobserve(element);
    }
    channel.observer.observe(element, { box: channel.box });
    siblings.add(subscription);

    return () => this.release(channel, subscription);
  }

  private release(channel: Channel, subscription: Subscription): void {
    if (subscription.closed) {
      return;
    }
    subscription.closed = true;
    subscription.pending = null;
    this.dirty.delete(subscription);

    const siblings = channel.subscriptions.get(subscription.element);
    siblings?.delete(subscription);
    if (siblings?.size === 0) {
      channel.subscriptions.delete(subscription.element);
      channel.observer?.unobserve(subscription.element);
    }
    if (channel.subscriptions.size === 0 && channel.observer) {
      channel.observer.disconnect();
      channel.observer = null;
    }
    if (this.dirty.size === 0) {
      this.cancelFrame();
    }
  }

  private receive(channel: Channel, entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const siblings = channel.subscriptions.get(entry.target);
      if (!siblings) {
        continue;
      }
      const measure = measureEntry(entry, channel.box);
      for (const subscription of siblings) {
        if (subscription.last && sameMeasure(subscription.last, measure)) {
          subscription.pending = null;
          this.dirty.delete(subscription);
          continue;
        }
        if (!subscription.delivered) {
          this.deliver(subscription, measure);
        } else {
          subscription.pending = measure;
          this.dirty.add(subscription);
        }
      }
    }
    if (this.dirty.size > 0) {
      this.scheduleFrame();
    }
  }

  private deliver(
    subscription: Subscription,
    measure: AndesElementMeasure,
  ): void {
    subscription.delivered = true;
    subscription.last = measure;
    subscription.pending = null;
    subscription.callback(measure);
  }

  private scheduleFrame(): void {
    if (this.frame !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      this.flush();
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.flush();
    });
  }

  private cancelFrame(): void {
    if (this.frame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frame);
    }
    this.frame = null;
  }

  private flush(): void {
    const batch = [...this.dirty];
    this.dirty.clear();
    for (const subscription of batch) {
      const measure = subscription.pending;
      if (subscription.closed || !measure) {
        continue;
      }
      if (subscription.last && sameMeasure(subscription.last, measure)) {
        subscription.pending = null;
        continue;
      }
      this.deliver(subscription, measure);
    }
  }
}
