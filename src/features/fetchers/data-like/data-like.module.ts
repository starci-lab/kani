import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./data-like.module-definition"
import { DataLikeService } from "./data-like.service"
import { DataLikeQueryService } from "./data-like-query.service"

@Module({
    providers: [
        DataLikeService,
        DataLikeQueryService,
    ],
    exports: [
        DataLikeService,
        DataLikeQueryService,
    ]
})
export class DataLikeModule extends ConfigurableModuleClass {}