import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./request-sign-in-otp.module-definition"
import { RequestSignInOtpService } from "./request-sign-in-otp.service"
import { RequestSignInOtpResolver } from "./request-sign-in-otp.resolver"

@Module({
    providers: [
        RequestSignInOtpService,
        RequestSignInOtpResolver,
    ],
})
export class RequestSignInOtpModule extends ConfigurableModuleClass {}

