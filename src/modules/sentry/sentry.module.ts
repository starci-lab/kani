import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./sentry.module-definition"
import { SentryModule as SentryCoreModule } from "@sentry/nestjs/setup"

@Module({})
export class SentryModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)
        const sentryCoreModule = SentryCoreModule.forRoot()
        return {
            ...dynamicModule,
            imports: [
                sentryCoreModule,
            ],
        }
    }
}