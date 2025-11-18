import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"

export interface EnsureCalculationParams {
    expected: BN,
    actual: BN,
}

export interface EnsureCalculationResponse {
    deviation: Decimal,
    isAcceptable: boolean,
}

const MAX_DEVIATION = new Decimal(0.05) // 5%

@Injectable()
export class EnsureMathService {
    public ensureAmounts(
        {
            expected,
            actual
        }: EnsureCalculationParams
    ): EnsureCalculationResponse {
        const deviation = new Decimal(actual.toString()).div(new Decimal(expected.toString())).sub(1).abs()
        return {
            deviation,
            isAcceptable: deviation.lte(MAX_DEVIATION),
        }
    }
}
