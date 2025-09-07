import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pool-fetcher.module-definition"
import { FetcherService } from "./fetcher.service"

@Module({
    providers: [
        FetcherService,
    ],
})
export class PoolFetcherModule extends ConfigurableModuleClass {}