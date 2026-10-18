import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesQrCode } from './qr-code';

/** A small round brand mark, inlined so the stories need no network. */
const BRAND_MARK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="12" fill="#2563eb"/>' +
      '<path d="M14 33 24 13l10 20h-6l-4-9-4 9z" fill="#fff"/></svg>',
  );

const meta: Meta<AndesQrCode> = {
  title: 'QR Code',
  component: AndesQrCode,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [AndesQrCode, AndesButton] })],
  parameters: {
    docs: {
      description: {
        component:
          'Draws a QR code from `value` with a built-in encoder (numeric, alphanumeric and byte ' +
          'modes, versions 1-40, error correction L/M/Q/H) - no runtime dependency. Renders ' +
          'crisp path-based SVG or a canvas, follows the theme through the foreground and ' +
          'background tokens, can carry a centre logo (the error correction level is raised as ' +
          'the logo needs), shows `loading`, `expired` and `scanned` overlays, and can export ' +
          'PNG or SVG. Colours come from `--andes-qr-code-color` and `--andes-qr-code-bg`, which ' +
          'the `color` and `bgColor` inputs set. Note: light modules on a dark background are ' +
          'read by most, not all, scanners - pass explicit colours for codes that must scan ' +
          'everywhere.',
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    type: { control: 'inline-radio', options: ['svg', 'canvas'] },
    size: { control: { type: 'range', min: 64, max: 320, step: 8 } },
    color: { control: 'color' },
    bgColor: { control: 'color' },
    bordered: { control: 'boolean' },
    errorLevel: { control: 'inline-radio', options: ['L', 'M', 'Q', 'H'] },
    boostLevel: { control: 'boolean' },
    quietZone: { control: { type: 'number', min: 0, max: 8 } },
    icon: { control: 'text' },
    iconSize: { control: 'number' },
    iconBordered: { control: 'boolean' },
    status: {
      control: 'inline-radio',
      options: ['active', 'loading', 'expired', 'scanned'],
    },
  },
  args: {
    value: 'https://andes.example/pay/42',
    type: 'svg',
    size: 160,
    bordered: true,
    errorLevel: 'M',
    boostLevel: true,
    quietZone: 2,
    iconBordered: true,
    status: 'active',
  },
  render: (args) => ({
    props: args,
    template: `<andes-qr-code
      [value]="value"
      [type]="type"
      [size]="size"
      [color]="color"
      [bgColor]="bgColor"
      [bordered]="bordered"
      [errorLevel]="errorLevel"
      [boostLevel]="boostLevel"
      [quietZone]="quietZone"
      [icon]="icon"
      [iconSize]="iconSize"
      [iconBordered]="iconBordered"
      [status]="status"
      aria-label="Payment QR code"
    />`,
  }),
};

export default meta;

type Story = StoryObj<AndesQrCode>;

export const Default: Story = {};

export const Canvas: Story = {
  args: { type: 'canvas' },
  parameters: {
    docs: {
      description: {
        story:
          'The same symbol painted on a canvas, sized for the device pixel ratio. It repaints when the theme attribute on the root element changes; call `redraw()` for themes switched any other way.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1rem;">
        <andes-qr-code value="https://andes.example/pay/42" [size]="96" aria-label="Small QR code" />
        <andes-qr-code value="https://andes.example/pay/42" [size]="128" aria-label="Medium QR code" />
        <andes-qr-code value="https://andes.example/pay/42" [size]="192" aria-label="Large QR code" />
      </div>`,
  }),
};

export const Colors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'By default the modules use the foreground token and the background the background token. Any CSS colour, including a token, can replace either.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        <andes-qr-code value="https://andes.example/pay/42" [size]="128" aria-label="Themed QR code" />
        <andes-qr-code value="https://andes.example/pay/42" [size]="128" color="var(--andes-color-primary)" bgColor="#ffffff" aria-label="Brand QR code" />
        <andes-qr-code value="https://andes.example/pay/42" [size]="128" color="#0f172a" bgColor="#ffffff" aria-label="Always dark-on-light QR code" />
      </div>`,
  }),
};

export const Borderless: Story = {
  args: { bordered: false },
};

export const ErrorLevels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A higher level adds redundancy, so the symbol grows. With `boostLevel` (default) the level is raised for free whenever the data still fits the same version.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);">
        @for (level of ['L', 'M', 'Q', 'H']; track level) {
          <figure style="margin: 0; display: grid; gap: 0.25rem; justify-items: center;">
            <andes-qr-code value="https://andes.example/invoices/2026-0417?download=1" [errorLevel]="level" [boostLevel]="false" [size]="128" [aria-label]="'Level ' + level" />
            <figcaption>Level {{ level }}</figcaption>
          </figure>
        }
      </div>`,
  }),
};

export const WithLogo: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The modules under the logo are cleared (whole modules, so no half-covered ones) and the error correction level is raised to what the logo needs. `iconBordered` leaves a one-module margin around it.',
      },
    },
  },
  render: () => ({
    props: { logo: BRAND_MARK },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        <andes-qr-code value="https://andes.example/pay/42" [icon]="logo" [size]="160" aria-label="QR code with logo" />
        <andes-qr-code value="https://andes.example/pay/42" [icon]="logo" [iconBordered]="false" [size]="160" aria-label="QR code with logo and no margin" />
        <andes-qr-code value="https://andes.example/pay/42" [icon]="logo" [iconSize]="{ width: 56, height: 28 }" [size]="160" errorLevel="L" aria-label="QR code with wide logo" />
      </div>`,
  }),
};

export const Statuses: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A non-active status hides the code behind an overlay so an outdated code cannot be scanned. `expired` offers a refresh button that emits `refresh`.',
      },
    },
  },
  render: () => ({
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        <andes-qr-code value="https://andes.example/pay/42" status="loading" aria-label="Loading QR code" />
        <andes-qr-code value="https://andes.example/pay/42" status="expired" aria-label="Expired QR code" />
        <andes-qr-code value="https://andes.example/pay/42" status="scanned" aria-label="Scanned QR code" />
      </div>`,
  }),
};

export const CustomStatus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`statusRender` replaces the overlay content; the template context carries the status and a `refresh()` function.',
      },
    },
  },
  render: () => ({
    template: `
      <andes-qr-code value="https://andes.example/pay/42" status="expired" [statusRender]="custom" aria-label="Expired QR code">
      </andes-qr-code>
      <ng-template #custom let-status let-refresh="refresh">
        <span style="font-weight: 600;">Session {{ status }}</span>
        <span style="font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);">Ask for a new code to continue.</span>
        <andes-button size="sm" variant="outline" (click)="refresh()">Get a new code</andes-button>
      </ng-template>`,
  }),
};

export const Localised: Story = {
  render: () => ({
    template: `
      <andes-qr-code value="https://andes.example/pago/42" status="expired" [labels]="{ qrCode: 'Codigo QR', expired: 'El codigo vencio', refresh: 'Actualizar', scanned: 'Escaneado', loading: 'Cargando' }" />`,
  }),
};

@Component({
  selector: 'andes-story-qr-code-export',
  imports: [AndesQrCode, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: grid; gap: 0.75rem; justify-items: start;">
      <andes-qr-code
        #qr
        value="https://andes.example/invoices/2026-0417"
        [icon]="logo"
        [size]="160"
        aria-label="Invoice QR code"
      />
      <div style="display: flex; gap: 0.5rem;">
        <andes-button
          size="sm"
          variant="outline"
          (click)="qr.download('invoice-2026-0417')"
          >Download PNG</andes-button
        >
        <andes-button
          size="sm"
          variant="outline"
          (click)="qr.download('invoice-2026-0417', { format: 'svg' })"
          >Download SVG</andes-button
        >
        <andes-button size="sm" variant="ghost" (click)="preview(qr)"
          >Show data URL</andes-button
        >
      </div>
      @if (dataUrl(); as url) {
        <img
          [src]="url"
          alt="PNG export preview"
          width="96"
          height="96"
          style="border: 1px solid var(--andes-color-border);"
        />
      }
    </div>
  `,
})
class ExportDemo {
  protected readonly logo = BRAND_MARK;
  protected readonly dataUrl = signal<string | null>(null);

  protected async preview(qr: AndesQrCode): Promise<void> {
    this.dataUrl.set(await qr.toDataUrl({ scale: 1 }));
  }
}

export const Export: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`download()` saves a PNG (or SVG); `toDataUrl()`, `toBlob()` and `toSvg()` hand back the image for uploads or printing. Exports use the colours currently shown unless `color` / `bgColor` are passed.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [ExportDemo] })],
  render: () => ({ template: `<andes-story-qr-code-export />` }),
};

/** How long a payment code stays valid in the card demo, in seconds. */
const CODE_LIFETIME = 45;

@Component({
  selector: 'andes-story-qr-code-payment',
  imports: [AndesQrCode, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      font-family: var(--andes-font-family), sans-serif;
      font-size: 0.875rem;
      line-height: 1.375rem;
      color: var(--andes-color-card-foreground);
    }
    .card {
      box-sizing: border-box;
      width: 22rem;
      max-width: 100%;
      display: grid;
      gap: 1rem;
      justify-items: center;
      padding: 1.5rem;
      border: 1px solid var(--andes-color-border);
      border-radius: var(--andes-radius-xl);
      background-color: var(--andes-color-card);
      box-shadow: var(--andes-shadow-sm, 0 1px 2px rgb(0 0 0 / 6%));
    }
    .merchant {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      justify-self: stretch;
    }
    .merchant img {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--andes-radius-lg);
    }
    h3 {
      margin: 0;
      font-size: 1rem;
      line-height: 1.5rem;
      font-weight: 600;
    }
    p {
      margin: 0;
    }
    .muted {
      color: var(--andes-color-muted-foreground);
      font-size: 0.75rem;
      line-height: 1.25rem;
    }
    .amount {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .code {
      display: grid;
      gap: 0.5rem;
      justify-items: center;
    }
    .code andes-qr-code {
      --andes-qr-code-color: #0f172a;
      --andes-qr-code-bg: #ffffff;
    }
    .timer {
      font-variant-numeric: tabular-nums;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .done {
      color: var(--andes-color-success-text, var(--andes-color-success));
      font-weight: 600;
    }
  `,
  template: `
    <section class="card" aria-labelledby="pay-title">
      <div class="merchant">
        <img [src]="logo" alt="" width="40" height="40" />
        <div>
          <h3 id="pay-title">Tamci Market</h3>
          <p class="muted">Order #A-2026-0417</p>
        </div>
      </div>

      <div style="justify-self: stretch;">
        <p class="muted">Amount to pay</p>
        <p class="amount">S/ 1,250.00</p>
      </div>

      <div class="code">
        <andes-qr-code
          [value]="payload()"
          [icon]="logo"
          [size]="184"
          errorLevel="Q"
          [status]="status()"
          aria-label="Payment QR code for order A-2026-0417"
          (refresh)="renew()"
        />
        @if (status() === 'active') {
          <p class="muted timer">Valid for {{ minutes() }}:{{ seconds() }}</p>
        } @else if (status() === 'scanned') {
          <p class="done">Payment confirmed</p>
        } @else {
          <p class="muted">This code is no longer valid.</p>
        }
      </div>

      <p class="muted" style="text-align: center;">
        Open your banking app, choose "Pay with QR" and scan the code.
      </p>

      <div class="actions">
        <andes-button
          size="sm"
          variant="outline"
          [disabled]="status() !== 'active'"
          (click)="simulateScan()"
          >Simulate scan</andes-button
        >
        <andes-button size="sm" variant="ghost" (click)="renew()"
          >New code</andes-button
        >
      </div>
    </section>
  `,
})
class PaymentCardDemo implements OnDestroy {
  protected readonly logo = BRAND_MARK;
  private readonly reference = signal(1);
  private readonly remaining = signal(CODE_LIFETIME);
  private readonly scanned = signal(false);
  private readonly timer = setInterval(() => {
    if (this.remaining() > 0) {
      this.remaining.update((value) => value - 1);
    }
  }, 1000);

  protected readonly payload = computed(
    () =>
      `https://andes.example/pay?order=A-2026-0417&amount=1250.00&ref=${String(this.reference()).padStart(6, '0')}`,
  );
  protected readonly status = computed(() =>
    this.scanned() ? 'scanned' : this.remaining() === 0 ? 'expired' : 'active',
  );
  protected readonly minutes = computed(() =>
    String(Math.floor(this.remaining() / 60)).padStart(2, '0'),
  );
  protected readonly seconds = computed(() =>
    String(this.remaining() % 60).padStart(2, '0'),
  );

  protected renew(): void {
    this.reference.update((value) => value + 1);
    this.remaining.set(CODE_LIFETIME);
    this.scanned.set(false);
  }

  protected simulateScan(): void {
    this.scanned.set(true);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}

export const PaymentCard: Story = {
  name: 'Payment card',
  parameters: {
    docs: {
      description: {
        story:
          'A payment sheet: the code carries a reference, counts down, expires into an overlay with a refresh button, and turns into a confirmation once scanned. A fresh reference is generated on every refresh. The code stays dark-on-light so it scans in the dark theme too.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [PaymentCardDemo] })],
  render: () => ({ template: `<andes-story-qr-code-payment />` }),
};
