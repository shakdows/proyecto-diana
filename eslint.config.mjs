import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Reglas de calidad del proyecto.
 *
 * `any` es error, no advertencia: el tipado estricto es un requisito, no una
 * recomendación.
 */
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'db/migrations/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    /**
     * Los scripts de `scripts/` y `db/` son herramientas de línea de comandos:
     * imprimir en consola es lo que hacen. Prohibírselo obligaría a sembrarlos
     * de excepciones, que es peor que no tener la regla.
     */
    files: ['scripts/**/*.ts', 'db/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    /**
     * La frontera del dominio puro SE VERIFICA, no se confía a la disciplina.
     *
     * `features/*​/services/` contiene las reglas de negocio: máquina de
     * estados, progreso, ETA, semáforo, CSAT/NPS. Deben poder probarse sin
     * levantar la aplicación y reutilizarse tal cual en el generador de PDF.
     * Si alguien importa Next.js o Supabase ahí, el lint falla.
     */
    files: ['src/features/*/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', 'server-only', '@supabase/*', 'react', 'react-dom'],
              message:
                'El dominio puro no depende del framework. Mueve esto a actions/ o queries/ (docs/06-estructura-de-carpetas.md §6.4).',
            },
            {
              group: ['@/lib/supabase/*', '@db/*'],
              message:
                'El dominio puro no accede a la base de datos: recibe datos y devuelve datos.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
