import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./signers.module-definition"
import { SignerService } from "./signer.service"
import { SignerV2Service } from "./signer-v2.service"
@Module({
    providers: [
        SignerService,
        SignerV2Service,
    ],
    exports: [
        SignerService,
        SignerV2Service,
    ],
})
export class SignersModule extends ConfigurableModuleClass {}