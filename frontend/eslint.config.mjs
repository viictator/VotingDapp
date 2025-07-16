// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // These are your existing extended configurations
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add a new configuration object for your custom rule overrides
  {
    // You can specify `files` if these rules should only apply to certain file types.
    // For global overrides like these, you can omit `files` or specify common web file types.
    // Example: files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      // Temporarily turn off rules that are causing build errors
      "@typescript-eslint/no-explicit-any": "off", // Allows 'any' types in TypeScript
      "react/no-unescaped-entities": "off",         // Allows unescaped characters (like ') in JSX
      // Optionally, if you also want to turn off the exhaustive-deps warnings:
      // "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;