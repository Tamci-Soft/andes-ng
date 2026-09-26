import {
  computed,
  DOCUMENT,
  effect,
  inject,
  type Signal,
  signal,
} from '@angular/core';

import {
  ANDES_AVATAR_GROUP,
  type AndesAvatarShape,
} from './avatar-group-context';

/** The five fixed size steps; each maps to a box size in avatar.css. */
export type AndesAvatarSizePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Viewport breakpoints for a responsive `size`, with Ant Design's (and
 * Bootstrap's) min-widths: `xs` < 576px <= `sm` < 768px <= `md` < 992px <=
 * `lg` < 1200px <= `xl` < 1600px <= `xxl`. There's no breakpoint token in
 * `@andes-ng/tokens` yet, so they live here.
 */
export type AndesAvatarBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * A size per viewport breakpoint, e.g. `{ xs: 'sm', md: 48, xl: 72 }`.
 *
 * Mobile-first: at a given viewport the avatar uses the value of the largest
 * breakpoint that is both matched and provided, so `{ xs: 24, lg: 64 }` is
 * 24px below 992px and 64px from there up. That's a deliberate improvement on
 * Ant, which only reads the exact current breakpoint's key and falls back to
 * the default size whenever that one key is missing. With no match at all
 * (`{ lg: 64 }` on a phone) the avatar falls back to `md`, same as Ant.
 */
export type AndesAvatarResponsiveSize = Partial<
  Record<AndesAvatarBreakpoint, AndesAvatarSizePreset | number>
>;

/**
 * Everything `size` accepts on `AndesAvatar`, `AndesAvatarGroup` and
 * `AndesAvatarGroupCount`: a preset step, a pixel size, or a responsive map.
 */
export type AndesAvatarSizeInput =
  AndesAvatarSizePreset | number | AndesAvatarResponsiveSize;

/** A size after the responsive map (if any) has been resolved. */
export type AndesAvatarResolvedSize = AndesAvatarSizePreset | number;

const BREAKPOINT_ORDER: readonly AndesAvatarBreakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
];

const BREAKPOINT_MIN_WIDTH: Readonly<Record<AndesAvatarBreakpoint, number>> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

const DEFAULT_SIZE: AndesAvatarSizePreset = 'md';

export function isResponsiveSize(
  size: AndesAvatarSizeInput | undefined,
): size is AndesAvatarResponsiveSize {
  return typeof size === 'object' && size !== null;
}

/**
 * Resolves a `size` input to a single preset or pixel size for the given
 * viewport breakpoint (see `AndesAvatarResponsiveSize` for the cascade).
 * A non-positive or non-finite pixel size falls back to `md` rather than
 * rendering a zero-sized or `NaN`-sized box.
 */
export function resolveAvatarSize(
  size: AndesAvatarSizeInput | undefined,
  breakpoint: AndesAvatarBreakpoint,
): AndesAvatarResolvedSize {
  let resolved: AndesAvatarSizePreset | number | undefined;

  if (isResponsiveSize(size)) {
    for (let i = BREAKPOINT_ORDER.indexOf(breakpoint); i >= 0; i--) {
      const candidate = size[BREAKPOINT_ORDER[i]];
      if (candidate !== undefined) {
        resolved = candidate;
        break;
      }
    }
  } else {
    resolved = size;
  }

  if (resolved === undefined) {
    return DEFAULT_SIZE;
  }
  if (typeof resolved === 'number') {
    return Number.isFinite(resolved) && resolved > 0 ? resolved : DEFAULT_SIZE;
  }
  return resolved;
}

/**
 * Font size for a pixel-sized avatar. Tracks the ratio of the preset steps
 * (`md` is 40px box / 14px text) so a custom size reads the same as the
 * nearest preset, with a floor so tiny avatars keep legible initials - the
 * fallback additionally shrinks overlong text to fit (see
 * AndesAvatarFallback), so this only has to be right for short initials.
 * Also drives the `em`-sized status badge.
 */
export function avatarFontSizeFor(px: number): number {
  return Math.max(10, Math.round(px * 0.35));
}

/**
 * The viewport breakpoint currently matched, tracked with `matchMedia`
 * listeners - but only while `active()` is true, so the overwhelmingly common
 * non-responsive avatar never registers a single listener.
 *
 * Read synchronously on first use (not only from the listener effect), so a
 * responsive avatar renders at the right size on its first paint instead of
 * flashing the `xs` size for one frame. Falls back to `xs` where `matchMedia`
 * doesn't exist (SSR, some test environments).
 *
 * Must be called in an injection context.
 */
export function injectAvatarBreakpoint(
  active: () => boolean,
): Signal<AndesAvatarBreakpoint> {
  const view = inject(DOCUMENT).defaultView;
  const matchMedia =
    view && typeof view.matchMedia === 'function'
      ? view.matchMedia.bind(view)
      : null;
  const changes = signal(0);

  const breakpoint = computed<AndesAvatarBreakpoint>(() => {
    changes();
    if (!matchMedia || !active()) {
      return 'xs';
    }
    for (let i = BREAKPOINT_ORDER.length - 1; i > 0; i--) {
      const name = BREAKPOINT_ORDER[i];
      if (matchMedia(`(min-width: ${BREAKPOINT_MIN_WIDTH[name]}px)`).matches) {
        return name;
      }
    }
    return 'xs';
  });

  effect((onCleanup) => {
    if (!matchMedia || !active()) {
      return;
    }
    const onChange = () => changes.update((value) => value + 1);
    const queries = BREAKPOINT_ORDER.slice(1).map((name) =>
      matchMedia(`(min-width: ${BREAKPOINT_MIN_WIDTH[name]}px)`),
    );
    for (const query of queries) {
      query.addEventListener('change', onChange);
    }
    onCleanup(() => {
      for (const query of queries) {
        query.removeEventListener('change', onChange);
      }
    });
  });

  return breakpoint;
}

/**
 * The size/shape an avatar-shaped box actually renders at, shared by
 * `AndesAvatar` and `AndesAvatarGroupCount` so a `+N` chip always matches the
 * avatars it's stacked against.
 *
 * Precedence follows Ant: the element's own input, then the enclosing
 * `AndesAvatarGroup`'s, then the default (`md`, `circular`). That's why the
 * inputs default to `undefined` rather than `'md'`/`'circular'` - a default
 * value would be indistinguishable from an explicit one and would always
 * shadow the group.
 *
 * Must be called in an injection context.
 */
export function injectAvatarAppearance(
  ownSize: () => AndesAvatarSizeInput | undefined,
  ownShape: () => AndesAvatarShape | undefined,
) {
  const group = inject(ANDES_AVATAR_GROUP, { optional: true });

  const sizeInput = computed(() => ownSize() ?? group?.size());
  const breakpoint = injectAvatarBreakpoint(() =>
    isResponsiveSize(sizeInput()),
  );
  const size = computed(() => resolveAvatarSize(sizeInput(), breakpoint()));
  const shape = computed<AndesAvatarShape>(
    () => ownShape() ?? group?.shape() ?? 'circular',
  );
  /** The preset step, or `null` for a pixel size. */
  const preset = computed(() => {
    const value = size();
    return typeof value === 'number' ? null : value;
  });
  /** The pixel size, or `null` for a preset step (sized by CSS instead). */
  const px = computed(() => {
    const value = size();
    return typeof value === 'number' ? value : null;
  });
  const fontPx = computed(() => {
    const value = px();
    return value === null ? null : avatarFontSizeFor(value);
  });

  return { group, size, shape, preset, px, fontPx };
}
