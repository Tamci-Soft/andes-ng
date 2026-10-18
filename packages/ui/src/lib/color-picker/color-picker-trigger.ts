import { Directive } from '@angular/core';

/**
 * Marks content projected into `<andes-color-picker>` as the trigger's own look, replacing
 * the default swatch. The picker still renders (and owns) the button, its keyboard
 * handling and its ARIA state; the projected content is only what shows inside it.
 *
 * ```html
 * <andes-color-picker [(value)]="brand">
 *   <span andesColorPickerTrigger>Pick a brand color</span>
 * </andes-color-picker>
 * ```
 */
@Directive({
  selector: '[andesColorPickerTrigger]',
})
export class AndesColorPickerTrigger {}
