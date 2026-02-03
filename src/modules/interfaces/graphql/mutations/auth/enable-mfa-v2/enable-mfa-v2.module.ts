import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./enable-mfa-v2.module-definition"
import {
    EnableMFAV2Service 
} from "./enable-mfa-v2.service"
import {
    EnableMFAV2Resolver 
} from "./enable-mfa-v2.resolver"

@Module({
    providers: [
        EnableMFAV2Service,
        EnableMFAV2Resolver,
    ],
})
export class EnableMFAV2Module extends ConfigurableModuleClass {}
