import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: false,
});

export default [
  ...compat.extends(
    "eslint-config-next/core-web-vitals",
    "eslint-config-next/typescript"
  ),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];
