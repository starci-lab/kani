import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./position-manager.module-definition"
import { PositionRecordManagerService } from "./position-record-manager.service"

@Module({
    providers: [
        PositionRecordManagerService,
    ],
    exports: [
        PositionRecordManagerService
    ]
})
export class PositionManagerModule extends ConfigurableModuleClass {}