import { InjectionToken, type Signal } from '@angular/core';

import type {
  AndesImageLabels,
  AndesImagePreviewConfig,
  AndesImagePreviewItem,
} from './image-types';

/** What an `andes-image` exposes to the `andes-image-group` it sits in. */
export interface AndesImageGroupMember {
  /** The image's host element; its DOM position orders the group. */
  readonly element: HTMLElement;
  /** The item to preview, or `null` while this image cannot be previewed. */
  readonly previewItem: Signal<AndesImagePreviewItem | null>;
  /** Moves focus to the image's preview button. */
  focusTrigger(): void;
}

/** What `andes-image-group` offers its images. */
export interface AndesImageGroupContext {
  /** Preview configuration shared by the group; `null` when the group disables previews. */
  readonly config: Signal<AndesImagePreviewConfig | null>;
  readonly labels: Signal<AndesImageLabels | null>;
  register(member: AndesImageGroupMember): void;
  unregister(member: AndesImageGroupMember): void;
  /** Opens the shared preview on `member`. */
  openMember(member: AndesImageGroupMember): void;
}

export const ANDES_IMAGE_GROUP = new InjectionToken<AndesImageGroupContext>(
  'ANDES_IMAGE_GROUP',
);
