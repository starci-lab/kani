import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./pool-selector.module-definition"
import { PoolSelectorService } from "./pool-selector.service"

@Module({
    providers: [
        PoolSelectorService, 
    ],
})
export class PoolSelectorModule extends ConfigurableModuleClass {}