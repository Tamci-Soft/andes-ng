/**
 * What the `+N` overflow panel needs to draw one hidden avatar as a face.
 * The hidden `AndesAvatar` elements themselves can't be moved into the panel
 * (projected content renders in exactly one place), so each one describes
 * itself with this plain object - see `AndesAvatar.face()`.
 */
export interface AndesAvatarFace {
  /** Who it is. Becomes the face's accessible name and its hover/focus caption. */
  readonly name: string;
  /** Photo URL, when the avatar has one. Drawn over the initials/icon. */
  readonly src?: string;
  /** Initials or short text drawn when there is no photo (or it fails to load). */
  readonly text?: string;
  /** Draw the generic person glyph (no photo, no text, no name to take initials from). */
  readonly icon?: boolean;
  /** Value of the avatar's own `--andes-avatar-background`, if it sets one. */
  readonly background?: string;
  /** Value of the avatar's own `--andes-avatar-foreground`, if it sets one. */
  readonly foreground?: string;
}

/** Up to two initials from a display name: "Alice Moreau" -> "AM". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}
