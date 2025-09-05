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
    amount: number | bigint,
    decimals = 8,
    fractionDigits: number = 5,
) => {
    if (typeof amount === "number") {
        const decimalMultiplier = 10 ** fractionDigits
        const divisor = 10 ** decimals
        const result = (amount * decimalMultiplier) / divisor
        return Number((result / decimalMultiplier).toFixed(fractionDigits))
    } else {
        const decimalMultiplier = BigInt(10 ** fractionDigits)
        const divisor = BigInt(10 ** decimals)
        const result = (amount * decimalMultiplier) / divisor
        return Number(result) / Number(decimalMultiplier)
    }
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