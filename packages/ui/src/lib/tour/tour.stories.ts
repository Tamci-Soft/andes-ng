import {
  Component,
  computed,
  inject,
  input,
  signal,
  type TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesTour } from './tour';
import type {
  AndesTourCloseEvent,
  AndesTourIndicators,
  AndesTourLabels,
  AndesTourMask,
  AndesTourPlacement,
  AndesTourStep,
  AndesTourType,
} from './tour-types';

/** A small admin page the tours point at. */
const PAGE_STYLES = `
  andes-story-tour, andes-story-tour-controlled { display: block; font: 14px/22px var(--andes-font-family, system-ui), sans-serif; color: var(--andes-color-foreground); }
  andes-story-tour .page, andes-story-tour-controlled .page { display: grid; grid-template-columns: 11rem 1fr; min-height: 26rem; border: 1px solid var(--andes-color-border); border-radius: 0.5rem; background: var(--andes-color-background); overflow: hidden; }
  andes-story-tour .side, andes-story-tour-controlled .side { padding: 1rem 0.75rem; border-inline-end: 1px solid var(--andes-color-border); display: flex; flex-direction: column; gap: 0.25rem; }
  andes-story-tour .side strong, andes-story-tour-controlled .side strong { font-size: 16px; line-height: 24px; padding: 0 0.5rem 0.75rem; }
  andes-story-tour .side a, andes-story-tour-controlled .side a { padding: 0.25rem 0.5rem; border-radius: 0.375rem; color: inherit; text-decoration: none; }
  andes-story-tour .side a.active, andes-story-tour-controlled .side a.active { background: var(--andes-color-accent); font-weight: 500; }
  andes-story-tour .main, andes-story-tour-controlled .main { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  andes-story-tour .bar, andes-story-tour-controlled .bar { display: flex; gap: 0.5rem; align-items: center; }
  andes-story-tour .bar input, andes-story-tour-controlled .bar input { flex: 1; min-width: 0; height: 2rem; box-sizing: border-box; padding: 0 0.6875rem; border: 1px solid var(--andes-color-input); border-radius: 0.375rem; background: var(--andes-color-background); color: inherit; font: inherit; }
  andes-story-tour button.act, andes-story-tour-controlled button.act { height: 2rem; padding: 0 0.6875rem; border: 0; border-radius: 0.375rem; background: var(--andes-color-primary); color: var(--andes-color-primary-foreground); font: inherit; font-weight: 500; cursor: pointer; }
  andes-story-tour .avatar, andes-story-tour-controlled .avatar { width: 2rem; height: 2rem; border-radius: 9999px; background: var(--andes-color-accent); display: grid; place-items: center; font-weight: 600; }
  andes-story-tour .stats, andes-story-tour-controlled .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  andes-story-tour .stat, andes-story-tour-controlled .stat { padding: 0.75rem; border: 1px solid var(--andes-color-border); border-radius: 0.5rem; }
  andes-story-tour .stat b, andes-story-tour-controlled .stat b { display: block; font-size: 20px; line-height: 28px; }
  andes-story-tour .stat span, andes-story-tour-controlled .stat span { color: var(--andes-color-muted-foreground); font-size: 12px; line-height: 20px; }
  andes-story-tour table, andes-story-tour-controlled table { width: 100%; border-collapse: collapse; }
  andes-story-tour th, andes-story-tour td, andes-story-tour-controlled th, andes-story-tour-controlled td { text-align: start; padding: 0.5rem; border-bottom: 1px solid var(--andes-color-border); }
  andes-story-tour th, andes-story-tour-controlled th { color: var(--andes-color-muted-foreground); font-weight: 500; }
  andes-story-tour .toolbar, andes-story-tour-controlled .toolbar { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  andes-story-tour .toolbar button, andes-story-tour-controlled .toolbar button { height: 2rem; padding: 0 0.6875rem; border: 1px solid var(--andes-color-input); border-radius: 0.375rem; background: var(--andes-color-background); color: inherit; font: inherit; cursor: pointer; }
`;

const PAGE = `
  <div class="page">
    <nav class="side" aria-label="Main">
      <strong>Acme</strong>
      <a class="active" href="#overview" id="nav-overview">Overview</a>
      <a href="#orders" id="nav-orders">Orders</a>
      <a href="#customers">Customers</a>
      <a href="#settings">Settings</a>
    </nav>
    <div class="main">
      <div class="bar">
        <input id="search" type="search" placeholder="Search orders" aria-label="Search orders" />
        <button class="act" id="create" type="button">New order</button>
        <span class="avatar" id="profile" aria-label="Your profile" role="img">JG</span>
      </div>
      <div class="stats" id="stats">
        <div class="stat"><b>128</b><span>Orders today</span></div>
        <div class="stat"><b>$12.4k</b><span>Revenue</span></div>
        <div class="stat"><b>96%</b><span>On time</span></div>
      </div>
      <table id="orders">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>#1042</td><td>Marta Quispe</td><td>Shipped</td></tr>
          <tr><td>#1041</td><td>Luis Rojas</td><td>Packing</td></tr>
          <tr><td>#1040</td><td>Ana Torres</td><td>Delivered</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`;

const STEPS: AndesTourStep[] = [
  {
    title: 'Welcome to Acme',
    description:
      'A two-minute look at where things are. A step with no target is centred on the page.',
  },
  {
    target: '#search',
    title: 'Find anything',
    description: 'Search orders by number, customer or status.',
    placement: 'bottomLeft',
  },
  {
    target: '#create',
    title: 'Create an order',
    description: 'Start a new order from here.',
    placement: 'bottom',
  },
  {
    target: '#stats',
    title: 'Today at a glance',
    description: 'Orders, revenue and on-time delivery update live.',
    placement: 'bottom',
  },
  {
    target: '#orders',
    title: 'Recent orders',
    description: 'Click a row to open the order.',
    placement: 'top',
  },
];

const PLACEMENTS: AndesTourPlacement[] = [
  'top',
  'topLeft',
  'topRight',
  'right',
  'rightTop',
  'rightBottom',
  'bottom',
  'bottomLeft',
  'bottomRight',
  'left',
  'leftTop',
  'leftBottom',
  'center',
  'auto',
];

/** A target in the middle of a roomy page, for the placement gallery. */
const ANCHOR_PAGE = `<div style="display: grid; place-items: center; height: 30rem; border: 1px dashed var(--andes-color-border); border-radius: 0.5rem;"><div id="anchor" style="width: 9rem; height: 4rem; display: grid; place-items: center; border-radius: 0.5rem; background: var(--andes-color-accent);">Target</div></div>`;

@Component({
  selector: 'andes-story-tour',
  imports: [AndesTour],
  template: `
    <div class="toolbar">
      <button type="button" id="start" (click)="start()">Start the tour</button>
      <span
        style="align-self: center; color: var(--andes-color-muted-foreground);"
        >{{ log() }}</span
      >
    </div>
    <div [innerHTML]="html()"></div>
    <andes-tour
      [steps]="steps()"
      [(open)]="open"
      [(current)]="current"
      [type]="type()"
      [mask]="mask()"
      [placement]="placement()"
      [arrow]="arrow()"
      [indicators]="indicators()"
      [indicatorsTemplate]="indicatorsTemplate()"
      [targetClickable]="targetClickable()"
      [closeOnMaskClick]="closeOnMaskClick()"
      [showSkip]="showSkip()"
      [labels]="labels()"
      (stepChange)="log.set('step ' + ($event + 1))"
      (closed)="onClose($event)"
      (finish)="log.set('finished')"
    />
  `,
  styles: PAGE_STYLES,
  encapsulation: ViewEncapsulation.None,
})
class TourDemo {
  readonly steps = input<AndesTourStep[]>(STEPS);
  readonly type = input<AndesTourType>('default');
  readonly mask = input<AndesTourMask>(true);
  readonly placement = input<AndesTourPlacement>('bottom');
  readonly arrow = input(true);
  readonly indicators = input<AndesTourIndicators>('dots');
  readonly indicatorsTemplate = input<TemplateRef<never> | null>(null);
  readonly targetClickable = input(false);
  readonly closeOnMaskClick = input(false);
  readonly showSkip = input(true);
  readonly labels = input<AndesTourLabels | null>(null);
  readonly page = input(PAGE);
  readonly startOpen = input(false);
  private readonly sanitizer = inject(DomSanitizer);
  /** The demo page is trusted markup of our own, so it keeps its inputs and styles. */
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.page()),
  );
  protected readonly open = signal(false);
  protected readonly current = signal(0);
  protected readonly log = signal('');

  constructor() {
    // Lets a story open the tour on load, so a static snapshot shows it.
    queueMicrotask(() => this.open.set(this.startOpen()));
  }

  protected start(): void {
    this.current.set(0);
    this.open.set(true);
  }

  protected onClose(event: AndesTourCloseEvent): void {
    this.log.set(`closed (${event.reason}) on step ${event.current + 1}`);
  }
}

const meta: Meta<AndesTour> = {
  title: 'Tour',
  component: AndesTour,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [TourDemo] })],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<AndesTour>;

export const Default: Story = {
  render: () => ({ template: `<andes-story-tour />` }),
};

export const PrimaryCard: Story = {
  render: () => ({ template: `<andes-story-tour type="primary" />` }),
};

export const CountIndicator: Story = {
  render: () => ({ template: `<andes-story-tour indicators="count" />` }),
};

export const NoArrowNoSkip: Story = {
  render: () => ({
    template: `<andes-story-tour [arrow]="false" [showSkip]="false" indicators="none" />`,
  }),
};

export const CustomMask: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The first step dims with a custom colour, the second has no mask at all (the target is ringed instead), the rest follow the tour.',
      },
    },
  },
  render: () => ({
    props: {
      steps: [
        {
          target: '#search',
          title: 'Tinted mask',
          description: 'This step dims with its own colour.',
          mask: { color: 'rgb(30 64 175 / 55%)' },
        },
        {
          target: '#create',
          title: 'No mask',
          description: 'The page stays as it is; the target is outlined.',
          mask: false,
        },
        {
          target: '#stats',
          title: 'Tour default',
          description: 'Back to the default mask.',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [steps]="steps" />`,
  }),
};

export const TargetClickable: Story = {
  render: () => ({
    props: {
      steps: [
        {
          target: '#create',
          title: 'Try it',
          description: 'The button is live: click it while the tour is open.',
          targetClickable: true,
        },
        {
          target: '#search',
          title: 'Type here',
          description: 'The field accepts input too.',
          targetClickable: true,
        },
        {
          title: 'Done',
          description: 'The rest of the page stays dimmed and inert to clicks.',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [steps]="steps" />`,
  }),
};

export const ClosesOnMaskClick: Story = {
  render: () => ({
    template: `<andes-story-tour [closeOnMaskClick]="true" />`,
  }),
};

export const WithCoverImage: Story = {
  render: () => ({
    props: {
      steps: [
        {
          target: '#stats',
          title: 'Your numbers',
          description: 'A cover image or template sits above the text.',
          placement: 'bottom',
          cover:
            'data:image/svg+xml;utf8,' +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="320" height="120" fill="url(#g)"/><g fill="#fff" opacity="0.85"><rect x="40" y="62" width="28" height="40" rx="4"/><rect x="84" y="44" width="28" height="58" rx="4"/><rect x="128" y="30" width="28" height="72" rx="4"/><rect x="172" y="52" width="28" height="50" rx="4"/><rect x="216" y="22" width="28" height="80" rx="4"/></g></svg>',
            ),
        },
        {
          target: '#orders',
          title: 'Orders',
          description: 'Without a cover the card is just text.',
          placement: 'top',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [steps]="steps" />`,
  }),
};

export const CustomButtons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Per-step button labels, and a click handler that keeps the user on the step by returning `false` (here: the first click on the first step is refused).',
      },
    },
  },
  render: () => {
    let refused = false;
    return {
      props: {
        steps: [
          {
            target: '#create',
            title: 'Create an order',
            description:
              'Click Next: the first click is refused, the second goes through.',
            nextButton: {
              label: 'Got it, next',
              onClick: () => {
                const proceed = refused;
                refused = true;
                return proceed;
              },
            },
          },
          {
            target: '#stats',
            title: 'Numbers',
            description: 'This step renames both buttons.',
            prevButton: { label: 'Back' },
            nextButton: { label: 'Show me orders' },
          },
          {
            target: '#orders',
            title: 'Last one',
            description: 'The final button says what it does.',
            nextButton: { label: 'Start working' },
            placement: 'top',
          },
        ] satisfies AndesTourStep[],
      },
      template: `<andes-story-tour [steps]="steps" />`,
    };
  },
};

export const Placements: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Every placement around one target, then `center` and `auto`. Placements that do not fit flip to the opposite side.',
      },
    },
  },
  render: () => ({
    props: {
      anchorPage: ANCHOR_PAGE,
      steps: PLACEMENTS.map((placement) => ({
        target: placement === 'center' ? null : '#anchor',
        title: placement,
        description: `placement: ${placement}`,
        placement,
      })) satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [page]="anchorPage" [steps]="steps" indicators="count" />`,
  }),
};

export const ScrollsToTarget: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The target is far below the fold: each step scrolls it into view (smoothly, instantly with reduced motion) and the spotlight follows.',
      },
    },
  },
  render: () => ({
    props: {
      tallPage: `<div style="height: 70rem; border: 1px dashed var(--andes-color-border); border-radius: 0.5rem; padding: 1rem;">Scroll space<div id="far" style="position: absolute; margin-top: 55rem; padding: 1rem; border-radius: 0.5rem; background: var(--andes-color-accent);">A target far below</div></div>`,
      steps: [
        { title: 'Long page', description: 'The next stop is far below.' },
        {
          target: '#far',
          title: 'Here it is',
          description: 'Scrolled into view for you.',
          placement: 'top',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [page]="tallPage" [steps]="steps" />`,
  }),
};

export const CentredSteps: Story = {
  render: () => ({
    props: {
      steps: [
        {
          title: 'Welcome',
          description:
            'No target: the card is centred and the whole page is dimmed.',
        },
        {
          title: 'Nothing to point at',
          description: 'Useful for introductions and sign-offs.',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [steps]="steps" />`,
  }),
};

@Component({
  selector: 'andes-story-tour-controlled',
  imports: [AndesTour],
  template: `
    <div class="toolbar">
      <button type="button" (click)="open.set(true)">Open</button>
      <button type="button" (click)="current.set(2)">Jump to step 3</button>
      <button type="button" (click)="tour.next()">next()</button>
      <button type="button" (click)="tour.previous()">previous()</button>
      <span style="align-self: center;"
        >open: {{ open() }}, current: {{ current() }}</span
      >
    </div>
    <div [innerHTML]="html"></div>
    <andes-tour #tour [steps]="steps" [(open)]="open" [(current)]="current" />
  `,
  styles: PAGE_STYLES,
  encapsulation: ViewEncapsulation.None,
})
class ControlledDemo {
  protected readonly html = inject(DomSanitizer).bypassSecurityTrustHtml(PAGE);
  protected readonly steps = STEPS;
  protected readonly open = signal(false);
  protected readonly current = signal(0);
}

export const Controlled: Story = {
  decorators: [moduleMetadata({ imports: [ControlledDemo] })],
  render: () => ({ template: `<andes-story-tour-controlled />` }),
};

export const Localised: Story = {
  render: () => ({
    props: {
      labels: {
        dialog: 'Recorrido guiado',
        previous: 'Anterior',
        next: 'Siguiente',
        finish: 'Terminar',
        skip: 'Omitir',
        close: 'Cerrar recorrido',
        step: (current: number, total: number) => `Paso ${current} de ${total}`,
      },
      steps: [
        {
          target: '#search',
          title: 'Buscar',
          description: 'Busca pedidos por número o cliente.',
        },
        {
          target: '#create',
          title: 'Nuevo pedido',
          description: 'Crea un pedido desde aquí.',
        },
        {
          target: '#orders',
          title: 'Pedidos recientes',
          description: 'Haz clic en una fila para abrirla.',
          placement: 'top',
        },
      ] satisfies AndesTourStep[],
    },
    template: `<andes-story-tour [labels]="labels" [steps]="steps" indicators="count" />`,
  }),
};

export const RightToLeft: Story = {
  render: () => ({
    props: { steps: STEPS.slice(1, 4) },
    template: `<div dir="rtl"><andes-story-tour [steps]="steps" /></div>`,
  }),
};
