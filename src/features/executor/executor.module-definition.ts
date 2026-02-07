import {
    ConfigurableModuleBuilder,
} from "@nestjs/common"

/** Options for ExecutorModule registration. */
export interface ExecutorOptions {
    /** Enable DNS discovery via Consul. */
    enableDnsDiscovery?: boolean
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<ExecutorOptions>()
        .setExtras(
            {
                isGlobal: false,
                enableDnsDiscovery: false,
            },
            (definition, extras) => ({
                ...definition,
                global: extras.isGlobal,
                enableDnsDiscovery: extras.enableDnsDiscovery,
            }),
        )
        .build()
