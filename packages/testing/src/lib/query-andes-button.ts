export function queryAndesButton(root: ParentNode): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>('button[andesButton]');
}
