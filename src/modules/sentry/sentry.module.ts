import {
    DynamicModule,
    Module,
} from "@nestjs/common"
import {
    SentryModule as SentryCoreModule,
} from "@sentry/nestjs/setup"
import {
    ConfigurableModuleClass,
} from "./sentry.module-definition"
import type {
    SentryModuleOptions,
} from "./types"

/**
 * The module for the Sentry service.
 */
@Module({
})
export class SentryModule extends ConfigurableModuleClass {
    static register(options: SentryModuleOptions): DynamicModule {
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