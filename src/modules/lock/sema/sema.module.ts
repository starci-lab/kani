import {
    ConfigurableModuleClass 
} from "./sema.module-definition"
import {
    Module 
} from "@nestjs/common"
import {
    SemaService 
} from "./sema.service"

/**
 * Module for semaphore locks.
 */
@Module({
    providers: [
        SemaService
    ],
    exports: [
        SemaService
    ],
})
export class SemaModule extends ConfigurableModuleClass {}