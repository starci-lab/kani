import {
    DynamicModule, Module, Provider 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./executor.module-definition"
import {
    LoadersModule 
} from "./loaders"
import {
    RuntimesModule 
} from "./runtimes"
import {
    BussinessModule 
} from "./bussiness"

@Module({
})
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
                RuntimesModule.register({
                    isGlobal: true,
                }),
                BussinessModule.register({
                    isGlobal: true,
                }),
            ],
            ...dynamicModule,
            providers: [...dynamicModule.providers || [],
                ...providers],
            exports: [...providers],
        }
    }
}   