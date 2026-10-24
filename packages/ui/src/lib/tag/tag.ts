import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesPaletteColor, resolvePaletteColor } from '../palette/palette';

/**
 * The themed presets, each backed by `--andes-color-*` tokens. `processing` and `error` are
 * status-flavored names for `info` and `danger`, matching AndesBadge's `status` values, so a
 * status can feed a tag's `color` directly.
 */
export type AndesTagPresetColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'processing'
  | 'error';
/**
 * A preset, a named palette hue (`red`, `indigo`, `magenta`, ... - themed for light and dark,
 * see palette.css), or any CSS color string (`#722ed1`, `rgb(...)`, `var(--x)`). Palette hues
 * and arbitrary colors share the custom-color block in tag.css, which keeps their text
 * readable in every variant.
 */
// `string & {}` keeps the preset literals in editor autocompletion instead of collapsing the
// whole union to plain `string`.
export type AndesTagColor =
  AndesTagPresetColor | AndesPaletteColor | (string & {});
/** Visual treatment, independent of `color` - `outlined` (border only) is the default look. */
export type AndesTagVariant = 'outlined' | 'filled' | 'solid';

const TAG_PRESETS: readonly string[] = [
  'default',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
];

/** Natively keyboard-focusable elements, plus anything opted in with a tabindex. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Status-flavored aliases, resolved to the preset whose styles they share. */
const TAG_PRESET_ALIASES: Readonly<Record<string, string>> = {
  processing: 'info',
  error: 'danger',
};

/**
 * Emitted by `closed`. Calling `preventDefault()` synchronously inside the handler vetoes the
 * close - it only has an effect with `hideOnClose`, since without it the tag never removes
 * itself anyway (the consumer removes it, or doesn't).
 */
export class AndesTagCloseEvent {
  private prevented = false;

  constructor(readonly originalEvent: MouseEvent) {}

  get defaultPrevented(): boolean {
    return this.prevented;
  }

  preventDefault(): void {
    this.prevented = true;
  }
}

@Component({
  selector: 'andes-tag',
  imports: [NgTemplateOutlet],
  templateUrl: './tag.html',
  styleUrls: ['../palette/palette.css', './tag.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTag {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  readonly color = input<AndesTagColor>('default');
  /**
   * Leading icon as a `TemplateRef`, rendered before any projected `slot=icon` content - the
   * template form suits icons that come from data (e.g. a checkable group's options).
   */
  readonly icon = input<TemplateRef<unknown> | undefined>(undefined);
  readonly variant = input<AndesTagVariant>('outlined');
  /** `false` drops the border, keeping the tag's size unchanged. */
  readonly bordered = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Renders a close button. By default the component never removes the tag itself - handle
   * `closed` (or opt into `hideOnClose`).
   */
  readonly closable = input(false, { transform: booleanAttribute });
  /** Custom close-button content. Setting it implies `closable`. */
  readonly closeIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /**
   * Uncontrolled mode: the tag hides itself after `closed` fires, unless a handler called
   * `preventDefault()` on the event.
   */
  readonly hideOnClose = input(false, { transform: booleanAttribute });
  /**
   * Accessible name of the close button. Left unset it is "Remove {label}", built from the
   * tag's projected label text, so a row of tags doesn't read as a list of identical "Remove"
   * buttons. Setting it replaces the whole name.
   */
  readonly closeAriaLabel = input<string | undefined>(undefined);
  /** Renders the tag as an anchor. Ignored when closable - see tag.html. */
  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  /**
   * A checkable tag toggles its own pressed state on click and renders as a native
   * `<button>` so Enter/Space work with no extra keyboard handling. `color`/`variant` are
   * ignored while checkable - a checkable tag only ever shows its own neutral/checked look, not an arbitrary color. Ignored
   * entirely when closable or `href` is set - see tag.html.
   */
  readonly checkable = input(false, { transform: booleanAttribute });
  /** Two-way bindable: `[(checked)]`. Toggles on its own when left unbound. */
  readonly checked = model(false);
  /** Plain clickable tag (no pressed state) - also renders as a native `<button>`. */
  readonly clickable = input(false, { transform: booleanAttribute });

  readonly closed = output<AndesTagCloseEvent>();
  readonly tagClick = output<MouseEvent>();

  /** `model()` has no `transform`, so a bare `checked` attribute arrives as `''`. */
  protected readonly isChecked = computed(() =>
    booleanAttribute(this.checked()),
  );

  protected readonly dismissed = signal(false);

  private readonly closableTag =
    viewChild<ElementRef<HTMLElement>>('closableTag');
  /** The closable tag's label as rendered - see the constructor. */
  private readonly labelText = signal('');

  protected readonly closeLabel = computed(() => {
    const label = this.labelText();
    return this.closeAriaLabel() ?? (label ? `Remove ${label}` : 'Remove');
  });

  constructor() {
    // Projected content isn't a signal, so the label is read back from the DOM after each
    // render. Re-setting an unchanged string is a no-op, so this only costs an extra pass when
    // the label text actually changes.
    afterEveryRender(() => {
      const tag = this.closableTag()?.nativeElement;
      this.labelText.set(tag ? labelTextOf(tag) : '');
    });
  }

  protected readonly isClosable = computed(
    () => this.closable() || !!this.closeIcon(),
  );

  protected readonly isLink = computed(
    () => !!this.href() && !this.isClosable(),
  );

  protected readonly isInteractive = computed(
    () =>
      (this.checkable() || this.clickable()) &&
      !this.isClosable() &&
      !this.isLink(),
  );

  /** The preset `color` names (aliases resolved), or `null` for a palette hue / CSS color. */
  private readonly presetColor = computed(() => {
    const color = this.color() || 'default';
    const resolved = TAG_PRESET_ALIASES[color] ?? color;
    return TAG_PRESETS.includes(resolved) ? resolved : null;
  });

  /**
   * Palette hue or arbitrary CSS color from `color`, applied through `--andes-tag-color` - a
   * palette name as its themed custom property, anything else raw.
   */
  protected readonly customColor = computed(() => {
    const color = this.color();
    if (!color || this.presetColor()) {
      return null;
    }
    return resolvePaletteColor(color) ?? color;
  });

  protected readonly classes = computed(() => {
    const skipColorAndVariant = this.checkable();
    return clsx(
      'andes-tag',
      !skipColorAndVariant &&
        (this.customColor()
          ? 'andes-tag--color-custom'
          : `andes-tag--color-${this.presetColor()}`),
      !skipColorAndVariant && `andes-tag--${this.variant()}`,
      // Outlined/filled custom colors derive their text from the color itself (tag.css); a
      // separate class, not a `:not(.andes-tag--solid)`, keeps those rules from ever
      // competing on specificity with solid's black/white rule.
      !skipColorAndVariant &&
        this.customColor() &&
        this.variant() !== 'solid' &&
        'andes-tag--custom-tinted',
      !this.bordered() && 'andes-tag--borderless',
      this.isClosable() && 'andes-tag--closable',
      this.isInteractive() && 'andes-tag--interactive',
      this.checkable() && 'andes-tag--checkable',
      this.checkable() && this.isChecked() && 'andes-tag--checked',
      this.disabled() && 'andes-tag--disabled',
    );
  });

  protected onTagClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }

    this.tagClick.emit(event);

    if (this.checkable()) {
      this.checked.set(!this.isChecked());
    }
  }

  protected onClose(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    const closeEvent = new AndesTagCloseEvent(event);
    this.closed.emit(closeEvent);
    if (this.hideOnClose() && !closeEvent.defaultPrevented) {
      this.moveFocusOffTag();
      this.dismissed.set(true);
    }
  }

  /**
   * Removing the tag removes its focused close button, which would drop focus to <body>. Move
   * it to the next tabbable element after the tag in DOM order - in a row of closable tags,
   * the next tag's close button - else the previous one.
   */
  private moveFocusOffTag(): void {
    const host = this.host.nativeElement;
    if (!host.contains(this.document.activeElement)) return;

    const candidates = Array.from(
      this.document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !host.contains(el) && isTabbable(el));
    const next = candidates.find(
      (el) =>
        host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const previous = candidates
      .filter(
        (el) =>
          host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING,
      )
      .at(-1);
    (next ?? previous)?.focus();
  }
}

function isTabbable(el: HTMLElement): boolean {
  if (el.tabIndex < 0 || el.closest('[hidden], [inert]')) return false;
  // Catches `display: none` / `visibility: hidden` where layout exists (not in SSR or jsdom).
  return typeof el.checkVisibility !== 'function' || el.checkVisibility();
}

/** The tag's label text, leaving out the close button, the icon slot and hidden decoration. */
function labelTextOf(tag: HTMLElement): string {
  // Non-element nodes are kept only if they are text - not the comment anchors Angular leaves
  // around projected content.
  return Array.from(tag.childNodes)
    .filter((node) =>
      node instanceof Element
        ? !node.matches('.andes-tag__close, [slot=icon], [aria-hidden="true"]')
        : node.nodeType === Node.TEXT_NODE,
    )
    .map((node) => node.textContent ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
