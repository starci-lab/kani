import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./executor.module-definition"
import {
    LoadersModule,
} from "./loaders"
import {
    RuntimesModule,
} from "./runtimes"
import {
    BussinessModule,
} from "./bussiness"
import {
    WorkersModule,
} from "./workers"
import {
    InterfacesModule,
} from "./interfaces"

@Module({
})
export class ExecutorModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
            BussinessModule.register({
                isGlobal: options.isGlobal,
            }),
            LoadersModule.register({
                isGlobal: options.isGlobal,
            }),
            RuntimesModule.register({
                isGlobal: options.isGlobal,
            }),
            WorkersModule.register({
                isGlobal: options.isGlobal,
            }),
            InterfacesModule.register({
                isGlobal: options.isGlobal,
            }),
        ]    
        return {  
            ...dynamicModule,
            imports: [...modules],
        }
    }
}   