import { PublicKey } from "@solana/web3.js"
import { BeetStruct, bignum, u8, u64, u128, u16, i32, uniformFixedSizeArray } from "@metaplex-foundation/beet"
import { publicKey } from "@metaplex-foundation/beet-solana"
import { RewardInfo } from "./reward-info"

export class PoolState {
    constructor(
      readonly bump: number,
      readonly ammConfig: PublicKey,
      readonly owner: PublicKey,
      readonly mintA: PublicKey,
      readonly mintB: PublicKey,
      readonly vaultA: PublicKey,
      readonly vaultB: PublicKey,
      readonly observationId: PublicKey,
      readonly mintDecimalsA: number,
      readonly mintDecimalsB: number,
      readonly tickSpacing: number,
      readonly liquidity: bignum,
      readonly sqrtPriceX64: bignum,
      readonly tickCurrent: number,
      readonly feeGrowthGlobal0X64: bignum,
      readonly feeGrowthGlobal1X64: bignum,
      readonly protocolFeesToken0: bignum,
      readonly protocolFeesToken1: bignum,
      readonly swapInAmountToken0: bignum,
      readonly swapOutAmountToken1: bignum,
      readonly swapInAmountToken1: bignum,
      readonly swapOutAmountToken0: bignum,
      readonly tickArrayBitmap: Array<bignum>,
      readonly totalFeesToken0: bignum,
      readonly totalFeesClaimedToken0: bignum,
      readonly totalFeesToken1: bignum,
      readonly totalFeesClaimedToken1: bignum,
      readonly fundFeesToken0: bignum,
      readonly fundFeesToken1: bignum,
      readonly startTime: bignum,
      readonly recentEpoch: bignum,
      readonly rewardInfos: Array<RewardInfo>,
      readonly status: number,
      readonly padding: Array<bignum>,
      readonly padding1: Array<bignum>,
      readonly padding2: Array<bignum>,
      readonly padding3: Array<bignum>,
      readonly padding4: Array<bignum>,
    ) {}
  
    static readonly struct = new BeetStruct<PoolState>(
        [
            ["bump", u8],
            ["ammConfig", publicKey],
            // owner is the creator of the pool
            ["owner", publicKey],
            // mintA and mintB are the tokens of the pool   
            ["mintA", publicKey],
            ["mintB", publicKey],
            // vaultA and vaultB are the vaults of the pool
            ["vaultA", publicKey],
            ["vaultB", publicKey],
            // observationId is the observation id of the pool
            ["observationId", publicKey],
            // mintDecimalsA and mintDecimalsB are the decimals of the tokens
            ["mintDecimalsA", u8],
            ["mintDecimalsB", u8],
            // tickSpacing is the tick spacing of the pool
            ["tickSpacing", u16],
            //liquidity is the liquidity of the pool
            ["liquidity", u128],
            // sqrtPriceX64 is the sqrt price of the pool
            ["sqrtPriceX64", u128],
            // tickCurrent is the current tick of the pool
            ["tickCurrent", i32],

            ["padding3", u16],
            ["padding4", u16],

            // feeGrowthGlobalX64A and feeGrowthGlobalX64B are the fee growth global of the pool
            ["feeGrowthGlobal0X64", u128],
            ["feeGrowthGlobal1X64", u128],
  
            ["protocolFeesToken0", u64],
            ["protocolFeesToken1", u64],
  
            ["swapInAmountToken0", u128],
            ["swapOutAmountToken1", u128],
            ["swapInAmountToken1", u128],
            ["swapOutAmountToken0", u128],

            // status is the status of the pool
            ["status", u8],
  
            // padding cho future upgrade
            ["padding", uniformFixedSizeArray(u8, 7)], // 7 bytes
            // fixed 3 rewards
            ["rewardInfos", uniformFixedSizeArray(RewardInfo.struct, 3)], // 3 * 20 bytes = 60 bytes
  
            // tick_array_bitmap is the bitmap of the tick array
            ["tickArrayBitmap", uniformFixedSizeArray(u64, 16)], // 16 * 8 bytes = 128 bytes

            // totalFeesToken0 and totalFeesClaimedToken0 are the total fees of the pool
            ["totalFeesToken0", u64],
            ["totalFeesClaimedToken0", u64],
            // totalFeesToken1 and totalFeesClaimedToken1 are the total fees of the pool
            ["totalFeesToken1", u64],
            ["totalFeesClaimedToken1", u64],
            // fundFeesToken0 and fundFeesToken1 are the fund fees of the pool
            ["fundFeesToken0", u64],
            ["fundFeesToken1", u64],
            // start time is the start time of the pool
            ["startTime", u64],
            // padding cho future upgrade
            ["recentEpoch", u64],
            // padding cho future upgrade
            ["padding1", uniformFixedSizeArray(u64, 24)], // 24 bytes
            ["padding2", uniformFixedSizeArray(u64, 32)], // 32 bytes
        ],
        (args) =>
            new PoolState(
          args.bump!,
          args.ammConfig!,
          args.owner!,
          args.mintA!,
          args.mintB!,
          args.vaultA!,
          args.vaultB!,
          args.observationId!,
          args.mintDecimalsA!,
          args.mintDecimalsB!,
          args.tickSpacing!,
          args.liquidity!,
          args.sqrtPriceX64!,
          args.tickCurrent!,
          args.feeGrowthGlobal0X64!,
          args.feeGrowthGlobal1X64!,
          args.protocolFeesToken0!,
          args.protocolFeesToken1!,
          args.swapInAmountToken0!,
          args.swapOutAmountToken1!,
          args.swapInAmountToken1!,
          args.swapOutAmountToken0!,
          args.tickArrayBitmap!,
          args.totalFeesToken0!,
          args.totalFeesClaimedToken0!,
          args.totalFeesToken1!,
          args.totalFeesClaimedToken1!,
          args.fundFeesToken0!,
          args.fundFeesToken1!,
          args.startTime!,
          args.recentEpoch!,
          args.rewardInfos!,
          args.status!,
          args.padding!,
          args.padding1!,
          args.padding2!,
          args.padding3!,
          args.padding4!,
            ),
        "PoolState",
    )
}

