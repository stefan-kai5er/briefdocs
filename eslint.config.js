import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";

// Prettier formatiert, ESLint sucht Fehler: hier stehen bewusst keine
// Stilregeln. Die Inhalte unter src/content/ bleiben außen vor.
export default defineConfig(
  {
    ignores: ["dist/", ".astro/", "node_modules/", "public/", "assets/", "src/content/"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    // Der 3D-Viewer besteht fast nur aus Hooks. Fehlende Abhängigkeiten in
    // useEffect/useMemo sind dort die wahrscheinlichste Fehlerquelle.
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  }
);
