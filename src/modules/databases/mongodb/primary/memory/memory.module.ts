import { Module } from "@nestjs/common"
import { PrimaryMemoryStorageService } from "./memory-storage.service"
import { ConfigurableModuleClass } from "./memory.module-definition"

@Module({
    providers: [
        PrimaryMemoryStorageService
    ],
    exports: [
        PrimaryMemoryStorageService
    ]
})
export class MemoryModule extends ConfigurableModuleClass {
}