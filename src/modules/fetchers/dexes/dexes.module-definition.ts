import { ConfigurableModuleBuilder } from "@nestjs/common"
import { DexesFetcherOptions } from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<DexesFetcherOptions>().setExtras(
        {
            isGlobal: false
        },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal
        })
    ).build()
