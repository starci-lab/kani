import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./executor.module-definition"
import { LoadersModule } from "./loaders"
import { RuntimesModule } from "./runtimes"
import { BussinessModule } from "./bussiness"
// import { SubscriptionsModule } from "./subscriptions"
// import { ProcessorsModule } from "./processors"
// import { WorkersModule } from "./workers"
// import { DiagnosticsModule } from "./diagnostics"
// import { PollersModule } from "./pollers"

@Module({})
export class ExecutorModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const providers: Array<Provider> = []
        return {
            imports: [
                // DiagnosticsModule.register({
                //     isGlobal: true,
                // }),
                LoadersModule.register({
                    isGlobal: true,
                }),
                RuntimesModule.register({
                    isGlobal: true,
                }),
                BussinessModule.register({
                    isGlobal: true,
                }),
                // SubscriptionsModule.register({
                //     isGlobal: true,
                // }), 
                // PollersModule.register({
                //     isGlobal: true,
                // }),
                // ProcessorsModule.register({
                //     isGlobal: true,
                // }),
                // WorkersModule.register({
                //     isGlobal: true,
                // }),
            ],
            ...dynamicModule,
            providers: [...dynamicModule.providers || [], ...providers],
            exports: [...providers],
        }
    }
}   