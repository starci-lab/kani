import { Injectable } from "@nestjs/common"
import { MailerService } from "@nestjs-modules/mailer"
import { KeyStorageService } from "@modules/filesystem"

@Injectable()
export class Send2FactorOtpMailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly keyStorageService: KeyStorageService
    ) {}

    async send({
        email,
        otp,
    }: Send2FactorOtpMailParams) {
        await this.mailerService.sendMail({
            to: email,  
            from: this.keyStorageService.smtpConfig.from,
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