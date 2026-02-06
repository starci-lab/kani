
import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import {
    DexOptions 
} from "../types"

/**
 * Turbos module definition.
 * Configures the Turbos DEX module with dynamic options.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<DexOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()
