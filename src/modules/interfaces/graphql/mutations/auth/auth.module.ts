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

@Module({
    imports: [
        EnableMFAModule.register({
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
    ],
})
export class AuthModule extends ConfigurableModuleClass {}