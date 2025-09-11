import { ConfigurableModuleBuilder } from "@nestjs/common"
import { SignersOptions } from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<SignersOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()
