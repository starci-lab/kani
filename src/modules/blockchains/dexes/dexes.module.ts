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
import { OpenPositionOrchestratorService } from "./open-position-orchestrator.service"
import { ClosePositionOrchestratorService } from "./close-position-orchestrator.service"
import { FeesOrchestratorService } from "./fees-orchestrator.service"
import { ReservesOrchestratorService } from "./reserves-orchestrator.service"
import { MeteoraModule } from "./meteora"

@Module({})
export class DexesModule extends ConfigurableModuleClass {
    static register(
        options: typeof OPTIONS_TYPE
    ): DynamicModule {
        const dynamicModule = super.register(options)
        const dexModules: Array<DynamicModule> = []
        if (
            !options.dexIds 
            || options.dexIds?.includes(DexId.Cetus)
        ) {
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.Turbos)
        ) {
            dexModules.push(
                TurbosModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.enabled,
                }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.Momentum)
        ) {
            dexModules.push(
                MomentumModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.enabled,
                }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.FlowX)
        ) {
            dexModules.push(
                FlowXModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.enabled,
                }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.Raydium)
        ) {
            dexModules.push(
                RaydiumModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.enabled,
                }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.Orca)
        ) {
            dexModules.push(OrcaModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }
        if (
            !options.dexIds
            || options.dexIds?.includes(DexId.Meteora)
        ) {
            dexModules.push(
                MeteoraModule.register({
                    isGlobal: options.isGlobal,
                    enabled: options.enabled,
                }))
        }
        const providers: Array<Provider> = [
            LiquidityPoolStateService,
        ]
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.observe ?? true))
        ) {
            providers.push(LiquidityPoolStateService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.action ?? true))
        ) {
            providers.push(OpenPositionOrchestratorService)
            providers.push(ClosePositionOrchestratorService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.fees ?? true))
        ) {
            providers.push(FeesOrchestratorService)
        }
        if (typeof options.enabled === "boolean" 
            ? options.enabled
            : (typeof options.enabled === "undefined" ? true : (options.enabled?.reserves ?? true))
        ) {
            providers.push(ReservesOrchestratorService)
        }
        return {
            ...dynamicModule,
            imports: [
                ...dexModules
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