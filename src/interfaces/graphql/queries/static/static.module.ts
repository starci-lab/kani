import { Module } from "@nestjs/common"
import { StaticResolver } from "./static.resolver"
import { StaticService } from "./static.service"
import { ConfigurableModuleClass } from "./static.module-definition"

@Module({
    providers: [StaticResolver, StaticService],
})
export class StaticModule extends ConfigurableModuleClass {}