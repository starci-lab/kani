import {
    DynamicModule, 
    Provider
} from "@nestjs/common"
import {
    CetusModule 
} from "./cetus"
import {
    FlowXModule 
} from "./flowx"
import {
    MeteoraModule 
} from "./meteora"
import {
    MomentumModule 
} from "./momentum"
import {
    OrcaModule 
} from "./orca"
import {
    LiquidityPoolStateService, 
    ClosePositionActionService, 
    OpenPositionActionService, 
    ClosePositionEnqueueService, 
    OpenPositionEnqueueService, 
    ReservesWithFeesActionService 
} from "./orchestrator"
import {
    RaydiumModule 
} from "./raydium"
import {
    TurbosModule 
} from "./turbos"
import {    
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
    OPTIONS_TYPE 
} from "./dexes.module-definition"
import {
    DexId 
} from "@modules/databases"

@Module({
})
export class DexesModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options)

        /* ------------------ DEX MODULES ------------------ */

        const dexModules: DynamicModule[] = []

        const useDex = (dexId: DexId) =>
            !options.dexIds || options.dexIds.includes(dexId)

        if (useDex(DexId.Cetus)) {
            dexModules.push(CetusModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.Turbos)) {
            dexModules.push(TurbosModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.Momentum)) {
            dexModules.push(MomentumModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.FlowX)) {
            dexModules.push(FlowXModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.Raydium)) {
            dexModules.push(RaydiumModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.Orca)) {
            dexModules.push(OrcaModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        if (useDex(DexId.Meteora)) {
            dexModules.push(MeteoraModule.register({
                isGlobal: options.isGlobal,
                enabled: options.enabled,
            }))
        }

        /* ------------------ ENABLE HELPERS ------------------ */

        const isGlobalEnabled = (): boolean => {
            if (typeof options.enabled === "boolean") return options.enabled
            if (options.enabled === undefined) return true
            return true
        }

        const isActionEnabled = (): boolean => {
            if (!isGlobalEnabled()) return false

            const action = options.enabled?.action
            if (typeof action === "boolean") return action
            if (action === undefined) return true

            return action.action ?? true
        }

        const isEnqueueEnabled = (): boolean => {
            if (!isGlobalEnabled()) return false

            const action = options.enabled?.action
            if (typeof action === "boolean") return action
            if (action === undefined) return true

            return action.enqueue ?? true
        }

        const isReservesWithFeesEnabled = (): boolean => {
            if (!isGlobalEnabled()) return false

            const reserves = options.enabled?.reservesWithFees
            if (typeof reserves === "boolean") return reserves
            if (reserves === undefined) return true

            return reserves ?? true
        }

        /* ------------------ ORCHESTRATOR PROVIDERS ------------------ */

        const orchestratorProviders: Array<Provider> = [
            LiquidityPoolStateService,
        ]

        if (isActionEnabled()) {
            orchestratorProviders.push(
                ClosePositionActionService,
                OpenPositionActionService,
            )
        }

        if (isEnqueueEnabled()) {
            orchestratorProviders.push(
                ClosePositionEnqueueService,
                OpenPositionEnqueueService,
            )
        }

        if (isReservesWithFeesEnabled()) {
            orchestratorProviders.push(
                ReservesWithFeesActionService,
            )
        }

        /* ------------------ RETURN MODULE ------------------ */

        return {
            ...dynamicModule,
            imports: [...dexModules],
            providers: [
                ...(dynamicModule.providers ?? []),
                ...orchestratorProviders,
            ],
            exports: [
                ...dexModules,
                ...orchestratorProviders,
            ],
        }
    }
}
