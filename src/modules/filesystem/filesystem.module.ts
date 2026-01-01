import { Module } from "@nestjs/common"
import { MountFilesystemService } from "./mount.service"
import { ConfigurableModuleClass } from "./filesystem.module-definition"
import { MountStorageService } from "./mount-storage.service"
import { GenFilesystemService } from "./gen.service"

@Module({
    providers: [
        MountFilesystemService,
        MountStorageService,
        GenFilesystemService,
    ],
    exports: [
        MountFilesystemService,
        MountStorageService,
        GenFilesystemService,
    ],
})
export class FilesystemModule extends ConfigurableModuleClass {}