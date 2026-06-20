// ESLint 10 flat config for Next 16. eslint-config-next 16 ships native flat
// config arrays — consume directly (no FlatCompat).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next', 'node_modules', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
];

export default config;
