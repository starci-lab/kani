import {
    ConfigurableModuleBuilder
} from "@nestjs/common"
import type {
    EnvOptions
} from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<EnvOptions>()
        .setClassMethodName("forRoot")
        .build()
