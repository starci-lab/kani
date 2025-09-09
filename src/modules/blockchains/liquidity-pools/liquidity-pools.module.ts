import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./liquidity-pools.module-definition"
import { CetusModule, TurbosModule } from "./dexes"
import { ClientsModule } from "./clients"
import { DexId } from "@modules/databases"
import { LiquidityPoolService } from "./liquidity-pools.service"

@Module({})
export class LiquidityPoolsModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []
        const providers: Array<Provider> = [
            LiquidityPoolService
        ]
        if (
            !options.dexes 
            || options.dexes.includes(DexId.Cetus)
        ) {
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes 
            || options.dexes.includes(DexId.Turbos)
        ) {
            dexModules.push(TurbosModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        return {
            ...dynamicModule,
            imports: [
                ClientsModule.register({
                    isGlobal: options.isGlobal
                }),
                ...dexModules,
            ],
            providers: [
                ...dynamicModule.providers || [],
                ...providers,
            ],
            exports: [
                ...dexModules,
                ...providers,
            ]
        }
    }
}