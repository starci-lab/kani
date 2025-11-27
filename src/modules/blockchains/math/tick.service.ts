import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { computeDenomination, toUnitDecimal } from "@modules/common"
import BN from "bn.js"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { Q64 } from "./constants"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../interfaces"
import { 
    SnapshotBalancesNotSetException, 
    TokenNotFoundException
} from "@exceptions"
import { OraclePriceService } from "../pyth"
import { LiquidityMath } from "@raydium-io/raydium-sdk-v2"

export interface TickToSqrtPriceX64Params {
    tickIndex: Decimal
}

@Injectable()
export class TickMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly oraclePriceService: OraclePriceService,
    ) {}

    public tickToSqrtPriceX64(
        {
            tickIndex,
        }: TickToSqrtPriceX64Params
    ): BN {
        // we use sui fomular with high-precision to calculate the sqrt price
        return TickMath.tickIndexToSqrtPriceX64(tickIndex.toNumber())
    }
    
    public async getTickBounds(
        params: GetTickBoundsParams
    ) {
        const {
            state,
            bot
        } = params
    
        const {
            snapshotTargetBalanceAmount,
            snapshotQuoteBalanceAmount,
            targetToken,
            quoteToken
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount || !targetToken || !quoteToken) {
            throw new SnapshotBalancesNotSetException("Snapshot balances not set")
        }
        const {
            dynamic: { tickCurrent },
            static: { tickSpacing, tickMultiplier }
        } = state
    
        const targetIsA = targetToken.toString() === state.static.tokenA.toString()
        const targetTokenInstance = this.primaryMemoryStorageService.tokens.find(token => token.id === targetToken.toString())
        const quoteTokenInstance = this.primaryMemoryStorageService.tokens.find(token => token.id === quoteToken.toString())
        if (!targetTokenInstance || !quoteTokenInstance) {
            throw new TokenNotFoundException("Target or quote token not found")
        }

        const targetTokenEntity = this.primaryMemoryStorageService.tokens.find(token => token.id === targetToken.toString())
        if (!targetTokenEntity) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteTokenEntity = this.primaryMemoryStorageService.tokens.find(token => token.id === quoteToken.toString())
        if (!quoteTokenEntity) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const oraclePrice = await this.oraclePriceService.getOraclePrice({
            tokenA: targetTokenEntity.displayId,
            tokenB: quoteTokenEntity.displayId,
        })
        const targetTokenBalanceAmountInQuote = computeDenomination(
            new BN(snapshotTargetBalanceAmount),
            targetTokenEntity.decimals
        ).mul(oraclePrice)
        const quoteTokenBalanceAmountInQuote = computeDenomination(
            new BN(snapshotQuoteBalanceAmount),
            quoteTokenEntity.decimals
        ) 
        // ?: S = tickSpacing * tickMultiplier = tickUpper - tickLower
        const S = new Decimal(tickSpacing).mul(new Decimal(tickMultiplier))
        // ?: R = quote / target
        const R = new Decimal(
            quoteTokenBalanceAmountInQuote
        ).div(targetTokenBalanceAmountInQuote) // ~ 0.25
        // * Goal: Find tickLower and tickUpper that satisfy the CLMM liquidity formulas
        // Token A amount (when price is inside range)
        // ?: amountA = L * (1/sqrtPriceCurrent - 1/sqrtPriceUpper)
        // Token B amount (when price is inside range)
        // ?: amountB = L * (sqrtPriceCurrent - sqrtPriceLower)
        // Also, the tickLower and tickUpper have to be divisible by the tickSpacing
        // ?: tickLower % tickSpacing == 0
        // ?: tickUpper % tickSpacing == 0
        // ?: tickUpper - tickLower = tickSpacing * tickMultiple
        // Sastify the following condition:
        // ?: targetIsA ? amountA/amountB ~ R : amountB/amountA ~ R
        // TODO: R = (sqrtPriceCurrent - sqrtPriceLower)/(1/sqrtPriceCurrent - 1/sqrtPriceUpper)
        // * Solution: Use loop to find the tickLower and tickUpper
        let tickLowerEntry = new Decimal(tickCurrent).sub(S.mul(targetIsA ? R : new Decimal(1).sub(R)))
        tickLowerEntry = tickLowerEntry.divToInt(new Decimal(tickSpacing)).mul(new Decimal(tickSpacing))
        let tickUpperEntry = tickLowerEntry.add(S)
        // we define a function to compute the R value
        const tokenAEntity = targetIsA ? targetTokenEntity : quoteTokenEntity
        const tokenBEntity = targetIsA ? quoteTokenEntity : targetTokenEntity
        const computeR = () => {
            const amountA = new BN(1_000_000_000)
            const liquidity = LiquidityMath.getLiquidityFromTokenAmountA(
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickLowerEntry) }),
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickUpperEntry) }),
                amountA,
                false,
            )
            const { amountA: amountAOut, amountB: amountBOut } = LiquidityMath.getAmountsFromLiquidity(
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickCurrent) }),
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickLowerEntry) }),
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickUpperEntry) }),
                liquidity,
                false,
            )
            const ratio = computeDenomination(amountBOut, tokenBEntity.decimals)
                .div(computeDenomination(amountAOut, tokenAEntity.decimals)).div(
                    oraclePrice
                )
            return targetIsA ? ratio : new Decimal(1).div(ratio)
        }
        let tickLower = new Decimal(0)
        let tickUpper = new Decimal(0)
        if (targetIsA) {
            for (let i = 0; i < S.div(tickSpacing).toNumber(); i++) {
                const absValue = computeR().sub(R).abs()
                tickLowerEntry = tickLowerEntry.add(new Decimal(tickSpacing))
                tickUpperEntry = tickUpperEntry.add(new Decimal(tickSpacing))
                if (computeR().lt(R)) {
                    const anotherAbsValue = computeR().sub(R).abs()
                    if (anotherAbsValue.gt(absValue)) {
                        tickLower = tickLowerEntry.sub(new Decimal(tickSpacing))
                        tickUpper = tickUpperEntry.sub(new Decimal(tickSpacing))
                    } else  {
                        tickLower = tickLowerEntry
                        tickUpper = tickUpperEntry
                    }
                    break
                }
            }
        } else {
            for (let i = 0; i < S.div(tickSpacing).toNumber(); i++) {
                const absValue = computeR().sub(R).abs()
                tickLowerEntry = tickLowerEntry.sub(new Decimal(tickSpacing))
                tickUpperEntry = tickUpperEntry.sub(new Decimal(tickSpacing))
                if (computeR().gt(R)) {
                    const anotherAbsValue = computeR().sub(R).abs()
                    if (anotherAbsValue.gt(absValue)) {
                        tickLower = tickLowerEntry.add(new Decimal(tickSpacing))
                        tickUpper = tickUpperEntry.add(new Decimal(tickSpacing))
                    } else {
                        tickLower = tickLowerEntry
                        tickUpper = tickUpperEntry
                    }
                    break
                }
            }
        }
        return {
            tickLower,
            tickUpper,
        }
    }

    public sqrtPriceX64ToPrice(
        params: SqrtPriceX64ToPriceParams
    ): SqrtPriceX64ToPriceResponse {
        const { sqrtPriceX64, decimalsA, decimalsB } = params

        const sqrtPrice = new Decimal(sqrtPriceX64.toString())
        if (sqrtPrice.isZero()) {
            return { price: new Decimal(0) }
        }

        // ratio = sqrtPrice / 2^64
        const ratio = sqrtPrice.div(Q64)

        // price = ratio^2 * 10^(decimalsA - decimalsB)
        return {
            price: ratio.pow(2).div(toUnitDecimal(decimalsB - decimalsA)),
        }
    }

    public tickIndexToPrice(
        params: TickIndexToPriceParams
    ): TickIndexToPriceResponse {
        const { tickIndex, decimalsA, decimalsB } = params
        const sqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(tickIndex)
        return this.sqrtPriceX64ToPrice({
            sqrtPriceX64,
            decimalsA,
            decimalsB,
        })
    }
}

export interface TickIndexToPriceParams {
    tickIndex: number
    decimalsA: number
    decimalsB: number
}

export interface TickIndexToPriceResponse {
    price: Decimal
}

export interface SqrtPriceX64ToPriceParams {
    sqrtPriceX64: BN
    decimalsA: number
    decimalsB: number
}

export interface SqrtPriceX64ToPriceResponse {
    price: Decimal
}

export interface GetTickBoundsParams {
    state: LiquidityPoolState
    bot: BotSchema
}

export interface GetTickBoundsResponse {
    tickLower: Decimal
    tickUpper: Decimal
}