import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", "scripts/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use Next's `server-only`. Use `*.server.ts` extension instead.",
            },
            {
              name: "sonner",
              message:
                "Import from `@/shared/lib/notify` instead of `sonner` directly (single toast entry point).",
            },
          ],
          patterns: [
            {
              group: ["**/integrations/supabase/client.server", "**/integrations/supabase/client.server.ts"],
              message:
                "`client.server.ts` is server-only — never import from client code. Use a `*.functions.ts` server fn instead.",
            },
          ],
        },
      ],
      // Hardcoded color literals are forbidden — use HSL tokens in src/styles.css.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            "Hardcoded hex color. Use a design token from src/styles.css (e.g. `bg-primary`, `text-foreground`).",
        },
        {
          selector: "Literal[value=/rgba?\\([0-9]/]",
          message:
            "Hardcoded rgb()/rgba(). Use a design token from src/styles.css.",
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Exceptions for files allowed to use the raw imports.
  {
    files: [
      "src/shared/lib/notify.ts",
      "src/components/ui/sonner.tsx",
      "src/integrations/supabase/client.server.ts",
      "src/integrations/supabase/**/*.server.ts",
      "src/**/*.functions.ts",
      "src/styles.css",
    ],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  eslintPluginPrettier,
);
