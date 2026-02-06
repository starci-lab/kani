import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./verify-sign-in-otp.module-definition"
import {
    VerifySignInOtpService 
} from "./verify-sign-in-otp.service"
import {
    VerifySignInOtpResolver 
} from "./verify-sign-in-otp.resolver"

@Module({
    providers: [
        VerifySignInOtpService,
        VerifySignInOtpResolver,
    ],
})
export class VerifySignInOtpModule extends ConfigurableModuleClass {}

