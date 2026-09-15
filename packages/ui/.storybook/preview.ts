import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucidePlus,
} from '@ng-icons/lucide';
import { applicationConfig, type Preview } from '@storybook/angular';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideIcons({ lucideArrowLeft, lucideArrowRight, lucidePlus }),
      ],
    }),
  ],
  parameters: {
    a11y: { test: 'error' },
    controls: { expanded: true },
    layout: 'centered',
  },
};

export default preview;
