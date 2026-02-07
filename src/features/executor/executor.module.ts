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
        const modules: Array<DynamicModule> = []    
        if (!options.configOnly) {
            modules.push(
                LoadersModule.register({
                    isGlobal: true,
                }),
                RuntimesModule.register({
                    isGlobal: true,
                }),
                BussinessModule.register({
                    isGlobal: true,
                }),
                WorkersModule.register({
                    isGlobal: true,
                }),
                InterfacesModule.register({
                    isGlobal: true,
                }),
            )
        }
        return {  
            ...dynamicModule,
            imports: [...modules],
        }
    }
}   