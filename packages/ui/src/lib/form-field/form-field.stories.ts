import { CommonModule } from '@angular/common';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import type { Decorator, Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesForm } from './form';
import { AndesFormControl } from './form-control';
import { AndesFormDescription } from './form-description';
import { AndesFormError } from './form-error';
import { AndesFormField } from './form-field';
import { AndesFormLabel } from './form-label';

const fieldModuleMetadata = {
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AndesForm,
    AndesFormField,
    AndesFormLabel,
    AndesFormControl,
    AndesFormDescription,
    AndesFormError,
    // The one andes-ng control this package can depend on today: AndesButton is already on
    // `develop`. AndesInput/AndesSelect are still unmerged branches of their own - see the
    // "Using andes-ng's own controls" section of the docs below.
    AndesButton,
  ],
};

/**
 * Andes-look styling for the NATIVE controls these stories render (AndesInput/AndesSelect are
 * not on `develop` yet - see the docs below). Injected once as a real stylesheet rather than
 * an inline `style` attribute: an inline border would outrank - and so hide - the field's own
 * status tint (`.andes-form-field--invalid :where(input)`), which is part of what these
 * stories demonstrate. Everything sits in zero-specificity `:where()` so any library rule wins.
 * Also used by form.stories.ts, hence exported (and excluded from the story list).
 */
export const DEMO_CONTROL_CSS = `
:where(.andes-demo-control) {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--andes-color-input);
  border-radius: var(--andes-radius-md);
  background: var(--andes-color-background);
  color: var(--andes-color-foreground);
  font-family: var(--andes-font-family), sans-serif;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
:where(.andes-demo-control):focus-visible {
  outline: 2px solid var(--andes-color-focus-ring);
  outline-offset: 1px;
}
:where([data-size='sm'] .andes-demo-control) {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
}
:where([data-size='lg'] .andes-demo-control) {
  padding: 0.75rem 0.875rem;
  font-size: 1rem;
}
`;

export const withDemoControls: Decorator = (story) => {
  if (!document.getElementById('andes-demo-control-css')) {
    const style = document.createElement('style');
    style.id = 'andes-demo-control-css';
    style.textContent = DEMO_CONTROL_CSS;
    document.head.appendChild(style);
  }
  return story();
};

const meta: Meta<AndesFormField> = {
  title: 'Form Field',
  component: AndesFormField,
  tags: ['autodocs'],
  excludeStories: ['DEMO_CONTROL_CSS', 'withDemoControls'],
  decorators: [withDemoControls],
  parameters: {
    docs: {
      description: {
        component: [
          'Wire `andesFormControl` onto the control itself, alongside `formControlName` /',
          '`[formControl]` / `[(ngModel)]`. For a **native** `<input>` / `<textarea>` /',
          '`<select>` everything (`id`/`for`, `aria-describedby`, `aria-invalid`,',
          '`aria-required`) is derived and applied automatically - nothing to hand-wire. That is',
          'what the stories below render.',
          '',
          '### Ant Design `Form.Item` features',
          '',
          '`validateStatus` (derived from the control - touched/dirty/submitted, pending,',
          'invalid - or set by hand), `hasFeedback` status icons, `help` / `extra` text,',
          'error messages generated from the control’s real `ValidationErrors` through a',
          'configurable message map (`errorMessages` on the field or `andesForm`, or',
          '`provideAndesFormErrorMessages()`), a required mark detected from',
          '`Validators.required` (`required` / `requiredMark` to override), `tooltip`, `label`',
          'and `noStyle`. Form-wide layout (`horizontal` / `vertical` / `inline`),',
          '`labelCol` / `wrapperCol`, `labelAlign`, `colon`, `size` and',
          '`scrollToFirstError` live on the `andesForm` directive - see the **Form** stories.',
          '',
          '### Using andes-ng’s own controls',
          '',
          'For a wrapper component that renders its real control inside its own template',
          '(`AndesInput`, `AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup`,',
          '`AndesSlider`), `andesFormControl` sits on the outer custom element, which is not a',
          'labelable form control and is deliberately kept out of the accessibility tree by',
          "those components' own host metadata. Writing `id`/`aria-*` there would reach neither",
          'the `<label for>` machinery nor the buried native control, so the directive writes',
          'nothing at all in that case and instead exposes `resolvedId()`, `labelledBy()`,',
          "`describedBy()`, `showError()` and `isRequired()` for you to bind into the wrapper's",
          'own inputs.',
          '',
          '**`AndesInput` is fully supported by that pattern** - verified against its own',
          'component source: it exposes `id`, `aria-labelledby`, `aria-describedby` and',
          '`aria-invalid` inputs, nulls each of them on its host element and forwards them onto',
          'the real `<input>` in its template, so the label is correctly associated *and*',
          'clickable. Its `required` input puts the native `required` attribute on that same',
          'inner `<input>`, which already implies `aria-required`:',
          '',
          '```html',
          '<andes-form-field #field="andesFormField">',
          '  <andes-form-label>Full name</andes-form-label>',
          '  <andes-input',
          '    andesFormControl',
          '    #ctrl="andesFormControl"',
          '    formControlName="name"',
          '    [id]="field.controlId()"',
          '    [aria-describedby]="ctrl.describedBy()"',
          '    [aria-invalid]="ctrl.showError()"',
          '    [required]="ctrl.isRequired()"',
          '  />',
          '  <andes-form-error>Your name is required.</andes-form-error>',
          '</andes-form-field>',
          '```',
          '',
          '### Known limitation: wrappers with no `id` input',
          '',
          '`AndesSelect`, `AndesCheckbox`, `AndesSwitch`, `AndesRadioGroup` and `AndesSlider`',
          'expose **no `id` input**, so `[id]="field.controlId()"` has nowhere to land and the',
          "label's `for` stays dangling - deliberately detectable rather than silently pointing",
          'at an element the platform refuses to associate. Adding an `id` input to each of them',
          'is the proper fix and has to happen on their own branches.',
          '',
          'All five *do* accept `aria-labelledby` and forward it onto their real internal',
          'control, so `AndesFormLabel` now stamps an id onto the `<label>` it renders and the',
          'field exposes it as `labelledBy()`. That gives those controls a correct accessible',
          'name today, without changing a line of their source:',
          '',
          '```html',
          '<andes-form-field>',
          '  <andes-form-label>Country</andes-form-label>',
          '  <andes-select',
          '    andesFormControl',
          '    #ctrl="andesFormControl"',
          '    formControlName="country"',
          '    [aria-labelledby]="ctrl.labelledBy()"',
          '    [aria-describedby]="ctrl.describedBy()"',
          '    [aria-invalid]="ctrl.showError()"',
          '  >',
          '    <andes-select-trigger><andes-select-value /></andes-select-trigger>',
          '    <andes-select-content>',
          '      <andes-select-item value="pe">Peru</andes-select-item>',
          '    </andes-select-content>',
          '  </andes-select>',
          '  <andes-form-error>Please pick a country.</andes-form-error>',
          '</andes-form-field>',
          '```',
          '',
          'It is an improvement, not a full substitute: `aria-labelledby` supplies the accessible',
          'name, but only a native `for`/`id` pair makes the label **clickable**. Label-click',
          'focus is the one thing still genuinely missing for those five.',
          '',
          '### Why these stories still render native controls',
          '',
          'Only `AndesButton` (used for the submit action in **Reactive Form Example**) has landed',
          'on `develop` so far. `AndesInput` and `AndesSelect` are still open, unmerged PRs of',
          'their own - and `AndesSelect` additionally depends on the overlay and list-navigation',
          'primitives, which are two further unmerged PRs. Importing them here would make this',
          'package fail to build until all of those merge, so the live examples stay on native',
          'controls and the wiring for the andes-ng controls is documented above instead. Swap',
          'them in - using exactly the snippets above - once those branches are on `develop`.',
        ].join('\n'),
      },
    },
  },
};

export default meta;

type Story = StoryObj<AndesFormField>;

/**
 * The core anatomy: label, a native input carrying `andesFormControl` alongside
 * `[formControl]`, a description and an error. Focus the input then blur it without typing
 * anything to see the error appear - it stays hidden on load even though the field is
 * already invalid (empty + required), matching the idiomatic Angular
 * "invalid && (touched || dirty)" rule instead of shouting at the user immediately.
 */
export const Basic: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
      }),
    },
    template: `
      <div style="max-width: 320px;">
        <andes-form-field>
          <andes-form-label>Email</andes-form-label>
          <input
            andesFormControl
            [formControl]="email"
            type="email"
            placeholder="you@example.com"
            class="andes-demo-control"
          />
          <andes-form-description>
            We'll only use this to send your receipt.
          </andes-form-description>
          <andes-form-error>Enter a valid email address.</andes-form-error>
        </andes-form-field>
      </div>
    `,
  }),
};

/**
 * A small reactive form (`FormGroup`) with two fields, each independently wired, plus an
 * `AndesButton` submit that force-marks everything as touched (`markAllAsTouched`) - the
 * standard Angular pattern for surfacing every remaining error on a failed submit attempt.
 *
 * The submit uses the library's own `<andes-button type="submit">`: its internal `<button>`
 * is still a descendant of this `<form>`, so implicit submission and `(ngSubmit)` behave
 * exactly as with a native button. The two controls are native `<input>`/`<select>` for the
 * reason documented on the component above - `AndesInput`/`AndesSelect` are not on `develop`
 * yet - and are the fully-automatic wiring path in the meantime.
 */
export const ReactiveFormExample: Story = {
  render: () => {
    const form = new FormGroup({
      name: new FormControl('', { validators: Validators.required }),
      country: new FormControl('', { validators: Validators.required }),
    });
    return {
      moduleMetadata: fieldModuleMetadata,
      props: {
        form,
        submitted: false,
        submit: function (this: { submitted: boolean }) {
          if (form.invalid) {
            form.markAllAsTouched();
            return;
          }
          this.submitted = true;
        },
      },
      template: `
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          style="max-width: 360px; display: flex; flex-direction: column; gap: 1.25rem;"
        >
          <andes-form-field>
            <andes-form-label>Full name</andes-form-label>
            <input andesFormControl formControlName="name" class="andes-demo-control" />
            <andes-form-error>Your name is required.</andes-form-error>
          </andes-form-field>

          <andes-form-field>
            <andes-form-label>Country</andes-form-label>
            <select andesFormControl formControlName="country" class="andes-demo-control">
              <option value="">Select a country</option>
              <option value="pe">Peru</option>
              <option value="cl">Chile</option>
              <option value="co">Colombia</option>
            </select>
            <andes-form-description>Used to calculate shipping.</andes-form-description>
            <andes-form-error>Please pick a country.</andes-form-error>
          </andes-form-field>

          <andes-button type="submit" style="align-self: flex-start;">Submit</andes-button>
          @if (submitted) {
            <p>Submitted: {{ form.value | json }}</p>
          }
        </form>
      `,
    };
  },
};

/**
 * Works identically with `[(ngModel)]` (template-driven forms) instead of Reactive Forms -
 * `AndesFormControl` reads whichever `NgControl` is present (`FormControlName`,
 * `FormControlDirective` or `NgModel`) without caring which. The `AndesButton` here only
 * echoes the current value; the field itself needs no submit to work.
 */
export const WithNgModel: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: { nickname: '', echoed: '' },
    template: `
      <div style="max-width: 320px; display: flex; flex-direction: column; gap: 1rem;">
        <andes-form-field>
          <andes-form-label>Nickname</andes-form-label>
          <input
            andesFormControl
            name="nickname"
            required
            [(ngModel)]="nickname"
            class="andes-demo-control"
          />
          <andes-form-error>A nickname is required.</andes-form-error>
        </andes-form-field>
        <andes-button
          variant="secondary"
          style="align-self: flex-start;"
          (click)="echoed = nickname"
          >Greet me</andes-button
        >
        @if (echoed) {
          <p>Hello, {{ echoed }}!</p>
        }
      </div>
    `,
  }),
};

/**
 * A description with no error slot at all, and an error slot with no description - both
 * parts are fully optional and `aria-describedby` only ever includes the ones actually
 * present.
 */
export const DescriptionOnly: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      value: new FormControl(''),
    },
    template: `
      <div style="max-width: 320px;">
        <andes-form-field>
          <andes-form-label>Coupon code</andes-form-label>
          <input andesFormControl [formControl]="value" class="andes-demo-control" />
          <andes-form-description>Optional - leave blank if you don't have one.</andes-form-description>
        </andes-form-field>
      </div>
    `,
  }),
};

/**
 * `validateStatus` set by hand, each with `hasFeedback` and a `help` line - the full status
 * vocabulary (`success`, `warning`, `error`, `validating`). Only `error` and `warning` tint a
 * plain native control; `success`/`validating` are carried by the icon alone, as in Ant.
 */
export const ValidateStatus: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      rows: [
        { status: 'success', label: 'Success', help: 'Looks good.' },
        { status: 'warning', label: 'Warning', help: 'This name is unusual.' },
        { status: 'error', label: 'Error', help: 'This name is taken.' },
        { status: 'validating', label: 'Validating', help: 'Checking…' },
      ],
      value: new FormControl('andes'),
    },
    template: `
      <div andesForm style="max-width: 360px;">
        @for (row of rows; track row.status) {
          <andes-form-field
            [label]="row.label"
            [validateStatus]="row.status"
            [help]="row.help"
            hasFeedback
          >
            <input andesFormControl [formControl]="value" class="andes-demo-control" />
          </andes-form-field>
        }
      </div>
    `,
  }),
};

/**
 * Status *derived* from the control, with `hasFeedback`. The username runs an async
 * validator (≈0.8 s) - type to see `validating` (spinner, `aria-busy` on the input), then
 * `success`, or `error` for "admin". Messages come from the validators themselves; the
 * async one returns its own string (`{ taken: 'That username is taken.' }`), which is used
 * as-is since no message map entry exists for `taken`.
 */
export const DerivedStatusWithFeedback: Story = {
  render: () => {
    const takenValidator = (control: AbstractControl) =>
      new Promise<ValidationErrors | null>((resolve) =>
        setTimeout(
          () =>
            resolve(
              control.value === 'admin'
                ? { taken: 'That username is taken.' }
                : null,
            ),
          800,
        ),
      );
    const username = new FormControl('admin', {
      validators: [Validators.required, Validators.minLength(3)],
      asyncValidators: takenValidator,
    });
    const email = new FormControl('ada@', {
      validators: [Validators.required, Validators.email],
    });
    const city = new FormControl('Lima', Validators.required);
    [username, email, city].forEach((c) => c.markAsTouched());
    return {
      moduleMetadata: fieldModuleMetadata,
      props: { username, email, city },
      template: `
        <div andesForm style="max-width: 360px;">
          <andes-form-field label="Username" hasFeedback>
            <input andesFormControl [formControl]="username" class="andes-demo-control" />
          </andes-form-field>
          <andes-form-field label="Email" hasFeedback>
            <input andesFormControl [formControl]="email" class="andes-demo-control" />
          </andes-form-field>
          <andes-form-field label="City" hasFeedback>
            <select andesFormControl [formControl]="city" class="andes-demo-control">
              <option value="">Select a city</option>
              <option value="Lima">Lima</option>
              <option value="Cusco">Cusco</option>
            </select>
          </andes-form-field>
        </div>
      `,
    };
  },
};

/**
 * No `<andes-form-error>` authored: the field renders a message per failing validator from
 * the control's real `ValidationErrors`. Messages resolve field `errorMessages` → the
 * `andesForm`'s → `provideAndesFormErrorMessages()` → built-in defaults, and may use
 * `{label}` or any key of the validator's error object (`{requiredLength}`), or be a function.
 * Here the form localizes to Spanish and one field overrides `pattern`.
 */
export const GeneratedErrorMessages: Story = {
  render: () => {
    const form = new FormGroup({
      name: new FormControl('', Validators.required),
      code: new FormControl('ab', [
        Validators.minLength(4),
        Validators.pattern(/^[0-9]+$/),
      ]),
      email: new FormControl('ada@', Validators.email),
    });
    form.markAllAsTouched();
    return {
      moduleMetadata: fieldModuleMetadata,
      props: {
        form,
        spanish: {
          required: '{label} es obligatorio.',
          minlength: 'Ingresa al menos {requiredLength} caracteres.',
          email: 'Ingresa un correo válido.',
        },
        codeMessages: { pattern: 'Solo dígitos, por favor.' },
      },
      template: `
        <form andesForm [formGroup]="form" [errorMessages]="spanish" style="max-width: 360px;">
          <andes-form-field label="Nombre">
            <input andesFormControl formControlName="name" class="andes-demo-control" />
          </andes-form-field>
          <andes-form-field label="Código" [errorMessages]="codeMessages">
            <input andesFormControl formControlName="code" class="andes-demo-control" />
          </andes-form-field>
          <andes-form-field label="Correo">
            <input andesFormControl formControlName="email" class="andes-demo-control" />
          </andes-form-field>
        </form>
      `,
    };
  },
};

/**
 * `help` replaces the generated messages (and is coloured by the status), `extra` always
 * sits underneath. Both are folded into the control's `aria-describedby`.
 */
export const HelpAndExtra: Story = {
  render: () => {
    const password = new FormControl('abc', Validators.minLength(8));
    password.markAsTouched();
    return {
      moduleMetadata: fieldModuleMetadata,
      props: { password, plain: new FormControl('') },
      template: `
        <div andesForm style="max-width: 360px;">
          <andes-form-field
            label="Password"
            help="Use 8 or more characters."
            extra="We never store your password in plain text."
          >
            <input andesFormControl type="password" [formControl]="password" class="andes-demo-control" />
          </andes-form-field>
          <andes-form-field label="Nickname" extra="Shown on your public profile.">
            <input andesFormControl [formControl]="plain" class="andes-demo-control" />
          </andes-form-field>
        </div>
      `,
    };
  },
};

/**
 * The required mark is detected from `Validators.required`/`requiredTrue` (or a native
 * `required` attribute); `requiredMark` on the form switches between the asterisk, nothing,
 * and `'optional'` (marks the *non*-required fields instead). `tooltip` adds an info button
 * next to the label - hover or focus it; Escape closes it.
 */
export const RequiredMarkAndTooltip: Story = {
  render: () => ({
    moduleMetadata: fieldModuleMetadata,
    props: {
      groups: [true, 'optional', false].map((mark) => ({
        mark,
        name: new FormControl('', Validators.required),
        company: new FormControl(''),
      })),
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; max-width: 900px;">
        @for (c of groups; track $index) {
          <div andesForm [requiredMark]="c.mark">
            <p style="margin: 0; font-family: var(--andes-font-family), sans-serif; font-size: 0.75rem; color: var(--andes-color-muted-foreground);">
              requiredMark = {{ c.mark }}
            </p>
            <andes-form-field label="Full name" tooltip="As printed on your ID.">
              <input andesFormControl [formControl]="c.name" class="andes-demo-control" />
            </andes-form-field>
            <andes-form-field label="Company">
              <input andesFormControl [formControl]="c.company" class="andes-demo-control" />
            </andes-form-field>
          </div>
        }
      </div>
    `,
  }),
};

/**
 * `noStyle` fields render only their control - several of them can share one labelled
 * parent field, whose status and messages aggregate theirs (Ant's compound-field pattern).
 */
export const NoStyleCompound: Story = {
  render: () => {
    const prefix = new FormControl('+51', Validators.required);
    const phone = new FormControl('98', [
      Validators.required,
      Validators.minLength(9),
    ]);
    phone.markAsTouched();
    return {
      moduleMetadata: fieldModuleMetadata,
      props: { prefix, phone },
      template: `
        <div andesForm style="max-width: 360px;">
          <andes-form-field label="Phone">
            <div style="display: flex; gap: 0.5rem;">
              <andes-form-field noStyle style="width: 5rem; flex: none;">
                <input andesFormControl [formControl]="prefix" class="andes-demo-control" aria-label="Country code" />
              </andes-form-field>
              <andes-form-field noStyle style="flex: 1;">
                <input andesFormControl [formControl]="phone" class="andes-demo-control" aria-label="Number" />
              </andes-form-field>
            </div>
          </andes-form-field>
        </div>
      `,
    };
  },
};
