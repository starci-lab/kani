import { ConfigurableModuleClass } from "./mutex.module-definition"
import { Module } from "@nestjs/common"
import { MutexService } from "./mutex.service"

@Module({
    providers: [
        MutexService
    ],
    exports: [
        MutexService
    ],
})
export class MutexModule extends ConfigurableModuleClass {}