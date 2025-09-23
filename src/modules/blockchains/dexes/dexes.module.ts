import { DynamicModule, Module } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./dexes.module-definition"
import { CetusModule } from "./cetus"
import { DexId } from "@modules/databases"
import { TurbosModule } from "./turbos"
import { MomentumModule } from "./momentum"
import { FlowXModule } from "./flowx"
import { LiquidityPoolService } from "./liquidity-pool.service"

@Module({})
export class DexesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []
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

        if (
            !options.dexes
            || options.dexes.includes(DexId.Momentum)
        ) {
            dexModules.push(MomentumModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes
            || options.dexes.includes(DexId.FlowX)
        ) {
            dexModules.push(FlowXModule.register({
                isGlobal: options.isGlobal,
            }))
        }
        
        return {
            ...dynamicModule,
            imports: [
                ...dexModules

            ],
            providers: [
                LiquidityPoolService,
            ],
            exports: [
                ...dexModules,
                LiquidityPoolService,
            ]
        }
    } 
}