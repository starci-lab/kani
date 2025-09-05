import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price-fetchers.module-definition"

@Module({
    imports: [
    ],
    providers: [
    ],
    exports: [
    ],
})
export class PriceFetchersModule extends ConfigurableModuleClass {}