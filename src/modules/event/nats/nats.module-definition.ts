import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import type {
    NatsOptions 
} from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<NatsOptions>()
        .setExtras(
            {
                isGlobal: false 
            },
            (definition, extras) => ({
                ...definition,
                global: extras.isGlobal,
            }),
        )
        .build()
