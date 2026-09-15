# Toast / Notification

Ant Design splits this space into two distinct components: **Message** (a lightweight, auto-dismissing status line at the top-center of the screen, for simple operation feedback) and **Notification** (a richer, corner-anchored toast with a title + description, longer-lived and more prominent). shadcn/ui has a single toast concept covering both roughly, positioned at a corner like Ant's Notification but simpler like Ant's Message.

**Important finding from live docs (verify against your installed shadcn version — this is a fast-moving part of shadcn):** the task brief assumed shadcn's page at `/docs/components/sonner` documents wrapping the third-party `sonner` library, because that was true in shadcn's 2024–2025 docs (shadcn had deprecated its original hand-rolled Toast component in favor of a thin wrapper around `sonner`). Fetching the live page in 2026 shows something further has changed: the `/docs/components/sonner` URL now resolves to a page whose own title (`h1`) is **"Toast"**, its install command is `pnpm dlx shadcn@latest add toast` (not `add sonner`), its import path is `@/components/ui/toast` (not from the `sonner` package), and the fetched content contains **no mention of the word "sonner" anywhere on the page**. The components index also lists a standalone `Toast` entry (under a `base/` route segment alongside `alert`, `alert-dialog`, and a `message`/`message-scroller` pair), with no separate "Sonner" entry. In other words: shadcn appears to have moved a second time — from (1) a custom Toast, to (2) wrapping `sonner`, to (3) a new native Toast built on a headless primitive (consistent with the same Base UI migration affecting the rest of shadcn's interactive components) that now lives at the same doc slug the `sonner` wrapper used to occupy. Document both states explicitly since a coding agent may encounter either depending on which shadcn version is installed:
- **Legacy (sonner-wrapper) shape**: `import { Toaster } from "@/components/ui/sonner"` mounted once in the root layout; `import { toast } from "sonner"` called as a function, e.g. `toast("Event created")`, `toast.success(...)`, `toast.promise(...)`. Theming was done via a `theme` prop on `<Toaster theme="system" />` and CSS variables sonner itself exposes, not shadcn's `--background`/`--foreground` set directly (sonner ships its own token names that shadcn's install step maps onto the project's palette).
- **Current (native Toast) shape, per the live docs fetched for this report**: `import { Toaster } from "@/components/ui/toast"` mounted once in the root layout; `import { toast } from "@/components/ui/toast"` called with an object API, e.g. `toast.add({ title, description })`, plus `toast.promise()` and `toast.close()`. The docs explicitly defer several details ("manager options, stacking, swipe dismissal, and the primitive API") to the underlying Base UI Toast documentation rather than restating them.

## 1. Anatomy / compound structure

### shadcn/ui
- **Toaster** — the single mount-point component placed once near the root of the app; renders the stack/queue of active toasts and owns positioning, stacking order, and swipe-to-dismiss gesture handling.
- **`toast` object/function** — the imperative API used anywhere in the app to enqueue a toast: `toast.add(options)` (current native API) with `type` values `success | info | warning | error | loading`, plus `toast.promise()` for async lifecycles and `toast.close()` to dismiss programmatically. (Legacy sonner-wrapper shape: `toast(message)` as a callable function with `.success()`/`.error()`/etc. convenience methods.)
- No manually-composed sub-components are rendered by the consumer (unlike Alert/Avatar) — the individual toast's internal structure (icon, title, description, action button, close button) is templated internally by the Toaster/primitive rather than assembled by the app.
- Underlying primitive: the current native Toast is built on a headless toast primitive from the Base UI family (the docs explicitly point to "the Base UI Toast documentation" for manager/stacking/swipe details), consistent with the broader Base UI migration. The legacy shape wrapped the third-party `sonner` library instead, which has no relationship to Radix or Base UI at all — it's an independent toast library with its own animation/stacking engine.

### Ant Design — Message
- **`message` API** — a purely imperative, no-JSX-anatomy API: `message.success()`, `message.error()`, `message.info()`, `message.warning()`, `message.loading()`, and the generic `message.open(config)`.
- **`message.useMessage()`** — the recommended hook form, returning an `api` (same methods as above) and a `contextHolder` node that must be rendered somewhere in the tree so the message can inherit `ConfigProvider` context (locale/theme/prefixCls) — the plain static `message.success()` form cannot see `ConfigProvider` context.
- Global controls: `message.config(options)` (legacy global configuration) and `message.destroy(key?)`.

### Ant Design — Notification
- **`notification` API** — imperative: `notification.success()`, `notification.error()`, `notification.info()`, `notification.warning()`, and the generic `notification.open(config)`.
- **`notification.useNotification()`** — the recommended hook form (same `api`/`contextHolder` pattern as Message, for the same ConfigProvider-context reason).
- Global controls: `notification.config(options)` and `notification.destroy(key?)`.
- Each notification instance's content anatomy (configured via the `config` object passed to `open`/`success`/etc., not via JSX composition) includes: icon, title, description, a close button, an optional action-button group (`actions`, replacing the deprecated `btn`), and an optional auto-close progress bar (`showProgress`).

## 2. Props / API

### shadcn/ui — `toast.add()` options (current native Toast)
| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` | — | Primary message text |
| `description` | `ReactNode` | — | Secondary message text |
| `type` | `"success" \| "info" \| "warning" \| "error" \| "loading"` | — | Status styling |
| `actionProps` | object (button props) | — | Renders an action button inside the toast with these props |
| `duration` | `number` (implied) | — | Auto-dismiss timeout; exact default not stated in the fetched docs — treat as unconfirmed and verify against the installed version |
| `onDismiss` | function (implied) | — | Callback when the toast is dismissed; exact signature not confirmed in the fetched docs |

`toast.promise(promise, { loading, success, error })` — maps a promise's lifecycle to loading/success/error toast states (options object shape not fully enumerated in the fetched docs; consistent with sonner's well-known `toast.promise` shape).
`toast.close(id)` — dismiss a specific toast by id.

**Toaster** props: the fetched docs explicitly defer "manager options, stacking, swipe dismissal, and the primitive API" to the Base UI Toast reference rather than enumerating them on the shadcn page itself — treat the exact prop list (e.g. position/placement, gap, expand-on-hover, swipe direction) as **not fully documented on the shadcn page** and requiring a follow-up read of Base UI's own Toast docs before implementation.

### Ant Design — Message
| Property | Type | Default | Description |
|---|---|---|---|
| `content` | `ReactNode` | — | Message body |
| `duration` | `number` | `3` | Auto-dismiss delay in seconds; `0` disables auto-dismiss |
| `onClose` | function | — | Callback when the message closes |
| `icon` | `ReactNode` | — | Custom icon |
| `key` | `string \| number` | — | Identifier, used to update an existing message in place |
| `pauseOnHover` | `boolean` | `true` | Pause the auto-dismiss timer while hovered |
| `className` | `string` | — | Custom class |
| `style` | `CSSProperties` | — | Inline styles |

**Global `message.config(options)`:**
| Option | Type | Default | Description |
|---|---|---|---|
| `top` | `string \| number` | `8` | Distance from the viewport top |
| `duration` | `number` | `3` | Default auto-dismiss seconds |
| `maxCount` | `number` | — | Max simultaneous messages shown |
| `getContainer` | `() => HTMLElement` | `document.body` | Mount point |
| `prefixCls` | `string` | `ant-message` | CSS class prefix |
| `rtl` | `boolean` | `false` | Right-to-left layout |
| `stack` | `boolean \| { threshold: number }` | `false` | Whether/when to visually stack multiple messages |

### Ant Design — Notification
| Property | Type | Default | Description |
|---|---|---|---|
| `title` (`message`) | `ReactNode` | — | Notification heading (long-standing prop name is `message`; current docs surface it as `title` — verify exact name against the installed version, same caveat as Alert's `message`/`title`) |
| `description` | `ReactNode` | — | Body content (documented as effectively required for a meaningful notification) |
| `placement` | `'top' \| 'bottom' \| 'topLeft' \| 'topRight' \| 'bottomLeft' \| 'bottomRight'` | `'topRight'` | Corner/edge position |
| `duration` | `number \| false` | `4.5` | Auto-close seconds; `0`/`false` disables auto-close |
| `icon` | `ReactNode` | — | Custom icon |
| `closable` | `boolean \| ClosableType` | `true` | Whether a close button is shown |
| `closeIcon` | `ReactNode` | `true` | Custom close icon |
| `actions` | `ReactNode` | — | Action button group (replaces the deprecated `btn` prop) |
| `onClick` | function | — | Handler when the notification body is clicked |
| `onClose` | function | — | Handler when the notification closes |
| `showProgress` | `boolean` | — | Show an auto-close countdown progress bar |
| `pauseOnHover` | `boolean` | `true` | Pause the auto-close timer on hover |
| `className` | `string` | — | Custom class |
| `style` | `CSSProperties` | — | Inline styles |
| `role` | `'alert' \| 'status'` | `'alert'` | Screen-reader semantics for the notification region |

**Global `notification.config(options)`:**
| Option | Type | Default | Description |
|---|---|---|---|
| `placement` | string | `'topRight'` | Default corner |
| `top` | `number` | `24` | Distance from viewport top (px) |
| `bottom` | `number` | `24` | Distance from viewport bottom (px) |
| `duration` | `number` | `4.5` | Default auto-close seconds |
| `getContainer` | `() => HTMLElement` | `() => document.body` | Mount point |
| `maxCount` | `number` | — | Max notifications shown; oldest dropped beyond this |
| `rtl` | `boolean` | `false` | Right-to-left layout |
| `showProgress` | `boolean` | — | Show progress bar globally |
| `pauseOnHover` | `boolean` | `true` | Pause timers on hover globally |

## 3. Variants, sizes and states

### shadcn/ui
- Status/type values (current native Toast): `success`, `info`, `warning`, `error`, `loading` — note this is one of the few shadcn components with first-class success/warning/info states baked into the primitive itself, unlike Badge/Alert which have no such variants.
- Action buttons via `actionProps`.
- Promise-driven lifecycle via `toast.promise()` (loading → success/error).
- Stacking/queueing: multiple toasts stack in the Toaster; exact stacking/expand/collapse behavior is deferred to Base UI's own docs rather than restated by shadcn.
- Swipe-to-dismiss is mentioned as a Toaster-level capability, direction/config left to the primitive docs.

### Ant Design — Message
- Type methods: `success`, `error`, `info`, `warning`, `loading` (`loading` is unique to Message among the two — it's meant for in-progress operations and typically paired with a manual `destroy()`/promise-then chain rather than a fixed duration).
- Stacking: opt-in via `stack: true` or `stack: { threshold }` in `message.config()` — by default multiple messages queue/replace rather than visually stack.
- Updating in place via a shared `key`.

### Ant Design — Notification
- Type methods: `success`, `error`, `info`, `warning` (no `loading` type, unlike Message).
- Placement: 6 positions (`top`, `bottom`, and the 4 corners), independently configurable from Message (which is always top-center).
- `showProgress`: optional visual countdown to auto-close.
- Action area via `actions` (current) vs. deprecated single `btn`.

## 4. Accessibility

### shadcn/ui
The fetched docs for the current native Toast explicitly state they do not document ARIA roles, `aria-live` regions, or announcement behavior on the shadcn page itself, instead saying "See the Base UI Toast documentation for details." This must be treated as **an open verification item**, not an assumption of compliance — a coding agent implementing andes-ng's toast must independently confirm (from Base UI's own primitive docs, not shadcn's page) whether the primitive applies a live region automatically, and what role/politeness it uses, before assuming screen reader users will hear the toast. The legacy sonner-wrapper library is independently known in the broader ecosystem to render its viewport as a live region, but that fact was not present in the pages fetched for this report and should likewise be verified directly rather than assumed carried over to the new native implementation.

### Ant Design
- **Notification** explicitly documents a `role` prop, `'alert' | 'status'`, defaulting to `'alert'` — i.e. Ant's Notification is documented to interrupt screen readers by default (assertive live region semantics), with an explicit opt-out to the calmer `'status'` (polite) semantics for less urgent notifications. This is the clearest, most explicit accessibility documentation found across all four components researched for this set of docs.
- **Message** has no equivalent documented `role` prop in the fetched content — its live-region/ARIA behavior is **not confirmed** by the docs and should be treated as undocumented rather than assumed to mirror Notification's explicit behavior.
- Both support `aria-*`/`data-*` pass-through via a `props` config option (mentioned for Notification; likely similar for Message though not explicitly confirmed).
- Close buttons (`closeIcon`) can be customized or hidden (`null`/`false`); no explicit accessible-name documentation was found for the default close button — verify rather than assume.

## 5. Design tokens

### shadcn/ui
No dedicated tokens exist for Toast. The fetched docs for the current native Toast explicitly state no CSS variables or custom styling options are documented on the page — styling is deferred entirely to the Base UI primitive's own styling contract (likely data-attribute-driven, e.g. `data-type="success"`, rather than shadcn's usual `--variable` reuse pattern). Based on general shadcn convention (unconfirmed for this specific component) it would be expected to reuse `--popover`/`--popover-foreground` (as the toast is a floating, elevated surface like a popover) and `--border`, but this specific mapping was **not confirmed** in the fetched content and should not be presented to a coding agent as settled fact.

### Ant Design — Message (full component Design Token table)
| Token | Description | Default value |
|---|---|---|
| `contentBg` | Message background | `#ffffff` |
| `contentPadding` | Internal padding | `9px 12px` |
| `zIndexPopup` | Stacking layer depth | `2010` |

These derive from global tokens including `colorBgElevated` (elevated-surface background family, which `contentBg` specializes), `colorError`/`colorSuccess`/`colorWarning`/`colorInfo` (per-type icon/text coloring), `borderRadiusLG`, `boxShadow`, `fontSize`, `margin`-family spacing tokens, and the shared `motion`-family tokens (enter/exit animation timing).

### Ant Design — Notification (full component Design Token table)
| Token | Description | Default value |
|---|---|---|
| `colorErrorBg` | Error-type notification background | (derived, not given as a raw literal in the fetched table) |
| `colorInfoBg` | Info-type notification background | (derived) |
| `colorSuccessBg` | Success-type notification background | (derived) |
| `colorWarningBg` | Warning-type notification background | (derived) |
| `progressBg` | Auto-close progress bar background | `linear-gradient(90deg, #69b1ff, #1677ff)` |
| `width` | Notification panel width | `384` |
| `zIndexPopup` | Stacking layer depth | `2050` |

These derive from the same four global status Seed tokens as Alert (`colorError`, `colorInfo`, `colorSuccess`, `colorWarning`, each with an auto-generated `*Bg` Map Token), plus `fontSize`, `boxShadow`, and `borderRadiusLG` for the panel's general chrome, and `colorPrimary` (visible in the `progressBg` gradient's blue tones) for the default progress indicator.

## 6. Notes for andes-ng implementation
- Not yet implemented in `packages/ui/src/lib` or `packages/primitives/src/lib` — greenfield, and this is the component in this set of four most likely to require genuinely new behavior primitives rather than pure styling.
- **Dedicated behavior primitive needed in `@andes-ng/primitives`**: a **toast/notification queue-and-stacking manager** — tracking an ordered list of active toast instances, assigning ids, handling auto-dismiss timers (with pause-on-hover), enforcing `maxCount`, and exposing an imperative `add`/`update`/`dismiss`/`clear` API that a `<AndesToaster>` root component renders. This is exactly the kind of state-machine logic neither Badge nor Alert need, and both reference libraries (shadcn's Base UI-backed manager, Ant's Message/Notification managers) treat it as non-trivial enough to be a dedicated subsystem rather than component-local state.
- **Dedicated behavior primitive needed: a live-region announcer.** Regardless of which visual toast component is showing, the actual screen-reader announcement should be driven by a single shared `aria-live` region primitive (e.g. `createLiveRegionAnnouncer()` — a visually-hidden `role="status"`/`role="alert"` container that receives text updates), decoupled from the visual toast's own DOM node. This avoids the exact ambiguity found in the research above (shadcn's docs punting entirely to Base UI's primitive; Ant only clearly documenting `role` for Notification, not Message) — andes-ng should not leave this to chance per-component and should build one shared, tested announcer used by both a "message"-style and "notification"-style toast.
- Consider following Ant's split rather than shadcn's unified one: a lightweight `AndesMessage` (brief, top-center, icon+text only) and a richer `AndesNotification` (corner-anchored, title+description+actions+optional progress bar) are meaningfully different enough in layout and urgency to justify two components sharing one underlying queue/announcer primitive, rather than one `AndesToast` trying to serve both roles.
- Token mapping to `packages/tokens/src/theme.css`:
  - Elevated surface background → `--andes-color-card` / `--andes-color-card-foreground` (closest existing analog to Ant's `contentBg`/`colorBgElevated` and the expected-but-unconfirmed shadcn `--popover` mapping).
  - Border → `--andes-color-border`.
  - Corner radius → `--andes-radius-lg` (Ant's Notification panel uses `borderRadiusLG` = `8`, matching `--andes-radius-lg` at `0.5rem`).
  - Padding/gaps → `--andes-space-3`/`--andes-space-4` (Ant Message's `9px 12px` is close to `--andes-space-2`/`--andes-space-3`).
  - Error/destructive status → `--andes-color-danger` family (exists).
  - **Missing tokens (flag for addition — same root gap as Alert and Badge/Tag)**: andes-ng has no `--andes-color-success`, `--andes-color-warning`, or `--andes-color-info`. This is arguably the single most consequential place this gap shows up: Ant's Message/Notification and (per the research above) even shadcn's *current* native Toast bake `success`/`warning`/`info`/`error` in as first-class status types, meaning andes-ng cannot ship a Toast/Notification component with real parity to either reference library until these three token families (each ideally with base/hover/active/foreground/background-tint/border variants, mirroring the existing `--andes-color-primary-*`/`--andes-color-danger-*` shape) are added to `theme.css`. Recommend treating this token addition as a prerequisite task before implementing Alert or Toast/Notification, since both need it identically.
- Accessibility pitfall (the big one, called out explicitly in this task): **a toast/notification that appears without being wired into an `aria-live` region is invisible to screen reader users**, because it typically isn't the focused element and nothing else prompts assistive tech to read it. The research above found this is a genuine, currently-unresolved-in-the-docs question for shadcn's newest native Toast (which defers entirely to Base UI's own reference) and only half-resolved for Ant (Notification documents `role: 'alert' | 'status'`; Message does not document anything equivalent). andes-ng must not copy either library's documentation gap — the shared live-region announcer primitive above should be treated as a hard requirement, tested with an actual screen reader or at minimum an automated `aria-live` presence check, before this component is considered done.
