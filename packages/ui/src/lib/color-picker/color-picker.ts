import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { AndesColor, type AndesColorInput } from './color';
import { clamp, type AndesColorFormat } from './color-math';
import { AndesColorArea, type AndesColorAreaChange } from './color-picker-area';
import { AndesColorSlider } from './color-picker-slider';
import { AndesColorPickerTrigger } from './color-picker-trigger';
import {
  ANDES_COLOR_PICKER_DEFAULT_LABELS,
  type AndesColorChangeEvent,
  type AndesColorPickerLabels,
  type AndesColorPickerPlacement,
  type AndesColorPickerShowText,
  type AndesColorPickerSize,
  type AndesColorPickerStatus,
  type AndesColorPreset,
} from './color-picker-types';

let nextUniqueId = 0;

/** What an empty picker starts editing from the first time the panel is used. */
const FALLBACK_COLOR = AndesColor.fromHsb(217, 91, 96);

const PLACEMENTS: Readonly<
  Record<
    AndesColorPickerPlacement,
    { side: AndesOverlaySide; align: AndesOverlayAlign }
  >
> = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
};

/** The channels the number fields edit. */
type AndesColorChannel = 'r' | 'g' | 'b' | 'h' | 's' | 'v' | 'a';

const CHANNEL_MAX: Readonly<Record<AndesColorChannel, number>> = {
  r: 255,
  g: 255,
  b: 255,
  h: 360,
  s: 100,
  v: 100,
  a: 100,
};

interface EyeDropperLike {
  open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>;
}

type EyeDropperConstructor = new () => EyeDropperLike;

interface PresetEntry {
  readonly color: AndesColor;
  readonly label: string;
}

interface PresetGroup {
  readonly label: string;
  readonly defaultOpen: boolean;
  readonly entries: readonly PresetEntry[];
}

/**
 * A colour picker: a swatch button that opens a panel with a saturation/brightness area, a
 * hue slider, an optional opacity slider, number and hex fields in three formats, labelled
 * groups of preset colours and, where the browser has one, an eyedropper.
 *
 * The value is text (`'#1677ff'`, `'rgb(22, 119, 255)'`, `'hsb(215, 91%, 100%)'`, named
 * colours...) or an {@link AndesColor}, and comes back the same way it went in: an
 * `AndesColor` in gives `AndesColor`s out, text in gives text in the current `format` out.
 * With no value yet, text is emitted.
 *
 * ```html
 * <andes-color-picker [(value)]="brand" showText allowClear />
 * <andes-color-picker [formControl]="accent" [presets]="presets" aria-label="Accent" />
 * ```
 *
 * `colorChange` fires for every change the user makes, including each step of a drag;
 * `colorChangeComplete` fires when a gesture ends (pointer release, a key press, a field
 * committed, a preset picked). Both carry the {@link AndesColor} and the value.
 *
 * ## Keyboard
 *
 * The area, the hue slider and the opacity slider are `role="slider"` elements: arrow keys
 * step by 1 (10 with Shift), `PageUp`/`PageDown` by 10, `Home`/`End` jump to the ends. In
 * the area, Left/Right change saturation and Up/Down brightness. The preset colours are a
 * listbox with one tab stop per group, navigated with the arrow keys.
 */
@Component({
  selector: 'andes-color-picker',
  imports: [
    AndesColorArea,
    AndesColorSlider,
    AndesOverlayContentPrimitive,
    AndesOverlayTriggerPrimitive,
    NgTemplateOutlet,
  ],
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesColorPicker),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real button instead: a screen reader never sees this wrapper, and a
    // static `id` left here would be a duplicate that a `<label for>` resolves to first.
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesColorPicker implements ControlValueAccessor {
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  private readonly triggerButton =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelTemplate =
    viewChild.required<TemplateRef<unknown>>('panel');

  /** Projected content marks a custom trigger look. */
  protected readonly customTrigger = contentChild(AndesColorPickerTrigger);
  protected readonly hasCustomTrigger = computed(
    () => this.customTrigger() !== undefined,
  );

  /**
   * The colour: text or an {@link AndesColor}; `null` for none. Two-way bindable as
   * `[(value)]`, and written by `ngModel` / `formControl` too, so a binding next to a form
   * control sees `valueChange` for values the form writes as well.
   */
  readonly value = model<AndesColorInput | null>(null);

  /**
   * Format of the fields, the trigger text and the emitted text. Setting it makes the format
   * controlled: the picker reports the user's choice through `formatChange` and shows the
   * format given here. Leave it unset to let the user choose, starting from `defaultFormat`.
   */
  readonly format = input<AndesColorFormat | undefined>(undefined);
  /** The format the picker starts in when `format` is not set. */
  readonly defaultFormat = input<AndesColorFormat>('hex');
  /** Hides the format switch, keeping the format as it is. */
  readonly disabledFormat = input(false, { transform: booleanAttribute });

  readonly size = input<AndesColorPickerSize>('md');
  readonly status = input<AndesColorPickerStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Adds a button to the panel that removes the colour. */
  readonly allowClear = input(false, { transform: booleanAttribute });
  /**
   * Shows the colour as text next to the swatch: `true` for the value in the current format,
   * or a template given the colour (`let-color let-value="value"`).
   */
  readonly showText = input<AndesColorPickerShowText>(false);
  /** Shows the opacity slider and field. Default `true`. */
  readonly showAlpha = input(true, { transform: booleanAttribute });
  /**
   * Takes opacity out of the value altogether: the controls are hidden and every emitted
   * colour is opaque. (`showAlpha="false"` only hides the controls, keeping any opacity the
   * value already has.)
   */
  readonly disabledAlpha = input(false, { transform: booleanAttribute });
  /** Labelled groups of preset colours under the picker. */
  readonly presets = input<readonly AndesColorPreset[]>([]);
  /** Shows the eyedropper where the browser supports one. Default `true`. */
  readonly eyeDropper = input(true, { transform: booleanAttribute });
  readonly placement = input<AndesColorPickerPlacement>('bottomLeft');
  /** Extra classes on the overlay pane - the hook for scoping custom properties. */
  readonly panelClass = input<string | readonly string[] | null>(null);
  /** Text shown with `showText` when there is no colour. */
  readonly placeholder = input('');
  /** Overrides any of the picker's strings, for translation. */
  readonly labels = input<Partial<AndesColorPickerLabels>>({});

  /** `id` of the trigger button, so a `<label for>` names it and focuses it when clicked. */
  readonly id = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /**
   * Whether the panel is open. Two-way bindable as `[(open)]`; `openChange` fires on every
   * transition, whatever caused it. A one-way `[open]` binding acts as a request.
   */
  readonly openState = model(false, { alias: 'open' });

  /**
   * Every change the user makes, including each step of a drag. Not called `change`: that
   * is a DOM event name, which a component output may not shadow.
   */
  readonly colorChange = output<AndesColorChangeEvent>();
  /** The end of a gesture: pointer released, key pressed, field committed, preset picked. */
  readonly colorChangeComplete = output<AndesColorChangeEvent>();
  /** The user removed the colour with the clear button. */
  readonly clear = output<void>();
  /** The user picked another format in the panel. */
  readonly formatChange = output<AndesColorFormat>();

  protected readonly uid = nextUniqueId++;
  protected readonly valueId = `andes-color-picker-value-${this.uid}`;
  protected readonly presetsId = `andes-color-picker-presets-${this.uid}`;

  protected readonly text = computed(() => ({
    ...ANDES_COLOR_PICKER_DEFAULT_LABELS,
    ...this.labels(),
  }));

  private readonly disabledByForm = signal(false);
  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  readonly isOpen = this.overlay.isOpen;

  private readonly formatState = linkedSignal(() => this.defaultFormat());
  /** The format in use: the controlled `format`, otherwise the user's choice. */
  protected readonly currentFormat = computed(
    () => this.format() ?? this.formatState(),
  );

  private readonly valueKind = signal<'string' | 'color'>('string');

  /** The value read as a colour; `null` when empty or not a colour. */
  private readonly parsedValue = computed(() => {
    const parsed = AndesColor.from(this.value());
    return parsed && this.disabledAlpha() ? parsed.withAlpha(1) : parsed;
  });

  /** The colour the trigger shows. */
  protected readonly displayColor = this.parsedValue;
  protected readonly isEmpty = computed(() => this.parsedValue() === null);

  /**
   * The colour being edited in the panel. Kept apart from the value because the value is
   * rounded text: dragging through black or grey would otherwise lose the hue.
   */
  protected readonly working = signal<AndesColor>(FALLBACK_COLOR);

  protected readonly alphaVisible = computed(
    () => this.showAlpha() && !this.disabledAlpha(),
  );

  protected readonly summary = computed(() => {
    const color = this.parsedValue();
    return color
      ? color.toFormat(this.currentFormat(), !this.disabledAlpha())
      : this.text().noColor;
  });

  /** Text of the trigger: the value, upper-cased when it is hex. */
  protected readonly triggerText = computed(() => {
    const color = this.parsedValue();
    if (!color) {
      return this.placeholder();
    }
    const value = this.summary();
    return value.startsWith('#') ? value.toUpperCase() : value;
  });

  protected readonly textTemplate = computed(() => {
    const show = this.showText();
    return typeof show === 'object' && show !== null ? show : null;
  });
  protected readonly textVisible = computed(() => this.showText() !== false);

  protected readonly textContext = computed(() => {
    const color = this.parsedValue();
    return color ? { $implicit: color, value: this.summary() } : null;
  });

  protected readonly triggerLabel = computed(() =>
    this.ariaLabelledby()
      ? null
      : `${this.ariaLabel() ?? this.text().trigger}, ${this.summary()}`,
  );
  protected readonly triggerLabelledby = computed(() => {
    const given = this.ariaLabelledby();
    return given ? `${given} ${this.valueId}` : null;
  });
  protected readonly invalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  protected readonly swatchColor = computed(
    () => this.parsedValue()?.toRgbString() ?? null,
  );

  // ----- Panel state -----------------------------------------------------------------

  protected readonly workingRgb = computed(() => this.working().toRgb());
  protected readonly workingHsb = computed(() => this.working().toHsb());
  protected readonly workingHueCss = computed(
    () => `hsl(${this.working().hue} 100% 50%)`,
  );
  protected readonly workingOpaque = computed(() =>
    this.working().withAlpha(1).toRgbString(),
  );
  protected readonly workingCss = computed(() => this.working().toRgbString());
  protected readonly workingAlphaPercent = computed(
    () => this.working().alpha * 100,
  );
  protected readonly workingHexDigits = computed(() =>
    this.working().toHex(false).slice(1).toUpperCase(),
  );
  protected readonly areaValueText = computed(() =>
    this.text()
      .areaValue.replace('{s}', String(Math.round(this.working().saturation)))
      .replace('{b}', String(Math.round(this.working().brightness))),
  );
  protected readonly hueValueText = computed(
    () => `${Math.round(this.working().hue)}°`,
  );
  protected readonly alphaValueText = computed(
    () => `${Math.round(this.working().alpha * 100)}%`,
  );

  protected readonly hexInvalid = signal(false);
  /** What the hex field holds while it is being edited, so typing is never rewritten. */
  private readonly hexDraft = signal<string | null>(null);
  protected readonly hexText = computed(
    () => this.hexDraft() ?? this.workingHexDigits(),
  );
  /** Spoken after a gesture ends, through a polite live region in the panel. */
  protected readonly announcement = signal('');

  protected readonly presetGroups = computed<readonly PresetGroup[]>(() =>
    this.presets().map((group) => ({
      label: group.label,
      defaultOpen: group.defaultOpen !== false,
      entries: group.colors.flatMap((entry): PresetEntry[] => {
        const color = AndesColor.from(entry);
        return color
          ? [
              {
                color,
                label: typeof entry === 'string' ? entry : color.toHex(),
              },
            ]
          : [];
      }),
    })),
  );
  private readonly groupOpenOverrides = signal<
    Readonly<Record<number, boolean>>
  >({});
  private readonly presetTabStops = signal<Readonly<Record<number, number>>>(
    {},
  );

  protected readonly supportsEyeDropper = computed(
    () => this.eyeDropper() && this.eyeDropperConstructor() !== null,
  );

  protected readonly side = computed(() => PLACEMENTS[this.placement()].side);

  /** The number fields of the current format (hex has its own text field). */
  protected readonly channels = computed<readonly AndesColorChannel[]>(() =>
    this.currentFormat() === 'hsb' ? ['h', 's', 'v'] : ['r', 'g', 'b'],
  );

  protected readonly formats: readonly {
    value: AndesColorFormat;
    label: string;
  }[] = [
    { value: 'hex', label: 'HEX' },
    { value: 'rgb', label: 'RGB' },
    { value: 'hsb', label: 'HSB' },
  ];

  private onChange: (value: AndesColorInput | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private hasPendingChange = false;
  private eyeDropperAbort: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.eyeDropperAbort?.abort());

    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      // `popover` is the closest preset: anchored to the trigger, click-opened, dismissed by
      // Escape and outside-click, no backdrop and no scroll lock. Focus moves into the panel
      // but is not trapped (the page stays usable); it goes to the area, which `open()`
      // focuses itself rather than leaving it to a search for the first tabbable element.
      autoFocus: 'none',
      positioning: {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 4,
        // Above or below the trigger only: beside it, the panel no longer reads as its own.
        crossSideFallback: false,
      },
    });

    effect(() => {
      const { side, align } = PLACEMENTS[this.placement()];
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side,
          align,
          sideOffset: 4,
          crossSideFallback: false,
        },
      });
    });

    effect(() => this.overlay.configure({ panelClass: this.panelClass() }));

    // Keeps the working colour in step with a value that changed from outside, but never
    // replaces it with a rounded reading of itself.
    effect(() => {
      const parsed = this.parsedValue();
      const value = this.value();
      untracked(() => {
        if (value instanceof AndesColor) {
          this.valueKind.set('color');
        } else if (typeof value === 'string') {
          this.valueKind.set('string');
        }
        if (parsed && !parsed.equals(this.working())) {
          this.working.set(parsed);
        }
      });
    });

    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });

    // `[open]` is honoured after render: the panel template and the trigger (the
    // positioning anchor) only exist once the view has rendered.
    afterRenderEffect(() => {
      const requested = booleanAttribute(this.openState());
      untracked(() => {
        if (requested && !this.overlay.isOpen()) {
          this.open();
        } else if (!requested && this.overlay.isOpen()) {
          this.close();
        }
      });
    });

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.openState.set(true);
    });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.eyeDropperAbort?.abort();
      this.openState.set(false);
      this.announcement.set('');
      this.onTouched();
    });
  }

  // ----- Public API ------------------------------------------------------------------

  /** Opens the panel. */
  open(): void {
    if (this.isDisabled() || this.overlay.isOpen()) {
      return;
    }
    this.overlay.open(this.panelTemplate(), {
      restoreFocusTo: this.triggerButton()?.nativeElement,
    });
    afterNextRender(
      () =>
        this.overlay
          .panelElement()
          ?.querySelector<HTMLElement>('andes-color-area')
          ?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  /** Closes the panel. */
  close(): void {
    this.overlay.close('imperative');
  }

  /** Opens the panel if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Moves focus to the trigger. */
  focus(options?: FocusOptions): void {
    this.triggerButton()?.nativeElement.focus(options);
  }

  /** Removes focus from the trigger. */
  blur(): void {
    this.triggerButton()?.nativeElement.blur();
  }

  /** Removes the colour, as the panel's clear button does. */
  clearValue(): void {
    if (this.isDisabled() || this.isEmpty()) {
      return;
    }
    this.hasPendingChange = false;
    this.value.set(null);
    this.onChange(null);
    this.clear.emit();
    this.announcement.set(this.text().noColor);
  }

  // ----- ControlValueAccessor --------------------------------------------------------

  writeValue(value: AndesColorInput | null | undefined): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: AndesColorInput | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  // ----- Trigger ---------------------------------------------------------------------

  protected onTriggerClick(): void {
    this.toggle();
  }

  protected onTriggerBlur(): void {
    if (!this.overlay.isOpen()) {
      this.onTouched();
    }
  }

  // ----- Editing ---------------------------------------------------------------------

  protected onAreaChange(change: AndesColorAreaChange): void {
    this.apply(
      this.working().withHsb({
        s: change.saturation,
        b: change.brightness,
      }),
    );
  }

  protected onAreaCommit(change: AndesColorAreaChange): void {
    this.apply(
      this.working().withHsb({
        s: change.saturation,
        b: change.brightness,
      }),
      true,
    );
  }

  protected onHueChange(hue: number, complete = false): void {
    // 360 is the same hue as 0: stopping just short keeps the handle at the far end.
    this.apply(this.working().withHsb({ h: Math.min(hue, 359.99) }), complete);
  }

  protected onAlphaChange(percent: number, complete = false): void {
    this.apply(this.working().withAlpha(percent / 100), complete);
  }

  protected onFormatSelect(format: string): void {
    if (format !== 'hex' && format !== 'rgb' && format !== 'hsb') {
      return;
    }
    this.formatState.set(format);
    this.formatChange.emit(format);
  }

  protected onChannelInput(
    channel: AndesColorChannel,
    field: HTMLInputElement,
  ): void {
    const parsed = field.value.trim() === '' ? NaN : Number(field.value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.apply(this.withChannel(channel, parsed));
  }

  protected onChannelCommit(
    channel: AndesColorChannel,
    field: HTMLInputElement,
  ): void {
    const parsed = field.value.trim() === '' ? NaN : Number(field.value);
    if (Number.isFinite(parsed)) {
      this.apply(this.withChannel(channel, parsed), true);
    }
    // Whatever was typed, the field now shows what the colour really is.
    field.value = String(this.channelValue(channel));
  }

  protected channelLabel(channel: AndesColorChannel): string {
    const text = this.text();
    switch (channel) {
      case 'r':
        return text.red;
      case 'g':
        return text.green;
      case 'b':
        return text.blue;
      case 'h':
        return text.hue;
      case 's':
        return text.saturation;
      case 'v':
        return text.brightness;
      default:
        return text.alpha;
    }
  }

  protected channelMax(channel: AndesColorChannel): number {
    return CHANNEL_MAX[channel];
  }

  protected channelValue(channel: AndesColorChannel): number {
    const rgb = this.workingRgb();
    const hsb = this.workingHsb();
    switch (channel) {
      case 'r':
        return rgb.r;
      case 'g':
        return rgb.g;
      case 'b':
        return rgb.b;
      case 'h':
        return hsb.h;
      case 's':
        return hsb.s;
      case 'v':
        return hsb.b;
      default:
        return Math.round(this.working().alpha * 100);
    }
  }

  protected onHexInput(field: HTMLInputElement): void {
    this.hexDraft.set(field.value);
    const parsed = this.parseHexField(field.value);
    this.hexInvalid.set(parsed === null && field.value.trim() !== '');
    if (parsed) {
      this.apply(parsed);
    }
  }

  protected onHexCommit(field: HTMLInputElement): void {
    const parsed = this.parseHexField(field.value);
    if (parsed) {
      this.apply(parsed, true);
    }
    this.hexInvalid.set(false);
    this.hexDraft.set(null);
    field.value = this.workingHexDigits();
  }

  protected onHexKeydown(event: KeyboardEvent, field: HTMLInputElement): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onHexCommit(field);
    }
  }

  protected selectPreset(entry: PresetEntry): void {
    this.apply(entry.color, true);
  }

  protected isPresetSelected(entry: PresetEntry): boolean {
    return !this.isEmpty() && entry.color.equals(this.working());
  }

  protected isGroupOpen(index: number): boolean {
    return (
      this.groupOpenOverrides()[index] ??
      this.presetGroups()[index]?.defaultOpen ??
      true
    );
  }

  protected toggleGroup(index: number): void {
    this.groupOpenOverrides.update((overrides) => ({
      ...overrides,
      [index]: !this.isGroupOpen(index),
    }));
  }

  /** The preset that takes the group's single tab stop. */
  protected presetTabStop(groupIndex: number): number {
    const group = this.presetGroups()[groupIndex];
    const selected = group?.entries.findIndex((entry) =>
      this.isPresetSelected(entry),
    );
    if (selected !== undefined && selected >= 0) {
      return selected;
    }
    return clamp(
      this.presetTabStops()[groupIndex] ?? 0,
      0,
      Math.max((group?.entries.length ?? 1) - 1, 0),
    );
  }

  protected onPresetKeydown(
    event: KeyboardEvent,
    groupIndex: number,
    entryIndex: number,
  ): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const list = (event.currentTarget as HTMLElement).parentElement;
    const options = Array.from(
      list?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const current = options[entryIndex];
    if (!current) {
      return;
    }

    let target: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        const forward =
          (event.key === 'ArrowRight') !==
          (this.document.defaultView?.getComputedStyle(current).direction ===
            'rtl');
        target =
          options[
            clamp(entryIndex + (forward ? 1 : -1), 0, options.length - 1)
          ];
        break;
      }
      case 'ArrowDown':
      case 'ArrowUp':
        target = this.neighbourInRow(
          options,
          current,
          event.key === 'ArrowDown' ? 1 : -1,
        );
        break;
      case 'Home':
        target = options[0];
        break;
      case 'End':
        target = options[options.length - 1];
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        current.click();
        return;
      default:
        return;
    }
    event.preventDefault();
    if (target) {
      this.presetTabStops.update((stops) => ({
        ...stops,
        [groupIndex]: options.indexOf(target as HTMLElement),
      }));
      target.focus();
    }
  }

  protected async pickWithEyeDropper(): Promise<void> {
    const Ctor = this.eyeDropperConstructor();
    if (!Ctor || this.isDisabled()) {
      return;
    }
    this.eyeDropperAbort?.abort();
    const abort = new AbortController();
    this.eyeDropperAbort = abort;
    try {
      const result = await new Ctor().open({ signal: abort.signal });
      const picked = AndesColor.parse(result.sRGBHex);
      if (picked && !abort.signal.aborted) {
        this.apply(picked.withAlpha(this.working().alpha), true);
      }
    } catch {
      // Cancelled with Escape, or aborted because the panel closed.
    } finally {
      if (this.eyeDropperAbort === abort) {
        this.eyeDropperAbort = null;
      }
    }
  }

  // ----- Internals -------------------------------------------------------------------

  private eyeDropperConstructor(): EyeDropperConstructor | null {
    const view = this.document.defaultView as
      (Window & { EyeDropper?: EyeDropperConstructor }) | null;
    return view?.EyeDropper ?? null;
  }

  private withChannel(channel: AndesColorChannel, input: number): AndesColor {
    const value = clamp(input, 0, CHANNEL_MAX[channel]);
    const current = this.working();
    const rgb = this.workingRgb();
    switch (channel) {
      case 'r':
        return AndesColor.fromRgb(
          value,
          rgb.g,
          rgb.b,
          current.alpha,
          current.hue,
        );
      case 'g':
        return AndesColor.fromRgb(
          rgb.r,
          value,
          rgb.b,
          current.alpha,
          current.hue,
        );
      case 'b':
        return AndesColor.fromRgb(
          rgb.r,
          rgb.g,
          value,
          current.alpha,
          current.hue,
        );
      case 'h':
        return current.withHsb({ h: value });
      case 's':
        return current.withHsb({ s: value });
      case 'v':
        return current.withHsb({ b: value });
      default:
        return current.withAlpha(value / 100);
    }
  }

  /** Reads the hex field; short forms keep the current opacity, 4 / 8 digits carry theirs. */
  private parseHexField(text: string): AndesColor | null {
    const digits = text.trim().replace(/^#/, '');
    if (![3, 4, 6, 8].includes(digits.length)) {
      return null;
    }
    const parsed = AndesColor.parse(`#${digits}`);
    if (!parsed) {
      return null;
    }
    const current = this.working();
    const { r, g, b } = parsed.toRgb();
    const hasAlpha = digits.length === 4 || digits.length === 8;
    return AndesColor.fromRgb(
      r,
      g,
      b,
      hasAlpha ? parsed.alpha : current.alpha,
      current.hue,
    );
  }

  private neighbourInRow(
    options: readonly HTMLElement[],
    current: HTMLElement,
    direction: 1 | -1,
  ): HTMLElement | undefined {
    const centre = current.offsetLeft + current.offsetWidth / 2;
    const rows = options.filter((option) =>
      direction === 1
        ? option.offsetTop > current.offsetTop
        : option.offsetTop < current.offsetTop,
    );
    if (rows.length === 0) {
      return undefined;
    }
    // The nearest row in that direction, then the swatch in it closest to this column.
    const rowTop =
      direction === 1
        ? Math.min(...rows.map((option) => option.offsetTop))
        : Math.max(...rows.map((option) => option.offsetTop));
    return rows
      .filter((option) => option.offsetTop === rowTop)
      .reduce((best, option) =>
        Math.abs(option.offsetLeft + option.offsetWidth / 2 - centre) <
        Math.abs(best.offsetLeft + best.offsetWidth / 2 - centre)
          ? option
          : best,
      );
  }

  /** Applies an edit made in the panel. */
  private apply(next: AndesColor, complete = false): void {
    if (this.isDisabled()) {
      return;
    }
    const color = this.disabledAlpha() ? next.withAlpha(1) : next;
    const previous = this.working();
    const wasEmpty = this.isEmpty();
    this.working.set(color);

    if (wasEmpty || !color.equals(previous)) {
      this.emitValue(color);
    }
    if (complete) {
      this.completeEdit(color);
    }
  }

  /** The colour as the value holds it: an `AndesColor` for those, otherwise text. */
  private outputFor(color: AndesColor): AndesColorInput {
    return this.valueKind() === 'color'
      ? color
      : color.toFormat(this.currentFormat(), !this.disabledAlpha());
  }

  private emitValue(color: AndesColor): void {
    const out = this.outputFor(color);
    this.value.set(out);
    this.onChange(out);
    this.colorChange.emit({ color, value: out });
    this.hasPendingChange = true;
  }

  private completeEdit(color: AndesColor): void {
    // A gesture that changed nothing (a key at the end of its range, a click on the
    // current colour) is not a change to report.
    if (!this.hasPendingChange) {
      return;
    }
    this.hasPendingChange = false;
    const value = this.outputFor(color);
    this.colorChangeComplete.emit({ color, value });
    this.announcement.set(
      color.toFormat(this.currentFormat(), !this.disabledAlpha()),
    );
  }
}
