import {
    DynamicModule, Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE 
} from "./eval.module-definition"   

@Module({
})
export class EvalModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules = [
        ]
        return {
            ...dynamicModule,
            imports: [
                ...modules,
            ],
            providers: [
                ...dynamicModule.providers || [],
            ],
            exports: [
                ...modules,
            ],
        }
    }
}