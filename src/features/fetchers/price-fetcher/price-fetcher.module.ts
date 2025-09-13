import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./price-fetcher.module-definition"
import { CexFetcherService } from "./cex-fetcher.service"

@Module({
    providers: [
        CexFetcherService,
    ],
    exports: [
        CexFetcherService,
    ],
})
export class PriceFetcherModule extends ConfigurableModuleClass {}