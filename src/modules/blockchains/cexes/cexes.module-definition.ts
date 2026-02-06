import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"

/**
 * Configurable module builder for CEX module.
 * Provides module options token and configuration type.
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
