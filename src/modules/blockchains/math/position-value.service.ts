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

/**
 * Service for calculating the value of a position based on balance changes.
 * 
 * Calculates position value by:
 * 1. Computing balance differences (before - after) for target, quote, and gas tokens
 * 2. Converting all differences to target token equivalent using relative prices
 * 3. Summing all values to get total position value in target token
 * 4. Converting to USD using target token price
 */
@Injectable()
export class PositionValueService {
    constructor(
        private readonly priceService: PriceService,
    ) {}

    /**
     * Calculates the position value based on balance changes before and after a position operation.
     * 
     * The calculation flow:
     * 1. Resolve relative prices (quote/gas tokens relative to target token)
     * 2. Calculate balance differences for each token type (before - after)
     * 3. Convert all differences to target token equivalent
     * 4. Sum all values to get total position value in target token
     * 5. Convert to USD using target token's USD price
     * 
     * @param before - Balance amounts before the position operation
     * @param after - Balance amounts after the position operation
     * @param targetToken - The target token schema (base token for calculations)
     * @param quoteToken - The quote token schema
     * @param gasToken - The gas token schema
     * @returns Position value in target token and USD
     */
    async calculatePositionValue(
        {
            before,
            after,
            targetToken,
            quoteToken,
            gasToken,
        }: CalculatePositionValueParams
    ): Promise<CalculatePositionValueResult> {
        // Resolve relative prices: how many target tokens equal one quote/gas token
        const { price: relativeQuotePrice } = await this.priceService.resolveRelativePrice({
            tokenA: quoteToken,
            tokenB: targetToken,
        })
        const { price: relativeGasPrice } = await this.priceService.resolveRelativePrice({
            tokenA: gasToken,
            tokenB: targetToken,
        })
        
        // Calculate balance differences and convert to target token equivalent
        // Target token difference (already in target token, no conversion needed)
        const targetBalanceAmountDiff = toDecimalAmount({
            amount: before.targetBalanceAmount.sub(after.targetBalanceAmount).abs(),
            decimals: new Decimal(targetToken.decimals),
        })
        
        // Quote token difference converted to target token equivalent
        const quoteBalanceAmountDiffInTarget = toDecimalAmount({
            amount: before.quoteBalanceAmount.sub(after.quoteBalanceAmount).abs(),
            decimals: new Decimal(quoteToken.decimals),
        }).mul(relativeQuotePrice)
        
        // Gas token difference converted to target token equivalent
        const gasBalanceAmountDiff = toDecimalAmount({
            amount: before.gasBalanceAmount.sub(after.gasBalanceAmount).abs(),
            decimals: new Decimal(gasToken.decimals),
        }).mul(relativeGasPrice)
        
        // Sum all differences to get total position value in target token
        const positionValue = targetBalanceAmountDiff.add(quoteBalanceAmountDiffInTarget).add(gasBalanceAmountDiff)
        
        // Convert position value to USD using target token's USD price
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

/**
 * Parameters for calculating position value.
 */
export interface CalculatePositionValueParams {
    /** Balance amounts before the position operation */
    before: CalculatePositionValue,
    /** Balance amounts after the position operation */
    after: CalculatePositionValue,
    /** The target token (base token for calculations) */
    targetToken: TokenSchema,
    /** The quote token */
    quoteToken: TokenSchema,
    /** The gas token */
    gasToken: TokenSchema,
}

/**
 * Result of position value calculation.
 */
export interface CalculatePositionValueResult {
    /** Position value in target token units */
    positionValue: Decimal,
    /** Position value in USD */
    positionValueInUsd: Decimal,
}

/**
 * Balance amounts for a specific point in time.
 * All amounts are in raw token units (not decimal-adjusted).
 */
export interface CalculatePositionValue {
    /** Target token balance amount (raw BN) */
    targetBalanceAmount: BN,
    /** Quote token balance amount (raw BN) */
    quoteBalanceAmount: BN,
    /** Gas token balance amount (raw BN) */
    gasBalanceAmount: BN,
}