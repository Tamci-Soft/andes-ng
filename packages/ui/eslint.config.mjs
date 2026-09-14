import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          // The package declares its peers and Brain ahead of the first
          // component, so the ADR 0004 contract stays reserved. Until a
          // component imports them, every entry here is intentionally
          // declared without being used.
          ignoredDependencies: [
            '@andes-ng/tokens',
            '@angular/cdk',
            '@angular/common',
            '@angular/core',
            '@angular/forms',
            '@spartan-ng/brain',
            'clsx',
            'rxjs',
            'tailwindcss',
            'tw-animate-css',
          ],
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'andes', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'andes', style: 'kebab-case' },
      ],
    },
  },
  { files: ['**/*.html'], rules: {} },
];
