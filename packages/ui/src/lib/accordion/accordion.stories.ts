import type { Meta, StoryObj } from '@storybook/angular';

import { AndesAccordion } from './accordion';
import { AndesAccordionContent } from './accordion-content';
import { AndesAccordionItem } from './accordion-item';
import { AndesAccordionTrigger } from './accordion-trigger';

const meta: Meta<AndesAccordion> = {
  title: 'Accordion',
  component: AndesAccordion,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['single', 'multiple'] },
    disabled: { control: 'boolean' },
  },
  args: {
    type: 'single',
    disabled: false,
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [
        AndesAccordionItem,
        AndesAccordionTrigger,
        AndesAccordionContent,
      ],
    },
    props: args,
    template: `
      <andes-accordion [type]="type" [disabled]="disabled" style="max-width: 28rem;">
        <andes-accordion-item value="what-is">
          <andes-accordion-trigger>What is Andes NG?</andes-accordion-trigger>
          <andes-accordion-content>
            A zoneless Angular component library published under the MIT license.
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="styling">
          <andes-accordion-trigger>How is it styled?</andes-accordion-trigger>
          <andes-accordion-content>
            Entirely through CSS custom properties defined in @andes-ng/tokens - no
            component-specific tokens, no runtime theming library.
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="a11y">
          <andes-accordion-trigger>Is it accessible?</andes-accordion-trigger>
          <andes-accordion-content>
            Each trigger is a native button with aria-expanded and aria-controls; each panel is
            a role="region" cross-linked back to its trigger via aria-labelledby.
          </andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesAccordion>;

export const Single: Story = {
  args: { type: 'single' },
};

export const Multiple: Story = {
  args: { type: 'multiple' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledItem: Story = {
  render: (args) => ({
    moduleMetadata: {
      imports: [
        AndesAccordionItem,
        AndesAccordionTrigger,
        AndesAccordionContent,
      ],
    },
    props: args,
    template: `
      <andes-accordion [type]="type" style="max-width: 28rem;">
        <andes-accordion-item value="one">
          <andes-accordion-trigger>Available section</andes-accordion-trigger>
          <andes-accordion-content>This one can be toggled normally.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="two" disabled>
          <andes-accordion-trigger>Disabled section</andes-accordion-trigger>
          <andes-accordion-content>This content is not reachable while disabled.</andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="three">
          <andes-accordion-trigger>Another available section</andes-accordion-trigger>
          <andes-accordion-content>More content here.</andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};

export const Preopened: Story = {
  name: 'Pre-opened item (multiple mode)',
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesAccordionItem,
        AndesAccordionTrigger,
        AndesAccordionContent,
      ],
    },
    template: `
      <andes-accordion type="multiple" style="max-width: 28rem;">
        <andes-accordion-item value="one">
          <andes-accordion-trigger>First section</andes-accordion-trigger>
          <andes-accordion-content>
            Click any trigger to expand/collapse it independently of the others.
          </andes-accordion-content>
        </andes-accordion-item>
        <andes-accordion-item value="two">
          <andes-accordion-trigger>Second section</andes-accordion-trigger>
          <andes-accordion-content>
            Multiple mode lets several panels stay open at the same time.
          </andes-accordion-content>
        </andes-accordion-item>
      </andes-accordion>
    `,
  }),
};
