/* 
 * Webpack configuration for kani-coordinator (NestJS application)
 * 
 * - Uses CommonJS for maximum compatibility with Nest CLI
 * - Bundles TypeScript entry into a Node.js application
 * - Generates a standalone package.json for distribution
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("path")

// Prevent bundling node_modules; they will be resolved at runtime
const nodeExternals = require("webpack-node-externals")

// Generates a package.json file in the output directory
const GeneratePackageJsonPlugin = require("generate-package-json-webpack-plugin")

/**
 * Base package.json template for kani-coordinator
 * This file will be generated inside dist/apps/kani-coordinator
 */
const basePackage = {
    name: "kani-coordinator",
    version: "0.0.1",

    /**
     * Entry point relative to the generated package.json
     * IMPORTANT:
     * - package.json is generated inside dist/apps/kani-coordinator
     * - main.js will also live in the same directory
     */
    main: "./main.js",

    scripts: {
        start: "node ./main.js"
    },

    /**
     * Node.js runtime requirement
     */
    engines: {
        node: ">= 24",
    },

    /**
     * Dependencies for the coordinator application
     */
    dependencies: {
        "@nestjs/platform-express": "^11.0.1",
    },
}

module.exports = {
    /**
     * TypeScript entry point for the coordinator application
     */
    entry: "./apps/kani-coordinator/src/main.ts",

    /**
     * Output bundle location
     * Final result: dist/apps/kani-coordinator/main.js
     */
    output: {
        path: path.join(__dirname, "../..", "dist", "apps", "kani-coordinator"),
        filename: "main.js",
    },

    /**
     * Target Node.js runtime (not browser)
     */
    target: "node",

    /**
     * Exclude node_modules from the bundle
     */
    externals: [nodeExternals()],

    /**
     * Plugins used during the build process
     */
    plugins: [
        new GeneratePackageJsonPlugin(
            basePackage,
            {
                resolveContextPaths: [__dirname],
                useInstalledVersions: true,
                excludeDependencies: [],
            }
        ),
    ],
}
