import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Breadcrumb is a compound set of small parts that communicate purely through DOM nesting and
 * content projection - there is no shared state or behavior between them (no focus trap, no
 * open/close state, no roving tabindex), so unlike `AndesButton` none of this needs a behavior
 * primitive from `@andes-ng/primitives`.
 *
 * Only the root (`AndesBreadcrumb`) and the optional collapse indicator (`AndesBreadcrumbEllipsis`)
 * are full `@Component`s with their own element selector - a component always renders its own tag
 * as the DOM node, and `AndesBreadcrumb` needs somewhere to own the shared stylesheet the way
 * `AndesButton` owns `button.css`. Every part that has to be a specific native list element
 * (`andesBreadcrumbList`, `andesBreadcrumbItem`, `andesBreadcrumbLink`, `andesBreadcrumbPage`,
 * `andesBreadcrumbSeparator`) is instead a plain attribute directive on that native tag (`ol`,
 * `li`, `a`, `span`) - the same technique `AndesButtonPrimitive` uses for `button`/`a`. That
 * matters more here than usual: an intervening custom-element wrapper between `<ol>` and `<li>`
 * would still look right but breaks the list/listitem relationship assistive tech relies on
 * (axe's "list" rule flags any `<ol>`/`<ul>` child that isn't an `<li>`, regardless of CSS) -
 * directives avoid that entirely, since the rendered DOM is exactly the tags the author wrote.
 *
 * That same directive-on-consumer-markup technique breaks Angular's default emulated view
 * encapsulation for `breadcrumb.css`: emulated encapsulation only rewrites a stylesheet's
 * selectors to match elements carrying ITS OWN component's `_ngcontent-*`/`_nghost-*` attribute,
 * and the `<ol>`/`<li>`/`<a>`/`<span>` these directives attach to are declared in the CONSUMER's
 * template, projected in via `<ng-content>` - they never carry `AndesBreadcrumb`'s attribute (a
 * `:host(...)` selector cannot reach them either, since `:host()` only ever matches an actual
 * component host element, and none of these directive-hosted elements are one). Unlike
 * `AndesCard`/`AndesRadioGroup`, where every styled part is its own `@Component` and `:host()`
 * therefore works, most of Breadcrumb's parts must stay directives (see above), so the only way
 * for `breadcrumb.css` to reach them at all is to opt the two `@Component`s that own that
 * stylesheet (`AndesBreadcrumb`, `AndesBreadcrumbEllipsis`) out of scoping entirely via
 * `encapsulation: ViewEncapsulation.None` - the plain class selectors in `breadcrumb.css` then
 * match by class name globally, the same way they would in a hand-written global stylesheet.
 */

/**
 * Root of a breadcrumb trail. Renders a `<nav>` landmark, defaulting `aria-label` to
 * `"breadcrumb"` per the ARIA Authoring Practices convention shadcn/ui and Ant Design both
 * follow; override it for localization (e.g. `aria-label="Ruta de navegación"`).
 *
 * @example
 * <andes-breadcrumb>
 *   <ol andesBreadcrumbList>
 *     <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
 *     <li andesBreadcrumbSeparator></li>
 *     <li andesBreadcrumbItem><span andesBreadcrumbPage>Settings</span></li>
 *   </ol>
 * </andes-breadcrumb>
 */
@Component({
  selector: 'andes-breadcrumb',
  template: `
    <nav [attr.aria-label]="ariaLabel()">
      <ng-content></ng-content>
    </nav>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // See the class-level comment above for why this can't be the (default) Emulated mode.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-breadcrumb',
    // The `aria-label` input is forwarded onto the real `<nav>` in the template below. Without
    // this, Angular would ALSO write the same static/bound value onto this host element (any
    // attribute matching an input's alias lands on both), producing two elements in the a11y
    // tree with the same accessible name - the same pitfall `AndesButton` avoids for its own
    // ARIA inputs (see button.ts).
    '[attr.aria-label]': 'null',
  },
})
export class AndesBreadcrumb {
  readonly ariaLabel = input('breadcrumb', { alias: 'aria-label' });
}

/** The `<ol>` that lays out crumbs in a row and wraps them on overflow. */
@Directive({
  selector: 'ol[andesBreadcrumbList]',
  host: { class: 'andes-breadcrumb-list' },
})
export class AndesBreadcrumbList {}

/** An `<li>` wrapping one crumb - a link, the current page, a separator, or an ellipsis. */
@Directive({
  selector: 'li[andesBreadcrumbItem]',
  host: { class: 'andes-breadcrumb-item' },
})
export class AndesBreadcrumbItem {}

/**
 * The clickable `<a>` for a non-current crumb. A plain styling attribute, deliberately not a
 * polymorphic primitive - apply it directly to a router's own anchor (e.g. `routerLink`) the same
 * way `andesButtonPrimitive` attaches to a plain `<a>`.
 */
@Directive({
  selector: 'a[andesBreadcrumbLink]',
  host: { class: 'andes-breadcrumb-link' },
})
export class AndesBreadcrumbLink {}

/**
 * A non-interactive `<span>` representing the current/last crumb. Carries `role="link"`,
 * `aria-disabled="true"` and `aria-current="page"` so it visually matches the rest of the trail
 * while assistive tech still gets an explicit "this is where you are" signal - the accessibility
 * pitfall the research guide flags Ant Design's own docs for not documenting.
 */
@Directive({
  selector: 'span[andesBreadcrumbPage]',
  host: {
    class: 'andes-breadcrumb-page',
    role: 'link',
    '[attr.aria-disabled]': 'true',
    '[attr.aria-current]': "'page'",
  },
})
export class AndesBreadcrumbPage {}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * An `<li role="presentation" aria-hidden="true">` divider between items. Renders a default
 * chevron icon; give it static children (an icon, `/`, `>`, etc.) to override it.
 *
 * A plain `@Directive` has no template of its own to project into, so the default icon is
 * inserted imperatively via `Renderer2` - the same technique `AndesButton` already uses for its
 * ripple - only when the host is still empty after the first render, so an author-provided
 * separator is never touched.
 */
@Directive({
  selector: 'li[andesBreadcrumbSeparator]',
  host: {
    class: 'andes-breadcrumb-separator',
    role: 'presentation',
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesBreadcrumbSeparator {
  private readonly elementRef = inject(ElementRef<HTMLLIElement>);
  private readonly renderer = inject(Renderer2);

  constructor() {
    afterNextRender(() => {
      const host = this.elementRef.nativeElement;
      if (host.childNodes.length > 0) {
        return;
      }

      const svg = this.renderer.createElement('svg', SVG_NS);
      this.renderer.setAttribute(
        svg,
        'class',
        'andes-breadcrumb-separator__icon',
      );
      this.renderer.setAttribute(svg, 'viewBox', '0 0 24 24');
      this.renderer.setAttribute(svg, 'fill', 'none');
      this.renderer.setAttribute(svg, 'stroke', 'currentColor');
      this.renderer.setAttribute(svg, 'stroke-width', '2');
      this.renderer.setAttribute(svg, 'stroke-linecap', 'round');
      this.renderer.setAttribute(svg, 'stroke-linejoin', 'round');
      // Explicit size, not left to `.andes-breadcrumb-separator__icon` in breadcrumb.css alone:
      // an unsized `<svg>` is a replaced element that falls back to the browser's default
      // replaced-element size (~300x150px) the instant it renders, before any stylesheet has
      // necessarily been applied - setting it here guarantees the icon is never briefly (or, if
      // the stylesheet somehow failed to load, permanently) oversized.
      this.renderer.setAttribute(svg, 'width', '14');
      this.renderer.setAttribute(svg, 'height', '14');

      const path = this.renderer.createElement('path', SVG_NS);
      this.renderer.setAttribute(path, 'd', 'm9 18 6-6-6-6');

      this.renderer.appendChild(svg, path);
      this.renderer.appendChild(host, svg);
    });
  }
}

/**
 * A collapsed-state indicator for long trails, meant to sit inside an `andesBreadcrumbItem`
 * (`<li andesBreadcrumbItem><andes-breadcrumb-ellipsis /></li>`) - visually a "more" icon with
 * `sr-only` text, meant to be composed with a future dropdown-menu component to expand the hidden
 * middle crumbs, not a component with its own dropdown logic (per the research guide, neither
 * shadcn/ui nor Ant Design gives it one). `role="presentation"`/`aria-hidden="true"` on the host
 * make the whole thing decorative, so the `sr-only` text is not currently exposed to assistive
 * tech either - matching the upstream shadcn/ui source exactly; a real accessible name belongs on
 * whatever interactive trigger wraps this later.
 */
@Component({
  selector: 'andes-breadcrumb-ellipsis',
  template: `
    <ng-content>
      <svg
        class="andes-breadcrumb-ellipsis__icon"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    </ng-content>
    <span class="andes-breadcrumb-ellipsis__sr-only">More</span>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // See the file-level comment above `AndesBreadcrumb` for why breadcrumb.css needs this.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-breadcrumb-ellipsis',
    role: 'presentation',
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesBreadcrumbEllipsis {}
