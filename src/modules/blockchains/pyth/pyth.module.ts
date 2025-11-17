import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pyth.module-definition"
import { createHermesClientProvider } from "./pyth.providers"
import { PythService } from "./pyth.service"
import { OraclePriceService } from "./oracle-price.service"

@Module({
    providers: [
        PythService,
        OraclePriceService,
        createHermesClientProvider(),
    ],
    exports: [
        PythService,
        OraclePriceService,
    ],
})
export class PythModule extends ConfigurableModuleClass {}