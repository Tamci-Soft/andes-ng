import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { AndesDropdownMenuContent } from '../dropdown-menu/dropdown-menu-content';
import { AndesDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';
import { AndesDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';

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
 * One crumb hidden behind an `AndesBreadcrumbEllipsis`, as passed to its `items` input.
 *
 * Deliberately a plain data shape rather than projected markup: the crumbs behind a "..." are by
 * definition the ones the trail had no room to render, so the caller already holds them as data
 * (a route array, an Ant-Design-style `items` list) and would otherwise have to re-author each of
 * them as a `<andes-dropdown-menu-item>` by hand.
 */
export interface AndesBreadcrumbEllipsisItem {
  /** Visible text of the hidden crumb. */
  readonly label: string;
  /**
   * Target of the hyperlink. When set, the menu entry renders an `<a andesBreadcrumbLink>` so the
   * crumb keeps real link semantics (middle-click, "copy link address", browser status bar);
   * when omitted, the entry is text-only and navigation is left to `(itemSelected)`.
   */
  readonly href?: string;
  /** Whether the entry is present but not selectable. */
  readonly disabled?: boolean;
}

/**
 * A collapsed-state indicator for long trails, meant to sit inside an `andesBreadcrumbItem`
 * (`<li andesBreadcrumbItem><andes-breadcrumb-ellipsis /></li>`) - visually a "more" icon with
 * `sr-only` text.
 *
 * It has two modes, and which one applies is decided entirely by whether `items` is non-empty, so
 * the interactive mode is purely additive - existing `<andes-breadcrumb-ellipsis />` usages keep
 * rendering byte-for-byte the DOM they did before:
 *
 * - **Static (default, `items` empty).** A decorative glyph: `role="presentation"` /
 *   `aria-hidden="true"` on the host make the whole thing invisible to assistive tech (so the
 *   `sr-only` text is not exposed either), matching the upstream shadcn/ui source exactly. This is
 *   still the right mode when the consumer wants to wrap the ellipsis in their OWN
 *   `[andesDropdownMenuTrigger]` and author the menu themselves - shadcn's own
 *   `BreadcrumbItem` + `DropdownMenu` + `BreadcrumbEllipsis` composition, which keeps working
 *   unchanged.
 * - **Interactive (`items` non-empty).** The glyph becomes the trigger of an `AndesDropdownMenu`
 *   listing the hidden crumbs, which is shadcn's documented "Breadcrumb with Dropdown Menu"
 *   pattern with the boilerplate folded in. The decorative `role`/`aria-hidden` are dropped (a
 *   focusable control inside an `aria-hidden` subtree is exactly the "hidden but focusable" error
 *   axe flags), and the `sr-only` text becomes the trigger's accessible name.
 *
 * The dropdown is deliberately assembled from the public `AndesDropdownMenu` parts rather than a
 * bespoke popup: dismissal (Escape, outside click), positioning, focus return to the trigger and
 * arrow-key/typeahead navigation all come from the shared `@andes-ng/primitives` overlay + listbox
 * primitives that component already wires together, so Breadcrumb adds no behavior of its own -
 * consistent with the research guide's finding that Breadcrumb itself needs no behavior primitive.
 *
 * @example Interactive - the ellipsis owns the menu
 * <li andesBreadcrumbItem>
 *   <andes-breadcrumb-ellipsis [items]="hiddenCrumbs" (itemSelected)="go($event)" />
 * </li>
 */
@Component({
  selector: 'andes-breadcrumb-ellipsis',
  imports: [
    NgTemplateOutlet,
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesBreadcrumbLink,
  ],
  template: `
    @if (hasMenu()) {
      <andes-dropdown-menu>
        <button
          type="button"
          class="andes-breadcrumb-ellipsis__trigger"
          andesDropdownMenuTrigger
        >
          <ng-container [ngTemplateOutlet]="glyph" />
          <span class="andes-breadcrumb-ellipsis__sr-only">{{ label() }}</span>
        </button>
        <andes-dropdown-menu-content>
          @for (item of items(); track $index) {
            <!-- The two branches differ only by the inner anchor, but cannot be collapsed into
                 one item with a conditional child: a template reference variable declared inside
                 an @if block is scoped to that block, so #anchor would be out of scope for the
                 (activated) binding if that binding sat on a shared parent outside it. -->
            @if (item.href) {
              <andes-dropdown-menu-item
                [disabled]="item.disabled ?? false"
                [typeaheadLabel]="item.label"
                (activated)="onItemActivated(item, anchor)"
              >
                <a
                  #anchor
                  andesBreadcrumbLink
                  class="andes-breadcrumb-ellipsis__menu-link"
                  tabindex="-1"
                  [href]="item.href"
                  (click)="onAnchorClick()"
                  >{{ item.label }}</a
                >
              </andes-dropdown-menu-item>
            } @else {
              <andes-dropdown-menu-item
                [disabled]="item.disabled ?? false"
                [typeaheadLabel]="item.label"
                (activated)="onItemActivated(item)"
              >
                {{ item.label }}
              </andes-dropdown-menu-item>
            }
          }
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    } @else {
      <ng-container [ngTemplateOutlet]="glyph" />
      <span class="andes-breadcrumb-ellipsis__sr-only">{{ label() }}</span>
    }

    <!-- The glyph lives in a template rather than being written out in both branches above
         because it wraps the component's single ng-content: two ng-content elements with the
         same (default) selector do NOT each get a copy of the projected nodes - the first one in
         template order silently wins, even when @if means it is the branch that never renders. A
         template instantiated from exactly one live branch has no such ambiguity. -->
    <ng-template #glyph>
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
    </ng-template>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // See the file-level comment above `AndesBreadcrumb` for why breadcrumb.css needs this.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-breadcrumb-ellipsis',
    // Decorative only while there is nothing to open - see the class comment. `null` removes the
    // attribute entirely rather than writing `role=""`/`aria-hidden="false"`.
    '[attr.role]': 'hasMenu() ? null : "presentation"',
    '[attr.aria-hidden]': 'hasMenu() ? null : true',
  },
})
export class AndesBreadcrumbEllipsis {
  /**
   * The crumbs collapsed behind this "...". Empty (the default) keeps the historical static,
   * non-interactive glyph; anything else turns it into a dropdown menu trigger.
   */
  readonly items = input<readonly AndesBreadcrumbEllipsisItem[]>([]);

  /**
   * Accessible name of the trigger, and the `sr-only` text of the static glyph. Defaults to
   * `'More'` (the upstream shadcn/ui wording); override it for localization, the same way
   * `AndesBreadcrumb`'s own `aria-label` is overridden.
   */
  readonly label = input('More');

  /** Emits the hidden crumb that was activated, by click, Enter or Space. */
  readonly itemSelected = output<AndesBreadcrumbEllipsisItem>();

  protected readonly hasMenu = computed(() => this.items().length > 0);

  /**
   * A real pointer click lands on the inner `<a>` first and navigates natively; the SAME click
   * then bubbles to the `role="menuitem"` host, whose own handler fires `activated`. Recording the
   * anchor hit here is what stops `onItemActivated` from synthesizing a second click on an anchor
   * the browser is already following (which a router directive would see as a duplicate
   * navigation). Keyboard activation never sets it - focus sits on the menu item, not the anchor.
   */
  private anchorHandledClick = false;

  protected onAnchorClick(): void {
    this.anchorHandledClick = true;
  }

  protected onItemActivated(
    item: AndesBreadcrumbEllipsisItem,
    anchor?: HTMLAnchorElement,
  ): void {
    this.itemSelected.emit(item);

    if (this.anchorHandledClick) {
      this.anchorHandledClick = false;
      return;
    }

    // Enter/Space on the focused menu item: forward the activation to the anchor so the crumb
    // navigates exactly as a click on it would, including through whatever router directive the
    // consumer put on it. Runs before `AndesDropdownMenuItem` closes the menu, so the anchor is
    // still in the DOM.
    anchor?.click();
  }
}
