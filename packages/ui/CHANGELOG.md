## 0.1.0 (2026-10-18)

### 🚀 Features

- AndesButton default size is now 32px high with 14px text (xs 20px, sm 24px, lg 40px; icon-only squares match), and icon-only buttons size their icon to the control size. ([9293aabd](https://github.com/andes-ng/andes/commit/9293aabd))

  AndesButton adds a `filled` variant, a `color` input (primary, danger, success, warning, info) that tints the solid, outline, dashed, filled, ghost and link variants, a `danger` shorthand, `round` and `circle` shapes, and a `ripple` toggle. The new AndesButtonGroup joins adjacent buttons into one segmented control (horizontal or vertical) and passes its `size` to buttons that don't set their own.

  AndesButton motion is quieter: the press ripple is a 10% wash, the loading spinner turns once a second, and an invalid button shows only its danger focus outline (no extra halo).

- Add dashed variant, a customizable loadingIcon (TemplateRef, falls back to the default spinner), and auto-sizing for any projected SVG icon (1em, scales with each size class's font-size). ([d5ab3582](https://github.com/andes-ng/andes/commit/d5ab3582))
- Add htmlType (as 'type', defaulting to 'button' - never the native submit default), target (for href), and a real ghost display mode (transparent, tinted to the variant's own color - distinct from the existing ghost variant). ([1de4ed22](https://github.com/andes-ng/andes/commit/1de4ed22))
- Add icon-xs size, data-slot/data-variant/data-size attributes, and aria-label/aria-labelledby/aria-describedby/aria-invalid forwarding to the real button/anchor (never the non-interactive host). ([0c6934c6](https://github.com/andes-ng/andes/commit/0c6934c6))
- Add AndesButton, the first component: primary/secondary/danger/outline/ghost/link variants, sm/md/lg/icon sizes, pill shape, and a loading state. ([73124d4d](https://github.com/andes-ng/andes/commit/73124d4d))

### 🩹 Fixes

- AndesButton moves to the shared control scale: 24/32/40px sizes (sm/md/lg) with 14px text (16px at lg), 7px/15px inline padding and 4/6/8px radii, with matching square icon-only sizes, a subtler press ripple that is skipped under prefers-reduced-motion, and 0.1s color transitions. ([9e0802e0](https://github.com/andes-ng/andes/commit/9e0802e0))
- Set aria-disabled on the disabled link-form button (anchors have no native disabled state) and aria-busy on it while loading, so screen readers announce both. ([407c49cc](https://github.com/andes-ng/andes/commit/407c49cc))
- Fix the hovered secondary ghost-mode button in the dark theme: its text used the theme's near-white secondary foreground on the fixed white ghost fill (1.04:1); it now uses the fixed --andes-color-ghost-foreground. ([d12f01ae](https://github.com/andes-ng/andes/commit/d12f01ae))

### ❤️ Thank You

- Gutierrez Soto Jhosepmyr Orlando @jhosepmyr