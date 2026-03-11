import {
    Injectable,
} from "@nestjs/common"
import {
    PositionSettlementReason,
} from "@modules/databases"
import {
    CacheKey,
    CacheService,
    IndicatorStatus,
} from "@modules/cache"
import type {
    ISettlementStrategyService,
    SettleParams,
    SettleStrategyResult,
} from "./types"

/**
 * Settlement strategy service for violate-indicators-triggered (reads from cache).
 *
 * @example
 * const result = await violateIndicatorsTriggeredSettlementService.settle({ bot, state, liquidityPool })
 */
@Injectable()
export class ViolateIndicatorsTriggeredSettlementService implements ISettlementStrategyService {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    /**
     * Checks whether any violate indicator has triggered for the bot (from cache).
     *
     * @param params - Bot, liquidity pool state, and liquidity pool (only bot used for cache key)
     * @returns Settle strategy result with reason and optional indicator results metadata
     *
     * @example
     * const result = await this.violateIndicatorsTriggeredSettlementService.settle({ bot, state, liquidityPool })
     */
    async settle(
        { bot }: SettleParams,
    ): Promise<SettleStrategyResult> {
        // load violate indicator results from cache
        const cached = await this.cacheService.get({
            key: CacheKey.ViolateIndicatorResults,
            args: [bot.id],
        })
        // consider settled if any result has status Trigger
        const indicatorsTriggered = cached?.results?.filter(
            (r) => r.status === IndicatorStatus.Trigger,
        )
        return {
            settled: !!(indicatorsTriggered?.length),
            reason: PositionSettlementReason.ViolateIndicatorsTriggered,
            metadata: {
                indicators: indicatorsTriggered,
            },
        }
    }
}
