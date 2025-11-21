import BN from "bn.js"
import Decimal from "decimal.js"

export const computePercentage = (
    numerator: Decimal.Value,
    denominator: Decimal.Value = 1,
    fractionDigits: number = 2,
): number => {
    const percentage = new Decimal(numerator)
        .mul(100)
        .div(denominator)
        .toDecimalPlaces(fractionDigits, Decimal.ROUND_HALF_UP)
    return percentage.toNumber()
}

export const toUnit = (decimals: number = 10): BN => {
    return new BN(10).pow(new BN(decimals))
}

export const toUnitDecimal = (decimals: number = 10): Decimal => {
    return new Decimal(10).pow(new Decimal(decimals))
}

export const computeRatio = (
    numerator: BN,
    denominator: BN,
    fractionDigits = 10,
): Decimal => {
    if (denominator.isZero()) {
        // we treat zero denominator as 100
        return new Decimal(100)
    }
    const multiplier = new BN(10).pow(new BN(fractionDigits)) // 10^decimals
    return new Decimal(
        new Decimal(
            numerator
                .mul(multiplier)
                .div(denominator)
                .toString()
        ).div(
            new Decimal(multiplier.toString())
        )
    )
}

export const computeDenomination = (
    amount: BN,
    decimals = 8,
    fractionDigits = 5,
): Decimal => {
    // amount is a BN
    const divisor = new BN(10).pow(new BN(decimals))
    const quotient = amount.div(divisor)
    const remainder = amount.mod(divisor)
    const result =
    quotient.toNumber() + remainder.toNumber() / divisor.toNumber()
    return new Decimal(result.toFixed(fractionDigits))
}

export const computeRaw = (
    amount: Decimal.Value,
    decimals = 8,
    fractionDigits = 5,
): BN => {
    const multiplier = new BN(10).pow(new BN(decimals)) // 10^decimals
    const decimalMultiplier = new BN(10).pow(new BN(fractionDigits)) // 10^fractionDigits
    const scaled = new BN(new Decimal(amount)
        .mul(new Decimal(10)
            .pow(new Decimal(fractionDigits))).toFixed(0))
    return scaled.mul(multiplier).div(decimalMultiplier)
}

export const computeFeeTierRaw = (feeTier = 0.003): number => {
    return Math.round(feeTier * 1_000_000)
}

export const computeAfterFee = (amount: bigint, feeTier = 0.003): bigint => {
    const fee = (amount * BigInt(computeFeeTierRaw(feeTier))) / BigInt(1_000_000)
    return amount - fee
}

export const computeBeforeFee = (amount: bigint, feeTier = 0.003): bigint => {
    return (
        (amount * BigInt(1_000_000)) /
    (BigInt(1_000_000) - BigInt(computeFeeTierRaw(feeTier)))
    )
}

export const toScaledBN = (
    bn: BN,
    multiplier: Decimal,
    fractionDigits: number = 10,
): BN => {
    const decimalMultiplier = new Decimal(10).pow(fractionDigits) // 10^fractionDigits
    const scale = new BN(multiplier.mul(decimalMultiplier).toFixed(0))
    return new BN(bn.toString())
        .mul(scale)
        .div(new BN(decimalMultiplier.toFixed(0)))
}

export const adjustSlippage = (
    bn: BN,
    slippage: Decimal,
    fractionDigits: number = 10,
): BN => {
    return toScaledBN(
        bn,
        new Decimal(1).minus(slippage),
        fractionDigits,
    )
}
