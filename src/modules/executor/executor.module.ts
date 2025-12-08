import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./executor.module-definition"
import { LoadersModule } from "./loaders"
import { SubscriptionsModule } from "./subscriptions"
import { ProcessorsModule } from "./processors"
import { WorkersModule } from "./workers"

@Module({})
export class ExecutorModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        return {
            imports: [
                LoadersModule.register({
                    isGlobal: true,
                }),
                SubscriptionsModule.register({
                    isGlobal: true,
                }), 
                ProcessorsModule.register({
                    isGlobal: true,
                }),
                WorkersModule.register({
                    isGlobal: true,
                }),
            ],
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   