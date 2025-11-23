import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { toUnitDecimal } from "@modules/common"
import BN from "bn.js"
import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { Q64 } from "./constants"
import { BotSchema, PrimaryMemoryStorageService } from "@modules/databases"
import { LiquidityPoolState } from "../interfaces"
import { computeDenomination } from "@utils"
import { 
    SnapshotBalancesNotSetException, 
    TokenNotFoundException
} from "@exceptions"
import { OraclePriceService } from "../pyth"

@Injectable()
export class TickMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly oraclePriceService: OraclePriceService,
    ) {}

    public async getTickBounds(
        {
            state,
            bot,
        }: GetTickBoundsParams
    ): Promise<GetTickBoundsResponse> {
        const { 
            snapshotTargetBalanceAmount, 
            snapshotQuoteBalanceAmount, 
            targetToken, quoteToken 
        } = bot
        if (!snapshotTargetBalanceAmount || !snapshotQuoteBalanceAmount) {
            throw new SnapshotBalancesNotSetException(
                "Snapshot target token balance amount or snapshot quote token balance amount is not set"
            )
        }
        const { 
            dynamic: { 
                tickCurrent
            }, 
            static: { 
                tickSpacing,
                tickMultiplier
            } 
        } = state
        const targetTokenEntity = this.primaryMemoryStorageService.tokens
            .find(token => token.id === targetToken.toString())
        if (!targetTokenEntity) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteTokenEntity = this.primaryMemoryStorageService.tokens
            .find(token => token.id === quoteToken.toString())
        if (!quoteTokenEntity) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const targetIsA = targetToken.id === state.static.tokenA.toString()
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
        //
        // 1. Compute R = quote / target
        //
        const R = new Decimal(
            quoteTokenBalanceAmountInQuote
        ).div(targetTokenBalanceAmountInQuote)
        //
        // S = tickMultiplier * tickSpacing define the range of the pool
        // S = tickUpper - tickLower = (tickUpper - current) + (current - tickLower)
        //
        const S = new Decimal(tickMultiplier).mul(tickSpacing)
        //
        // 2. Compute L depending on whether target is token A or B.
        //    L defines: (current - tickLower) / (tickUpper - current) is targetIsA = true 
        //    L defines: (tickUpper - current) / ((current - tickLower) is targetIsA = false
        //    L must satisfy L <= R to ensure the token allocation is valid
        //
        let tickLower: Decimal
        let tickUpper: Decimal
        if (targetIsA) {
            // L = (S - (current - tickLower))/(current - tickLower) <= R
            // => S/(current - tickLower) - 1 <= R
            // => S/(current - tickLower) <= R + 1
            // => (current - tickLower) >= S/(R + 1)
            // => tickLower <= current - S/(R + 1)
            tickLower = Decimal.floor(new Decimal(tickCurrent).sub(S.div(R.add(1))))
            tickUpper = tickLower.add(S)
        } else {
            // L = (S - (tickUpper - current))/(tickUpper - current) <= R
            // => S/(tickUpper - current) - 1 <= R
            // => S/(tickUpper - current) <= R + 1
            // => (tickUpper - current) >= S/(R + 1)
            // => tickUpper >= current + S/(R + 1)
            tickUpper = Decimal.ceil(new Decimal(tickCurrent).add(S.div(R.add(1))))
            tickLower = tickUpper.sub(tickMultiplier)
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