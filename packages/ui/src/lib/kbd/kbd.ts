import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  andesKeyInfo,
  andesParseShortcut,
  type AndesKeyInfo,
  type AndesKeyPlatformInput,
} from './kbd-key';

export type AndesKbdPlatform = AndesKeyPlatformInput;
export type AndesKbdSize = 'sm' | 'md' | 'lg';
export type AndesKbdVariant = 'default' | 'outline';

/** Text drawn between keys: `'+'` (default), `'then'` for a sequence, `'none'` for nothing, or
 *  any custom string. */
export type AndesKbdSeparator = '+' | 'then' | 'none' | (string & {});

/** One key cap as rendered by `AndesKbd` in shortcut mode. */
export interface AndesKbdKey extends AndesKeyInfo {
  /** The separator drawn before this key, `''` for the first key of a step. */
  readonly separator: string;
}

export function andesKbdSeparatorText(separator: AndesKbdSeparator): string {
  return separator === 'none' ? '' : separator;
}

/**
 * A keyboard key cap rendered as a real `<kbd>` element.
 *
 * Three ways to fill it:
 * - projected text: `<andes-kbd>Esc</andes-kbd>` is drawn exactly as written;
 * - `key`: `<andes-kbd key="Shift" />` draws the platform glyph (`⇧` on a Mac, `Shift`
 *   elsewhere) with an assistive-technology name;
 * - `shortcut`: `<andes-kbd shortcut="Mod+K" />` draws a whole combination as one key cap per
 *   key, joined by `separator`; `'G then I'` draws a two-step sequence.
 *
 * Glyph keys are hidden from the accessibility tree and replaced by a spoken name
 * ("Command"), because screen readers read pictograms such as `⌘` inconsistently.
 *
 * Colours come from `--andes-kbd-bg`, `--andes-kbd-color` and `--andes-kbd-border`, so a key
 * cap can be re-skinned for an inverted surface such as a tooltip.
 */
@Component({
  selector: 'andes-kbd',
  templateUrl: './kbd.html',
  styleUrl: './kbd.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'kbd',
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
  },
})
export class AndesKbd {
  /** Platform glyph set; `auto` detects it from the browser. Set it explicitly where server and
   *  client render must match. */
  readonly platform = input<AndesKbdPlatform>('auto');
  readonly size = input<AndesKbdSize>('md');
  readonly variant = input<AndesKbdVariant>('default');
  /** A single key name, e.g. `Mod`, `Shift`, `Enter`, `ArrowUp`. */
  readonly key = input<string | undefined>(undefined);
  /** A shortcut such as `Mod+K` or `G then I`. Takes precedence over `key`. */
  readonly shortcut = input<string | undefined>(undefined);
  /** Drawn between the keys of one step of `shortcut`. */
  readonly separator = input<AndesKbdSeparator>('+');

  /** Steps of the resolved shortcut; empty when the projected content is used. */
  protected readonly steps = computed<AndesKbdKey[][]>(() => {
    const platform = this.platform();
    const shortcut = this.shortcut();
    const key = this.key();
    const sequence =
      shortcut !== undefined && shortcut.trim() !== ''
        ? andesParseShortcut(shortcut)
        : key !== undefined && key !== ''
          ? [[key]]
          : [];
    const separator = andesKbdSeparatorText(this.separator());
    return sequence.map((step) =>
      step.map((name, index) => ({
        ...andesKeyInfo(name, platform),
        separator: index === 0 ? '' : separator,
      })),
    );
  });
}
