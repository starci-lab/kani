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
import {
    AsyncService 
} from "@modules/mixin"

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
        private readonly asyncService: AsyncService,
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
        await this.asyncService.allIgnoreError(
            [
                (async () => {
                    const result = await this.outOfRangeSettlementService.settle({
                        bot,
                        state,
                        liquidityPool,
                    })
                    strategyResults.push(result)
                })(),
                (async () => {
                    const result = await this.violateIndicatorsTriggeredSettlementService.settle({
                        bot,
                        state,
                        liquidityPool,
                    })
                    strategyResults.push(result)
                })(),
            ]
        )
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