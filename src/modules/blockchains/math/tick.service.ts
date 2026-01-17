import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { computeDenomination } from "@utils"
import BN from "bn.js"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../interfaces"
import {
    PriceStaleException,
    SnapshotBalancesNotSetException, 
    TokenNotFoundException
} from "@exceptions"
import { PriceService } from "./price.service"
import { LiquidityMath } from "@raydium-io/raydium-sdk-v2"
import { ClmmTickFormulaService } from "../formulas"
// import assert from "assert"

@Injectable()
export class TickMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    public async getTickBounds(
        {
            state,
            bot
        }: GetTickBoundsParams
    ) {
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            targetToken,
            quoteToken
        } = bot
        if (
            !snapshotTargetBalanceAmount ||
            !snapshotQuoteBalanceAmount ||
            !targetToken ||
            !quoteToken
        ) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
    
        const {
            dynamic: { tickCurrent },
            static: { tickSpacing, tickMultiplier }
        } = state
    
        const targetIsA =
            targetToken.toString() === state.static.tokenA.toString()
    
        const targetTokenEntity = this.primaryMemoryStorageService.tokens.find(
            token => token.id === targetToken.toString()
        )
        if (!targetTokenEntity) {
            throw new TokenNotFoundException("Target token not found")
        }
    
        const quoteTokenEntity = this.primaryMemoryStorageService.tokens.find(
            token => token.id === quoteToken.toString()
        )
        if (!quoteTokenEntity) {
            throw new TokenNotFoundException("Quote token not found")
        }
    
        const tokenAEntity = targetIsA ? targetTokenEntity : quoteTokenEntity
        const tokenBEntity = targetIsA ? quoteTokenEntity : targetTokenEntity
    
        const snapshotTokenAAmount = targetIsA
            ? snapshotTargetBalanceAmount
            : snapshotQuoteBalanceAmount
    
        const snapshotTokenBAmount = targetIsA
            ? snapshotQuoteBalanceAmount
            : snapshotTargetBalanceAmount
    
        // we get the price from the oracle or the spot price
        const { isStale, price } = await this.priceService.resolvePrice({
            tokenId: tokenAEntity.displayId,
        })
        if (isStale) {
            throw new PriceStaleException("Price is stale")
        }
        // token amounts in B denomination
        const tokenAAmountInB = computeDenomination(
            new BN(snapshotTokenAAmount),
            tokenAEntity.decimals
        ).mul(price)
    
        const tokenBAmountInB = computeDenomination(
            new BN(snapshotTokenBAmount),
            tokenBEntity.decimals
        )
    
        // S = tickUpper - tickLower
        const S = new Decimal(tickSpacing).mul(new Decimal(tickMultiplier))
    
        // target ratio
        const R = new Decimal(tokenAAmountInB)
            .div(tokenAAmountInB.add(tokenBAmountInB))
        
        // we define a function to compute the R value
        const computeR = (tickLower: Decimal, tickUpper: Decimal): Decimal => {
            const amountA = new BN(1_000_000_000)
    
            const liquidity = LiquidityMath.getLiquidityFromTokenAmountA(
                this.clmmTickFormulaService.tickToSqrtPriceX64({
                    tickIndex: tickLower,
                }),
                this.clmmTickFormulaService.tickToSqrtPriceX64({
                    tickIndex: tickUpper,
                }),
                amountA,
                false
            )
    
            const { amountA: amountAOut, amountB: amountBOut } =
                LiquidityMath.getAmountsFromLiquidity(
                    this.clmmTickFormulaService.tickToSqrtPriceX64({
                        tickIndex: new Decimal(tickCurrent.toString()),
                    }),
                    this.clmmTickFormulaService.tickToSqrtPriceX64({
                        tickIndex: tickLower,
                    }),
                    this.clmmTickFormulaService.tickToSqrtPriceX64({
                        tickIndex: tickUpper,
                    }),
                    liquidity,
                    false
                )
    
            const amountAOutInB = computeDenomination(
                new BN(amountAOut),
                tokenAEntity.decimals
            ).mul(price)
    
            const amountBOutInB = computeDenomination(
                new BN(amountBOut),
                tokenBEntity.decimals
            )
    
            return new Decimal(
                amountAOutInB
                    .div(amountAOutInB.add(amountBOutInB))
                    .toString()
            )
        }
    
        // we find the best tick range (NO ARRAY)
        let tickLowerEntry = new Decimal(tickCurrent.toString())
            .sub(S)
            .div(tickSpacing)
            .ceil()
            .mul(tickSpacing)
    
        let tickUpperEntry = tickLowerEntry.add(S)
    
        let bestTickLower: Decimal | null = null
        let bestTickUpper: Decimal | null = null
        let bestDiff: Decimal | null = null
        // we iterate over the tick multiplier
        for (let i = 0; i < tickMultiplier; i++) {
            // we compute the R value
            const currentR = computeR(tickLowerEntry, tickUpperEntry)
            // we compute the difference between the current R value and the target R value
            const diff = currentR.sub(R).abs()
            // if the difference is greater than the best difference, we break
            if (bestDiff !== null && diff.gt(bestDiff)) {
                break
            }
            // we update the best difference, tick lower, and tick upper
            bestDiff = diff
            bestTickLower = tickLowerEntry
            bestTickUpper = tickUpperEntry
            // we update the tick lower and tick upper
            tickLowerEntry = tickLowerEntry.add(tickSpacing)
            tickUpperEntry = tickUpperEntry.add(tickSpacing)
        }
        if (!bestTickLower || !bestTickUpper) {
            throw new Error("Failed to determine tick bounds")
        } 
        // const { tickLower: _tickLower, tickUpper: _tickUpper } = await this._getTickBounds({
        //     state,
        //     bot,
        // })
        // assert(bestTickLower.eq(_tickLower) && bestTickUpper.eq(_tickUpper), "Best tick lower and upper are not the same")
        // check price range
        return {
            tickLower: bestTickLower,
            tickUpper: bestTickUpper,
        }
    }

    // public async _getTickBounds(
    //     params: GetTickBoundsParams
    // ) {
    //     const {
    //         state,
    //         bot
    //     } = params
    
    //     const {
    //         snapshotTargetBalanceAmount,
    //         snapshotQuoteBalanceAmount,
    //         targetToken,
    //         quoteToken
    //     } = bot
    //     if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !targetToken || !quoteToken) {
    //         throw new SnapshotBalancesNotSetException("Snapshot balances not set")
    //     }
    //     const {
    //         dynamic: { tickCurrent },
    //         static: { tickSpacing, tickMultiplier }
    //     } = state
    
    //     const targetIsA = targetToken.toString() === state.static.tokenA.toString()
    //     const targetTokenInstance = this.primaryMemoryStorageService.tokens.find(token => token.id === targetToken.toString())
    //     const quoteTokenInstance = this.primaryMemoryStorageService.tokens.find(token => token.id === quoteToken.toString())
    //     if (!targetTokenInstance || !quoteTokenInstance) {
    //         throw new TokenNotFoundException("Target or quote token not found")
    //     }
    //     const targetTokenEntity = this.primaryMemoryStorageService.tokens.find(token => token.id === targetToken.toString())
    //     if (!targetTokenEntity) {
    //         throw new TokenNotFoundException("Target token not found")
    //     }
    //     const quoteTokenEntity = this.primaryMemoryStorageService.tokens.find(token => token.id === quoteToken.toString())
    //     if (!quoteTokenEntity) {
    //         throw new TokenNotFoundException("Quote token not found")
    //     }
    //     const tokenAEntity = targetIsA ? targetTokenEntity : quoteTokenEntity
    //     const tokenBEntity = targetIsA ? quoteTokenEntity : targetTokenEntity
    //     const snapshotTokenAAmount = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
    //     const snapshotTokenBAmount = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
    //     const oraclePrice = await this.pythOraclePriceService.getPythOraclePrice({
    //         tokenA: tokenAEntity.displayId,
    //         tokenB: tokenBEntity.displayId,
    //     })
    //     const tokenAAmountInB = computeDenomination(
    //         new BN(snapshotTokenAAmount),
    //         tokenAEntity.decimals
    //     ).mul(oraclePrice)
    //     const tokenBAmountInB = computeDenomination(
    //         new BN(snapshotTokenBAmount),
    //         tokenBEntity.decimals
    //     ) 
    //     // ?: S = tickSpacing * tickMultiplier = tickUpper - tickLower
    //     const S = new Decimal(tickSpacing).mul(new Decimal(tickMultiplier))
    //     // ?: R = quote / (target + quote)
    //     const R = new Decimal(
    //         tokenAAmountInB
    //     ).div(
    //         tokenAAmountInB
    //             .add(tokenBAmountInB)
    //     ) // ~ 0.25
    //     // * Goal: Find tickLower and tickUpper that satisfy the CLMM liquidity formulas
    //     // Token A amount (when price is inside range)
    //     // ?: amountA = L * (1/sqrtPriceCurrent - 1/sqrtPriceUpper)
    //     // Token B amount (when price is inside range)
    //     // ?: amountB = L * (sqrtPriceCurrent - sqrtPriceLower)
    //     // Also, the tickLower and tickUpper have to be divisible by the tickSpacing
    //     // ?: tickLower % tickSpacing == 0
    //     // ?: tickUpper % tickSpacing == 0
    //     // ?: tickUpper - tickLower = tickSpacing * tickMultiple
    //     // Sastify the following condition:
    //     // ?: targetIsA ? amountA/amountB ~ R : amountB/amountA ~ R
    //     // TODO: R = (sqrtPriceCurrent - sqrtPriceLower)/(1/sqrtPriceCurrent - 1/sqrtPriceUpper)
    //     // * Solution: Use loop to find the tickLower and tickUpper
    //     let tickLowerEntry = new Decimal(tickCurrent).sub(S).div(tickSpacing).ceil().mul(tickSpacing)
    //     let tickUpperEntry = tickLowerEntry.add(S)
    //     // we define a function to compute the R value
    //     const computeR = (tickLower: Decimal, tickUpper: Decimal) => {
    //         const amountA = new BN(1_000_000_000)
    //         const liquidity = LiquidityMath.getLiquidityFromTokenAmountA(
    //             this.clmmTickFormulaService.tickToSqrtPriceX64({ tickIndex: tickLower }),
    //             this.clmmTickFormulaService.tickToSqrtPriceX64({ tickIndex: tickUpper }),
    //             amountA,
    //             false,
    //         )
    //         const { amountA: amountAOut, amountB: amountBOut } = LiquidityMath.getAmountsFromLiquidity(
    //             this.clmmTickFormulaService.tickToSqrtPriceX64({ tickIndex: new Decimal(tickCurrent) }),
    //             this.clmmTickFormulaService.tickToSqrtPriceX64({ tickIndex: tickLower }),
    //             this.clmmTickFormulaService.tickToSqrtPriceX64({ tickIndex: tickUpper }),
    //             liquidity,
    //             false,
    //         )
    //         const amountAOutInB = computeDenomination(
    //             new BN(amountAOut),
    //             tokenAEntity.decimals
    //         ).mul(oraclePrice)
    //         const amountBOutInB = computeDenomination(
    //             new BN(amountBOut),
    //             tokenBEntity.decimals
    //         )
    //         const ratio = amountAOutInB.div(amountAOutInB.add(amountBOutInB))
    //         return new Decimal(ratio.toString())
    //     }
    //     const tickRecords: Array<TickRecord> = []
    //     for (let i = 0; i < tickMultiplier; i++) {
    //         const tickRecord: TickRecord = {
    //             tickLower: tickLowerEntry,
    //             tickUpper: tickUpperEntry,
    //             R: computeR(tickLowerEntry, tickUpperEntry),
    //         }
    //         tickRecords.push(tickRecord)
    //         tickLowerEntry = tickLowerEntry.add(new Decimal(tickSpacing))
    //         tickUpperEntry = tickUpperEntry.add(new Decimal(tickSpacing))
    //     }
    //     // pick the most closest tick record to the R value
    //     const closestTickRecord = tickRecords.reduce((prev, curr) => {
    //         return prev.R.sub(R).abs().lt(curr.R.sub(R).abs()) ? prev : curr
    //     })
    //     return {
    //         tickLower: closestTickRecord.tickLower,
    //         tickUpper: closestTickRecord.tickUpper,
    //     }
    // }
}

export interface GetTickBoundsParams {
    state: LiquidityPoolState
    bot: BotSchema
}

export interface GetTickBoundsResult {
    tickLower: Decimal
    tickUpper: Decimal
}

export interface TickRecord {
    tickLower: Decimal
    tickUpper: Decimal
    R: Decimal
}