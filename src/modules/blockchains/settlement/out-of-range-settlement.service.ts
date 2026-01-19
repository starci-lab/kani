import {
    Injectable 
} from "@nestjs/common"
import {
    ActivePositionNotFoundException 
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
            if (
                _state.tickCurrent.lt(new BN(bot.activePosition.associatedPosition.tickLower ?? 0)) 
                || _state.tickCurrent.gt(new BN(bot.activePosition.associatedPosition.tickUpper ?? 0))
            ) {
                return true
            }
        } else {
            const _state = state.dynamic as DynamicDlmmLiquidityPoolInfoCacheResult
            if (
                new BN(_state.activeId).lt(new BN(bot.activePosition.associatedPosition.minBinId ?? 0)) 
                || new BN(_state.activeId).gt(new BN(bot.activePosition.associatedPosition.maxBinId ?? 0))
            ) {
                return true
            }
        }
        return false
    }
}