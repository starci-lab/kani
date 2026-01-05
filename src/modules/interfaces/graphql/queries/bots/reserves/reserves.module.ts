import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./fees.module-definition"
import { FeesService } from "./reserves.service"
import { FeesResolver } from "./fees.resolver"

@Module({
    providers: [
        FeesService,
        FeesResolver,
    ],
})
export class FeesModule extends ConfigurableModuleClass {}

