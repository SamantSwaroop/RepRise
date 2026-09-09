/**
 * Root ESLint config — used by apps/api and packages/shared (plain Node/TS).
 * apps/mobile has its own config extending `expo` instead, since React Native
 * needs different rules (JSX, RN globals, Expo Router file conventions).
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { es2022: true, node: true },
  ignorePatterns: ['dist', 'node_modules', '.expo', 'apps/mobile/**'],
};
