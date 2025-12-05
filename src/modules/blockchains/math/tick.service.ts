import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { computeDenomination, toUnitDecimal } from "@modules/common"
import BN from "bn.js"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
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

const Q64 = new Decimal(2).pow(64)

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
        const tokenAEntity = targetIsA ? targetTokenEntity : quoteTokenEntity
        const tokenBEntity = targetIsA ? quoteTokenEntity : targetTokenEntity
        const snapshotTokenAAmount = targetIsA ? snapshotTargetBalanceAmount : snapshotQuoteBalanceAmount
        const snapshotTokenBAmount = targetIsA ? snapshotQuoteBalanceAmount : snapshotTargetBalanceAmount
        const oraclePrice = await this.oraclePriceService.getOraclePrice({
            tokenA: tokenAEntity.displayId,
            tokenB: tokenBEntity.displayId,
        })
        const tokenAAmountInB = computeDenomination(
            new BN(snapshotTokenAAmount),
            tokenAEntity.decimals
        ).mul(oraclePrice)
        const tokenBAmountInB = computeDenomination(
            new BN(snapshotTokenBAmount),
            quoteTokenEntity.decimals
        ) 
        // ?: S = tickSpacing * tickMultiplier = tickUpper - tickLower
        const S = new Decimal(tickSpacing).mul(new Decimal(tickMultiplier))
        // ?: R = quote / (target + quote)
        const R = new Decimal(
            tokenAAmountInB
        ).div(
            tokenAAmountInB
                .add(tokenBAmountInB)
        ) // ~ 0.25
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
        let tickLowerEntry = new Decimal(tickCurrent).sub(S).div(tickSpacing).ceil().mul(tickSpacing)
        let tickUpperEntry = tickLowerEntry.add(S)
        // we define a function to compute the R value
        const computeR = (tickLower: Decimal, tickUpper: Decimal) => {
            const amountA = new BN(1_000_000_000)
            const liquidity = LiquidityMath.getLiquidityFromTokenAmountA(
                this.tickToSqrtPriceX64({ tickIndex: tickLower }),
                this.tickToSqrtPriceX64({ tickIndex: tickUpper }),
                amountA,
                false,
            )
            const { amountA: amountAOut, amountB: amountBOut } = LiquidityMath.getAmountsFromLiquidity(
                this.tickToSqrtPriceX64({ tickIndex: new Decimal(tickCurrent) }),
                this.tickToSqrtPriceX64({ tickIndex: tickLower }),
                this.tickToSqrtPriceX64({ tickIndex: tickUpper }),
                liquidity,
                false,
            )
            const amountAOutInB = computeDenomination(
                new BN(amountAOut),
                tokenAEntity.decimals
            ).mul(oraclePrice)
            const amountBOutInB = computeDenomination(
                new BN(amountBOut),
                tokenBEntity.decimals
            )
            const ratio = amountAOutInB.div(amountAOutInB.add(amountBOutInB))
            return new Decimal(ratio.toString())
        }
        const tickRecords: Array<TickRecord> = []
        for (let i = 0; i < tickMultiplier; i++) {
            const tickRecord: TickRecord = {
                tickLower: tickLowerEntry,
                tickUpper: tickUpperEntry,
                R: computeR(tickLowerEntry, tickUpperEntry),
            }
            tickRecords.push(tickRecord)
            tickLowerEntry = tickLowerEntry.add(new Decimal(tickSpacing))
            tickUpperEntry = tickUpperEntry.add(new Decimal(tickSpacing))
        }
        // pick the most closest tick record to the R value
        const closestTickRecord = tickRecords.reduce((prev, curr) => {
            return prev.R.sub(R).abs().lt(curr.R.sub(R).abs()) ? prev : curr
        })
        console.log(closestTickRecord)
        console.log(tickCurrent)
        return {
            tickLower: closestTickRecord.tickLower,
            tickUpper: closestTickRecord.tickUpper,
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

export interface TickRecord {
    tickLower: Decimal
    tickUpper: Decimal
    R: Decimal
}