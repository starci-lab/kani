
import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"

/**
 * TxBuilder module definition.
 * Configures the tx-builder module with dynamic options.
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


