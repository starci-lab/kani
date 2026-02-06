import {
    BeetStruct, i32, u8, uniformFixedSizeArray, bignum, u128, u64 
} from "@metaplex-foundation/beet"
import {
    PublicKey 
} from "@solana/web3.js"
import {
    PositionRewardInfo 
} from "./position-reward-info"
import {
    publicKey 
} from "@metaplex-foundation/beet-solana"

/**
 * Raydium personal position state structure.
 * Represents a liquidity position in a Raydium CLMM pool.
 */
export class PersonalPositionState {
    constructor(
      /** Bump seed for PDA derivation (u8). */
      readonly bump: number,
      /** Public key of the position NFT mint. */
      readonly nftMint: PublicKey,
      /** Public key of the pool this position belongs to. */
      readonly poolId: PublicKey,
      /** Lower tick index (i32). */
      readonly tickLowerIndex: number,
      /** Upper tick index (i32). */
      readonly tickUpperIndex: number,
      /** Liquidity amount (u128). */
      readonly liquidity: bignum,
      /** Fee growth inside 0 last in Q64.64 format (u128). */
      readonly feeGrowthInside0LastX64: bignum,
      /** Fee growth inside 1 last in Q64.64 format (u128). */
      readonly feeGrowthInside1LastX64: bignum,
      /** Token fees owed 0 (u64). */
      readonly tokenFeesOwed0: bignum,
      /** Token fees owed 1 (u64). */
      readonly tokenFeesOwed1: bignum,
      /** Public key of the position owner. */
      readonly owner: PublicKey,
      /** Array of reward information (max 3 rewards). */
      readonly rewardInfos: Array<PositionRewardInfo>,
      /** Position status (u8). */
      readonly status: number,
    ) {}
  
    static readonly struct = new BeetStruct<PersonalPositionState>(
        [   
            // bump is the bump of the personal position state
            ["bump",
                u8],
            // nftMint is the mint of the NFT
            ["nftMint",
                publicKey],
            // poolId is the id of the pool
            ["poolId",
                publicKey],
            // tickLowerIndex is the lower tick index
            ["tickLowerIndex",
                i32],
            // tickUpperIndex is the upper tick index
            ["tickUpperIndex",
                i32],
            // liquidity is the liquidity of the personal position
            ["liquidity",
                u128],
            // feeGrowthInside0LastX64 is the fee growth inside 0 last
            ["feeGrowthInside0LastX64",
                u128],
            // feeGrowthInside1LastX64 is the fee growth inside 1 last
            ["feeGrowthInside1LastX64",
                u128],
            // tokensOwed0 is the tokens owed 0
            ["tokenFeesOwed0",
                u64],
            // tokenFeesOwed1 is the token fees owed 1
            ["tokenFeesOwed1",
                u64],
            // rewardInfos is the reward infos
            ["rewardInfos",
                uniformFixedSizeArray(PositionRewardInfo.struct,
                    3)],
        ],
        (args) =>
            new PersonalPositionState(
          args.bump!,
          args.nftMint!,
          args.poolId!,
          args.tickLowerIndex!,
          args.tickUpperIndex!,
          args.liquidity!,
          args.feeGrowthInside0LastX64!,
          args.feeGrowthInside1LastX64!,
          args.tokenFeesOwed0!,
          args.tokenFeesOwed1!,
          args.owner!,
          args.rewardInfos!,
          args.status!,
            ),
        "PersonalPositionState",
    )
}