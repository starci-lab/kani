import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./verify-multi-step.module-definition"
import {
    VerifyMultiStepsService 
} from "./verify-multi-step.service"
import {
    VerifyMultiStepsResolver 
} from "./verify-multi-step.resolver"

@Module({
    providers: [
        VerifyMultiStepsService,
        VerifyMultiStepsResolver,
    ],
})
export class VerifyMultiStepsModule extends ConfigurableModuleClass {}
