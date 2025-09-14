import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price-fetcher.module-definition"
import { CexFetcherService } from "./cex-fetcher.service"
import { PythFetcherService } from "./pyth-fetcher.service"

@Module({
    providers: [
        CexFetcherService,
        PythFetcherService
    ],
    exports: [
        CexFetcherService,
        PythFetcherService
    ],
})
export class PriceFetcherModule extends ConfigurableModuleClass {}