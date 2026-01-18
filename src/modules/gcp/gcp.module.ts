import {
    Module 
} from "@nestjs/common"
import {
    GcpKmsService 
} from "./gcp-kms.service"
import {
    ConfigurableModuleClass 
} from "./gcp.module-definition"
import {
    createGcpKmsClientProvider 
} from "./gcp.providers"
import {
    GoogleDriveService 
} from "./google-drive.service"

@Module({
    providers: [
        GcpKmsService, 
        createGcpKmsClientProvider(),
        GoogleDriveService,
    ],
    exports: [GcpKmsService,
        GoogleDriveService],
})
export class GcpModule extends ConfigurableModuleClass {}