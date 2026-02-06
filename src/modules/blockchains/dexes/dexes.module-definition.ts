import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import {
    DexesOptions 
} from "./types"

/**
 * DEXes module definition.
 * Configures the DEXes module with dynamic options.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<DexesOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()