import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
    // Global ignores
    {
        ignores: ["dist/**", "node_modules/**", ".vercel/**"],
    },

    // Base recommended config
    js.configs.recommended,

    // TypeScript configs
    ...tseslint.configs.recommended,

    // Project-specific configuration
    {
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "off",

            // General rules
            "no-console": "off",
            "prefer-const": "error",
            "no-var": "error",
        },
    },

    // API routes configuration
    {
        files: ["api/**/*.ts"],
        rules: {
            // Allow unused vars in API handlers (req, res pattern)
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_|^req$|^res$" },
            ],
        },
    },
];
