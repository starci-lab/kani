import { Module } from "@nestjs/common"
import { MountFilesystemService } from "./mount.service"
import { ConfigurableModuleClass } from "./filesystem.module-definition"
import { MountStorageService } from "./mount-storage.service"

@Module({
    providers: [
        MountFilesystemService,
        MountStorageService,
    ],
    exports: [
        MountFilesystemService,
        MountStorageService,
    ],
})
export class FilesystemModule extends ConfigurableModuleClass {}