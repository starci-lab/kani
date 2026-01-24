import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PriceService 
} from "../math/price.service"
import {
    TokenSchema 
} from "@modules/databases"
import {
    toDecimalAmount 
} from "@modules/utils"

@Injectable()
export class PositionValueService {
    constructor(
        private readonly priceService: PriceService,
    ) {}

    async calculatePositionValue(
        {
            before,
            after,
            targetToken,
            quoteToken,
            gasToken,
        }: CalculatePositionValueParams
    ) {
        const { price: relativeQuotePrice } = await this.priceService.resolveRelativePrice({
            tokenA: targetToken,
            tokenB: quoteToken,
        })
        const { price: relativeGasPrice } = await this.priceService.resolveRelativePrice({
            tokenA: targetToken,
            tokenB: gasToken,
        })
        // caculate in target token
        const targetBalanceAmountDiff = toDecimalAmount({
            amount: before.targetBalanceAmount.sub(after.targetBalanceAmount),
            decimals: new Decimal(targetToken.decimals),
        })
        const quoteBalanceAmountDiffInTarget = toDecimalAmount({
            amount: before.quoteBalanceAmount.sub(after.quoteBalanceAmount),
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)
        const gasBalanceAmountDiff = toDecimalAmount({
            amount: before.gasBalanceAmount.sub(after.gasBalanceAmount),
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)
        const positionValue = targetBalanceAmountDiff.add(quoteBalanceAmountDiffInTarget).add(gasBalanceAmountDiff)
        // convert to usd
        const { price: targetPrice } = await this.priceService.resolvePrice({
            token: targetToken,
        })
        const positionValueInUsd = positionValue.mul(targetPrice)
        return {
            positionValue,
            positionValueInUsd,
        }
    }
}

export interface CalculatePositionValueParams {
    before: CalculatePositionValue,
    after: CalculatePositionValue,
    targetToken: TokenSchema,
    quoteToken: TokenSchema,
    gasToken: TokenSchema,
}

export interface CalculatePositionValueResult {
    positionValue: Decimal,
    positionValueInUsd: Decimal,
}

export interface CalculatePositionValue {
    targetBalanceAmount: BN,
    quoteBalanceAmount: BN,
    gasBalanceAmount: BN,
}