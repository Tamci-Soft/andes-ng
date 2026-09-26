/** Numbers are pixels (as in Ant Design); strings are passed through verbatim (`'50%'`, `'3rem'`). */
export function toCssSize(
  value: string | number | null | undefined,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return typeof value === 'number' ? `${value}px` : value;
}

/** Size scale shared by the avatar/button/input placeholders - the same names as AndesButton. */
export type AndesSkeletonSize = 'sm' | 'md' | 'lg';
