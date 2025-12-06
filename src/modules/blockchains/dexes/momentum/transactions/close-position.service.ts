import { 
    BotSchema, 
    MomentumLiquidityPoolMetadata, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
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
        txb.transferObjects([coinAOut, coinBOut], bot.accountAddress)
        const rewards = state.dynamic.rewards as Array<PoolRewardInfo>
        const rewardCoins: Array<string> = []
        for (const reward of rewards) {
            const [rewardCoin] = txb.moveCall({
                target: `${packageId}::collect::reward`,
                typeArguments: [
                    tokenA.tokenAddress,
                    tokenB.tokenAddress,
                    reward.rewardCoinType,
                ],
                arguments: [
                    txb.object(state.static.poolAddress),
                    txb.object(bot.activePosition.positionId),
                    txb.object(SUI_CLOCK_OBJECT_ID),
                    txb.object(versionObject),
                ],
            })
            rewardCoins.push(rewardCoin.toString())
        }
        txb.transferObjects(rewardCoins, bot.accountAddress)
        const [feeCoinA, feeCoinB] = txb.moveCall({
            target: `${packageId}::collect::fee`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(state.static.poolAddress),
                txb.object(bot.activePosition.positionId),
                txb.object(SUI_CLOCK_OBJECT_ID),
                txb.object(versionObject),
            ],
        })
        txb.transferObjects([feeCoinA, feeCoinB], bot.accountAddress)
        txb.moveCall({
            target: `${packageId}::liquidity::close_position`,
            arguments: [
                txb.object(bot.activePosition.positionId),
                txb.object(versionObject),
            ],
        })
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