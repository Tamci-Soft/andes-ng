import type { Renderer2 } from '@angular/core';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** A decorative inline icon: the box it is drawn in, and the stroked paths inside it. */
export interface AndesComboboxIcon {
  readonly viewBox: string;
  readonly strokeWidth: string;
  readonly paths: readonly string[];
}

/**
 * The empty-state glyph: an open inbox, the same "nothing in this container" illustration
 * Ant Design's own `notFoundContent` default falls back to
 * (`<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />`).
 */
export const ANDES_COMBOBOX_EMPTY_ICON: AndesComboboxIcon = {
  viewBox: '0 0 24 24',
  strokeWidth: '1.5',
  paths: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
  ],
};

/** The selected-option check, drawn to match `AndesCheckbox`'s and `AndesSelectItem`'s. */
export const ANDES_COMBOBOX_SELECTED_ICON: AndesComboboxIcon = {
  viewBox: '0 0 16 16',
  strokeWidth: '2',
  paths: ['M3.5 8.5L6.5 11.5L12.5 4.5'],
};

/**
 * Builds one of the icons above as a real SVG element.
 *
 * Every part of this compound component is a directive applied to the consumer's own
 * element (`<div andesComboboxItem>`), not a component rendering an element of its own -
 * which is both the authoring API this Combobox is built around and what the workspace's
 * `@angular-eslint/component-selector` rule requires of anything attribute-selected. A
 * directive has no template to declare markup in, so the little decoration these two parts
 * add around the projected content is built here instead.
 *
 * `Renderer2` rather than `innerHTML`: it keeps this a real DOM construction that a
 * non-DOM renderer can execute, and it never hands a string to the parser.
 */
export function createAndesComboboxIcon(
  renderer: Renderer2,
  icon: AndesComboboxIcon,
  className: string,
): SVGElement {
  const svg: SVGElement = renderer.createElement('svg', SVG_NAMESPACE);
  renderer.addClass(svg, className);
  renderer.setAttribute(svg, 'viewBox', icon.viewBox);
  renderer.setAttribute(svg, 'fill', 'none');
  renderer.setAttribute(svg, 'aria-hidden', 'true');

  for (const d of icon.paths) {
    const path: SVGElement = renderer.createElement('path', SVG_NAMESPACE);
    renderer.setAttribute(path, 'd', d);
    renderer.setAttribute(path, 'stroke', 'currentColor');
    renderer.setAttribute(path, 'stroke-width', icon.strokeWidth);
    renderer.setAttribute(path, 'stroke-linecap', 'round');
    renderer.setAttribute(path, 'stroke-linejoin', 'round');
    renderer.appendChild(svg, path);
  }

  return svg;
}
