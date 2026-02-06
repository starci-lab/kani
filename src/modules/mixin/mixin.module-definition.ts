import {
    ConfigurableModuleBuilder
} from "@nestjs/common"
import type {
    MixinOptions
} from "./types"

/**
 * The configurable module class for the Mixin module.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<MixinOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()
