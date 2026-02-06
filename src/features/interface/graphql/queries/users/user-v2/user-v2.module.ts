import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./user-v2.module-definition"
import {
    UserV2Service 
} from "./user-v2.service"
import {
    UserV2Resolver 
} from "./user-v2.resolver"

@Module({
    providers: [
        UserV2Service,
        UserV2Resolver,
    ],
})
export class UserV2Module extends ConfigurableModuleClass {}

