import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./user-fetcher.module-definition"
import { UserFetcherService } from "./user-fetcher.service"

@Module({
    providers: [
        UserFetcherService,
    ],
})
export class UserFetcherModule extends ConfigurableModuleClass {}