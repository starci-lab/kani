import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./positions.module-definition"
import { PositionsService } from "./positions.service"
import { PositionsResolver } from "./positions.resolver"

@Module({
    providers: [
        PositionsService,
        PositionsResolver,
    ],
})
export class PositionsModule extends ConfigurableModuleClass {}

