import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./refresh.module-definition"
import { RefreshService } from "./refresh.service"
import { RefreshResolver } from "./refresh.resolver"

@Module({
    providers: [
        RefreshService,
        RefreshResolver,
    ],
})
export class RefreshModule extends ConfigurableModuleClass {}

