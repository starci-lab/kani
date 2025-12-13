import { Injectable } from "@nestjs/common"
import { MailerService } from "@nestjs-modules/mailer"
import { envConfig } from "@modules/env/config"

@Injectable()
export class SendLoginCodeMailService {
    constructor(private readonly mailerService: MailerService) {}

    async send({
        email,
        code,
    }: SendVerificationMailParams) {
        await this.mailerService.sendMail({
            to: email,
            from: envConfig().brevo.smtpFrom,
            subject: `${code} is your login code for Kani`,
            template: "login-code",
            context: {
                code,
            },
        })
    }
}

export interface SendVerificationMailParams {
    email: string
    code: string
}