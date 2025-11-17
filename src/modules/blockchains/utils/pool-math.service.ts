import { Injectable } from "@nestjs/common"
import { computeRatio, computeRaw, toUnit } from "@utils"
import BN from "bn.js"
import Decimal from "decimal.js"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { ClmmPoolUtil } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { TokenNotFoundException } from "@exceptions"
@Injectable()
export class PoolMathService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    public getRatioFromAmountA(
        {
            slippage,
            sqrtPriceX64,
            tickLower,
            tickUpper,
            tokenAId,
            tokenBId,
        }: GetRatioFromAmountAParams
    ): GetRatioFromAmountAResponse 
    {
        const tokenA = this.primaryMemoryStorageService.tokens
            .find(token => token.displayId === tokenAId)
        const tokenB = this.primaryMemoryStorageService.tokens
            .find(token => token.displayId === tokenBId)
        if (!tokenA || !tokenB) {
            throw new TokenNotFoundException("Token not found")
        }
        const quoteAmountA = computeRaw(1, tokenA.decimals)
        // we use sui lib to calculate the amount out efficiently than using the formula
        const { coinAmountA: estCoinAmountA, coinAmountB: estCoinAmountB } =
            ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
                tickLower.toNumber(),
                tickUpper.toNumber(),
                quoteAmountA, // coinAmount must be BN
                true, // isCoinA
                true, // roundUp
                slippage.toNumber(), // example 0.01
                sqrtPriceX64,
            )
        const ratio = computeRatio(
            new BN(estCoinAmountB).mul(toUnit(tokenA.decimals)),
            new BN(estCoinAmountA).mul(toUnit(tokenB.decimals)),
        )
        return { ratio }
    }

    calculateZapAmounts({
        decimalsA,
        decimalsB,
        amountIn,
        spotPrice,
        oraclePrice,
        ratio,
        targetIsA,
    }: ZapCalculationParams): ZapCalculationResponse { 
        const price = oraclePrice ?? spotPrice
        let swapAmountIn: BN
        let remainingAmountIn: BN
        let receiveAmountOut: BN
        if (targetIsA) {
            // target is A
            // swapA = (ratio * OriginA) / (price + ratio)
            const originA = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsA))
            const swapA = ratio.mul(originA).div(price.add(ratio))
      
            swapAmountIn = new BN(swapA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
            remainingAmountIn = amountIn.sub(swapAmountIn)
      
            const receiveB = swapA.mul(price)
            receiveAmountOut = new BN(receiveB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
        } else {
            // target is B
            // swapB = (price * OriginB) / (price + ratio)
            const originB = new Decimal(amountIn.toString()).div(new Decimal(10).pow(decimalsB))
            const swapB = price.mul(originB).div(price.add(ratio))
      
            swapAmountIn = new BN(swapB.mul(new Decimal(10).pow(decimalsB)).toFixed(0))
            remainingAmountIn = amountIn.sub(swapAmountIn)

            const receiveA = swapB.div(price)
            receiveAmountOut = new BN(receiveA.mul(new Decimal(10).pow(decimalsA)).toFixed(0))
        }
        return {
            swapAmountIn,
            remainingAmountIn,
            receiveAmountOut,
        }
    }
}

export interface GetRatioFromAmountAParams {
    slippage: Decimal,
    sqrtPriceX64: BN,
    tickLower: Decimal,
    tickUpper: Decimal,
    tokenAId: TokenId
    tokenBId: TokenId
}

export interface GetRatioFromAmountAResponse {
    ratio: Decimal,
}

export interface ZapCalculationParams {
    decimalsA: number,
    decimalsB: number,
    amountIn: BN,
    spotPrice: Decimal,
    oraclePrice: Decimal,
    ratio: Decimal,
    targetIsA: boolean,
}

export interface ZapCalculationResponse {
    swapAmountIn: BN,
    remainingAmountIn: BN,
    receiveAmountOut: BN,
}