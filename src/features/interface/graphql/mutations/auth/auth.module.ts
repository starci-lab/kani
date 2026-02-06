import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./auth.module-definition"
import {
    EnableAuthenticatorAppV2Module 
} from "./enable-authenticator-app-v2"
import {
    DisableAuthenticatorAppV2Module 
} from "./disable-authenticator-app-v2"
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
        EnableAuthenticatorAppV2Module.register({
            isGlobal: true,
        }),
        DisableAuthenticatorAppV2Module.register({
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