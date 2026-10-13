import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next v16 ships native flat configs — no FlatCompat needed
// (wrapping it in FlatCompat is what caused the "circular structure" crash).
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
