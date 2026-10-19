import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-a11y'],
  // Generated media fixtures for the video player stories (see public/media/README.md).
  staticDirs: ['./public'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
