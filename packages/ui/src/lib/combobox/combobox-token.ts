import { InjectionToken } from '@angular/core';

import type { AndesCombobox } from './combobox';

/**
 * How the parts of a Combobox reach their root.
 *
 * The parts inject this token rather than the `AndesCombobox` class itself because the
 * root's own template now renders those same parts (the `[options]` mode), so the root
 * imports them - and a part importing the root class back as a runtime value would close
 * an ES module cycle whose evaluation order depends on which file a bundler happens to
 * reach first. A type-only import is erased, so this file carries no cycle at all.
 */
export const ANDES_COMBOBOX = new InjectionToken<AndesCombobox<unknown>>(
  'AndesCombobox',
);
