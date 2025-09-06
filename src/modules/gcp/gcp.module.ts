import { Module } from "@nestjs/common"
import { GcpKmsService } from "./gcp-kms.service"
import { GcpSecretService } from "./gcp-secret.service"
import { ConfigurableModuleClass } from "./gcp.module-definition"
import { createGcpKmsClientProvider } from "./gcp.providers"
import { createGcpSecretClientProvider } from "./gcp.providers"

@Module({
    providers: [
        GcpKmsService, 
        GcpSecretService,
        createGcpKmsClientProvider(),
        createGcpSecretClientProvider(),
    ],
    exports: [GcpKmsService, GcpSecretService],
})
export class GcpModule extends ConfigurableModuleClass {}