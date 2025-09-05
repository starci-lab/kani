import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price-fetchers.module-definition"
import { FetcherService } from "./fetcher.service"

@Module({
    providers: [
        FetcherService,
    ],
})
export class PriceFetchersModule extends ConfigurableModuleClass {}