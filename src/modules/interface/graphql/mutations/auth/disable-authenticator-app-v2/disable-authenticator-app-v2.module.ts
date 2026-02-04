import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./disable-authenticator-app-v2.module-definition"
import {
    DisableAuthenticatorAppV2Service 
} from "./disable-authenticator-app-v2.service"
import {
    DisableAuthenticatorAppV2Resolver 
} from "./disable-authenticator-app-v2.resolver"

@Module({
    providers: [
        DisableAuthenticatorAppV2Service,
        DisableAuthenticatorAppV2Resolver,
    ],
})
export class DisableAuthenticatorAppV2Module extends ConfigurableModuleClass {}
