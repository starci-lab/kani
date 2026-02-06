import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./authentication-config.module-definition"
import {
    AuthenticationConfigService 
} from "./authentication-config.service"
import {
    AuthenticationConfigResolver 
} from "./authentication-config.resolver"

@Module({
    providers: [
        AuthenticationConfigService,
        AuthenticationConfigResolver,
    ],
})
export class AuthenticationConfigModule extends ConfigurableModuleClass {}
