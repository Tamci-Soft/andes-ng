import { signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesInput } from './input';
import { AndesInputGroup } from './input-group';
import { AndesInputOtp } from './input-otp';
import { AndesInputPassword } from './input-password';
import { AndesInputSearch } from './input-search';

const meta: Meta<AndesInput> = {
  title: 'Input',
  component: AndesInput,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    clearable: { control: 'boolean' },
    showCount: { control: 'boolean' },
    maxLength: { control: 'number' },
    addonBefore: { control: 'text' },
    addonAfter: { control: 'text' },
    placeholder: { control: 'text' },
  },
  args: {
    type: 'text',
    size: 'md',
    variant: 'outlined',
    status: undefined,
    disabled: false,
    required: false,
    readOnly: false,
    clearable: false,
    showCount: false,
    maxLength: undefined,
    addonBefore: undefined,
    addonAfter: undefined,
    placeholder: 'Enter some text…',
  },
  render: (args) => ({
    props: args,
    template: `<andes-input aria-label="Example input" [type]="type" [size]="size" [variant]="variant" [status]="status" [disabled]="disabled" [required]="required" [readOnly]="readOnly" [clearable]="clearable" [showCount]="showCount" [maxLength]="maxLength" [addonBefore]="addonBefore" [addonAfter]="addonAfter" [placeholder]="placeholder" />`,
  }),
};

export default meta;

type Story = StoryObj<AndesInput>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input size="sm" placeholder="Small" />
        <andes-input size="md" placeholder="Medium" />
        <andes-input size="lg" placeholder="Large" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled' },
};

export const ReadOnly: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    // Bound under a name distinct from AndesInput's own `value` model input -
    // Storybook's Angular renderer forwards story props onto any matching
    // property of a `meta.component` instance it finds in the rendered tree.
    props: { readOnlyValue: 'Read-only value' },
    template: `<andes-input readOnly [(ngModel)]="readOnlyValue" placeholder="Read-only" />`,
  }),
};

export const Required: Story = {
  args: { required: true, placeholder: 'Required field' },
};

export const Invalid: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.375rem; width: 20rem;">
        <label for="invalid-email" style="font-size: 0.875rem; font-weight: 500;">Email address</label>
        <andes-input id="invalid-email" type="email" aria-invalid="true" aria-describedby="email-error" placeholder="you@example.com" />
        <span id="email-error" style="color: var(--andes-color-danger); font-size: 0.75rem; line-height: 1.25rem;">
          Please enter a valid email address.
        </span>
      </div>
    `,
  }),
};

export const Clearable: Story = {
  render: () => ({
    moduleMetadata: { imports: [FormsModule] },
    // Bound under a name distinct from AndesInput's own `value` model input -
    // Storybook's Angular renderer forwards story props onto any matching
    // property of a `meta.component` instance it finds in the rendered tree.
    props: { clearableValue: 'Clear me' },
    template: `<andes-input clearable [(ngModel)]="clearableValue" placeholder="Clearable" />`,
  }),
};

/**
 * The clear button is the same at every size and on every field: a small muted disc that
 * appears while the field is hovered or focused (always on touch screens). It is a Tab stop of
 * its own, named by `clearLabel`.
 */
export const ClearButtonSizes: Story = {
  render: () => ({
    props: {
      smallText: signal('Small'),
      mediumText: signal('Medium'),
      largeText: signal('Large'),
      localizedText: signal('Texto'),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Small" size="sm" clearable [(value)]="smallText" />
        <andes-input aria-label="Medium" clearable [(value)]="mediumText" />
        <andes-input aria-label="Large" size="lg" clearable [(value)]="largeText" />
        <andes-input aria-label="Localized" clearable clearLabel="Borrar" [(value)]="localizedText" />
      </div>
    `,
  }),
};

export const WithPrefixAndSuffix: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input placeholder="0.00">
          <span slot="prefix">$</span>
          <span slot="suffix">USD</span>
        </andes-input>
        <andes-input type="url" placeholder="andes-ng.dev">
          <span slot="prefix">https://</span>
        </andes-input>
      </div>
    `,
  }),
};

export const Types: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input type="text" placeholder="Text" />
        <andes-input type="email" placeholder="Email" />
        <andes-input type="password" placeholder="Password" />
        <andes-input type="number" placeholder="Number" />
        <andes-input type="search" placeholder="Search" clearable />
        <andes-input type="tel" placeholder="Phone" />
        <andes-input type="url" placeholder="URL" />
      </div>
    `,
  }),
};

export const ReactiveForm: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: { control: new FormControl('Bound via FormControl') },
    template: `<andes-input [formControl]="control" placeholder="Reactive form" />`,
  }),
};

export const TwoWayBinding: Story = {
  render: () => ({
    // `[(value)]` is a model() - no Angular Forms needed. Bound under a name distinct from
    // AndesInput's own `value` input (Storybook forwards matching story props onto it).
    props: { boundText: signal('Edit me') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Two-way bound" [(value)]="boundText" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Value: {{ boundText() }}</span>
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Outlined" variant="outlined" placeholder="Outlined" />
        <andes-input aria-label="Filled" variant="filled" placeholder="Filled" />
        <andes-input aria-label="Borderless" variant="borderless" placeholder="Borderless" />
        <andes-input aria-label="Underlined" variant="underlined" placeholder="Underlined" />
      </div>
    `,
  }),
};

export const Status: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Error" status="error" placeholder="Error (also sets aria-invalid)" />
        <andes-input aria-label="Warning" status="warning" placeholder="Warning" />
        <andes-input aria-label="Error, filled" status="error" variant="filled" placeholder="Error, filled" />
        <andes-input aria-label="Warning, underlined" status="warning" variant="underlined" placeholder="Warning, underlined" />
      </div>
    `,
  }),
};

export const ShowCount: Story = {
  render: () => ({
    props: {
      remaining: ({
        count,
        maxLength,
      }: {
        count: number;
        maxLength?: number;
      }) => `${(maxLength ?? 0) - count} characters left`,
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input aria-label="Nickname" showCount [maxLength]="20" placeholder="Max 20 characters" />
        <andes-input aria-label="Bio" showCount placeholder="No limit" />
        <andes-input aria-label="Tweet" showCount [maxLength]="40" [countFormatter]="remaining" placeholder="Custom formatter" />
      </div>
    `,
  }),
};

export const Addons: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 24rem;">
        <andes-input aria-label="Website" addonBefore="https://" addonAfter=".com" placeholder="mysite" />
        <andes-input aria-label="Phone number" type="tel" placeholder="987 654 321">
          <span slot="addon-before">+51</span>
        </andes-input>
        <andes-input aria-label="Weight" placeholder="0" clearable>
          <span slot="prefix">≈</span>
          <span slot="addon-after">kg</span>
        </andes-input>
        <andes-input aria-label="Coupon" placeholder="Coupon code">
          <button slot="addon-after" type="button" style="border: 0; background: none; padding: 0 0.25rem; color: inherit; font: inherit; cursor: pointer;">Apply</button>
        </andes-input>
        <andes-input aria-label="Coupon, in error" status="error" placeholder="Coupon code">
          <button slot="addon-after" type="button" style="border: 0; background: none; padding: 0 0.25rem; color: inherit; font: inherit; cursor: pointer;">Apply</button>
        </andes-input>
        <andes-input aria-label="Website, filled" variant="filled" addonBefore="https://" placeholder="filled variant" />
        <andes-input aria-label="Website, disabled" addonBefore="https://" addonAfter=".com" disabled placeholder="disabled" />
      </div>
    `,
  }),
};

export const ClearEvents: Story = {
  render: () => ({
    moduleMetadata: { imports: [ReactiveFormsModule] },
    props: {
      clearControl: new FormControl('Clear me'),
      log: signal<string[]>([]),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Clearable" clearable [formControl]="clearControl"
          (cleared)="log.set(log().concat('cleared - control value: &quot;' + clearControl.value + '&quot;'))" />
        @for (entry of log(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">{{ entry }}</span>
        }
      </div>
    `,
  }),
};

export const PressEnter: Story = {
  render: () => ({
    props: { entered: signal<string[]>([]), enterText: signal('') },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Press Enter" placeholder="Type and press Enter" [(value)]="enterText"
          (pressEnter)="entered.set(entered().concat(enterText()))" />
        @for (entry of entered(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Enter: "{{ entry }}"</span>
        }
      </div>
    `,
  }),
};

export const Password: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputPassword] },
    props: { passwordVisible: signal(false) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input-password aria-label="Password" placeholder="Password" autocomplete="current-password" />
        <andes-input-password aria-label="Password, controlled" placeholder="Controlled visibility" [(visible)]="passwordVisible" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Visible: {{ passwordVisible() }}</span>
        <andes-input-password aria-label="Password, no toggle" placeholder="visibilityToggle = false" [visibilityToggle]="false" />
        <andes-input-password aria-label="Password, disabled" placeholder="Disabled" disabled />
      </div>
    `,
  }),
};

export const Search: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputSearch] },
    props: { searches: signal<string[]>([]) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 24rem;">
        <andes-input-search aria-label="Search" placeholder="Default search button" clearable
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, primary" placeholder="enterButton" enterButton
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, labelled" placeholder="enterButton = 'Search'" enterButton="Search" addonBefore="https://"
          (searched)="searches.set(searches().concat($event.source + ': ' + $event.value))" />
        <andes-input-search aria-label="Search, loading" placeholder="loading" enterButton loading />
        <andes-input-search aria-label="Search, small" placeholder="Small" size="sm" enterButton />
        <andes-input-search aria-label="Search, large" placeholder="Large" size="lg" />
        @for (entry of searches(); track $index) {
          <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">{{ entry }}</span>
        }
      </div>
    `,
  }),
};

export const OTP: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputOtp] },
    props: {
      otpCode: signal(''),
      completedCode: signal(''),
      digitsOnly: (text: string) => text.replace(/\D/g, ''),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <andes-input-otp aria-label="Verification code" inputMode="numeric" [formatter]="digitsOnly"
          [(value)]="otpCode" (complete)="completedCode.set($event)" />
        <span style="font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;">Value: "{{ otpCode() }}" · Completed: "{{ completedCode() }}"</span>
        <andes-input-otp aria-label="Masked code" [length]="4" mask />
        <andes-input-otp aria-label="Code with separator" [length]="6" separator="-" variant="filled" size="sm" />
        <andes-input-otp aria-label="Invalid code" [length]="4" status="error" variant="underlined" size="lg" />
        <andes-input-otp aria-label="Disabled code" [length]="4" disabled />
      </div>
    `,
  }),
};

const caption =
  'font-size: 0.875rem; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif;';

// Grapheme-aware helpers for the count stories: an emoji or a flag counts as one character.
function graphemes(value: string): string[] {
  return Array.from(
    new Intl.Segmenter().segment(value),
    (part) => part.segment,
  );
}

export const CountLimits: Story = {
  render: () => ({
    props: {
      countGraphemes: (value: string) => graphemes(value).length,
      cutGraphemes: (value: string, { max }: { max: number }) =>
        graphemes(value).slice(0, max).join(''),
      softText: signal('A note that runs long'),
      emojiText: signal('🇵🇪👍🏽'),
      caption,
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 22rem;">
        <andes-input aria-label="Soft limit" showCount [countMax]="12" [(value)]="softText"
          placeholder="countMax = 12, not enforced" />
        <span [style]="caption">countMax flags the field (red counter, error border, aria-invalid) instead of blocking input.</span>
        <andes-input aria-label="Emoji-aware limit" showCount [countMax]="6"
          [countStrategy]="countGraphemes" [countExceedFormatter]="cutGraphemes" [(value)]="emojiText"
          placeholder="6 characters, emoji count as one" />
        <span [style]="caption">countStrategy counts emoji as one; countExceedFormatter trims past 6.</span>
      </div>
    `,
  }),
};

export const CustomClearIcon: Story = {
  render: () => ({
    props: { customClearText: signal('Clear me') },
    template: `
      <div style="width: 20rem;">
        <andes-input aria-label="Custom clear icon" clearable [clearIcon]="clearIconTpl" [(value)]="customClearText" />
      </div>
      <ng-template #clearIconTpl>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>
        </svg>
      </ng-template>
    `,
  }),
};

export const TextAlign: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 16rem;">
        <andes-input aria-label="Amount" value="1,250.00" style="--andes-input-text-align: end;">
          <span slot="prefix">S/</span>
        </andes-input>
        <andes-input aria-label="Code" value="A-104" style="--andes-input-text-align: center;" />
      </div>
    `,
  }),
};

export const Focus: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesButton] },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 24rem;">
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          <andes-button size="sm" variant="outline" (click)="focusTarget.focus({ cursor: 'start' })">Focus at start</andes-button>
          <andes-button size="sm" variant="outline" (click)="focusTarget.focus({ cursor: 'end' })">Focus at end</andes-button>
          <andes-button size="sm" variant="outline" (click)="focusTarget.focus({ cursor: 'all' })">Select all</andes-button>
          <andes-button size="sm" variant="outline" (click)="focusTarget.blur()">Blur</andes-button>
        </div>
        <andes-input #focusTarget aria-label="Focus target" value="Focus moves the caret here" />
      </div>
    `,
  }),
};

/** `(focused)` / `(blurred)` re-emit the inner input's native FocusEvent. */
export const FocusEvents: Story = {
  render: () => ({
    props: { focusLog: signal<string[]>([]) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 20rem;">
        <andes-input aria-label="Focus events" placeholder="Focus me, then tab away"
          (focused)="focusLog.set(focusLog().concat('focused'))"
          (blurred)="focusLog.set(focusLog().concat('blurred'))" />
        <span style="font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);">
          {{ focusLog().join(' → ') || 'No events yet' }}
        </span>
      </div>
    `,
  }),
};

export const PasswordCustomToggle: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputPassword] },
    props: { toggleLog: signal<boolean[]>([]), caption },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 20rem;">
        <andes-input-password aria-label="Password, text toggle" placeholder="Custom toggle content"
          [visibilityIcon]="toggleText" (visibleChange)="toggleLog.set(toggleLog().concat($event))" />
        <andes-input-password aria-label="Password, toggle out of Tab order" placeholder="Toggle skipped by Tab"
          [visibilityToggleTabIndex]="-1" />
        <span [style]="caption">visibleChange: {{ toggleLog().join(', ') }}</span>
      </div>
      <ng-template #toggleText let-visible>
        <span style="font-size: 0.75rem; font-weight: 500;">{{ visible ? 'Hide' : 'Show' }}</span>
      </ng-template>
    `,
  }),
};

export const SearchCustomButton: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputSearch] },
    props: { customSearches: signal<string[]>([]), caption },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 24rem;">
        <andes-input-search aria-label="Search, custom button" placeholder="enterButton as a template" [enterButton]="goButton"
          (searched)="customSearches.set(customSearches().concat($event.value))" />
        <andes-input-search aria-label="Search, custom icon" placeholder="searchIcon" [searchIcon]="filterIcon" />
        @for (entry of customSearches(); track $index) {
          <span [style]="caption">{{ entry }}</span>
        }
      </div>
      <ng-template #goButton>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>
        </svg>
        Go
      </ng-template>
      <ng-template #filterIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path>
        </svg>
      </ng-template>
    `,
  }),
};

export const OTPSeparators: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesInputOtp] },
    props: {
      middleDash: (index: number) => (index === 2 ? '–' : ''),
      otpCells: signal<string[]>([]),
      caption,
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <andes-input-otp aria-label="Code, grouped in threes" [separator]="middleDash"
          (cellsChange)="otpCells.set($event)" />
        <span [style]="caption">cellsChange: [{{ otpCells().map(c => c || '·').join(' ') }}]</span>
        <andes-input-otp aria-label="Code, dotted" [length]="4" [separator]="dotSeparator" mask="✱" />
      </div>
      <ng-template #dotSeparator>
        <span style="display: block; width: 0.375rem; height: 0.375rem; border-radius: 999px; background: var(--andes-color-muted-foreground);"></span>
      </ng-template>
    `,
  }),
};

export const Compact: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesInputGroup, AndesButton, AndesInputSearch],
    },
    template: `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; width: 28rem;">
        <andes-input-group aria-label="Name">
          <andes-input aria-label="First name" placeholder="First name" />
          <andes-input aria-label="Last name" placeholder="Last name" />
        </andes-input-group>
        <andes-input-group block aria-label="Convert amount">
          <andes-input aria-label="Amount" placeholder="0.00" addonBefore="USD" />
          <andes-button>Convert</andes-button>
        </andes-input-group>
        <andes-input-group block aria-label="Search orders">
          <andes-input aria-label="Order field" value="Order #" style="flex: 0 0 7rem;" />
          <andes-input-search aria-label="Search orders" placeholder="Search…" enterButton />
        </andes-input-group>
        <andes-input-group block aria-label="Email and code">
          <andes-input aria-label="Email" status="error" value="not-an-email" />
          <andes-input aria-label="Code" placeholder="Code" />
          <andes-button>Send</andes-button>
        </andes-input-group>
        <andes-input-group block aria-label="Name and nickname">
          <andes-input aria-label="Name" placeholder="Name" [countMax]="3" value="too long" />
          <andes-input aria-label="Nickname" placeholder="Nickname" />
        </andes-input-group>
        <andes-input-group block aria-label="Small row">
          <andes-input size="sm" aria-label="From" placeholder="From" />
          <andes-input size="sm" aria-label="To" placeholder="To" />
          <andes-button size="sm" variant="outline">Apply</andes-button>
        </andes-input-group>
      </div>
    `,
  }),
};
