import { Module } from "@nestjs/common"
import { GcpKmsService } from "./gcp-kms.service"
import { ConfigurableModuleClass } from "./gcp.module-definition"
import { createGcpKmsClientProvider } from "./gcp.providers"

@Module({
    providers: [
        GcpKmsService, 
        createGcpKmsClientProvider(),
    ],
    exports: [GcpKmsService],
})
export class GcpModule extends ConfigurableModuleClass {}