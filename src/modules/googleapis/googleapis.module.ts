import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./googleapis.module-definition"
import { GoogleDriveService } from "./google-drive.service"

@Module({
    providers: [
        GoogleDriveService,
    ],
    exports: [GoogleDriveService],
})
export class GoogleapisModule extends ConfigurableModuleClass {}