import { Injectable } from "@nestjs/common"
import { OutOfRangeExitCheckParams } from "./types"
import { ActivePositionNotFoundException } from "@exceptions"
import { Decimal } from "decimal.js"
import { DynamicDlmmLiquidityPoolInfo, DynamicLiquidityPoolInfo } from "../types"
import { LiquidityPoolType } from "@modules/databases"

@Injectable()
export class OutOfRangeStrategyEngineService {
    async willExit(
        { 
            bot, 
            state 
        }: OutOfRangeExitCheckParams
    ): Promise<boolean> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                bot.id, 
                "Active position not found"
            )
        }
        const isClmm = state.static.type === LiquidityPoolType.Clmm
        if (isClmm) {
            const _state = state.dynamic as DynamicLiquidityPoolInfo
            if (
                new Decimal(_state.tickCurrent).lt(bot.activePosition.tickLower || 0) 
                || new Decimal(_state.tickCurrent).gt(bot.activePosition.tickUpper || 0)
            ) {
                return true
            }
        } else {
            const _state = state.dynamic as DynamicDlmmLiquidityPoolInfo
            if (
                new Decimal(_state.activeId).lt(bot.activePosition.minBinId || 0) 
                || new Decimal(_state.activeId).gt(bot.activePosition.maxBinId || 0)
            ) {
                return true
            }
        }
        return false
    }
}