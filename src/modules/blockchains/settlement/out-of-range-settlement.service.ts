import {
    Injectable,
} from "@nestjs/common"
import {
    ActivePositionNotFoundException,
    PositionClmmStateNotFoundException,
    PositionDlmmStateNotFoundException,
} from "@modules/exceptions"
import {
    LiquidityPoolType,
    PositionSettlementReason,
} from "@modules/databases"
import type {
    ISettlementStrategyService,
    SettleParams,
    SettleStrategyResult,
} from "./types"
import BN from "bn.js"
import type {
    ClmmLiquidityPoolState,
    DlmmLiquidityPoolState,
} from "../types"

/**
 * Settlement strategy service for out-of-range positions (tick/bin outside range).
 *
 * @example
 * const result = await outOfRangeSettlementService.settle({ bot, state, liquidityPool })
 */
@Injectable()
export class OutOfRangeSettlementService implements ISettlementStrategyService {
    /**
     * Checks whether the active position is out of range for the current pool state.
     *
     * @param params - Bot, liquidity pool state, and liquidity pool
     * @returns Settle strategy result with reason and optional tick/bin metadata
     *
     * @example
     * const result = await this.outOfRangeSettlementService.settle({ bot, state, liquidityPool })
     */
    async settle(
        {
            bot,
            state,
            liquidityPool,
        }: SettleParams,
    ): Promise<SettleStrategyResult> {
        // ensure bot has an active position
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id 
            })
        }

        const isClmm = liquidityPool.type === LiquidityPoolType.Clmm
        let settled = false

        if (isClmm) {
            const _state = state as ClmmLiquidityPoolState
            if (!bot.activePosition.associatedPosition.clmmState) {
                throw new PositionClmmStateNotFoundException({
                    positionId: bot.activePosition.associatedPosition.id,
                    botId: bot.id,
                })
            }
            // tick current outside [tickLower, tickUpper] => out of range
            const { tickLower, tickUpper } = bot.activePosition.associatedPosition.clmmState
            if (
                _state.tickCurrent.lt(new BN(tickLower))
                || _state.tickCurrent.gt(new BN(tickUpper))
            ) {
                settled = true
            }
            return {
                settled,
                reason: PositionSettlementReason.OutOfRange,
                metadata: {
                    tickCurrent: _state.tickCurrent.toNumber(),
                    tickLower,
                    tickUpper,
                },
            }
        }

        // DLMM: active bin outside [minBinId, maxBinId] => out of range
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition.associatedPosition.dlmmState) {
            throw new PositionDlmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.id,
                botId: bot.id,
            })
        }
        const { minBinId, maxBinId } = bot.activePosition.associatedPosition.dlmmState
        if (
            new BN(_state.activeId).lt(new BN(minBinId))
            || new BN(_state.activeId).gt(new BN(maxBinId))
        ) {
            settled = true
        }
        return {
            settled,
            reason: PositionSettlementReason.OutOfRange,
            metadata: {
                activeId: _state.activeId,
                minBinId,
                maxBinId,
            },
        }
    }
}