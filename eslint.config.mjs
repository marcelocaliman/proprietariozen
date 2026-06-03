// ESLint 9 flat config — minimal, foca em pegar erros de TypeScript.
// next/core-web-vitals tem incompatibilidade com FlatCompat no Next 16,
// então usamos só typescript-eslint base.
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      // Não falha por diretivas de plugins não instalados (react-hooks,
      // @next/next, etc.) — mantemos os disable-comments compativeis com
      // futura readicao desses plugins sem barulho agora.
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  // Stub para regras de plugins removidos do core (Next 16 dropped lint).
  // Registramos como off pra disable-directives existentes no codigo nao
  // virarem erro de regra desconhecida.
  {
    plugins: {
      'react-hooks':  { rules: { 'exhaustive-deps': { create: () => ({}) }, 'rules-of-hooks': { create: () => ({}) } } },
      '@next/next':   { rules: { 'no-img-element': { create: () => ({}) } } },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks':  'off',
      '@next/next/no-img-element':   'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
      'public/**',
      'backend/**',  // codigo legacy JS — fora do escopo do app Next
    ],
  },
]
