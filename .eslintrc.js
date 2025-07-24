module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: [
    'shared/dist/**/*',
    'shared/src/**/*',
    'e2e/**/*',
    'backend/*/index.ts', // Ignore function directories
    '**/*.d.ts',
    'node_modules/**/*',
    'coverage/**/*',
    'dist/**/*',
    'build/**/*',
    '.eslintrc.*',
    'jest.config.js',
    'jest.setup.js',
    'backend/index.js',
    'frontend/debug-*.js',
    'scripts/validate-dependencies.js',
  ],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off',
  },
  overrides: [
    {
      files: ['backend/src/**/*.ts'],
      extends: ['./backend/.eslintrc.js'],
    },
    {
      files: ['frontend/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['frontend/debug-*.js'],
      extends: ['./frontend/.eslintrc.json'],
    },
  ],
};
