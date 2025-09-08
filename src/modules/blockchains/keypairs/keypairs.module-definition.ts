import { ConfigurableModuleBuilder } from "@nestjs/common"
import { KeypairsOptions } from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<KeypairsOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()