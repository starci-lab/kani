import { ConfigurableModuleBuilder } from "@nestjs/common"
import { WinstonOptions } from "./types"

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<WinstonOptions>().setExtras(
      {
          isGlobal: false
      },
      (definition, extras) => ({
          ...definition,
          global: extras.isGlobal
      })
  ).build()
