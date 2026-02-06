import {
    ConfigurableModuleBuilder,
} from "@nestjs/common"
import {
    ApolloServerOptions,
} from "./types"

/** Dynamic module definition for ApolloServerModule (options and global flag). */
export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ApolloServerOptions>()
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
