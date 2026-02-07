import type {
    TokenId 
} from "../enums"

/** Raydium CLMM liquidity pool metadata. */
export interface RaydiumLiquidityPoolMetadata {
    programAddress: string
    tokenVault0: string
    tokenVault1: string
}

/** Raydium reward vault info. */
export interface RaydiumRewardVault {
    tokenId: TokenId
    vaultAddress: string
}

/** Meteora DLMM liquidity pool metadata. */
export interface MeteoraLiquidityPoolMetadata {
    programAddress: string
    reserveXAddress: string
    reserveYAddress: string
}

/** Orca CLMM liquidity pool metadata. */
export interface OrcaLiquidityPoolMetadata {
    programAddress: string
    tokenVault0: string
    tokenVault1: string
}

/** FlowX CLMM liquidity pool metadata. */
export interface FlowXLiquidityPoolMetadata {
    packageId: string
    poolRegistryObject: string
    positionRegistryObject: string
    versionObject: string
    positionType: string
    poolType: string
    i32Type: string
    poolFeeCollectEventType: string
    poolRewardCollectEventType: string
    ticksId: string
}

/** Cetus CLMM liquidity pool metadata. */
export interface CetusLiquidityPoolMetadata {
    intergratePackageId: string
    globalConfigObject: string
    clmmPackageId: string
    rewarderGlobalVaultObject: string
    tickManagerId: string
    positionManagerId: string
}

/** Turbos CLMM liquidity pool metadata. */
export interface TurbosLiquidityPoolMetadata {
    packageId: string
    feeType: string
    positionsObject: string
    versionObject: string
    i32Type: string
}

/** Momentum CLMM liquidity pool metadata. */
export interface MomentumLiquidityPoolMetadata {
    packageId: string
    versionObject: string
    ticksId: string
    i32Type: string
}
