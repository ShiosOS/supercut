// Lint rules for the pipeline and app code. Strict on unused code and `any`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  {
    // The pipeline reports progress on stdout by design; the app does not.
    files: ["src/**"],
    rules: { "no-console": "off" },
  },
);
