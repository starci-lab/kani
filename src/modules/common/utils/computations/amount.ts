import Decimal from "decimal.js"
import BN from "bn.js"
import {
    envConfig,
} from "@modules/env"
import {
    pow10,
} from "./pow-10"

export interface ToDecimalAmountParams {
    // the amount to convert to a decimal
    amount: BN
    // the number of decimals to use
    decimals: Decimal
    // the number of fraction digits to use
    fractionDigits?: Decimal
}

export const toDecimalAmount = ({
    amount,
    decimals,
    fractionDigits = new Decimal(
        envConfig()
            .computation.amount.fractionDigits,
    ),
}: ToDecimalAmountParams): Decimal => {
    const precisionFactor = pow10({
        exponent: fractionDigits,
        asBN: true,
    })
    const decimalsFactor = pow10({
        exponent: decimals,
        asBN: true,
    })
    return new Decimal(amount.mul(precisionFactor)
        .div(decimalsFactor).toString())
        .div(new Decimal(precisionFactor.toString()))
        .toDecimalPlaces(fractionDigits.toNumber(),
            Decimal.ROUND_HALF_UP)
}

export interface ToRawAmountParams {
    // the decimal amount (UI / human-readable)
    amount: Decimal
    // the number of decimals to use
    decimals: Decimal
    // the number of fraction digits used during computation
    fractionDigits?: Decimal
  }

export const toRawAmount = ({
    amount,
    decimals,
    fractionDigits = new Decimal(
        envConfig()
            .computation.amount.fractionDigits,
    ),
}: ToRawAmountParams): BN => {
    const precisionFactor = pow10({
        exponent: fractionDigits,
        asBN: false,
    })

    const decimalsFactor = pow10({
        exponent: decimals,
        asBN: true,
    })

    return new BN(amount.mul(precisionFactor).toDecimalPlaces(0,
        Decimal.ROUND_UP).toString())
        .mul(decimalsFactor)
        .div(new BN(precisionFactor.toFixed(0)))
}
