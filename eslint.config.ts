import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';

const config = [
  {
    ignores: ['dist/**', 'node_modules/**', '.scratchpad/**', '.wrangler/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['src/**/*.ts'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.builtin, ...globals.node, ...globals.es2020,
      },
      parser: ts.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },

    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      'constructor-super': 'error',
      'curly': ['error', 'multi-line'],
      'default-case-last': 'error',
      'default-param-last': ['error'],
      'dot-notation': ['error', { allowKeywords: true }],
      'eqeqeq': ['error', 'smart'],
      'indent': ['error', 2],
      'max-len': ['error', { code: 200, tabWidth: 2 }],
      'no-console': ['error', { allow: ['debug'] }],
      'no-const-assign': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-empty': 'error',
      'no-throw-literal': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-expressions': 'error',
      'no-use-before-define': 'off',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-constructor': 'error',
      'no-useless-return': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-destructuring': ['error', { object: true, array: true }],
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
    },
  },
  {
    files: ['src/common/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.builtin, ...globals.node,
      },
      parser: ts.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },

    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',

      'curly': ['error', 'multi-line'],
      'eqeqeq': ['error', 'smart'],
      'indent': ['error', 2],
      'no-console': 'off',
      'no-throw-literal': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
    },
  }
];

export default config;
