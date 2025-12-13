import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mail.module-definition"
import { SendSignInOtpMailService } from "./send-sign-in-otp-mail.service"
import { MailerModule } from "@nestjs-modules/mailer"
import { envConfig } from "@modules/env/config"
import path from "path"
import { PugAdapter } from "@nestjs-modules/mailer/dist/adapters/pug.adapter"

@Module({})
export class MailModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                MailerModule.forRoot({
                    transport: {
                        host: envConfig().brevo.smtpHost,
                        port: envConfig().brevo.smtpPort,
                        secure: false,
                        auth: {
                            user: envConfig().brevo.smtpUser,
                            pass: envConfig().brevo.smtpKey,
                        },
                    },
                    defaults: {
                        from: `Kani <${envConfig().brevo.smtpFrom}>`,
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
            ],
            exports: [
                SendSignInOtpMailService,
            ],
        }
    }
}