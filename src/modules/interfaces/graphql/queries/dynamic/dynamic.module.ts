import { Module } from "@nestjs/common"
import { DynamicResolver } from "./dynamic.resolver"
import { DynamicService } from "./dynamic.service"
import { ConfigurableModuleClass } from "./dynamic.module-definition"

@Module({
    providers: [DynamicResolver, DynamicService],
})
export class DynamicGraphQLModule extends ConfigurableModuleClass {}