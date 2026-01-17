import { 
    BotSchema, 
    MomentumLiquidityPoolMetadata, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    Transaction, TransactionResult 
} from "@mysten/sui/transactions"
import { 
    InvalidPoolTokensException, 
    ActivePositionNotFoundException 
} from "@exceptions"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    ClmmLiquidityPoolState 
} from "../../../interfaces"

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
    ): Promise<CreateClosePositionTxbResult> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: state.static.displayId,
            })
        }
        const {
            packageId,
            versionObject,
        } = state.static.metadata as MomentumLiquidityPoolMetadata
        const [coinAOut,
            coinBOut] = txb.moveCall({
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
        txb.transferObjects([coinAOut,
            coinBOut],
        txb.pure.address(bot.accountAddress))

        const rewards = state.dynamic.rewards
        const rewardCoins: Array<TransactionResult> = []
        for (const reward of rewards) {
            let rewardCoinType = reward.tokenAddress
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
        txb.transferObjects(rewardCoins,
            txb.pure.address(bot.accountAddress))
        return {
            txb,
        }
    }
}

export interface CreateClosePositionTxbParams {
    txb?: Transaction
    bot: BotSchema
    state: ClmmLiquidityPoolState
}

export interface CreateClosePositionTxbResult {
    txb: Transaction
}