import { DynamicModule, Module, Provider } from "@nestjs/common"
import { ConfigurableModuleClass, OPTIONS_TYPE } from "./dexes.module-definition"
import { CetusModule } from "./cetus"
import { DexId } from "@modules/databases"
import { TurbosModule } from "./turbos"
import { MomentumModule } from "./momentum"
import { FlowXModule } from "./flowx"
import { RaydiumModule } from "./raydium"
import { OrcaModule } from "./orca"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { DispatchOpenPositionService } from "./dispatch-open-position.service"
import { DispatchClosePositionService } from "./dispatch-close-position.service"
import { MeteoraModule } from "./meteora"
import { FeeService } from "../math/fee.service"

@Module({})
export class DexesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []
        if (
            !options.dexes 
            || options.dexes.find((dex) => dex.dexId === DexId.Cetus)
        ) {
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.Turbos)
        ) {
            dexModules.push(TurbosModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.Momentum)
        ) {
            dexModules.push(MomentumModule.register({
                isGlobal: options.isGlobal,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.FlowX)
        ) {
            dexModules.push(FlowXModule.register({
                isGlobal: options.isGlobal,
                enabled: options.dexes?.find((dex) => dex.dexId === DexId.FlowX)?.enabled,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.Raydium)
        ) {
            dexModules.push(RaydiumModule.register({
                isGlobal: options.isGlobal,
                enabled: options.dexes?.find((dex) => dex.dexId === DexId.Raydium)?.enabled,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.Orca)
        ) {
            dexModules.push(OrcaModule.register({
                isGlobal: options.isGlobal,
                enabled: options.dexes?.find((dex) => dex.dexId === DexId.Orca)?.enabled,
            }))
        }

        if (
            !options.dexes
            || options.dexes.find((dex) => dex.dexId === DexId.Meteora)
        ) {
            dexModules.push(
                MeteoraModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.dexes?.find((dex) => dex.dexId === DexId.Meteora)?.enabled,
                }))
        }
        const utilities: Array<Provider> = []
        if (options.withUtilities) {
            utilities.push(LiquidityPoolStateService)
            utilities.push(DispatchOpenPositionService)
            utilities.push(DispatchClosePositionService)
        }
        
        return {
            ...dynamicModule,
            imports: [
                ...dexModules
            ],
            providers: [
                ...dynamicModule.providers || [],
                FeeService,
                ...utilities,
            ],
            exports: [
                ...dexModules,
                ...utilities,
            ]
        }
    } 
}