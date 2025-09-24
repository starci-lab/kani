import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./data-like.module-definition"
import { DataLikeService } from "./data-like.service"
import { DataLikeQueryService } from "./data-like-query.service"
import { DataLikePositionService } from "./data-like-position.service"

@Module({
    providers: [
        DataLikeService,
        DataLikeQueryService,
        DataLikePositionService,
    ],
    exports: [
        DataLikeService,
        DataLikeQueryService,
        DataLikePositionService,
    ]
})
export class DataLikeModule extends ConfigurableModuleClass {}