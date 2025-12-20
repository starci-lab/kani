import { Module } from "@nestjs/common"
import { MountFilesystemService } from "./mount.service"
import { ConfigurableModuleClass } from "./filesystem.module-definition"
import { KeyStorageService } from "./key-storage.service"

@Module({
    providers: [
        MountFilesystemService,
        KeyStorageService,
    ],
    exports: [
        MountFilesystemService,
        KeyStorageService,
    ],
})
export class FilesystemModule extends ConfigurableModuleClass {}