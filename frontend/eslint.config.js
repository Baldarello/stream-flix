import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    { ignores: ['dist/**', 'node_modules/**', '.junie/**', '.playwright-mcp/**', 'coverage/**'] },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                process: 'readonly',
                // Loaded globally by the Google Identity Services script
                // in `index.html` (see <script src="https://accounts.google.com/gsi/client">).
                google: 'readonly',
                // Bundled lazily by Vite when the user clicks the login button.
                gapi: 'readonly',
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'jsx-a11y': jsxA11y,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-useless-escape': 'warn',
        },
    },
    {
        files: ['**/*.test.{js,jsx}', 'tests/**', 'e2e/**'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
        rules: {
            'no-unused-vars': 'off',
        },
    },
];
