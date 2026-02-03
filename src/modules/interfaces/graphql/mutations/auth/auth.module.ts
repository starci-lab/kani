import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./auth.module-definition"
import {
    EnableMFAModule 
} from "./enable-mfa"
import {
    EnableMFAV2Module 
} from "./enable-mfa-v2"
import {
    RefreshModule 
} from "./refresh"
import {
    RequestSignInOtpModule 
} from "./request-sign-in-otp"
import {
    VerifySignInOtpModule 
} from "./verify-sign-in-otp"
import {
    RequestSend2FactorOtpModule 
} from "./request-send-2-factor-otp"
import {
    VerifyMultiStepsModule 
} from "./verify-multi-steps"

@Module({
    imports: [
        EnableMFAModule.register({
            isGlobal: true,
        }),
        EnableMFAV2Module.register({
            isGlobal: true,
        }),
        RefreshModule.register({
            isGlobal: true,
        }),
        RequestSignInOtpModule.register({
            isGlobal: true,
        }),
        VerifySignInOtpModule.register({
            isGlobal: true,
        }),
        RequestSend2FactorOtpModule.register({
            isGlobal: true,
        }),
        VerifyMultiStepsModule.register({
            isGlobal: true,
        }),
    ],
})
export class AuthModule extends ConfigurableModuleClass {}