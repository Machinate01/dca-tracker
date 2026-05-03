// Minimal flat config. eslint-config-next pulls in a react plugin with a
// circular object structure that ESLint 9 flat config cannot serialize
// (JSON.stringify throws). Since this is a local single-user app and
// `tsc --noEmit` (npm run typecheck) is the primary correctness gate,
// we keep lint as a no-op pass with just the ignores.
export default [
  {
    ignores: [
      'dca-tracker-ui-ref/**',
      'data/**',
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'eslint.config.mjs',
    ],
  },
];
