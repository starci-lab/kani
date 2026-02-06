import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"
import {
    DexOptions 
} from "../types"

/**
 * FlowX module definition.
 * Configures the FlowX DEX module with dynamic options.
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
