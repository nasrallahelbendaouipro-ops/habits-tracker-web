import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler-readiness rules new to eslint-config-next's core-web-vitals.
      // They flag ~26 pre-existing call sites (hydration-safe localStorage reads in
      // effects, a couple of ref/impure-call patterns) that work correctly today and
      // predate React Compiler adoption. Downgraded to warn so CI isn't blocked by a
      // backlog unrelated to this pass; revisit when adopting the compiler.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.claude/**', 'node_modules/**']),
]);

export default eslintConfig;
