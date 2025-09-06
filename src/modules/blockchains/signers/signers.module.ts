import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./signers.module-definition"
import { SignerService } from "./signer.service"
import { SecretSignerService } from "./secret-signer.service"

@Module({
    providers: [
        SecretSignerService,
        SignerService,
    ],
    exports: [
        SecretSignerService,
        SignerService
    ],
})
export class SignersModule extends ConfigurableModuleClass {}