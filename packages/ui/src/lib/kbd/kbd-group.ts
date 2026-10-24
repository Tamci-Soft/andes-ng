import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AndesKbd, andesKbdSeparatorText } from './kbd';
import type {
  AndesKbdPlatform,
  AndesKbdSeparator,
  AndesKbdSize,
  AndesKbdVariant,
} from './kbd';

/**
 * Lays several key caps out as one shortcut, with a separator between neighbours.
 *
 * Give it the keys as data (`[keys]="['Mod', 'K']"`, drawn as `AndesKbd`s) or project
 * `<andes-kbd>` children yourself. For projected children the separator is drawn by
 * the stylesheet between siblings, which supports `+`, `then` and custom text but is not
 * announced consistently - prefer `keys` when the separator carries meaning.
 */
@Component({
  selector: 'andes-kbd-group',
  imports: [AndesKbd],
  templateUrl: './kbd-group.html',
  styleUrl: './kbd-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    'data-slot': 'kbd-group',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-separator]': 'separator()',
    '[style.--_kbd-separator]': 'cssSeparator()',
  },
})
export class AndesKbdGroup {
  /** Key names to render, e.g. `['Mod', 'Shift', 'P']`. */
  readonly keys = input<readonly string[]>([]);
  readonly separator = input<AndesKbdSeparator>('+');
  readonly size = input<AndesKbdSize>('md');
  readonly variant = input<AndesKbdVariant>('default');
  readonly platform = input<AndesKbdPlatform>('auto');
  /** Accessible name of the group, e.g. "Command palette shortcut". */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly separatorText = computed(() =>
    andesKbdSeparatorText(this.separator()),
  );

  protected readonly cssSeparator = computed(() => {
    const text = this.separatorText();
    return text ? `"${text.replace(/["\\]/g, '\\$&')}"` : '""';
  });
}
