import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pyth.module-definition"
import { createHermesClientProvider } from "./pyth.providers"
import { PythService } from "./pyth.service"

@Module({
    providers: [
        PythService,
        createHermesClientProvider(),
    ],
    exports: [
        PythService,
    ],
})
export class PythModule extends ConfigurableModuleClass {}