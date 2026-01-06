import { ConfigurableModuleClass } from "./atomic.module-definition"
import { Module } from "@nestjs/common"
import { AtomicLockService } from "./atomic.service"

@Module({
    providers: [
        AtomicLockService
    ],
    exports: [
        AtomicLockService
    ],
})
export class AtomicLockModule extends ConfigurableModuleClass {}