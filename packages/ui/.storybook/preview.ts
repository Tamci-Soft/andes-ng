import { provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucideLoaderCircle,
  lucidePlus,
} from '@ng-icons/lucide';
import {
  applicationConfig,
  type Decorator,
  type Preview,
} from '@storybook/angular';

const withTheme: Decorator = (story, context) => {
  const theme = context.globals['theme'] === 'dark' ? 'dark' : undefined;
  if (theme) {
    document.documentElement.setAttribute('data-andes-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-andes-theme');
  }
  document.body.style.backgroundColor =
    theme === 'dark' ? '#0f172a' : '#ffffff';
  return story();
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Andes NG theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    withTheme,
    applicationConfig({
      providers: [
        provideIcons({
          lucideArrowLeft,
          lucideArrowRight,
          lucideLoaderCircle,
          lucidePlus,
        }),
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
