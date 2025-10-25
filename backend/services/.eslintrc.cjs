module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error', 'log'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['dist/**']
};
