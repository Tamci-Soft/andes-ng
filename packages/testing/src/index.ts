export function getAndesButtonByName(
  container: ParentNode,
  name: string,
): HTMLButtonElement {
  const button = Array.from(
    container.querySelectorAll<HTMLButtonElement>('andes-button button'),
  ).find((candidate) => candidate.textContent?.trim() === name);

  if (!button) {
    throw new Error(`No andes-button found with accessible name "${name}"`);
  }

  return button;
}
