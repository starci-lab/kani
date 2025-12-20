import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./request-send-2-factor-otp.module-definition"
import { RequestSend2FactorOtpService } from "./request-send-2-factor-otp.service"
import { RequestSend2FactorOtpResolver } from "./request-send-2-factor-otp.resolver"

@Module({
    providers: [
        RequestSend2FactorOtpService,
        RequestSend2FactorOtpResolver,
    ],
})
export class RequestSend2FactorOtpModule extends ConfigurableModuleClass {}

