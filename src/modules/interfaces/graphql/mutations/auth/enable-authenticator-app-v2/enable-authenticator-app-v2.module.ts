import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./enable-authenticator-app-v2.module-definition"
import {
    EnableAuthenticatorAppV2Service 
} from "./enable-authenticator-app-v2.service"
import {
    EnableAuthenticatorAppV2Resolver 
} from "./enable-authenticator-app-v2.resolver"

@Module({
    providers: [
        EnableAuthenticatorAppV2Service,
        EnableAuthenticatorAppV2Resolver,
    ],
})
export class EnableAuthenticatorAppV2Module extends ConfigurableModuleClass {}
