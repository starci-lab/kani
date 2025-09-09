import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./data-like.module-definition"
import { DataLikeService } from "./data-like.service"

@Module({
    providers: [
        DataLikeService,
    ],
    exports: [
        DataLikeService
    ]
})
export class DataLikeModule extends ConfigurableModuleClass {}