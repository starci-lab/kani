import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import {
    ClientsOptions 
} from "./types"

/**
 * Configurable module builder for clients module.
 * Provides module options token and configuration type.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<ClientsOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()
