import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import {
  ANDES_IMAGE_GROUP,
  type AndesImageGroupMember,
} from './image-group-context';
import { AndesImageIcon } from './image-icon';
import { AndesImagePreview } from './image-preview';
import {
  normalizePreviewInput,
  resolveImageLabels,
  type AndesImageLabels,
  type AndesImagePreviewConfig,
  type AndesImagePreviewItem,
  type AndesImageTransformEvent,
} from './image-types';

/** Loading state of the thumbnail, mirrored on `data-state`. */
export type AndesImageStatus = 'loading' | 'loaded' | 'error';

/** How the picture fills its box; the CSS `object-fit` values. */
export type AndesImageFit =
  'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

/**
 * What shows while the image loads: `true` / `'skeleton'` a slow shimmer, `'blur'` the
 * `placeholderSrc` thumbnail blurred, or a template for anything else.
 */
export type AndesImagePlaceholder =
  boolean | 'skeleton' | 'blur' | TemplateRef<unknown>;

function toCssLength(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * A picture with loading and failure states and an optional full-viewport preview.
 *
 * It wraps a native `<img>`: `src`, `alt`, `width`/`height`, `loading` (lazy by default),
 * `srcset`/`sizes` and `crossOrigin` go straight through. While it loads it can show a
 * `placeholder`; if it fails it swaps in `fallback`, and shows a neutral error box when
 * that fails too.
 *
 * With `preview` (on by default) the thumbnail gets a button covering it - a hover label
 * ("Preview", or your own `mask`) - that opens a modal viewer with zoom, rotate, flip,
 * reset, download and drag-to-pan. Put several images in an `andes-image-group` and the
 * viewer steps through all of them.
 *
 * ```html
 * <andes-image src="/photos/harbour.jpg" alt="Harbour at dusk" [width]="240" [height]="160" />
 * ```
 */
@Component({
  selector: 'andes-image',
  imports: [AndesImageIcon, AndesImagePreview, NgTemplateOutlet],
  templateUrl: './image.html',
  styleUrl: './image.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"image"',
    '[attr.data-state]': 'status()',
    '[attr.data-preview]': 'previewConfig() ? "" : null',
    '[style.width]': 'cssWidth()',
    '[style.height]': 'cssHeight()',
  },
})
export class AndesImage implements AndesImageGroupMember {
  protected readonly group = inject(ANDES_IMAGE_GROUP, { optional: true });
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Image URL. `null` / `undefined` means it has not arrived yet (the placeholder keeps
   * showing); an empty string means there is no image.
   */
  readonly src = input<string | null | undefined>('');
  /** Alternative text; leave empty for a purely decorative image. */
  readonly alt = input('');
  /** Box width: a number is px, a string any CSS length. */
  readonly width = input<number | string | null>(null);
  /** Box height: a number is px, a string any CSS length. */
  readonly height = input<number | string | null>(null);
  /** Shown instead when `src` fails to load. */
  readonly fallback = input<string | null | undefined>(null);
  /** What to show while loading; see {@link AndesImagePlaceholder}. */
  readonly placeholder = input<AndesImagePlaceholder>(false);
  /** Small image shown blurred by `placeholder="blur"` until `src` arrives. */
  readonly placeholderSrc = input<string | null | undefined>(null);
  /** How the picture fills its box. */
  readonly fit = input<AndesImageFit>('cover');
  /** Native lazy loading; `'eager'` for images above the fold. */
  readonly loading = input<'lazy' | 'eager'>('lazy');
  /** Native `decoding` hint. */
  readonly decoding = input<'async' | 'sync' | 'auto'>('async');
  /** Native `srcset`. */
  readonly srcset = input<string | null | undefined>(null);
  /** Native `sizes`. */
  readonly sizes = input<string | null | undefined>(null);
  /** Native `crossorigin`. */
  readonly crossOrigin = input<'anonymous' | 'use-credentials' | '' | null>(
    null,
  );
  /** Native `referrerpolicy`. */
  readonly referrerPolicy = input<ReferrerPolicy | null>(null);
  /**
   * Opens a viewer on click: `true` (default), `false` to turn it off, or a config object
   * (zoom limits, scrim, toolbar buttons, ...). Inside an `andes-image-group` the group's
   * configuration applies and only `false` keeps this image out of the viewer.
   */
  readonly preview = input<boolean | AndesImagePreviewConfig | ''>(true);
  /** A larger asset to show in the viewer; the thumbnail loads `src`. */
  readonly previewSrc = input<string | null | undefined>(null);
  /**
   * The thumbnail's hover label: `true` for the default "Preview" with an eye glyph, a
   * string, a template, or `false` for no visible label (the thumbnail still opens).
   */
  readonly mask = input<boolean | string | TemplateRef<unknown>>(true);
  /** Localised strings; unset fields keep their English default. */
  readonly labels = input<AndesImageLabels | null>(null);

  /** Whether this image's own viewer is open (`[(previewOpen)]`). Unused inside a group. */
  readonly previewOpen = model(false);

  /** The thumbnail loaded. */
  readonly loaded = output<Event>();
  /** The thumbnail (or its fallback) failed to load. */
  readonly errored = output<Event>();
  /** The viewer's pan / zoom / rotate / flip changed. Unused inside a group. */
  readonly previewTransformChange = output<AndesImageTransformEvent>();

  private readonly imageRef = viewChild<ElementRef<HTMLImageElement>>('img');
  private readonly triggerRef =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  private readonly useFallback = linkedSignal<string, boolean>({
    source: () => this.src() ?? '',
    computation: () => false,
  });

  /** The URL the `<img>` currently loads. */
  protected readonly currentSrc = computed(() => {
    const src = this.src();
    const fallback = this.fallback();
    return !src || this.useFallback() ? (fallback ?? '') : src;
  });

  /**
   * `src` that is still `null` / `undefined` (the URL is being fetched) keeps the image
   * loading, so its placeholder stays up; an empty string with no fallback is a failure.
   */
  private readonly pending = computed(
    () => this.src() == null && !this.fallback(),
  );

  /** `loading` until the load event, `error` once the source (and fallback) failed. */
  readonly status = linkedSignal<
    { src: string; pending: boolean },
    AndesImageStatus
  >({
    source: () => ({ src: this.currentSrc(), pending: this.pending() }),
    computation: ({ src, pending }) => (src || pending ? 'loading' : 'error'),
  });

  protected readonly text = computed(() =>
    resolveImageLabels(this.group?.labels(), this.labels()),
  );

  protected readonly cssWidth = computed(() => toCssLength(this.width()));
  protected readonly cssHeight = computed(() => toCssLength(this.height()));

  /** The effective viewer configuration, `null` when previews are off. */
  protected readonly previewConfig = computed<AndesImagePreviewConfig | null>(
    () => {
      const own = normalizePreviewInput(this.preview());
      if (own === null) {
        return null;
      }
      return this.group ? this.group.config() : own;
    },
  );

  /** The placeholder to draw while loading, resolved to one concrete kind. */
  protected readonly placeholderKind = computed<
    'none' | 'skeleton' | 'blur' | 'template'
  >(() => {
    const placeholder = this.placeholder();
    if (!placeholder) {
      return 'none';
    }
    if (typeof placeholder === 'object') {
      return 'template';
    }
    if (placeholder === 'blur') {
      return 'blur';
    }
    if (placeholder === true && this.placeholderSrc()) {
      return 'blur';
    }
    return 'skeleton';
  });

  protected readonly placeholderTemplate = computed(() => {
    const placeholder = this.placeholder();
    return typeof placeholder === 'object' ? placeholder : null;
  });

  /** The item the viewer shows for this image, or `null` when it cannot be previewed. */
  readonly previewItem = computed<AndesImagePreviewItem | null>(() => {
    if (!this.previewConfig()) {
      return null;
    }
    const previewSrc = this.previewSrc();
    if (this.status() === 'error' && !previewSrc) {
      return null;
    }
    const src = previewSrc || this.currentSrc();
    if (!src) {
      return null;
    }
    const thumbnail = this.currentSrc();
    return {
      src,
      alt: this.alt(),
      fallback: previewSrc
        ? thumbnail || undefined
        : (this.fallback() ?? undefined),
      crossOrigin: this.crossOrigin(),
    };
  });

  protected readonly standaloneItems = computed(() => {
    const item = this.previewItem();
    return item ? [item] : [];
  });

  /** Whether the thumbnail offers a preview button. */
  protected readonly canPreview = computed(() => this.previewItem() !== null);

  protected readonly maskText = computed(() => {
    const mask = this.mask();
    return mask === true
      ? this.text().preview
      : typeof mask === 'string'
        ? mask
        : null;
  });

  protected readonly maskTemplate = computed(() => {
    const mask = this.mask();
    return typeof mask === 'object' ? mask : null;
  });

  protected readonly triggerLabel = computed(() => {
    const alt = this.alt();
    const preview = this.text().preview;
    return alt ? `${preview}: ${alt}` : preview;
  });

  constructor() {
    this.group?.register(this);
    inject(DestroyRef).onDestroy(() => this.group?.unregister(this));

    // A cached or server-rendered image can finish before the load listener is attached.
    afterNextRender(() => {
      const image = this.imageRef()?.nativeElement;
      if (
        image?.complete &&
        image.naturalWidth > 0 &&
        this.status() === 'loading'
      ) {
        this.status.set('loaded');
      }
    });
  }

  /** Opens the viewer (on the shared group viewer when inside a group). */
  openPreview(): void {
    if (!this.canPreview()) {
      return;
    }
    if (this.group) {
      this.group.openMember(this);
    } else {
      this.previewOpen.set(true);
    }
  }

  /** Closes this image's own viewer. Inside a group, use the group's `close()`. */
  closePreview(): void {
    this.previewOpen.set(false);
  }

  focusTrigger(): void {
    this.triggerRef()?.nativeElement.focus();
  }

  protected onLoad(event: Event): void {
    this.status.set('loaded');
    this.loaded.emit(event);
  }

  protected onError(event: Event): void {
    if (!this.useFallback() && this.src() && this.fallback()) {
      this.useFallback.set(true);
    } else {
      this.status.set('error');
    }
    this.errored.emit(event);
  }
}
