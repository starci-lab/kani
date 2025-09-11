import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./signers.module-definition"
import { SignerService } from "./signer.service"
@Module({
    providers: [
        SignerService,
    ],
    exports: [
        SignerService
    ],
})
export class SignersModule extends ConfigurableModuleClass {}