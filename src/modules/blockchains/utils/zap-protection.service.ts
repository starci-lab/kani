import { toScaledBN } from "@modules/common"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

export interface IsZapEligibleParams {
    amountOriginal: BN
    amountZapped: BN
}

export interface EmitZapNotEligibleParams {
    amountOriginal: BN
    amountZapped: BN
    liquidityPoolId: string
    userId: string
}

export interface EnsureZapEligibleParams {
    amountOriginal: BN
    amountZapped: BN
    liquidityPoolId: string
    userId: string
    requireZapEligible?: boolean
}

// we only process zap if only zap amount < 4/10 * total amount
// to reduce the swap fee for the zap
const ZAP_ELIGIBILITY_RATIO_THRESHOLD = new Decimal(0.4)

@Injectable()
export class ZapProtectionService {
    constructor(
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    private isZapEligible(
        { amountOriginal, amountZapped }: IsZapEligibleParams
    ): boolean {
        const threshold = toScaledBN(amountOriginal, ZAP_ELIGIBILITY_RATIO_THRESHOLD)
        return amountZapped.lte(threshold)
    }

    public ensureZapEligible(
        { amountOriginal, amountZapped, liquidityPoolId, userId, requireZapEligible = true }: EnsureZapEligibleParams
    ) {
        if (requireZapEligible && !this.isZapEligible({ amountOriginal, amountZapped })) {
            this.emitZapNotEligible({ amountOriginal, amountZapped, liquidityPoolId, userId })
            throw new Error(WinstonLog.ZapNotEligible)
        }
    }

    private emitZapNotEligible(
        {
            amountOriginal,
            amountZapped,
            liquidityPoolId,
            userId
        }: EmitZapNotEligibleParams
    ) {
        this.logger.warn(WinstonLog.ZapNotEligible, {
            amountOriginal: amountOriginal.toString(),
            amountZapped: amountZapped.toString(),
            liquidityPoolId,
            userId,
        })
    }
}