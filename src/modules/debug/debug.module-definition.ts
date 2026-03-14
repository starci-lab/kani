import {
    ConfigurableModuleBuilder 
} from "@nestjs/common" 

/**
 * Configurable module builder for debug loggers module.
 * Provides module options with global configuration support.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder()
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
