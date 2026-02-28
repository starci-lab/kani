import {
    DynamicModule, Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass, OPTIONS_TYPE,
} from "./price.module-definition"
import {
    PriceCalculationService 
} from "./calculation.service"
import {
    MathModule 
} from "@modules/blockchains"
import {
    PriceProccessService 
} from "./proccess.service"
import {
    PricePointStorageService 
} from "./storage.service"

/**
 * TWAP module.
 * Provides services for TWAP computation.
 */
@Module({
})
export class PriceModule extends ConfigurableModuleClass {
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
            MathModule.register({
                isGlobal: options.isGlobal,
            }),
        ]    
        return {  
            ...dynamicModule,
            imports: [...modules],
            providers: [
                PriceCalculationService,
                PriceProccessService,
                PricePointStorageService,
            ],
        }
    }
}   