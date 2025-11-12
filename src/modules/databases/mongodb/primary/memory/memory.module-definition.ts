import { ConfigurableModuleBuilder } from "@nestjs/common"
import { MemoryStorageOptions } from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<MemoryStorageOptions>().setExtras(
        {
            isGlobal: false
        },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal
        })
    ).build()
