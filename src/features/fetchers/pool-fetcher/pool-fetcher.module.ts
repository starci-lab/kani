import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pool-fetcher.module-definition"
import { PoolFetcherService } from "./fetcher.service"

@Module({
    providers: [
        PoolFetcherService,
    ],
    exports: [
        PoolFetcherService
    ]
})
export class PoolFetcherModule extends ConfigurableModuleClass {}