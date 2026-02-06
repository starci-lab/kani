import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"

/**
 * Snapshots module definition.
 * Configures the snapshots module with dynamic options.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()


