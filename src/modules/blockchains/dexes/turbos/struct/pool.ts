import BN from "bn.js"
import {
    SuiObject,
    SuiObjectID,
    SuiObjectI32,
} from "../../../structs"
import { parseSuiI32 } from "../../../structs/sui/parsers/int"

// ========== Reward Info Types ==========
export interface TurbosSuiObjectPoolRewardInfo {
    type: string
    fields: {
        emissions_per_second: string
        growth_global: string
        id: SuiObjectID
        manager: string
        vault: string
        vault_coin_type: string
    }
}

// ========== RAW POOL STRUCT ==========
export interface TurbosSuiObjectPoolFields {
    coin_a: string
    coin_b: string
    deploy_time_ms: string
    fee: number
    fee_growth_global_a: string
    fee_growth_global_b: string
    fee_protocol: number
    id: SuiObjectID
    liquidity: string
    max_liquidity_per_tick: string
    protocol_fees_a: string
    protocol_fees_b: string
    reward_infos: Array<TurbosSuiObjectPoolRewardInfo>
    reward_last_updated_time_ms: string
    sqrt_price: string
    tick_current_index: SuiObjectI32
    tick_spacing: number
    unlocked: boolean
}

export type TurbosSuiObjectPool = SuiObject<
    TurbosSuiObjectPoolFields,
    `${string}::pool::Pool`
>

// ========== PARSED POOL INTERFACE ==========
export interface TurbosPool {
    coinA: string
    coinB: string
    deployTimeMs: BN
    fee: number
    feeGrowthGlobalA: BN
    feeGrowthGlobalB: BN
    feeProtocol: number
    id: string
    liquidity: BN
    maxLiquidityPerTick: BN
    protocolFeesA: BN
    protocolFeesB: BN
    rewardInfos: Array<{
        emissionsPerSecond: BN
        growthGlobal: BN
        rewardId: string
        manager: string
        vault: string
        vaultCoinType: string
    }>
    rewardLastUpdatedTimeMs: BN
    sqrtPrice: BN
    tickCurrentIndex: BN
    tickSpacing: number
    unlocked: boolean
}

// ========== PARSER FUNCTION ==========
/**
 * Parses a Turbos Pool Sui object into a TurbosPool interface
 */
export const parseTurbosPool = (target: TurbosSuiObjectPoolFields): TurbosPool => {
    return {
        coinA: target.coin_a,
        coinB: target.coin_b,
        deployTimeMs: new BN(target.deploy_time_ms),
        fee: target.fee,
        feeGrowthGlobalA: new BN(target.fee_growth_global_a),
        feeGrowthGlobalB: new BN(target.fee_growth_global_b),
        feeProtocol: target.fee_protocol,
        id: target.id.id,
        liquidity: new BN(target.liquidity),
        maxLiquidityPerTick: new BN(target.max_liquidity_per_tick),
        protocolFeesA: new BN(target.protocol_fees_a),
        protocolFeesB: new BN(target.protocol_fees_b),
        rewardInfos: target.reward_infos.map((r) => ({
            emissionsPerSecond: new BN(r.fields.emissions_per_second),
            growthGlobal: new BN(r.fields.growth_global),
            rewardId: r.fields.id.id,
            manager: r.fields.manager,
            vault: r.fields.vault,
            vaultCoinType: r.fields.vault_coin_type,
        })),
        rewardLastUpdatedTimeMs: new BN(target.reward_last_updated_time_ms),
        sqrtPrice: new BN(target.sqrt_price),
        tickCurrentIndex: parseSuiI32(target.tick_current_index),
        tickSpacing: target.tick_spacing,
        unlocked: target.unlocked,
    }
}
