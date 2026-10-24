import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayCloseReason,
} from '@andes-ng/primitives';
import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  type TemplateRef,
  untracked,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';

import { AndesImageIcon } from './image-icon';
import {
  ANDES_IMAGE_IDENTITY_TRANSFORM,
  clamp,
  imageTransformCss,
  isIdentityTransform,
  isZoomed,
  reboundTransform,
  zoomTransform,
} from './image-transform';
import {
  resolveImageLabels,
  resolvePreviewConfig,
  type AndesImageCountContext,
  type AndesImageExtraActionsContext,
  type AndesImageLabels,
  type AndesImagePreviewAction,
  type AndesImagePreviewConfig,
  type AndesImagePreviewItem,
  type AndesImageTransform,
  type AndesImageTransformAction,
  type AndesImageTransformEvent,
} from './image-types';

/** Class on the scrim; `image-preview.css` retimes its fade and adds the blur variant. */
export const ANDES_IMAGE_PREVIEW_BACKDROP_CLASS =
  'andes-image-preview-backdrop';
const BACKDROP_BLUR_CLASS = 'andes-image-preview-backdrop--blur';
const PANE_CLASS = 'andes-image-preview-pane';

/** Distance the arrow keys pan a zoomed image per press, in px. */
const KEY_PAN_STEP = 48;
/** Movement below this is still a click, not a drag. */
const DRAG_THRESHOLD = 4;
/** Horizontal travel that turns a drag of a fitted image into a previous/next swipe. */
const SWIPE_DISTANCE = 60;
/** Double-click / double-tap zoom target. */
const DOUBLE_CLICK_SCALE = 2;

const SHORTCUTS: Readonly<Record<AndesImagePreviewAction, string>> = {
  zoomIn: '+',
  zoomOut: '-',
  rotateLeft: 'Shift+R [',
  rotateRight: 'R ]',
  flipX: 'H',
  flipY: 'V',
  reset: '0',
  download: '',
};

interface DragState {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly originX: number;
  readonly originY: number;
  readonly onStage: boolean;
  moved: boolean;
}

type LoadState = 'loading' | 'loaded' | 'error';

/** Best-effort file name for the download action. */
function fileNameOf(item: AndesImagePreviewItem, url: string): string {
  if (item.name) {
    return item.name;
  }
  if (url.startsWith('data:')) {
    const type = /^data:image\/([a-z0-9.+-]+)/i.exec(url)?.[1] ?? 'png';
    return `image.${type === 'svg+xml' ? 'svg' : type}`;
  }
  const path = url.split(/[?#]/)[0];
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last || 'image';
}

/**
 * The full-viewport image viewer behind `andes-image` and `andes-image-group`.
 *
 * It renders nothing in place: when `open` turns true it shows a modal overlay (focus is
 * trapped and returned, Escape closes, the page behind is inert) with the image centred, a
 * toolbar (zoom, rotate, flip, reset, download), a close button and, for more than one
 * item, previous/next buttons with a "2 / 5" counter.
 *
 * Use it directly to preview images that have no thumbnail on the page:
 *
 * ```html
 * <andes-image-preview [items]="photos" [(open)]="open" [(current)]="index" />
 * ```
 *
 * Keyboard (when `keyboard` is on): `+` / `-` zoom, `0` reset, `R` / `Shift+R` rotate,
 * `H` / `V` flip, `PageUp` / `PageDown` previous / next, `Home` / `End` first / last, and
 * the arrow keys step through items - or pan, while the image is zoomed.
 */
@Component({
  selector: 'andes-image-preview',
  imports: [AndesImageIcon, AndesOverlayContentPrimitive, NgTemplateOutlet],
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay()],
  host: {
    class: 'andes-image-preview-host',
    '[attr.data-slot]': '"image-preview-host"',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesImagePreview {
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);

  /** The images to browse. */
  readonly items = input<readonly AndesImagePreviewItem[]>([]);
  /** Whether the viewer is open (`[(open)]`). */
  readonly open = model(false);
  /** 0-based index of the shown item (`[(current)]`). */
  readonly current = model(0);
  /** Behaviour of the viewer; see {@link AndesImagePreviewConfig}. */
  readonly config = input<AndesImagePreviewConfig | null>(null);
  /** Localised strings; unset fields keep their English default. */
  readonly labels = input<AndesImageLabels | null>(null);

  /** The transform changed; `action` says why. */
  readonly transformChange = output<AndesImageTransformEvent>();
  /** The viewer finished opening. */
  readonly opened = output<void>();
  /** The viewer closed (after its exit animation); `reason` says how. */
  readonly closed = output<AndesOverlayCloseReason>();

  protected readonly cfg = computed(() => resolvePreviewConfig(this.config()));
  protected readonly text = computed(() => resolveImageLabels(this.labels()));
  protected readonly total = computed(() => this.items().length);
  protected readonly index = computed(() =>
    clamp(Math.trunc(this.current()) || 0, 0, Math.max(0, this.total() - 1)),
  );
  protected readonly item = computed(() => this.items()[this.index()] ?? null);

  /** Pan / zoom / rotate / flip of the shown image; resets whenever the item changes. */
  protected readonly transform = linkedSignal<
    AndesImagePreviewItem | null,
    AndesImageTransform
  >({
    source: this.item,
    computation: () => ANDES_IMAGE_IDENTITY_TRANSFORM,
  });

  private readonly usingFallback = linkedSignal<
    AndesImagePreviewItem | null,
    boolean
  >({ source: this.item, computation: () => false });

  protected readonly src = computed(() => {
    const item = this.item();
    if (!item) {
      return null;
    }
    return this.usingFallback() && item.fallback ? item.fallback : item.src;
  });

  protected readonly loadState = linkedSignal<string | null, LoadState>({
    source: this.src,
    computation: (src) => (src ? 'loading' : 'error'),
  });

  protected readonly dragging = signal(false);

  protected readonly css = computed(() => imageTransformCss(this.transform()));
  protected readonly zoomed = computed(() => isZoomed(this.transform()));
  protected readonly canPan = computed(
    () => this.zoomed() && this.cfg().movable,
  );
  protected readonly canPrevious = computed(
    () => this.total() > 1 && (this.cfg().loop || this.index() > 0),
  );
  protected readonly canNext = computed(
    () =>
      this.total() > 1 && (this.cfg().loop || this.index() < this.total() - 1),
  );
  protected readonly toolbarActions = computed(() =>
    this.cfg().actions.filter((action) => action in SHORTCUTS),
  );
  protected readonly dialogLabel = computed(() => {
    const alt = this.item()?.alt;
    const dialog = this.text().dialog;
    return alt ? `${dialog}: ${alt}` : dialog;
  });
  protected readonly announcement = computed(() => {
    if (this.total() < 2) {
      return '';
    }
    const alt = this.item()?.alt;
    const position = this.text().position(this.index() + 1, this.total());
    return alt ? `${position}: ${alt}` : position;
  });
  protected readonly countContext = computed<AndesImageCountContext>(() => ({
    $implicit: this.index() + 1,
    current: this.index() + 1,
    total: this.total(),
  }));
  protected readonly extraContext =
    computed<AndesImageExtraActionsContext | null>(() => {
      const item = this.item();
      return item
        ? {
            $implicit: item,
            item,
            index: this.index(),
            total: this.total(),
            transform: this.transform(),
            close: () => this.close(),
          }
        : null;
    });

  private readonly surface = viewChild<TemplateRef<unknown>>('surface');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly image = viewChild<ElementRef<HTMLImageElement>>('image');

  private drag: DragState | null = null;
  private suppressClick = false;
  /** Whether the press that led to the next click began on the empty stage. */
  private pressedOnStage = true;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('dialog'),
      closeOnOutsideClick: false,
      panelClass: PANE_CLASS,
      backdropClass: ANDES_IMAGE_PREVIEW_BACKDROP_CLASS,
      size: { width: '100%', height: '100%' },
    });

    effect(() => {
      const config = this.cfg();
      this.overlay.configure({
        hasBackdrop: config.scrim,
        closeOnEscape: config.closeOnEscape,
        backdropClass: config.scrimBlur
          ? [ANDES_IMAGE_PREVIEW_BACKDROP_CLASS, BACKDROP_BLUR_CLASS]
          : ANDES_IMAGE_PREVIEW_BACKDROP_CLASS,
      });
    });

    effect(() => {
      const wantsOpen = this.open();
      const template = this.surface();
      const total = this.total();
      untracked(() => {
        if (!wantsOpen) {
          this.overlay.close();
          return;
        }
        if (!template) {
          return;
        }
        if (total === 0) {
          this.open.set(false);
          return;
        }
        this.transform.set(ANDES_IMAGE_IDENTITY_TRANSFORM);
        this.overlay.open(template);
      });
    });

    // Shortcuts work wherever focus is inside the viewer (stage, toolbar, nav buttons).
    this.overlay.keydownEvents.subscribe((event) => this.onKeydown(event));
    this.overlay.opened.subscribe(() => this.opened.emit());
    this.overlay.closed.subscribe((reason) => {
      this.open.set(false);
      this.closed.emit(reason);
    });
  }

  /** Opens the viewer at `index` (default: the current one). */
  show(index?: number): void {
    if (index !== undefined) {
      this.current.set(index);
    }
    this.open.set(true);
  }

  /** Closes the viewer. */
  close(reason: AndesOverlayCloseReason = 'close-button'): void {
    this.overlay.close(reason);
  }

  /** Shows the next item; wraps only with `loop`. */
  next(): void {
    this.step(1);
  }

  /** Shows the previous item; wraps only with `loop`. */
  previous(): void {
    this.step(-1);
  }

  /** Zooms in one step. */
  zoomIn(): void {
    this.zoomBy(1, 'zoomIn');
  }

  /** Zooms out one step. */
  zoomOut(): void {
    this.zoomBy(-1, 'zoomOut');
  }

  /** Rotates a quarter turn: positive is clockwise. */
  rotate(direction: 1 | -1): void {
    const transform = this.transform();
    this.commit(
      this.rebound({ ...transform, rotate: transform.rotate + 90 * direction }),
      direction > 0 ? 'rotateRight' : 'rotateLeft',
    );
  }

  /** Mirrors the image on the horizontal (`'x'`) or vertical (`'y'`) screen axis. */
  flip(axis: 'x' | 'y'): void {
    const transform = this.transform();
    this.commit(
      axis === 'x'
        ? { ...transform, flipX: !transform.flipX }
        : { ...transform, flipY: !transform.flipY },
      axis === 'x' ? 'flipX' : 'flipY',
    );
  }

  /** Back to fit-to-viewport, unrotated, unmirrored. */
  reset(): void {
    this.commit(ANDES_IMAGE_IDENTITY_TRANSFORM, 'reset');
  }

  /** Saves the shown image, through a blob where the browser allows it. */
  async download(): Promise<void> {
    const item = this.item();
    const url = this.src();
    if (!item || !url) {
      return;
    }
    const name = fileNameOf(item, url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      this.clickAnchor(objectUrl, name);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      // Cross-origin without CORS: a plain download link is the best that is left.
      this.clickAnchor(url, name);
    }
    this.transformChange.emit({
      transform: this.transform(),
      action: 'download',
    });
  }

  protected run(action: AndesImagePreviewAction): void {
    switch (action) {
      case 'zoomIn':
        return this.zoomIn();
      case 'zoomOut':
        return this.zoomOut();
      case 'rotateLeft':
        return this.rotate(-1);
      case 'rotateRight':
        return this.rotate(1);
      case 'flipX':
        return this.flip('x');
      case 'flipY':
        return this.flip('y');
      case 'reset':
        return this.reset();
      case 'download':
        void this.download();
    }
  }

  protected actionDisabled(action: AndesImagePreviewAction): boolean {
    const transform = this.transform();
    const config = this.cfg();
    switch (action) {
      case 'zoomIn':
        return transform.scale >= config.maxScale;
      case 'zoomOut':
        return transform.scale <= config.minScale;
      case 'reset':
        return isIdentityTransform(transform);
      default:
        return false;
    }
  }

  protected shortcut(action: AndesImagePreviewAction): string | null {
    return SHORTCUTS[action] || null;
  }

  protected step(delta: number): void {
    const total = this.total();
    if (total < 2) {
      return;
    }
    let next = this.index() + delta;
    if (next < 0 || next >= total) {
      if (!this.cfg().loop) {
        return;
      }
      next = (next + total) % total;
    }
    this.current.set(next);
  }

  protected goTo(index: number): void {
    if (this.total() > 0) {
      this.current.set(clamp(index, 0, this.total() - 1));
    }
  }

  protected onLoad(): void {
    this.loadState.set('loaded');
    this.settlePan();
  }

  protected onError(): void {
    const item = this.item();
    if (item?.fallback && !this.usingFallback()) {
      this.usingFallback.set(true);
      return;
    }
    this.loadState.set('error');
  }

  private onKeydown(event: KeyboardEvent): void {
    const config = this.cfg();
    if (
      !config.keyboard ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const rtl = this.directionality.value === 'rtl';
    const key = event.key;
    const lower = key.length === 1 ? key.toLowerCase() : key;
    const transform = this.transform();
    let handled = true;

    switch (lower) {
      case '+':
      case '=':
        this.zoomBy(1, 'keyboard');
        break;
      case '-':
      case '_':
        this.zoomBy(-1, 'keyboard');
        break;
      case '0':
        this.reset();
        break;
      case 'r':
        this.rotate(event.shiftKey ? -1 : 1);
        break;
      case '[':
        this.rotate(-1);
        break;
      case ']':
        this.rotate(1);
        break;
      case 'h':
        this.flip('x');
        break;
      case 'v':
        this.flip('y');
        break;
      case 'PageUp':
        this.previous();
        break;
      case 'PageDown':
        this.next();
        break;
      case 'Home':
        this.goTo(0);
        break;
      case 'End':
        this.goTo(this.total() - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (this.canPan()) {
          const dx =
            lower === 'ArrowLeft'
              ? KEY_PAN_STEP
              : lower === 'ArrowRight'
                ? -KEY_PAN_STEP
                : 0;
          const dy =
            lower === 'ArrowUp'
              ? KEY_PAN_STEP
              : lower === 'ArrowDown'
                ? -KEY_PAN_STEP
                : 0;
          this.commit(
            this.rebound({
              ...transform,
              x: transform.x + dx,
              y: transform.y + dy,
            }),
            'keyboard',
          );
        } else if (lower === 'ArrowLeft' || lower === 'ArrowRight') {
          const toward = (lower === 'ArrowRight') !== rtl ? 1 : -1;
          this.step(toward);
        } else {
          handled = false;
        }
        break;
      }
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  protected onWheel(event: WheelEvent): void {
    const config = this.cfg();
    if (!config.wheel) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 33 : 1);
    // One 100px mouse-wheel notch is half a zoom step; a trackpad pinch (reported as
    // ctrl+wheel with small deltas) is made four times as sensitive.
    const exponent = clamp(-delta / (event.ctrlKey ? 25 : 200), -1, 1);
    const next = this.transform().scale * (1 + config.scaleStep) ** exponent;
    this.zoomAt(next, 'wheel', this.focalPoint(event));
  }

  protected onPointerDown(event: PointerEvent): void {
    if ((event.pointerType === 'mouse' && event.button !== 0) || this.drag) {
      return;
    }
    const transform = this.transform();
    this.drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
      onStage: event.target === event.currentTarget,
      moved: false,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }
      drag.moved = true;
      this.dragging.set(true);
      // Capture only once it is a real drag: capturing on press would retarget the
      // click that follows a plain press onto the stage.
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        // Not every environment can capture; the drag still works while over the stage.
      }
    }
    if (this.canPan()) {
      this.transform.set({
        ...this.transform(),
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    }
  }

  protected onPointerEnd(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    this.drag = null;
    this.dragging.set(false);
    this.suppressClick = drag.moved;
    this.pressedOnStage = drag.onStage;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // Nothing was captured.
    }
    if (!drag.moved) {
      return;
    }

    if (this.canPan()) {
      const settled = this.rebound(this.transform());
      this.transform.set(settled);
      this.transformChange.emit({ transform: settled, action: 'move' });
      return;
    }
    if (event.type !== 'pointerup' || this.zoomed()) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const rtl = this.directionality.value === 'rtl';
      this.step(dx > 0 !== rtl ? -1 : 1);
    }
  }

  protected onStageClick(event: MouseEvent): void {
    const suppressed = this.suppressClick;
    const pressedOnStage = this.pressedOnStage;
    this.suppressClick = false;
    this.pressedOnStage = true;
    if (
      suppressed ||
      !pressedOnStage ||
      event.target !== event.currentTarget ||
      !this.cfg().closeOnScrimClick
    ) {
      return;
    }
    this.close('backdrop-click');
  }

  /**
   * Escape from the stage: the keyboard counterpart of clicking its empty area. The overlay
   * closes on Escape by itself, this only keeps the two dismissals paired on the element.
   */
  protected onStageEscape(): void {
    if (this.cfg().closeOnEscape) {
      this.close('escape-key');
    }
  }

  protected onImageDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    if (this.zoomed()) {
      this.reset();
      return;
    }
    const target = Math.min(this.cfg().maxScale, DOUBLE_CLICK_SCALE);
    this.zoomAt(target, 'doubleClick', this.focalPoint(event));
  }

  private zoomBy(direction: 1 | -1, action: AndesImageTransformAction): void {
    const { scaleStep } = this.cfg();
    const scale = this.transform().scale;
    this.zoomAt(
      direction > 0 ? scale * (1 + scaleStep) : scale / (1 + scaleStep),
      action,
    );
  }

  private zoomAt(
    scale: number,
    action: AndesImageTransformAction,
    focal?: { x: number; y: number },
  ): void {
    const { minScale, maxScale } = this.cfg();
    let next = zoomTransform(
      this.transform(),
      scale,
      minScale,
      maxScale,
      focal,
    );
    if (next.scale <= 1) {
      next = { ...next, x: 0, y: 0 };
    }
    this.commit(this.rebound(next), action);
  }

  /** Pointer position measured from the viewport centre. */
  private focalPoint(event: MouseEvent): { x: number; y: number } {
    const stage = this.stage()?.nativeElement;
    if (!stage) {
      return { x: 0, y: 0 };
    }
    const rect = stage.getBoundingClientRect();
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    };
  }

  private rebound(transform: AndesImageTransform): AndesImageTransform {
    const stage = this.stage()?.nativeElement;
    const image = this.image()?.nativeElement;
    if (!stage || !image) {
      return transform;
    }
    return reboundTransform(
      transform,
      { width: stage.clientWidth, height: stage.clientHeight },
      { width: image.offsetWidth, height: image.offsetHeight },
    );
  }

  /** Re-checks the pan once the image has its real size (after a load). */
  private settlePan(): void {
    const transform = this.transform();
    const next = this.rebound(transform);
    if (next !== transform) {
      this.transform.set(next);
    }
  }

  private commit(
    transform: AndesImageTransform,
    action: AndesImageTransformAction,
  ): void {
    if (transform === this.transform()) {
      return;
    }
    this.transform.set(transform);
    this.transformChange.emit({ transform, action });
  }

  private clickAnchor(href: string, name: string): void {
    const anchor = this.document.createElement('a');
    anchor.href = href;
    anchor.download = name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    this.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
