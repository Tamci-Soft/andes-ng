import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  PLATFORM_ID,
  untracked,
} from '@angular/core';

import {
  ANDES_WATERMARK_DEFAULT_GAP,
  ANDES_WATERMARK_DEFAULT_ROTATE,
  andesWatermarkTile,
  type AndesWatermarkFont,
  type AndesWatermarkOptions,
} from './watermark-canvas';
import {
  AndesWatermarkOverlay,
  type AndesWatermarkPaint,
} from './watermark-overlay';
import { AndesWatermarkService } from './watermark.service';

export type {
  AndesWatermarkFont,
  AndesWatermarkOptions,
  AndesWatermarkTile,
} from './watermark-canvas';
export type { AndesWatermarkPaint } from './watermark-overlay';

/**
 * Overlays a repeating watermark on its content. The overlay never intercepts the pointer,
 * so the content underneath stays fully interactive, and it is put back if it is removed or
 * edited from outside.
 *
 * ```html
 * <andes-watermark [content]="['Confidential', user.email]">...</andes-watermark>
 * ```
 */
@Component({
  selector: 'andes-watermark',
  template: '<ng-content />',
  styleUrl: './watermark.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'watermark',
    '[attr.data-fullpage]': 'fullPage() ? "" : null',
  },
})
export class AndesWatermark {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly service = inject(AndesWatermarkService);
  private readonly destroyRef = inject(DestroyRef);

  /** Text to repeat; an array draws several lines. */
  readonly content = input<string | readonly string[] | undefined>(undefined);
  /** Image URL to repeat instead of text. */
  readonly image = input<string | undefined>(undefined);
  readonly font = input<AndesWatermarkFont | undefined>(undefined);
  readonly rotate = input(ANDES_WATERMARK_DEFAULT_ROTATE, {
    transform: numberAttribute,
  });
  /** Space between marks, `[horizontal, vertical]` in pixels. */
  readonly gap = input<readonly [number, number]>(ANDES_WATERMARK_DEFAULT_GAP);
  /** Shifts the pattern from the top-start corner, `[x, y]` in pixels. */
  readonly offset = input<readonly [number, number]>([0, 0]);
  readonly width = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  readonly height = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  readonly zIndex = input(9, { transform: numberAttribute });
  /** Lets content rendered outside this element (dialogs, menus) show the same watermark. */
  readonly inherit = input(true, { transform: booleanAttribute });
  /** Covers the whole viewport instead of just this element. */
  readonly fullPage = input(false, { transform: booleanAttribute });

  private overlay: AndesWatermarkOverlay | null = null;
  private overlayParent: HTMLElement | null = null;
  private generation = 0;
  private ready = false;
  private themeObserver: MutationObserver | undefined;

  private readonly options = computed<AndesWatermarkOptions>(() => ({
    content: this.content(),
    image: this.image(),
    font: this.font(),
    rotate: this.rotate(),
    gap: this.gap(),
    offset: this.offset(),
    width: this.width(),
    height: this.height(),
  }));

  constructor() {
    afterNextRender(() => {
      this.ready = true;
      this.watchTheme();
      void this.render();
    });

    effect(() => {
      this.options();
      this.zIndex();
      this.fullPage();
      this.inherit();
      untracked(() => {
        if (this.ready) {
          void this.render();
        }
      });
    });

    this.destroyRef.onDestroy(() => {
      this.generation++;
      this.ready = false;
      this.themeObserver?.disconnect();
      this.overlay?.destroy();
      this.service.revoke(this);
    });
  }

  /** Draws the watermark again, e.g. after a font finished loading. */
  refresh(): void {
    if (this.ready) {
      void this.render();
    }
  }

  private async render(): Promise<void> {
    if (!this.browser) {
      return;
    }
    const run = ++this.generation;
    const el = this.host.nativeElement;
    const doc = el.ownerDocument;
    const style = doc.defaultView?.getComputedStyle(el);
    const tile = await andesWatermarkTile(this.options(), {
      document: doc,
      foreground:
        style?.getPropertyValue('--andes-color-foreground').trim() ||
        style?.color,
      fontFamily: style?.fontFamily,
    });
    // A newer render (or destroy) started while the image loaded: this result is stale.
    if (run !== this.generation) {
      return;
    }
    if (!tile) {
      this.overlay?.destroy();
      this.overlay = null;
      this.overlayParent = null;
      this.service.revoke(this);
      return;
    }
    const paint: AndesWatermarkPaint = {
      url: tile.url,
      width: tile.width,
      height: tile.height,
      offset: this.offset(),
      zIndex: this.zIndex(),
    };
    const fullPage = this.fullPage();
    const parent = fullPage ? doc.body : el;
    if (!this.overlay || this.overlayParent !== parent) {
      this.overlay?.destroy();
      this.overlay = new AndesWatermarkOverlay(parent, doc);
      this.overlayParent = parent;
    }
    this.overlay.paint(paint, fullPage);
    if (this.inherit()) {
      this.service.publish(this, paint);
    } else {
      this.service.revoke(this);
    }
  }

  /** The default colour comes from the theme, so a theme switch redraws the tile. */
  private watchTheme(): void {
    const el = this.host.nativeElement;
    const View = el.ownerDocument.defaultView;
    if (!View?.MutationObserver) {
      return;
    }
    this.themeObserver = new View.MutationObserver(() => this.refresh());
    const options = {
      attributes: true,
      attributeFilter: ['data-andes-theme', 'class'],
    };
    this.themeObserver.observe(el.ownerDocument.documentElement, options);
    const themed = el.closest('[data-andes-theme]');
    if (themed && themed !== el.ownerDocument.documentElement) {
      this.themeObserver.observe(themed, options);
    }
  }
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = numberAttribute(value, Number.NaN);
  return Number.isNaN(parsed) ? undefined : parsed;
}
