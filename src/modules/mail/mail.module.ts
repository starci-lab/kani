import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./mail.module-definition"
import { SendSignInOtpMailService } from "./send-sign-in-otp-mail.service"
import { MailerModule } from "@nestjs-modules/mailer"
import path from "path"
import { PugAdapter } from "@nestjs-modules/mailer/dist/adapters/pug.adapter"
import { Send2FactorOtpMailService } from "./send-2-factor-otp-mail.service"
import { MountFilesystemService } from "@modules/filesystem"

@Module({})
export class MailModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                MailerModule.forRootAsync({
                    useFactory: async (
                        mountFilesystemService: MountFilesystemService
                    ) => {
                        const smtpConfig = await mountFilesystemService.smtpConfig()
                        return {
                            transport: {
                                host: smtpConfig.host,
                                port: smtpConfig.port,
                                secure: false,
                                auth: {
                                    user: smtpConfig.user,
                                    pass: smtpConfig.key,
                                },
                            },
                            defaults: {
                                from: `Kani <${smtpConfig.from}>`,
                            },
                            template: {
                                dir: path.join(process.cwd(), "templates"),
                                adapter: new PugAdapter(),
                                options: {
                                    strict: true,
                                },
                            },
                        }
                    },
                    inject: [MountFilesystemService],
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