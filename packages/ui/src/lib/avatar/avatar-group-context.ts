import { InjectionToken, type Signal } from '@angular/core';

import type { AndesAvatarSizeInput } from './avatar-size';

export type AndesAvatarShape = 'circular' | 'rounded' | 'square';

/**
 * What an `AndesAvatarGroup` shares with the avatars (and the `+N` chip)
 * inside it. Provided through a token in its own file, rather than by
 * injecting `AndesAvatarGroup` directly, because the group queries
 * `AndesAvatar` - importing the class back from avatar.ts would be a cycle.
 * Internal; not exported from the package.
 */
export interface AndesAvatarGroupContext {
  /** Group-wide size; an avatar's own `size` input wins over it. */
  readonly size: Signal<AndesAvatarSizeInput | undefined>;
  /** Group-wide shape; an avatar's own `shape` input wins over it. */
  readonly shape: Signal<AndesAvatarShape | undefined>;
  /** Whether `max.count` has pushed this avatar out of the visible stack. */
  isHidden(avatar: unknown): boolean;
}

export const ANDES_AVATAR_GROUP = new InjectionToken<AndesAvatarGroupContext>(
  'ANDES_AVATAR_GROUP',
);
