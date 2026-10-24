import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CSS contract of the table's look. The rules cannot be measured in the unit-test DOM
 * (the projected cells sit behind `::ng-deep`, and tokens and `color-mix` are not
 * resolved there), so these read the stylesheet itself and pin the declarations the
 * design depends on: the rounded frame, the row rhythm, the separators and the tints.
 */
function readStylesheet(name: string): string {
  const candidates = [
    resolve(process.cwd(), 'packages/ui/src/lib/table', name),
    resolve(process.cwd(), 'src/lib/table', name),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    } catch {
      // Try the next location: the runner's working directory differs per setup.
    }
  }
  throw new Error(`Cannot read ${name} from ${candidates.join(' or ')}`);
}

const css = readStylesheet('table.css');
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Splits a selector list on its top-level commas, leaving `:is(a, b)` whole. */
function splitSelectorList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

/** Every declaration block whose selector list contains `selector`, joined. */
function rule(selector: string): string {
  const wanted = normalize(selector);
  const bodies: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = splitSelectorList(normalize(match[1]));
    if (selectors.includes(wanted)) {
      bodies.push(normalize(match[2]));
    }
  }
  return bodies.join(' ');
}

describe('table stylesheet contract', () => {
  describe('frame', () => {
    it('sits the table in a bordered, rounded container', () => {
      const frame = rule('.andes-table__container--framed');

      expect(frame).toContain(
        'border: 1px solid var(--andes-color-border, #d1d5db)',
      );
      expect(frame).toContain('border-radius: var(--andes-radius-lg, 0.5rem)');
      expect(frame).toContain('box-sizing: border-box');
    });

    it('clips to the rounded corners whether or not the container scrolls', () => {
      expect(rule('.andes-table__container')).toContain('overflow-x: auto');
      expect(rule('.andes-table__container--scroll-y')).toContain(
        'overflow-y: auto',
      );
      expect(
        rule('.andes-table__container--framed.andes-table__container--sticky'),
      ).toContain('overflow: clip');
    });

    it('rounds the loading overlay with the frame', () => {
      expect(rule('.andes-table__loading--framed')).toContain(
        'border-radius: var(--andes-radius-lg, 0.5rem)',
      );
    });

    it('draws no table border of its own, so edges are never doubled', () => {
      expect(rule('.andes-table')).not.toMatch(/(^|\s)border:/);
      expect(rule('.andes-table--bordered')).toContain('border: 1px hidden');
    });
  });

  describe('header and rows', () => {
    it('makes the header and data rows 40px tall by default', () => {
      expect(rule('.andes-table--default')).toContain(
        '--andes-table-row-height: 2.5rem',
      );
      const cells = rule('.andes-table ::ng-deep .andes-table__head');
      expect(cells).toContain('height: var(--andes-table-row-height, 2.5rem)');
    });

    it('pads cells 8px by 12px, 4px by 8px when compact and 12px by 16px when comfortable', () => {
      const padding = (density: string) => rule(`.andes-table--${density}`);

      expect(padding('default')).toContain(
        '--andes-table-cell-padding-block: var(--andes-space-2, 0.5rem)',
      );
      expect(padding('default')).toContain(
        '--andes-table-cell-padding-inline: var(--andes-space-3, 0.75rem)',
      );
      expect(padding('compact')).toContain(
        '--andes-table-cell-padding-block: var(--andes-space-1, 0.25rem)',
      );
      expect(padding('compact')).toContain('--andes-table-row-height: 2rem');
      expect(padding('comfortable')).toContain(
        '--andes-table-cell-padding-inline: var(--andes-space-4, 1rem)',
      );
      expect(padding('comfortable')).toContain(
        '--andes-table-row-height: 3rem',
      );
    });

    it('sets the header in 500 weight on the foreground colour, with no column borders', () => {
      const head = rule('.andes-table ::ng-deep .andes-table__head');

      expect(head).toContain(
        'font-weight: var(--andes-font-weight-medium, 500)',
      );
      expect(head).toContain('color: var(--andes-color-foreground, #0f172a)');
      expect(head).not.toMatch(/(^|[ ;])border[a-z-]*:/);
    });

    it('separates rows with a bottom hairline only, and none under the last row', () => {
      expect(rule('.andes-table ::ng-deep .andes-table__row')).toContain(
        'border-bottom: 1px solid var(--andes-table-line)',
      );
      expect(
        rule(
          '.andes-table ::ng-deep .andes-table__body .andes-table__row:is(:last-child, :has(+ .andes-table__virtual-spacer:last-child))',
        ),
      ).toContain('border-bottom: none');
      expect(
        rule(
          '.andes-table ::ng-deep .andes-table__footer .andes-table__row:last-child',
        ),
      ).toContain('border-bottom: none');
    });

    it('draws the cell grid only for bordered tables', () => {
      expect(
        rule('.andes-table--bordered ::ng-deep .andes-table__cell'),
      ).toContain('border: 1px solid var(--andes-table-line)');
    });
  });

  describe('tints', () => {
    it('derives the line and the tint from the muted and border tokens', () => {
      const table = rule('.andes-table');

      expect(table).toMatch(
        /--andes-table-line: color-mix\( ?in srgb, var\(--andes-color-border, #d1d5db\) 60%, transparent ?\)/,
      );
      expect(table).toMatch(
        /--andes-table-tint: color-mix\( ?in srgb, var\(--andes-color-muted, #f1f5f9\) 55%, var\(--andes-color-background, #fff\) ?\)/,
      );
    });

    it('tints the header, the footer and the hovered row alike', () => {
      expect(rule('.andes-table ::ng-deep .andes-table__header')).toContain(
        'background-color: var(--andes-table-tint)',
      );
      const footer = rule('.andes-table ::ng-deep .andes-table__footer');
      expect(footer).toContain('background-color: var(--andes-table-tint)');
      expect(footer).toContain(
        'font-weight: var(--andes-font-weight-medium, 500)',
      );
      expect(footer).toContain('border-top: 1px solid');
      expect(
        rule(
          '.andes-table--hoverable ::ng-deep .andes-table__body .andes-table__row:not(.andes-table__expanded-row, :has(> td > andes-table-empty)):hover',
        ),
      ).toContain('background-color: var(--andes-table-tint)');
    });

    it('keeps a selected row stronger than a hovered one', () => {
      expect(
        rule('.andes-table ::ng-deep .andes-table__row--selected'),
      ).toMatch(
        /color-mix\( ?in srgb, var\(--andes-color-primary, #2563eb\) 8%/,
      );
    });
  });

  describe('sort indicator', () => {
    it('sits beside the title, before it in an end-aligned column', () => {
      expect(rule('.andes-table ::ng-deep .andes-table__head-title')).toContain(
        'flex: 0 1 auto',
      );
      expect(
        rule(
          '.andes-table ::ng-deep .andes-table__align--end .andes-table__sorter',
        ),
      ).toContain('order: -1');
      expect(
        rule(
          '.andes-table ::ng-deep .andes-table__align--end .andes-table__head-content',
        ),
      ).toContain('justify-content: flex-end');
    });

    it('rings a focused sortable header', () => {
      expect(
        rule(
          '.andes-table ::ng-deep .andes-table__head--sortable:focus-visible',
        ),
      ).toContain('outline: 2px solid var(--andes-color-focus-ring, #2563eb)');
    });
  });

  describe('hygiene', () => {
    it('gives every colour token a literal fallback', () => {
      const bare = css.match(/var\(--andes-color-[a-z-]+\)/g) ?? [];

      expect(bare).toEqual([]);
    });

    it('never starts a selector line with a combinator', () => {
      const lines = css.split('\n').filter((line) => /^\s*[>+~]\s/.test(line));

      expect(lines).toEqual([]);
    });
  });
});
