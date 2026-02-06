import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./totp-secret.module-definition"
import {
    TotpSecretService 
} from "./totp-secret.service"
import {
    TotpSecretResolver 
} from "./totp-secret.resolver"

@Module({
    providers: [
        TotpSecretService,
        TotpSecretResolver,
    ],
})
export class TotpSecretModule extends ConfigurableModuleClass {}

