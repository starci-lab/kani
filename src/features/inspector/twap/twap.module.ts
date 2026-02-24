import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./twap.module-definition"
@Module({
})
export class TwapModule extends ConfigurableModuleClass {
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