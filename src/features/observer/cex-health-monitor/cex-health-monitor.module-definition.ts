import {
    ConfigurableModuleBuilder,
} from "@nestjs/common"
import type { CexHealthMonitorOptions } from "./types/options"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<CexHealthMonitorOptions>()
        .setExtras(
            { isGlobal: false },
            (definition, extras) => ({
                ...definition,
                global: extras.isGlobal,
            }),
        )
        .build()
