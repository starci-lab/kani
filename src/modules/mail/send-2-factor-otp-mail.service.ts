import { Injectable } from "@nestjs/common"
import { MailerService } from "@nestjs-modules/mailer"
import { envConfig } from "@modules/env/config"

@Injectable()
export class Send2FactorOtpMailService {
    constructor(
        private readonly mailerService: MailerService
    ) {}

    async send({
        email,
        otp,
    }: Send2FactorOtpMailParams) {
        await this.mailerService.sendMail({
            to: email,  
            from: envConfig().brevo.smtpFrom,
            subject: `${otp} is your 2-factor authentication OTP for Kani`,
            template: "2-factor-otp",
            context: {
                otp,
            },
        })
    }
}

export interface Send2FactorOtpMailParams {
    email: string
    otp: string
}