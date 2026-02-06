import {
    ConfigurableModuleBuilder 
} from "@nestjs/common"

/**
 * BullMQ module definition.
 * Configures the bullmq module with dynamic options.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder()
      .setClassMethodName("forRoot")
      .build()
