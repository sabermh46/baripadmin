import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // argsIgnorePattern matches varsIgnorePattern so a destructured component prop
      // renamed to a capitalised identifier — `({ icon: Icon })`, used as <Icon /> — is not
      // reported. This config has no eslint-plugin-react, so JSX usage does not count as a
      // reference and every icon-prop component was flagged falsely.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]|^_' }],

      // Catches the temporal dead zone crashes this app has shipped twice — a `const` read
      // higher up the same function than its declaration ("Cannot access 'x' before
      // initialization"). js.configs.recommended does not include this, Vite does not analyse
      // it, so the only signal was the component blanking in the browser.
      //
      // functions:false keeps hoisted function declarations legal (used all over for helpers
      // defined below their call site); classes/variables are the real hazard.
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true, allowNamedExports: true }],
    },
  },
])
