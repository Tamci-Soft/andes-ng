# 7. Integrate specialized components through Andes-owned adapters

## Status

Proposed

## Context

Organizational charts, resource rosters/timelines and video players have interaction, rendering and licensing concerns that exceed general CRUD components. A general UI suite or headless primitive library is unlikely to cover them adequately. Building graph layout, timeline virtualization or media playback from zero would create avoidable risk.

## Decision

Select specialized engines through proof-of-concept evaluations and place each behind an Andes-owned adapter API. Keep domain data models separate from vendor models through explicit mapping functions. Lazy-load large engines, isolate vendor CSS and expose accessible fallback views.

Initial candidates for evaluation are:

- D3 hierarchy or ELK for organizational layout, with Andes owning node rendering, keyboard navigation and zoom controls.
- Bryntum Scheduler, Syncfusion Scheduler/Gantt or a composition of Angular CDK virtual scrolling with a dedicated timeline engine for rosters; licensing is an explicit selection criterion.
- Native HTML `<video>` first, with Video.js only when consistent controls, streaming plugins or analytics justify it.

Do not add these engines to the root `@andes-ng/ui` entry point until a consumer use case and bundle budget exist. The final package/entry-point boundary requires a follow-up ADR after the spikes.

## Consequences

- Andes retains a stable product-facing API while vendors can change.
- Large optional dependencies do not penalize basic CRUD consumers by default.
- Adapter, accessibility and domain-mapping tests are mandatory.
- Licensing, virtualization performance and mobile behavior must be measured before acceptance.

## Sources

- [Angular CDK virtual scrolling](https://material.angular.dev/cdk/scrolling/overview)
- [D3 hierarchy](https://d3js.org/d3-hierarchy)
- [Eclipse Layout Kernel](https://eclipse.dev/elk/)
- [Video.js](https://videojs.com/)
