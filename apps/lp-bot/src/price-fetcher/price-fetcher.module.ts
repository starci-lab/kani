import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price-fetcher.module-definition"
import { FetcherService } from "./fetcher.service"

@Module({
    providers: [
        FetcherService,
    ],
})
export class PriceFetcherModule extends ConfigurableModuleClass {}