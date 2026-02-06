
import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import type {
    TerminusOptions
} from "./types"

/**
 * The configurable module class for the Terminus module.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<TerminusOptions>().setExtras({
        isGlobal: false
    },
    (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
    })
    ).build()
