import { 
    BotSchema, 
    MomentumLiquidityPoolMetadata, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Transaction, TransactionResult } from "@mysten/sui/transactions"
import { 
    InvalidPoolTokensException, 
    ActivePositionNotFoundException 
} from "@exceptions"
import { PoolRewardInfo } from "../struct"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { LiquidityPoolState } from "../../../interfaces"

@Injectable()
export class ClosePositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async createClosePositionTxb(
        {
            txb,
            bot,
            state,
        }: CreateClosePositionTxbParams
    ): Promise<CreateClosePositionTxbResponse> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        txb = txb ?? new Transaction()
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const {
            packageId,
            versionObject,
        } = state.static.metadata as MomentumLiquidityPoolMetadata
        const [coinAOut, coinBOut] = txb.moveCall({
            target: `${packageId}::liquidity::remove_liquidity`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress
            ],
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(bot.activePosition.positionId),
                txb.pure.u128(bot.activePosition.liquidity?.toString() || 0),
                txb.pure.u64(0),
                txb.pure.u64(0),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(versionObject),
            ],
        })
        txb.transferObjects([coinAOut, coinBOut], txb.pure.address(bot.accountAddress))

        const rewards = state.dynamic.rewards as Array<PoolRewardInfo>
        const rewardCoins: Array<TransactionResult> = []
        for (const reward of rewards) {
            let rewardCoinType = `0x${reward.rewardCoinType}`
            if (rewardCoinType === "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI") {
                rewardCoinType = "0x2::sui::SUI"
            }
            const rewardCoin = txb.moveCall({
                target: `${packageId}::collect::reward`,
                arguments: [
                    txb.object(state.static.poolAddress),
                    txb.object(bot.activePosition.positionId),
                    txb.object(SUI_CLOCK_OBJECT_ID),
                    txb.object(versionObject),
                ],
                typeArguments: [
                    tokenA.tokenAddress,
                    tokenB.tokenAddress,
                    rewardCoinType,
                ],
            })
            rewardCoins.push(rewardCoin)
        }
        txb.transferObjects(rewardCoins, txb.pure.address(bot.accountAddress))
        return {
            txb,
        }
    }
}

export interface CreateClosePositionTxbParams {
    txb: Transaction
    bot: BotSchema
    state: LiquidityPoolState
}

export interface CreateClosePositionTxbResponse {
    txb: Transaction
}