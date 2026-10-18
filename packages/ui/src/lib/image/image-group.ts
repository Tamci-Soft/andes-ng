import type { AndesOverlayCloseReason } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  ANDES_IMAGE_GROUP,
  type AndesImageGroupContext,
  type AndesImageGroupMember,
} from './image-group-context';
import { AndesImagePreview } from './image-preview';
import {
  normalizePreviewInput,
  type AndesImageLabels,
  type AndesImagePreviewConfig,
  type AndesImagePreviewItem,
  type AndesImageTransformEvent,
} from './image-types';

/**
 * Collects the `andes-image` elements inside it so one viewer can step through all of them.
 *
 * Clicking any thumbnail opens the viewer on that image; previous / next buttons, the
 * arrow keys, `PageUp` / `PageDown`, `Home` and `End` move between them, with a
 * "2 / 5" counter. Images are ordered as they appear in the document, and an image
 * with `[preview]="false"` (or one that failed to load) is left out.
 *
 * ```html
 * <andes-image-group [preview]="{ loop: true }">
 *   <andes-image src="/a.jpg" alt="First" [width]="120" [height]="80" />
 *   <andes-image src="/b.jpg" alt="Second" [width]="120" [height]="80" />
 * </andes-image-group>
 * ```
 *
 * The group has no box of its own (`display: contents`): lay the thumbnails out around it.
 */
@Component({
  selector: 'andes-image-group',
  imports: [AndesImagePreview],
  template: `
    <ng-content />
    @if (config(); as previewConfig) {
      <andes-image-preview
        [items]="items()"
        [config]="previewConfig"
        [labels]="labels()"
        [(open)]="open"
        [(current)]="current"
        (transformChange)="transformChange.emit($event)"
        (closed)="onClosed($event)"
      />
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ANDES_IMAGE_GROUP, useExisting: AndesImageGroup }],
  host: { '[attr.data-slot]': '"image-group"' },
})
export class AndesImageGroup implements AndesImageGroupContext {
  /**
   * Viewer configuration shared by every image in the group, or `false` to turn previews
   * off for all of them. A bare `preview` attribute means the defaults.
   */
  readonly preview = input<boolean | AndesImagePreviewConfig | ''>(true);
  /** Localised strings for the thumbnails' labels and the viewer. */
  readonly labels = input<AndesImageLabels | null>(null);

  /** Whether the viewer is open (`[(open)]`). */
  readonly open = model(false);
  /** 0-based index of the shown image (`[(current)]`). */
  readonly current = model(0);

  /** The viewer's pan / zoom / rotate / flip changed. */
  readonly transformChange = output<AndesImageTransformEvent>();
  /** The viewer closed; `reason` says how. */
  readonly closed = output<AndesOverlayCloseReason>();

  readonly config = computed(() => normalizePreviewInput(this.preview()));

  private readonly members = signal<readonly AndesImageGroupMember[]>([]);
  /** Bumped when the DOM order may have changed without any member coming or going. */
  private readonly orderVersion = signal(0);
  private openedMember: AndesImageGroupMember | null = null;

  private readonly previewable = computed(() => {
    this.orderVersion();
    return this.members()
      .filter((member) => member.previewItem() !== null)
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
  });

  /** The items the viewer browses, in document order. */
  protected readonly items = computed<readonly AndesImagePreviewItem[]>(() =>
    this.previewable().map(
      (member) => member.previewItem() as AndesImagePreviewItem,
    ),
  );

  register(member: AndesImageGroupMember): void {
    this.members.update((members) => [...members, member]);
  }

  unregister(member: AndesImageGroupMember): void {
    this.members.update((members) =>
      members.filter((entry) => entry !== member),
    );
  }

  /** Opens the viewer on `member` (an image of this group). */
  openMember(member: AndesImageGroupMember): void {
    this.orderVersion.update((version) => version + 1);
    const index = this.previewable().indexOf(member);
    if (index >= 0) {
      this.show(index);
    }
  }

  /** Opens the viewer on the image at `index`. */
  show(index = 0): void {
    this.openedMember = this.previewable()[index] ?? null;
    this.current.set(index);
    this.open.set(true);
  }

  /** Closes the viewer. */
  hide(): void {
    this.open.set(false);
  }

  protected onClosed(reason: AndesOverlayCloseReason): void {
    // Focus returns to the thumbnail that opened the viewer; if the user paged to another
    // image since, the one they were last looking at is the better place to land.
    const shown = this.previewable()[this.current()];
    if (shown && shown !== this.openedMember) {
      shown.focusTrigger();
    }
    this.openedMember = null;
    this.closed.emit(reason);
  }
}
