import {
    Injectable 
} from "@nestjs/common"
import {
    MailerService 
} from "@nestjs-modules/mailer"
import {
    MountStorageService 
} from "@modules/filesystem"

@Injectable()
export class SendSignInOtpMailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly mountStorageService: MountStorageService
    ) {}

    async send({
        email,
        otp,
    }: SendSignInOtpMailParams) {
        await this.mailerService.sendMail({
            to: email,
            from: this.mountStorageService.appConfig.smtp.from,
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
