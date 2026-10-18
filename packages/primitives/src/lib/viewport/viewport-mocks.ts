/**
 * Browser APIs that jsdom lacks (`ResizeObserver`, `matchMedia`, a controllable
 * `requestAnimationFrame`), written so specs can drive them and then check nothing was left
 * behind. Test support only: it is not part of the public API.
 */

interface MockEntryInit {
  readonly width: number;
  readonly height: number;
  /** Border-box size as `[inline, block]`; defaults to the content size. */
  readonly border?: readonly [number, number];
}

type Global = Record<string, unknown>;

function define(name: string, value: unknown): () => void {
  const target = globalThis as unknown as Global;
  const had = Object.prototype.hasOwnProperty.call(target, name);
  const previous = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, {
    configurable: true,
    writable: true,
    value,
  });
  return () => {
    if (had && previous) {
      Object.defineProperty(target, name, previous);
    } else {
      delete target[name];
    }
  };
}

/** A `ResizeObserver` whose notifications the test sends by hand. */
export class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly observed = new Map<Element, ResizeObserverOptions | undefined>();
  disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element, options?: ResizeObserverOptions): void {
    this.observed.set(element, options);
  }

  unobserve(element: Element): void {
    this.observed.delete(element);
  }

  disconnect(): void {
    this.observed.clear();
    this.disconnected = true;
  }

  /** Reports a new size for `element`, as the browser would. */
  notify(element: Element, init: MockEntryInit): void {
    const border = init.border ?? [init.width, init.height];
    const entry = {
      target: element,
      contentRect: { width: init.width, height: init.height },
      contentBoxSize: [{ inlineSize: init.width, blockSize: init.height }],
      borderBoxSize: [{ inlineSize: border[0], blockSize: border[1] }],
    } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }

  /** Native observers created and not yet disconnected. */
  static get live(): MockResizeObserver[] {
    return MockResizeObserver.instances.filter((o) => !o.disconnected);
  }

  /** Total elements currently observed across live observers. */
  static get observedCount(): number {
    return MockResizeObserver.live.reduce((n, o) => n + o.observed.size, 0);
  }

  /** Installs the mock as the global `ResizeObserver`; returns the restore function. */
  static install(): () => void {
    MockResizeObserver.instances = [];
    return define('ResizeObserver', MockResizeObserver);
  }
}

/** A hand-cranked `requestAnimationFrame`. */
export class MockAnimationFrames {
  private nextId = 1;
  private readonly queue = new Map<number, FrameRequestCallback>();

  /** Frames requested and neither run nor cancelled. */
  get pending(): number {
    return this.queue.size;
  }

  /** Runs every currently queued frame callback once. */
  flush(): void {
    const batch = [...this.queue.values()];
    this.queue.clear();
    for (const callback of batch) {
      callback(0);
    }
  }

  install(): () => void {
    const restores = [
      define('requestAnimationFrame', (callback: FrameRequestCallback) => {
        const id = this.nextId++;
        this.queue.set(id, callback);
        return id;
      }),
      define('cancelAnimationFrame', (id: number) => {
        this.queue.delete(id);
      }),
    ];
    return () => restores.forEach((restore) => restore());
  }
}

class MockMediaQueryList {
  matches: boolean;
  private readonly listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(
    readonly media: string,
    private readonly owner: MockMatchMedia,
  ) {
    this.matches = owner.evaluate(media);
  }

  addEventListener(
    type: string,
    listener: (event: MediaQueryListEvent) => void,
  ): void {
    if (type === 'change') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(
    type: string,
    listener: (event: MediaQueryListEvent) => void,
  ): void {
    if (type === 'change') {
      this.listeners.delete(listener);
    }
  }

  get listenerCount(): number {
    return this.listeners.size;
  }

  refresh(): void {
    const next = this.owner.evaluate(this.media);
    if (next === this.matches) {
      return;
    }
    this.matches = next;
    const event = { matches: next, media: this.media } as MediaQueryListEvent;
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}

/**
 * A `matchMedia` that answers `min-width` / `max-width` queries from a settable viewport width
 * and any other query from explicit overrides, firing `change` events when answers flip.
 */
export class MockMatchMedia {
  readonly lists: MockMediaQueryList[] = [];
  /** `matchMedia` calls made, to catch redundant lookups. */
  calls = 0;
  private width: number;
  private readonly overrides = new Map<string, boolean>();

  constructor(width = 1024) {
    this.width = width;
  }

  /** Total `change` listeners currently attached across every list. */
  get listenerCount(): number {
    return this.lists.reduce((n, list) => n + list.listenerCount, 0);
  }

  evaluate(query: string): boolean {
    const forced = this.overrides.get(query);
    if (forced !== undefined) {
      return forced;
    }
    const min = /\(min-width:\s*([\d.]+)px\)/.exec(query);
    if (min) {
      return this.width >= Number(min[1]);
    }
    const max = /\(max-width:\s*([\d.]+)px\)/.exec(query);
    if (max) {
      return this.width <= Number(max[1]);
    }
    return false;
  }

  /** Changes the viewport width and notifies the lists whose answer flipped. */
  setWidth(width: number): void {
    this.width = width;
    this.refreshAll();
  }

  /** Forces the answer for one exact query string. */
  setMatches(query: string, matches: boolean): void {
    this.overrides.set(query, matches);
    this.refreshAll();
  }

  private refreshAll(): void {
    for (const list of [...this.lists]) {
      list.refresh();
    }
  }

  /** Installs the mock as `window.matchMedia`; returns the restore function. */
  install(): () => void {
    const matchMedia = (query: string) => {
      this.calls++;
      const list = new MockMediaQueryList(query, this);
      this.lists.push(list);
      return list as unknown as MediaQueryList;
    };
    const target = window as unknown as Global;
    const previous = Object.getOwnPropertyDescriptor(target, 'matchMedia');
    Object.defineProperty(target, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });
    return () => {
      if (previous) {
        Object.defineProperty(target, 'matchMedia', previous);
      } else {
        delete target['matchMedia'];
      }
    };
  }
}
