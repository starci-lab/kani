import { Injectable } from "@nestjs/common"
import { BN } from "turbos-clmm-sdk"

@Injectable()
export class ProfitabilityMathService {
    constructor(
    ) {}

    public calculateProfitability(
        {
            targetTokenBalanceAmount,
            quoteTokenBalanceAmount,
            gasBalanceAmount,
        }: CalculateProfitabilityParams
    ): CalculateProfitabilityResponse {
        const before: CalculateProfitability = {
            targetTokenBalanceAmount,
            quoteTokenBalanceAmount,
            gasBalanceAmount,
        }
        const after: CalculateProfitability = {
            targetTokenBalanceAmount,
            quoteTokenBalanceAmount,
            gasBalanceAmount,
        }
        return {
            before,
            after,
        }
    }
}

export interface CalculateProfitabilityResponse {
    before: CalculateProfitability,
    after: CalculateProfitability,
}

export interface CalculateProfitability {
    targetTokenBalanceAmount: BN
    quoteTokenBalanceAmount: BN
    gasBalanceAmount: BN
}
