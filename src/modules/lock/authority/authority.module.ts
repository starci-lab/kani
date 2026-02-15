import {
    ConfigurableModuleClass 
} from "./authority.module-definition"
import {
    Module 
} from "@nestjs/common"
import {
    LockAuthorityService 
} from "./authority.service"

/**
 * Module for lock authority.
 */
@Module({
    providers: [
        LockAuthorityService
    ],
    exports: [
        LockAuthorityService
    ],
})
export class LockAuthorityModule extends ConfigurableModuleClass {}