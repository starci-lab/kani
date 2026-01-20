import {
    Injectable 
} from "@nestjs/common"
import {
    ActivePositionNotFoundException, 
    PositionClmmStateNotFoundException,
    PositionDlmmStateNotFoundException
} from "@modules/exceptions"
import {
    LiquidityPoolType 
} from "@modules/databases"
import {
    ISettlementStrategyService, 
    SettleParams
} from "./strategy.interface"
import {
    DynamicClmmLiquidityPoolInfoCacheResult,
    DynamicDlmmLiquidityPoolInfoCacheResult 
} from "@modules/cache"
import BN from "bn.js"

@Injectable()
export class OutOfRangeSettlementService implements ISettlementStrategyService {
    // Check if the bot will exit the position due to being out of range
    async settle(
        { 
            bot, 
            state 
        }: SettleParams
    ): Promise<boolean> {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const isClmm = state.static.type === LiquidityPoolType.Clmm
        if (isClmm) {
            const _state = state.dynamic as DynamicClmmLiquidityPoolInfoCacheResult
            if (!bot.activePosition.associatedPosition.clmmState) {
                throw new PositionClmmStateNotFoundException({
                    positionId: bot.activePosition.associatedPosition.id,
                    botId: bot.id,
                })
            }
            if (
                _state.tickCurrent.lt(new BN(bot.activePosition.associatedPosition.clmmState.tickLower)) 
                || _state.tickCurrent.gt(new BN(bot.activePosition.associatedPosition.clmmState.tickUpper))
            ) {
                return true
            }
        } else {
            const _state = state.dynamic as DynamicDlmmLiquidityPoolInfoCacheResult
            if (!bot.activePosition.associatedPosition.dlmmState) {
                throw new PositionDlmmStateNotFoundException({
                    positionId: bot.activePosition.associatedPosition.id,
                    botId: bot.id,
                })
            }
            if (
                new BN(_state.activeId).lt(new BN(bot.activePosition.associatedPosition.dlmmState.minBinId)) 
                || new BN(_state.activeId).gt(new BN(bot.activePosition.associatedPosition.dlmmState.maxBinId))
            ) {
                return true
            }
        }
        return false
    }
}