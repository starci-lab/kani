import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./twap.module-definition"
import {
    TwapCalculationService 
} from "./calculation.service"

/**
 * TWAP module.
 * Provides services for TWAP computation.
 */
@Module({
})
export class TwapModule extends ConfigurableModuleClass {
    /**
     * Registers the TWAP module.
     * @param options - The options for the TWAP module.
     * @returns The DynamicModule for the TWAP module.
     */
    static register(
        options: typeof OPTIONS_TYPE,
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const modules: Array<DynamicModule> = [
        ]    
        return {  
            ...dynamicModule,
            imports: [...modules],
            providers: [
                TwapCalculationService,
            ],
        }
    }
}   