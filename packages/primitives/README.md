# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Viewport

Signals for "how big is it" and "what does the environment prefer", with the server guard, the missing-API guard and the teardown written once. Everything is a no-op on the server and where `ResizeObserver` / `matchMedia` do not exist, and every listener is removed with the owning injector.

| API                                                                                                      | Answers                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `andesElementSize(target, options?)`                                                                     | An element's `width`, `height` (and `size`, `measured`) as signals.                                  |
| `andesContainerBreakpoint(target, buckets, options?)`                                                    | Which named width bucket an element currently falls in.                                              |
| `andesMediaQuery(query, options?)`                                                                       | Whether a media query matches.                                                                       |
| `andesPrefersReducedMotion()`, `andesPrefersDark()`, `andesPrefersContrast()`                            | Ready-made user-preference queries.                                                                  |
| `AndesBreakpoints`                                                                                       | The viewport breakpoint (`active`) and `up(name)`, `down(name)`, `between(from, to)` signals.        |
| `ANDES_BREAKPOINTS`, `ANDES_BREAKPOINT_NAMES`, `andesBreakpointForWidth`, `ANDES_BREAKPOINT_SSR_DEFAULT` | The shared breakpoint table (`xs 0`, `sm 576`, `md 768`, `lg 992`, `xl 1200`, `xxl 1600`).           |
| `AndesResizeObserver`                                                                                    | The shared observer behind `andesElementSize`, for callers that need a callback instead of a signal. |

```ts
@Component({
  selector: 'app-chart',
  template: `
    <div #frame><canvas [attr.width]="size.width()"></canvas></div>
    @if (!reducedMotion()) {
      <app-sparkle />
    }
    @if (isMobile()) {
      <app-drawer-toggle />
    }
  `,
})
export class Chart {
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

  // Re-observes if `frame` is re-created; stops with the component.
  protected readonly size = andesElementSize(this.frame);

  // Collapses on the element's own width, not the window's.
  protected readonly layout = andesContainerBreakpoint(
    this.frame,
    { compact: 0, full: 480 },
    { initial: 'full' },
  );

  protected readonly reducedMotion = andesPrefersReducedMotion();
  protected readonly isMobile = inject(AndesBreakpoints).down('md');
}
```

Behavior worth knowing:

- **One observer, one write per frame.** All elements share a native `ResizeObserver` (created with the first subscription, disconnected with the last). Bursts of changes are reduced to the latest size and delivered in one animation frame; the very first measurement is delivered immediately so the first paint is already correct.
- **`measured` vs. the `initial` size.** Before the browser reports a size (and always on the server) the signals hold `options.initial` (`0 x 0` by default). `measured()` tells a real zero from "not measured yet", and is reset when the element goes away or is swapped.
- **Breakpoint comparisons are half-open.** `up('md')` is true from 768px; `down('md')` is true strictly below it, so `down(x)` is always `!up(x)` and `between('sm', 'lg')` includes `sm` and excludes `lg`. Chained `between` ranges neither overlap nor leave gaps.
- **Server default.** Without a viewport, `AndesBreakpoints.active` is `ANDES_BREAKPOINT_SSR_DEFAULT` (`lg`); override the token to match your most common client. `andesMediaQuery` takes an `ssrDefault`.
- **Container buckets** map a name to the minimum width where it starts (the same shape as `ANDES_BREAKPOINTS`), and the signal changes only when a threshold is crossed. Pass a signal of buckets when the thresholds come from inputs.
- `andesMediaQuery` accepts a `Signal<string>` for queries that depend on an input and moves its listener when the query changes. Each call owns one listener; use `AndesBreakpoints` for viewport widths, which is shared by the whole application.

### Which components should adopt this

Paths are in `packages/ui/src/lib/`.

Element size (`andesElementSize` / `AndesResizeObserver`), replacing a hand-written `new ResizeObserver` with its `typeof ResizeObserver` guard and `disconnect()`:

- `alert/alert.ts`: marquee track width (`track.offsetWidth` into `marqueeDistance`).
- `avatar/avatar-fallback.ts`: host and text width, to scale the fallback text to fit.
- `descriptions/descriptions.ts`: host width (`getBoundingClientRect().width`) to pick the column count.
- `steps/steps.ts`: host width against `breakpoint()` to switch to the narrow layout (a good fit for `andesContainerBreakpoint`).
- `grid/grid-row.ts`: the container breakpoint (`andesBreakpointForWidth` over `contentRect.width`); becomes `andesContainerBreakpoint(host, ANDES_BREAKPOINTS)`.
- `scroll-area/scroll-area.ts`: viewport and content boxes, to re-measure the scrollbars.
- `collapsible/collapsible-content.ts`: inner `scrollHeight`, to publish the content height variable.
- `masonry/masonry.ts`: host width, to re-run the layout (its own `requestAnimationFrame` coalescing and `window` resize listener also go away).
- `splitter/splitter.ts`: host size, to re-layout panels.
- `table/table.ts`, `card/card.ts`, `tabs/tabs.ts`, `menu/menu.ts`, `segmented/segmented.ts`: container, strip, nav and option sizes, to recompute scroll edges, fades, overflow and the thumb.
- `textarea/textarea.ts`: width/height deduped by hand against the last size (the primitive already de-duplicates).
- `select/select-trigger.ts`, `toast/toast-item.ts`, `spinner/spin.ts`, `typography/typography-base.ts`, `affix/affix.ts`: box, row, scroller and host sizes feeding re-positioning or truncation.
- `tooltip/tooltip.ts`, `hover-card/hover-card.ts`, `popover/popover-base.ts`, `tour/tour.ts`, `navigation-menu/navigation-menu.ts`: observe the floating panel or target to re-position; use `AndesResizeObserver.observe` with a callback.

Media queries (`andesMediaQuery` and the preference helpers), replacing `matchMedia` + `addEventListener('change')` + `removeEventListener`:

- `andesPrefersReducedMotion()`: `button/button.ts`, `carousel/carousel.ts` (kept in sync today), `alert/alert.ts`, `anchor/anchor.ts`, `masonry/masonry.ts`, `scroll-area/scroll-area.ts`, `statistic/countdown.ts`, `float-button/back-top.ts`, `tour/tour.ts`, `navigation-menu/navigation-menu.ts`. Most read it once with a bare `matchMedia(...)` call (some without a guard) and never update.
- `andesMediaQuery` with a width query: `pagination/pagination.ts` (`(max-width: 575.98px)`; better as `AndesBreakpoints.down('sm')`), `navigation-menu/navigation-menu.ts` (`(max-width: <mobileBreakpoint>px)` in an effect), `layout/sidebar-provider.ts` and `layout/layout-sider.ts` (`max-width: <breakpoint>px` below-breakpoint tests; `down(name)`).

Breakpoints (`AndesBreakpoints`, `ANDES_BREAKPOINTS`): `grid/breakpoints.ts` (its `AndesBreakpointService`, `ANDES_BREAKPOINTS` and `andesBreakpointForWidth` move here), `avatar/avatar-size.ts` (`injectAvatarBreakpoint` registers its own queries per avatar), and every consumer of `AndesBreakpointService.atLeast(name)` (`up(name)`).
