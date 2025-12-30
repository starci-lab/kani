/* 
 * Webpack configuration for kani-cli (NestJS CLI application)
 * 
 * - Uses CommonJS for maximum compatibility with Nest CLI
 * - Bundles TypeScript entry into a Node.js CLI
 * - Generates a standalone package.json for CLI distribution
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("path")

// Prevent bundling node_modules; they will be resolved at runtime
const nodeExternals = require("webpack-node-externals")

// Generates a package.json file in the output directory
const GeneratePackageJsonPlugin = require("generate-package-json-webpack-plugin")

/**
 * Base package.json template for kani-cli
 * This file will be generated inside dist/apps/kani-cli
 */
const basePackage = {
    // CLI package name
    name: "kani-cli",

    // CLI version (should match repository version if published)
    version: "0.0.1",

    /**
     * Entry point relative to the generated package.json
     * IMPORTANT:
     * - package.json is generated inside dist/apps/kani-cli
     * - main.js will also live in the same directory
     */
    main: "./main.js",

    // Helper script for local debugging
    scripts: {
        start: "node ./main.js"
    },

    /**
     * Binary definition for CLI execution
     * Allows usage like:
     *   kani googleapis backup
     */
    bin: {
        kani: "./main.js"
    },

    /**
     * Node.js runtime requirement
     * Ensure your runtime and Docker image support this version
     */
    engines: {
        node: ">= 24",
    }
}

module.exports = {
    /**
     * TypeScript entry point for the CLI application
     */
    entry: "./apps/kani-cli/src/main.ts",

    /**
     * Output bundle location
     * Final result:
     *   apps/kani-cli/main.js
     */
    output: {
        path: path.join(__dirname, "../..", "dist", "apps", "kani-cli"),
        filename: "main.js",
    },

    /**
     * Target Node.js runtime (not browser)
     */
    target: "node",

    /**
     * Exclude node_modules from the bundle
     * Keeps the bundle small and avoids duplicating dependencies
     */
    externals: [nodeExternals()],

    /**
     * Plugins used during the build process
     */
    plugins: [
        new GeneratePackageJsonPlugin(
            basePackage,
            {
                /**
                 * Resolve dependencies relative to the current config directory
                 */
                resolveContextPaths: [__dirname],

                /**
                 * Use versions from installed node_modules
                 */
                useInstalledVersions: true,

                /**
                 * Do not exclude any dependencies from generated package.json
                 */
                excludeDependencies: [],
            }
        ),
    ],
}
