import {
    ConfigurableModuleBuilder,
} from "@nestjs/common"

/** Dynamic module definition for ApolloClientModule (options and global flag). */
export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} = new ConfigurableModuleBuilder()
    .setExtras(
        {
            isGlobal: false,
        },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
        })
    )
    .build()
