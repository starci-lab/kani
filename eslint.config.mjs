import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import {
    defineConfig
} from "eslint/config"

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: {
            js
        }, extends: ["js/recommended"], languageOptions: {
            globals: globals.node
        }
    },
    tseslint.configs.recommended,
    {
        rules: {
            "array-element-newline": ["error", "always"],
            "object-curly-newline": [
                "error",
                {
                    "ObjectExpression": "always",
                    "ImportDeclaration": "always",
                }
            ],
            "function-call-argument-newline": ["error", "always"],
            indent: ["error", 4],
            "linebreak-style": "off",
            quotes: ["error", "double"],
            semi: ["error", "never"],
        },
    },
])
