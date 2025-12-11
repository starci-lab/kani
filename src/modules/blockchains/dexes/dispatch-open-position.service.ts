import { Inject, Injectable } from "@nestjs/common"
import { LiquidityPoolStateService } from "./liquidity-pool-state.service"
import { 
    BotSchema, 
    DexId, 
    LiquidityPoolId, 
    LiquidityPoolType, 
    PrimaryMemoryStorageService,
    QuoteRatioStatus
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
import { computeDenomination, createObjectId } from "@utils"
import Decimal from "decimal.js"
import { FlowXActionService } from "./flowx"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { getMutexKey, MutexKey, MutexService } from "@modules/lock"
import { CetusActionService } from "./cetus"
import { TurbosActionService } from "./turbos"
import { MomentumActionService } from "./momentum"
import { MsService } from "@modules/mixin"
import { WinstonLog } from "@modules/winston"
import { InjectWinston } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import dayjs from "dayjs"
const OPEN_POSITION_SNAPSHOT_INTERVAL = "30 seconds"

@Injectable()
export class DispatchOpenPositionService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumActionService: RaydiumActionService,
        private readonly orcaActionService: OrcaActionService,
        private readonly meteoraActionService: MeteoraActionService,
        private readonly quoteRatioService: QuoteRatioService,
        private readonly flowxActionService: FlowXActionService,
        private readonly cetusActionService: CetusActionService,
        private readonly turbosActionService: TurbosActionService,
        private readonly momentumActionService: MomentumActionService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly msService: MsService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly mutexService: MutexService,
    ) {}

    async dispatchOpenPosition(
        {
            liquidityPoolId,
            bot,
        }: DispatchOpenPositionParams,
    ) {
        if (
            !bot.snapshotTargetBalanceAmount 
            || !bot.snapshotQuoteBalanceAmount
            || !bot.snapshotGasBalanceAmount
            || new Decimal(
                dayjs().diff(
                    bot.lastBalancesSnapshotAt, "millisecond")).gt(
                new Decimal(
                    this.msService.fromString(OPEN_POSITION_SNAPSHOT_INTERVAL)
                )
            )
        ) {
            return
        }
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        if (
            !bot.liquidityPools
                .map((liquidityPool) => liquidityPool.toString())
                .includes(createObjectId(liquidityPoolId).toString())
        )
        {
            // skip if the liquidity pool is not belong to the bot
            return
        }
        const snapshotTargetBalanceAmountBN = new BN(bot.snapshotTargetBalanceAmount)
        const snapshotQuoteBalanceAmountBN = new BN(bot.snapshotQuoteBalanceAmount)
        // get the quote ratio, if the quote ratio is not good, we skip the open position
        const {
            quoteRatio
        } = await this.quoteRatioService.computeQuoteRatio({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
            targetBalanceAmount: snapshotTargetBalanceAmountBN,
            quoteBalanceAmount: snapshotQuoteBalanceAmountBN,
        })
        if (this.quoteRatioService.checkQuoteRatioStatus({
            quoteRatio
        }) !== QuoteRatioStatus.Good) {
            return
        }
        if (await this.cacheManager.get(
            createCacheKey(
                CacheKey.OpenPositionTransaction, {
                    botId: bot.id
                })
        )) {
            return
        }
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
        // Retrieve the mutex for the bot
        const mutex = this.mutexService.mutex(getMutexKey(MutexKey.Action, bot.id))
        // if the mutex is locked, skip the execution
        if (mutex.isLocked()) {
            console.log("mutex is locked, skipping open position")
            return
        }
        // acquire the mutex lock
        await mutex.acquire()
        // run the open position action under mutex lock
        try {
            switch (dex.displayId) {
            case DexId.Raydium: {
                return await this.raydiumActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.Orca: {
                return await this.orcaActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.Meteora: {
                return await this.meteoraActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.FlowX: {
                return await this.flowxActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.Cetus: {
                return await this.cetusActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.Turbos: {
                return await this.turbosActionService.openPosition({
                    state,
                    bot,
                })
            }
            case DexId.Momentum: {
                return await this.momentumActionService.openPosition({
                    state,
                    bot,
                })
            }
            default: {
                throw new DexNotImplementedException(`DEX ${state.static.dex.toString()} not supported`)
            }
            }
        } catch (error) {
            mutex.release() 
            this.logger.error(
                WinstonLog.OpenPositionFailed, {
                    botId: bot.id,
                    error: error.message,
                    stack: error.stack,
                })
        }
    }
}

export interface DispatchOpenPositionParams {
    bot: BotSchema
    liquidityPoolId: LiquidityPoolId
}