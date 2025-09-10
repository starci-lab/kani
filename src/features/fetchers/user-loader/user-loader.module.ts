import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./user-loader.module-definition"
import { UserLoaderService } from "./user-loader.service"

@Module({
    providers: [
        UserLoaderService,
    ],
    exports: [
        UserLoaderService,
    ],
})
export class UserLoaderModule extends ConfigurableModuleClass {}