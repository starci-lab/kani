import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./inspector.module-definition"
import {
    PriceModule 
} from "./price"

@Module({
})
export class InspectorModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        return {  
            ...dynamicModule,
            imports: [
                PriceModule.register({
                    isGlobal: options.isGlobal,
                }),
            ],
        }
    }
}   