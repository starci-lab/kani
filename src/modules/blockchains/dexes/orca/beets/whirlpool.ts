import { 
    BeetStruct, 
    bignum, 
    fixedSizeUint8Array, 
    i32, 
    u128,
    u16,
    u64,
    uniformFixedSizeArray
} from "@metaplex-foundation/beet"
import { publicKey } from "@metaplex-foundation/beet-solana"
import { PublicKey } from "@solana/web3.js"

// ==================== WhirlpoolRewardInfo ====================
export class WhirlpoolRewardInfo {
    constructor(
        readonly mint: PublicKey,
        readonly vault: PublicKey,
        readonly extension: Uint8Array,
        readonly emissionsPerSecondX64: bignum,
        readonly growthGlobalX64: bignum
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolRewardInfo>(
        [
            ["mint", publicKey],
            ["vault", publicKey],
            ["extension", fixedSizeUint8Array(32)],
            ["emissionsPerSecondX64", u128],
            ["growthGlobalX64", u128],
        ],
        (args) => new WhirlpoolRewardInfo(
            args.mint!,
            args.vault!,
            args.extension!,
            args.emissionsPerSecondX64!,
            args.growthGlobalX64!
        ),
        "WhirlpoolRewardInfo"
    )
}

// ==================== Whirlpool ====================
export class Whirlpool {
    constructor(
        readonly whirlpoolsConfig: PublicKey,
        readonly whirlpoolBump: Uint8Array,
        readonly tickSpacing: number,
        readonly feeTierIndexSeed: Array<number>,
        readonly feeRate: number,
        readonly protocolFeeRate: number,
        readonly liquidity: bignum,
        readonly sqrtPrice: bignum,
        readonly tickCurrentIndex: number,
        readonly protocolFeeOwedA: bignum,
        readonly protocolFeeOwedB: bignum,
        readonly tokenMintA: PublicKey,
        readonly tokenVaultA: PublicKey,
        readonly feeGrowthGlobalA: bignum,
        readonly tokenMintB: PublicKey,
        readonly tokenVaultB: PublicKey,
        readonly feeGrowthGlobalB: bignum,
        readonly rewardLastUpdatedTimestamp: bignum,
        readonly rewardInfos: Array<WhirlpoolRewardInfo>
    ) {}

    static readonly struct = new BeetStruct<Whirlpool>(
        [
            ["whirlpoolsConfig", publicKey],
            ["whirlpoolBump", fixedSizeUint8Array(1)],
            ["tickSpacing", u16],
            ["feeTierIndexSeed", fixedSizeUint8Array(2)],
            ["feeRate", u16],
            ["protocolFeeRate", u16],
            ["liquidity", u128],
            ["sqrtPrice", u128],
            ["tickCurrentIndex", i32],
            ["protocolFeeOwedA", u64],
            ["protocolFeeOwedB", u64],
            ["tokenMintA", publicKey],
            ["tokenVaultA", publicKey],
            ["feeGrowthGlobalA", u128],
            ["tokenMintB", publicKey],
            ["tokenVaultB", publicKey],
            ["feeGrowthGlobalB", u128],
            ["rewardLastUpdatedTimestamp", u64],
            ["rewardInfos", uniformFixedSizeArray(WhirlpoolRewardInfo.struct, 3)],
        ],
        (args) => new Whirlpool(
            args.whirlpoolsConfig!,
            args.whirlpoolBump!,
            args.tickSpacing!,
            args.feeTierIndexSeed!,
            args.feeRate!,
            args.protocolFeeRate!,
            args.liquidity!,
            args.sqrtPrice!,
            args.tickCurrentIndex!,
            args.protocolFeeOwedA!,
            args.protocolFeeOwedB!,
            args.tokenMintA!,
            args.tokenVaultA!,
            args.feeGrowthGlobalA!,
            args.tokenMintB!,
            args.tokenVaultB!,
            args.feeGrowthGlobalB!,
            args.rewardLastUpdatedTimestamp!,
            args.rewardInfos!
        ),
        "Whirlpool"
    )
}

// ==================== WhirlpoolExtensionSegmentPrimary ====================
export class WhirlpoolExtensionSegmentPrimary {
    constructor(
        readonly controlFlags: number,
        readonly reserved: Uint8Array
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolExtensionSegmentPrimary>(
        [
            ["controlFlags", u16],
            ["reserved", fixedSizeUint8Array(30)],
        ],
        (args) => new WhirlpoolExtensionSegmentPrimary(args.controlFlags!, args.reserved!),
        "WhirlpoolExtensionSegmentPrimary"
    )
}

// ==================== WhirlpoolExtensionSegmentSecondary ====================
export class WhirlpoolExtensionSegmentSecondary {
    constructor(
        readonly reserved: Uint8Array
    ) {}

    static readonly struct = new BeetStruct<WhirlpoolExtensionSegmentSecondary>(
        [
            ["reserved", fixedSizeUint8Array(32)],
        ],
        (args) => new WhirlpoolExtensionSegmentSecondary(args.reserved!),
        "WhirlpoolExtensionSegmentSecondary"
    )
}