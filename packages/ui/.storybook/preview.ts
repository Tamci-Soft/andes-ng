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
  // Demo text around the components (captions, logs, plain triggers) uses the library font too,
  // so a story reads as one surface instead of mixing Geist with the browser's Times/Arial.
  document.body.style.fontFamily = 'var(--andes-font-family), sans-serif';
  // Grayscale antialiasing, as the tokens README recommends for consumer apps: macOS otherwise
  // renders text with a heavier stroke than the typeface was drawn with.
  document.body.style.setProperty('-webkit-font-smoothing', 'antialiased');
  document.body.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
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
