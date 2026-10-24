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
          ignoredDependencies: [
            // Relied on only through --andes-* CSS custom properties, never a TS import.
            '@andes-ng/tokens',
            // Not used by any component yet.
            '@angular/cdk',
            '@angular/common',
            '@angular/forms',
            'rxjs',
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
  {
    // Table cells must stay native <th>/<td> elements to keep the table's
    // semantics, so the header cell is a component on an attribute selector.
    files: ['src/lib/table/table-head.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'attribute', prefix: 'andes', style: 'camelCase' },
      ],
    },
  },
  { files: ['**/*.html'], rules: {} },
];
