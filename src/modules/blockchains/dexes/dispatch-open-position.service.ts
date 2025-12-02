import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { 
    BotSchema, 
    DexId, 
    LiquidityPoolId, 
    LiquidityPoolType, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { 
    DexNotFoundException, 
    DexNotImplementedException, 
    LiquidityPoolNotFoundException, 
    TokenNotFoundException 
} from "@exceptions"
import { RaydiumActionService } from "./raydium"
import { OrcaActionService } from "./orca"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { MeteoraActionService } from "./meteora"
import { DlmmLiquidityPoolState, LiquidityPoolState } from "../interfaces"
import { BN } from "bn.js"
import { QuoteRatioService } from "../math"
import { computeDenomination } from "@utils"
import Decimal from "decimal.js"

@Injectable()
export class DispatchOpenPositionService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumActionService: RaydiumActionService,
        private readonly orcaActionService: OrcaActionService,
        private readonly meteoraActionService: MeteoraActionService,
        private readonly quoteRatioService: QuoteRatioService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
    ) {}

    async dispatchOpenPosition(
        {
            liquidityPoolId,
            bot,
        }: DispatchOpenPositionParams,
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId,
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(liquidityPoolId, `Liquidity pool ${liquidityPoolId} not found`)
        }
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPoolId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPoolId)
        }
        const dex = this.primaryMemoryStorageService.dexes.find(dex => dex.id === state.static.dex.toString())
        if (!dex) throw new DexNotFoundException("Dex not found")
        if (!this.options.dexes?.find(dex => dex.dexId === dex.dexId)) {
            throw new DexNotImplementedException(`Dex ${state.static.dex.toString()} not supported`)
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const quoteRatioResponse = await this.quoteRatioService.computeQuoteRatio({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            targetBalanceAmount: new BN(bot.snapshotTargetBalanceAmount || 0),
            quoteBalanceAmount: new BN(bot.snapshotQuoteBalanceAmount || 0),
        })
        const targetBalanceAmount = new BN(bot.snapshotTargetBalanceAmount || 0)
        const quoteBalanceAmount = new BN(bot.snapshotQuoteBalanceAmount || 0)
        // safety check, if the balance is not enough to open a position, return and remind user to deposit more tokens
        const targetBalanceAmountInTarget = computeDenomination(targetBalanceAmount, targetToken.decimals)
        const quoteBalanceAmountInTarget = computeDenomination(quoteBalanceAmount, quoteToken.decimals)
            .div(quoteRatioResponse.oraclePrice)
        const totalBalanceAmountInTarget = targetBalanceAmountInTarget.add(quoteBalanceAmountInTarget)
        if (totalBalanceAmountInTarget.lt(new Decimal(targetToken.minRequiredAmountInTotal || 0))) {
            // your balance is not enough to open a position, return and remind user to deposit more tokens
            return
        }   
        switch (dex.displayId) {
        case DexId.Raydium:
            return this.raydiumActionService.openPosition({
                state,
                bot,
            })
        case DexId.Orca:
            return this.orcaActionService.openPosition({
                state,
                bot,
            })
        case DexId.Meteora:
            return this.meteoraActionService.openPosition({
                state,
                bot,
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