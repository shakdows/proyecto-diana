import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Reglas de calidad del proyecto.
 * `any` es error, no advertencia: el tipado estricto es un requisito, no una
 * recomendación.
 */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'db/migrations/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default config;
