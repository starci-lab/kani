import {
    Injectable,
} from "@nestjs/common"
import {
    OutOfRangeSettlementService,
} from "./out-of-range-settlement.service"
import {
    ViolateIndicatorsTriggeredSettlementService,
} from "./violate-indicators-triggered-settlement.service"
import type {
    SettleParams,
    SettleResult,
    SettleStrategyResult,
} from "./types"

/**
 * Service responsible for running all settlement strategies and aggregating results.
 *
 * @example
 * const result = await settlementService.settle({ bot, state, liquidityPool })
 * if (result.settled) { ... }
 */
@Injectable()
export class SettlementService {
    constructor(
        private readonly outOfRangeSettlementService: OutOfRangeSettlementService,
        private readonly violateIndicatorsTriggeredSettlementService: ViolateIndicatorsTriggeredSettlementService,
    ) { }

    /**
     * Runs all settlement strategies and returns whether any condition triggered.
     *
     * @param params - Bot, liquidity pool state, and liquidity pool
     * @returns Aggregated settled flag and list of reasons from each strategy
     *
     * @example
     * const { settled, reasons } = await this.settlementService.settle({ bot, state, liquidityPool })
     */
    async settle(
        {
            bot,
            state,
            liquidityPool,
        }: SettleParams,
    ): Promise<SettleResult> {
        const strategyResults: Array<SettleStrategyResult> = []

        // run out-of-range strategy
        const outOfRangeResult = await this.outOfRangeSettlementService.settle({
            bot,
            state,
            liquidityPool,
        })
        strategyResults.push(outOfRangeResult)

        // run violate-indicators-triggered strategy
        const violateIndicatorsResult = await this.violateIndicatorsTriggeredSettlementService.settle({
            bot,
            state,
            liquidityPool,
        })
        strategyResults.push(violateIndicatorsResult)

        // aggregate: settled if any strategy settled
        const settled = strategyResults.some((result) => result.settled)
        return {
            settled,
            positionSettlements: strategyResults.map((result) => (
                {
                    reason: result.reason,
                    metadata: result.metadata,
                }
            )
            ),
        }
    }
}