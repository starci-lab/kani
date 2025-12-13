import { Injectable } from "@nestjs/common"
import { MailerService } from "@nestjs-modules/mailer"
import { envConfig } from "@modules/env/config"

@Injectable()
export class SendSignInOtpMailService {
    constructor(
        private readonly mailerService: MailerService
    ) {}

    async send({
        email,
        otp,
    }: SendSignInOtpMailParams) {
        await this.mailerService.sendMail({
            to: email,
            from: envConfig().brevo.smtpFrom,
            subject: `${otp} is your sign in OTP for Kani`,
            template: "sign-in-otp",
            context: {
                otp,
            },
        })
    }
}

export interface SendSignInOtpMailParams {
    email: string
    otp: string
}