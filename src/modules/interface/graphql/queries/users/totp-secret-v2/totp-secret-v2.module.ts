import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./totp-secret-v2.module-definition"
import {
    TotpSecretV2Service 
} from "./totp-secret-v2.service"
import {
    TotpSecretV2Resolver 
} from "./totp-secret-v2.resolver"

@Module({
    providers: [
        TotpSecretV2Service,
        TotpSecretV2Resolver,
    ],
})
export class TotpSecretV2Module extends ConfigurableModuleClass {}
