import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./orderbook.module-definition"

@Module({
})
export class OrderbookModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
        ]    
        return {  
            ...dynamicModule,
            imports: [...modules],
        }
    }
}   