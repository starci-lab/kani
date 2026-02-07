import {
    ConfigurableModuleBuilder,
} from "@nestjs/common"
import type {
    ConsulOptions,
} from "./types"

/** NestJS configurable module tokens and options type for Consul. */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<ConsulOptions>()
        .setExtras(
            {
                isGlobal: false,
            },
            (definition, extras) => ({
                ...definition,
                global: extras.isGlobal,
            }),
        )
        .build()
