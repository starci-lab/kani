import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./data-like.module-definition"
import { DataLikeService } from "./data-like.service"
import { DataLikeQueryService } from "./data-like-query.service"
import { PositionRecordManagerService } from "./position-record-manager.service"
import { DataLikePositionService } from "./data-like-position.service"

@Module({
    providers: [
        DataLikeService,
        DataLikeQueryService,
        DataLikePositionService,
        PositionRecordManagerService
    ],
    exports: [
        DataLikeService,
        DataLikeQueryService,
        DataLikePositionService,
        PositionRecordManagerService
    ]
})
export class DataLikeModule extends ConfigurableModuleClass {}