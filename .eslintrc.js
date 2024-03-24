module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['standard-with-typescript', 'prettier'],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  ignorePatterns: [
    'node_modules',
    'cdk.out',
    'dist',
    'test/*.js',
    'test/*.d.ts'
  ],
  rules: {
    'eqeqeq': 'warn',
    'no-new': 'off',
    'object-shorthand': 'off',
    'no-lone-blocks': 'off',
    'no-unneeded-ternary': 'off',
    'spaced-comment': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/consistent-type-definitions': 'warn',
    '@typescript-eslint/consistent-indexed-object-style': 'warn',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/dot-notation': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/restrict-plus-operands': 'warn',
    '@typescript-eslint/consistent-type-imports': 'off',
  }
};
