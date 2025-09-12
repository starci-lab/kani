import BN from "bn.js"
import Decimal from "decimal.js"
import JSBI from "jsbi"

export const computePercentage = (
    numerator: number,
    denominator: number = 1,
    fractionDigits: number = 2,
): number => {
    const fixed = ((numerator * 100) / denominator).toFixed(fractionDigits)
    return Number.parseFloat(fixed)
}

export const computeDenomination = (
    amount: BN,
    decimals = 8,
    fractionDigits = 5,
): number => {
    // amount is a BN
    const divisor = new BN(10).pow(new BN(decimals))
    const quotient = amount.div(divisor)
    const remainder = amount.mod(divisor)

    const result =
        quotient.toNumber() +
        remainder.toNumber() / divisor.toNumber()

    return parseFloat(result.toFixed(fractionDigits))
}

export const computeRaw = (
    amount: number,
    decimals = 8,
    fractionDigits = 5,
): bigint => {
    const mutiplier = JSBI.BigInt(10 ** decimals)
    const decimalMultiplier = JSBI.BigInt(10 ** fractionDigits)
    const result = JSBI.multiply(
        JSBI.BigInt((amount * 10 ** fractionDigits).toFixed()),
        mutiplier,
    )
    const result2 = JSBI.divide(result, decimalMultiplier)
    return BigInt(result2.toString())
}

export const roundNumber = (amount: number, decimals = 5): number => {
    return new Decimal(amount).toDecimalPlaces(decimals).toNumber()
}

export const computeFeeTierRaw = (feeTier = 0.003): number => {
    return Math.round(feeTier * 1_000_000)
}

export const computeAfterFee = (amount: bigint, feeTier = 0.003): bigint => {
    const fee =
    (amount * BigInt(computeFeeTierRaw(feeTier))) / BigInt(1_000_000)
    return amount - fee
}

export const computeBeforeFee = (amount: bigint, feeTier = 0.003): bigint => {
    return (amount * BigInt(1_000_000)) / (BigInt(1_000_000) - BigInt(computeFeeTierRaw(feeTier)))
}