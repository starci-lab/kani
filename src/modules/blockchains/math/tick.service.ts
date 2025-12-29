import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { computeDenomination } from "@utils"
import BN from "bn.js"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../interfaces"
import {
    SnapshotBalancesNotSetException, 
    TokenNotFoundException
} from "@exceptions"
import { PythOraclePriceService } from "../pyth"
import { LiquidityMath } from "@raydium-io/raydium-sdk-v2"
import { SpotPriceService } from "../spot"
import { AsyncService } from "@modules/mixin"
import { ClmmTickFormulaService } from "../formulas"

@Injectable()
export class TickMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly pythOraclePriceService: PythOraclePriceService,
        private readonly spotPriceService: SpotPriceService,
        private readonly asyncService: AsyncService,
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
        const price = await this.asyncService.executeWithFallbacks({
            action: async () => {
                return await this.pythOraclePriceService.getPythOraclePrice({
                    tokenA: tokenAEntity.displayId,
                    tokenB: tokenBEntity.displayId,
                })
            },
            fallbacks: [
                async () => {
                    return await this.spotPriceService.getSpotPrice({ state })
                },
            ],
            attempts: 1,
        })
    
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
                        tickIndex: new Decimal(tickCurrent),
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
        let tickLowerEntry = new Decimal(tickCurrent)
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
    
        return {
            tickLower: bestTickLower,
            tickUpper: bestTickUpper,
        }
    }
}

export interface GetTickBoundsParams {
    state: LiquidityPoolState
    bot: BotSchema
}

export interface GetTickBoundsResponse {
    tickLower: Decimal
    tickUpper: Decimal
}

export interface TickRecord {
    tickLower: Decimal
    tickUpper: Decimal
    R: Decimal
}