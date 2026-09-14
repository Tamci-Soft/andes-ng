# 8. Own behavior primitives incrementally in `@andes-ng/primitives`

## Status

Accepted

## Context

ADR 0004 accepted `@spartan-ng/brain` as an implementation dependency of `@andes-ng/ui`, while naming "an isolated behavior package" or "copy-owned primitives under their original MIT attribution" as fallback options if Brain's cost ever became unacceptable — not a hard fork of the full Spartan repository.

Building the first component (`AndesButton`) raised the question directly: Radix Primitives, the library shadcn/ui builds on, is React-only and not usable from Angular at all — it was never a real alternative. Spartan Brain itself is built on Angular CDK (verified directly in its source: nearly every non-trivial primitive imports `@angular/cdk`), adding Radix-style ergonomics on top. A full, from-scratch fork of Spartan Brain's 35+ primitives was scoped and rejected: it would take months, and take on the ongoing accessibility-maintenance burden of every primitive we forked, most of which nothing in Andes uses yet.

`BrnButton`, the one primitive `AndesButton` actually depended on, is small: a single directive (~20 lines) reflecting `disabled`/`data-disabled`/`tabindex` and preventing navigation on a disabled anchor (native `<a>` has no `disabled` attribute). Small enough to write as Andes's own original implementation, not a copy of Spartan's file, using the same public Angular API (`HOST_TAG_NAME`) Spartan uses.

## Decision

Introduce `@andes-ng/primitives`: Andes-owned, unstyled, accessible Angular directives, replacing Spartan Brain one primitive at a time as each is small enough to own outright. `AndesButtonPrimitive` is the first, replacing `BrnButton` for `AndesButton`. `@spartan-ng/brain` is removed from `@andes-ng/ui`'s dependencies now that nothing in it uses it.

This is not a fork: primitives here are Andes's own implementation of a documented behavior contract, not copies of Spartan's source, so no MIT attribution is owed for them. A future primitive complex enough that copying Spartan's actual file is the sane choice would need that attribution, per ADR 0004's own terms — this ADR doesn't change that.

Spartan Brain remains an option for any future component whose behavior is too complex to justify writing in-house yet (for example, `Combobox` or `Dialog`, which lean on Angular CDK overlay/focus-trap machinery that would take real time to get right). ADR 0004's adapter boundary — consumers only ever program against Andes APIs — already made this swap possible without a public breaking change, which is why this decision costs nothing to defer piece by piece rather than pay for all at once.

## Consequences

- `@andes-ng/ui`'s dependency graph drops `@spartan-ng/brain`, `tailwindcss` and `tw-animate-css` entirely — the peer-dependency install overhead ADR 0004 flagged as accepted-but-visible is gone for good, not just for Button.
- Each future component picks its primitive source case by case: write our own in `@andes-ng/primitives` when the behavior is small and well-understood (most form controls); reach for Spartan Brain when it isn't (overlay-based components, complex keyboard/focus graphs) — ADR 0004's adapter pattern still applies whichever is chosen.
- `@andes-ng/primitives` carries its own accessibility-correctness burden for whatever it contains. Each primitive added here needs the same rigor Spartan/Radix apply — real keyboard and screen-reader testing — not just an implementation that visually behaves right.
- `AndesButtonPrimitive` is an implementation dependency of `@andes-ng/ui`, on the same terms as Spartan Brain was: never re-exported, never a public Andes API.

## Sources

- [ADR 0004](0004-spartan-brain-behind-andes-adapters.md)
- [Spartan Brain button source](https://github.com/spartan-ng/spartan/blob/main/libs/brain/button/src/lib/brn-button.ts)
- [Radix Primitives](https://www.radix-ui.com/primitives) (React-only — confirmed no Angular support exists)
- [Angular `HOST_TAG_NAME`](https://angular.dev/api/core/HOST_TAG_NAME)
