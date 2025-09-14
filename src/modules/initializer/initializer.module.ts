import { Module } from "@nestjs/common"
import { InitializerService } from "./initializer.service"
import { ConfigurableModuleClass } from "./initializer.module-definition"

@Module({
    providers: [
        InitializerService
    ],
    exports: [
        InitializerService
    ]
})
export class InitializerModule extends ConfigurableModuleClass {}