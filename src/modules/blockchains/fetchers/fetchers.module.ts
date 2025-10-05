import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./fetchers.module-definition"
import { PoolFetcherService } from "./pool-fetcher.service"

@Module({
    providers: [
        PoolFetcherService,
    ],
    exports: [
        PoolFetcherService
    ]
})
export class FetchersModule extends ConfigurableModuleClass {}