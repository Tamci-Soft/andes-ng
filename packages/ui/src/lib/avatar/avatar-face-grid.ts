import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';

import type { AndesAvatarFace } from './avatar-face';
import type { AndesAvatarShape } from './avatar-group-context';

/** How the `+N` panel lays the hidden faces out. */
export type AndesAvatarGroupCountLayout = 'grid' | 'row';

/** Space between faces, px. Mirrored by `--_andes-avatar-face-gap` in the CSS. */
const GAP = 6;
/** Room around the faces so a focus ring is not clipped by the scroller, px. */
const EDGE = 3;
/** The grid shows at most this many rows before it scrolls. */
export const MAX_VISIBLE_ROWS = 4;
/** Rows rendered beyond each edge of the visible ones, so scrolling never shows a gap. */
const OVERSCAN = 2;

/** Faces per row for a face size: 8 at 32px and under, 7 up to 40px, else 6. */
export function faceColumns(faceSize: number): number {
  return faceSize <= 32 ? 8 : faceSize <= 40 ? 7 : 6;
}

interface Cell {
  readonly index: number;
  readonly col: number;
  readonly face: AndesAvatarFace;
}

interface Row {
  readonly index: number;
  readonly cells: readonly Cell[];
}

/**
 * The hidden avatars of an `AndesAvatarGroup` as a grid of faces (internal to
 * the `+N` panel).
 *
 * Built for long lists: only the rows in (or just beside) the scroll viewport
 * are in the DOM, so 5,000 hidden avatars cost the same as 50, and each
 * photo is `loading="lazy"`. The `row` layout is one horizontal line for
 * small counts and renders every face.
 *
 * Accessibility follows the WAI-ARIA grid pattern: `grid` > `row` >
 * `gridcell`, one tab stop (roving tabindex), each cell named by `aria-label`
 * (the photo and initials are decorative). Arrow keys move across the faces
 * (left/right continue into the next row), Up/Down move by a row, Home/End
 * go to the start/end of the row, Ctrl+Home/End to the first/last face and
 * PageUp/PageDown by a screenful. The hovered or focused face's name is
 * shown in a small label floating past the panel edge.
 */
@Component({
  selector: 'andes-avatar-face-grid',
  imports: [],
  templateUrl: './avatar-face-grid.html',
  styleUrl: './avatar-face-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': "'avatar-face-grid'",
    '[attr.data-layout]': 'layout()',
    '[attr.data-shape]': 'shape()',
    '[style.--_andes-avatar-face]': 'faceSize() + "px"',
    '[style.--_andes-avatar-face-gap]': 'gap + "px"',
    '[style.--_andes-avatar-face-edge]': 'edge + "px"',
    '[style.--_andes-avatar-face-cols]': 'viewportColumns()',
  },
})
export class AndesAvatarFaceGrid {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly faces = input.required<readonly AndesAvatarFace[]>();
  readonly layout = input<AndesAvatarGroupCountLayout>('grid');
  /** Edge of one face, px. */
  readonly faceSize = input(32);
  readonly shape = input<AndesAvatarShape>('circular');
  /** Accessible name of the grid, e.g. "+12 more". */
  readonly label = input('');

  protected readonly gap = GAP;
  protected readonly edge = EDGE;

  private readonly scroller =
    viewChild.required<ElementRef<HTMLElement>>('scroller');

  protected readonly isRow = computed(() => this.layout() === 'row');
  private readonly columns = computed(() => faceColumns(this.faceSize()));
  /** Faces per row: one row holds them all in the `row` layout. */
  private readonly perRow = computed(() =>
    this.isRow() ? Math.max(1, this.faces().length) : this.columns(),
  );
  /** Columns the viewport is as wide as. */
  protected readonly visibleColumns = computed(() =>
    Math.max(1, Math.min(this.columns(), this.faces().length)),
  );
  /**
   * Columns' worth of width the viewport takes. A `row` with more faces than
   * fit ends on a half face, which is the cue that it scrolls sideways.
   */
  protected readonly viewportColumns = computed(() =>
    this.isRow() && this.faces().length > this.columns()
      ? this.columns() - 0.5
      : this.visibleColumns(),
  );
  protected readonly rowCount = computed(() =>
    Math.ceil(this.faces().length / this.perRow()),
  );
  private readonly step = computed(() => this.faceSize() + GAP);
  private readonly viewportRows = computed(() =>
    Math.min(this.rowCount(), MAX_VISIBLE_ROWS),
  );

  /** Whether there are more rows than fit - the panel then scrolls. */
  readonly scrolls = computed(
    () => !this.isRow() && this.rowCount() > MAX_VISIBLE_ROWS,
  );

  /** Pixel height of the scrolling viewport (the `row` layout sizes itself). */
  protected readonly viewportHeight = computed(() =>
    this.isRow() ? null : this.viewportRows() * this.step() - GAP + EDGE * 2,
  );

  // --- Windowing -------------------------------------------------------------

  private readonly scrollTop = signal(0);
  private readonly activeIndex = signal(0);
  private readonly hoveredIndex = signal(-1);
  private readonly focusedIndex = signal(-1);

  private readonly firstVisibleRow = computed(() =>
    this.isRow()
      ? 0
      : Math.max(0, Math.floor((this.scrollTop() - EDGE) / this.step())),
  );

  /** The rendered range of rows: the visible ones plus a few either side. */
  protected readonly startRow = computed(() =>
    this.isRow() ? 0 : Math.max(0, this.firstVisibleRow() - OVERSCAN),
  );

  protected readonly endRow = computed(() =>
    this.isRow()
      ? this.rowCount()
      : Math.min(
          this.rowCount(),
          this.firstVisibleRow() + this.viewportRows() + 1 + OVERSCAN,
        ),
  );

  protected readonly padStart = computed(() => this.startRow() * this.step());
  protected readonly padEnd = computed(
    () => (this.rowCount() - this.endRow()) * this.step(),
  );

  protected readonly visibleRows = computed<readonly Row[]>(() => {
    const faces = this.faces();
    const perRow = this.perRow();
    const rows: Row[] = [];
    for (let r = this.startRow(); r < this.endRow(); r++) {
      const cells: Cell[] = [];
      const first = r * perRow;
      for (let i = first; i < Math.min(faces.length, first + perRow); i++) {
        cells.push({ index: i, col: i - first, face: faces[i] });
      }
      rows.push({ index: r, cells });
    }
    return rows;
  });

  /** The one cell in the tab order: the active one while it is on screen. */
  protected readonly tabStop = computed(() => {
    const count = this.faces().length;
    const active = Math.min(Math.max(0, this.activeIndex()), count - 1);
    if (this.isRow()) {
      return active;
    }
    const row = Math.floor(active / this.perRow());
    const first = this.firstVisibleRow();
    const last = first + this.viewportRows() - 1;
    return row >= first && row <= last ? active : first * this.perRow();
  });

  protected readonly caption = computed(() => {
    const faces = this.faces();
    const index =
      this.hoveredIndex() >= 0 ? this.hoveredIndex() : this.focusedIndex();
    return faces[index]?.name ?? '';
  });

  // --- Events ----------------------------------------------------------------

  protected onScroll(): void {
    const scroller = this.scroller().nativeElement;
    this.scrollTop.set(scroller.scrollTop);
    // Scrolling the focused face out of the rendered rows would remove it from
    // the DOM, and a removed focused element drops focus out of the panel
    // (closing it). Park focus on the scroller first; the roving tab stop then
    // follows the rows on screen.
    if (this.focusedIndex() >= 0) {
      const row = Math.floor(this.focusedIndex() / this.perRow());
      const first = this.firstVisibleRow();
      if (
        row < first - OVERSCAN ||
        row > first + this.viewportRows() + OVERSCAN
      ) {
        scroller.focus({ preventScroll: true });
      }
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const index = this.indexOf(event.target);
    if (index < 0) {
      return;
    }
    this.activeIndex.set(index);
    this.focusedIndex.set(index);
  }

  protected onFocusOut(event: FocusEvent): void {
    // Focus moving to another face is not leaving: that face's focusin sets it.
    if (this.indexOf(event.relatedTarget) < 0) {
      this.focusedIndex.set(-1);
    }
  }

  protected onHover(event: PointerEvent): void {
    this.hoveredIndex.set(this.indexOf(event.target));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.faces().length;
    if (count === 0 || event.altKey) {
      return;
    }
    const current = Math.max(0, this.indexOf(event.target));
    const perRow = this.perRow();
    const row = Math.floor(current / perRow);
    const lastRow = this.rowCount() - 1;
    const rtl =
      getComputedStyle(this.scroller().nativeElement).direction === 'rtl';
    const jump = event.ctrlKey || event.metaKey;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = current + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        next = current + (rtl ? 1 : -1);
        break;
      case 'ArrowDown':
        if (this.isRow()) {
          return;
        }
        next = row < lastRow ? Math.min(count - 1, current + perRow) : current;
        break;
      case 'ArrowUp':
        if (this.isRow()) {
          return;
        }
        next = row > 0 ? current - perRow : current;
        break;
      case 'PageDown':
        next = this.isRow()
          ? current
          : Math.min(count - 1, current + perRow * this.viewportRows());
        break;
      case 'PageUp':
        next = this.isRow()
          ? current
          : Math.max(0, current - perRow * this.viewportRows());
        break;
      case 'Home':
        next = jump ? 0 : row * perRow;
        break;
      case 'End':
        next = jump
          ? count - 1
          : Math.min(count - 1, row * perRow + perRow - 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    this.moveTo(Math.min(count - 1, Math.max(0, next)));
  }

  // --- Focus -----------------------------------------------------------------

  /** Moves keyboard focus into the grid, to the remembered face. */
  focusFirst(): void {
    if (this.faces().length > 0) {
      this.moveTo(this.tabStop());
    }
  }

  private moveTo(index: number): void {
    this.activeIndex.set(index);
    if (!this.isRow()) {
      this.scrollRowIntoView(Math.floor(index / this.perRow()));
    }
    const cell = this.cellAt(index);
    if (cell) {
      cell.focus({ preventScroll: !this.isRow() });
      return;
    }
    // The row is not rendered yet: scrolling changed the window, so focus
    // once Angular has drawn it. Until then focus waits on the scroller, so
    // the face it is leaving can be removed without dropping focus.
    this.scroller().nativeElement.focus({ preventScroll: true });
    afterNextRender(
      () => this.cellAt(index)?.focus({ preventScroll: !this.isRow() }),
      { injector: this.injector },
    );
  }

  private scrollRowIntoView(row: number): void {
    const scroller = this.scroller().nativeElement;
    const height = this.viewportHeight() ?? scroller.clientHeight;
    const top = EDGE + row * this.step();
    const bottom = top + this.faceSize();
    let target = this.scrollTop();
    if (top - EDGE < target) {
      target = top - EDGE;
    } else if (bottom + EDGE > target + height) {
      target = bottom + EDGE - height;
    }
    if (target !== this.scrollTop()) {
      scroller.scrollTop = target;
      this.scrollTop.set(target);
    }
  }

  private cellAt(index: number): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(
      `[data-index="${index}"]`,
    );
  }

  private indexOf(target: EventTarget | null): number {
    const cell = (target as Element | null)?.closest?.('[data-index]');
    const index = cell ? Number(cell.getAttribute('data-index')) : -1;
    return Number.isFinite(index) ? index : -1;
  }

  protected onImageError(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
