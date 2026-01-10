import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mail.module-definition"
import { SendSignInOtpMailService } from "./send-sign-in-otp-mail.service"
import { MailerModule } from "@nestjs-modules/mailer"
import path from "path"
import { PugAdapter } from "@nestjs-modules/mailer/dist/adapters/pug.adapter"
import { Send2FactorOtpMailService } from "./send-2-factor-otp-mail.service"
import { getAppConfig } from "@modules/filesystem"

@Module({})
export class MailModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const smtpConfig = getAppConfig().smtp
        return {
            ...dynamicModule,
            imports: [
                MailerModule.forRoot({
                    transport: {
                        host: smtpConfig.host,
                        port: smtpConfig.port,
                        secure: smtpConfig.secure,
                        auth: {
                            user: smtpConfig.user,
                            pass: smtpConfig.password,
                        },
                    },
                    defaults: {
                        from: smtpConfig.from,
                    },
                    template: {
                        dir: path.join(process.cwd(), "templates"),
                        adapter: new PugAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                }),
            ],
            providers: [
                ...(dynamicModule.providers || []),
                SendSignInOtpMailService,
                Send2FactorOtpMailService,
            ],
            exports: [
                SendSignInOtpMailService,
                Send2FactorOtpMailService,
            ],
        }
    }
}