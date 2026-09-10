module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  rules: {
    'react-hooks/refs': 'off',
    'react-hooks/set-state-in-effect': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['/dist/*', 'node_modules'],
};
