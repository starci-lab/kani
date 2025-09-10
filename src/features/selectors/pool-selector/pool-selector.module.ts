import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pool-selector.module-definition"
import { PoolSelectorService } from "./pool-selector.service"
import { TickManagerService } from "./tick-manager.service"

@Module({
    providers: [
        PoolSelectorService, 
        TickManagerService,
    ],
})
export class PoolSelectorModule extends ConfigurableModuleClass {}