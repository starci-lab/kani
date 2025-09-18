import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./data-like.module-definition"
import { DataLikeService } from "./data-like.service"
import { DataLikeQueryService } from "./data-like-query.service"
import { PositionRecordManagerService } from "./position-record-manager.service"

@Module({
    providers: [
        DataLikeService,
        DataLikeQueryService,
        PositionRecordManagerService
    ],
    exports: [
        DataLikeService,
        DataLikeQueryService,
        PositionRecordManagerService
    ]
})
export class DataLikeModule extends ConfigurableModuleClass {}