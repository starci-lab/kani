import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { BotSchema, DexId, LiquidityPoolId, PrimaryMemoryStorageService } from "@modules/databases"
import { DexNotFoundException, DexNotImplementedException, InvalidPoolTokensException } from "@exceptions"
import { RaydiumActionService } from "./raydium"
import { OrcaActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"

@Injectable()
export class DispatchOpenPositionService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumActionService: RaydiumActionService,
        private readonly orcaActionService: OrcaActionService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}

    async dispatchOpenPosition(
        {
            liquidityPoolId,
            bot,
        }: DispatchOpenPositionParams,
    ) {
        const state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        const tokenA = this.primaryMemoryStorageService.tokens.find(token => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find(token => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        const targetIsA = bot.targetTokenId === tokenA.id
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        switch (dex.displayId) {
        case DexId.Raydium:
            return this.raydiumActionService.openPosition({
                state,
                network: state.static.network,
                bot,
                targetIsA,
                tokenAId: tokenA.displayId,
                tokenBId: tokenB.displayId,
            })
        case DexId.Orca:
            return this.orcaActionService.openPosition({
                state,
                network: state.static.network,
                bot,
                targetIsA,
                tokenAId: tokenA.displayId,
                tokenBId: tokenB.displayId,
            })
        default:
            throw new Error(`DEX ${state.static.dex.toString()} not supported`)
        }
    }
}

export interface DispatchOpenPositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}