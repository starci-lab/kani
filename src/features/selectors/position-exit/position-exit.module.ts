import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./position-exit.module-definition"
import { PositionExitService } from "./position-exit.service"

@Module({
    providers: [
        PositionExitService, 
    ],
})
export class PositionExitModule extends ConfigurableModuleClass {}