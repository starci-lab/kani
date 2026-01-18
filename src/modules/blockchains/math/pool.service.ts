import {
    TokenNotFoundException 
} from "@exceptions"
import {
    computeRatio, computeRaw, toUnit 
} from "@utils"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PrimaryMemoryStorageService, TokenId 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    ClmmPoolUtil 
} from "@cetusprotocol/cetus-sui-clmm-sdk"

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
    ): GetRatioFromAmountAResult {
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: tokenAId
            }
        })
        if (!tokenA) {
            throw new TokenNotFoundException({
                displayId: tokenAId
            })
        }
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            displayId: {
                $eq: tokenBId
            }
        })
        if (!tokenB) {
            throw new TokenNotFoundException({
                displayId: tokenBId
            })
        }
        const quoteAmountA = computeRaw(new Decimal(1),
            tokenA.decimals)
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
        return {
            ratio,
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

export interface GetRatioFromAmountAResult {
    ratio: Decimal,
}
