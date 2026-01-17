import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./bussiness.module-definition"
import { SubscriptionsModule } from "./subscriptions/subscriptions.module"

@Module({})
export class BussinessModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {
            ...dynamicModule,
            imports: [
                SubscriptionsModule.register({
                    isGlobal: options.isGlobal,
                }),
            ],
        }
    }
}   