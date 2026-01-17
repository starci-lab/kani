import { 
    BotSchema, 
    CetusLiquidityPoolMetadata, 
    PrimaryMemoryStorageService 
} from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Transaction } from "@mysten/sui/transactions"
import { 
    InvalidPoolTokensException, 
    ActivePositionNotFoundException,
} from "@exceptions"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { ClmmLiquidityPoolState } from "../../../interfaces"

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
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        if (
            !bot.activePosition ||
            !bot.activePositionLiquidityPool ||
            !bot.activePositionLiquidityPoolType
        ) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString()
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString()
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: state.static.displayId,
            })
        }
        const {
            intergratePackageId,
            globalConfigObject,
            rewarderGlobalVaultObject
        } = state.static.metadata as CetusLiquidityPoolMetadata
        const rewarders = state.dynamic.rewards
        for (const rewarder of rewarders) {
            const zeroCoinTxResult = txb.moveCall({
                target: "0x2::coin::zero",
                typeArguments: [
                    rewarder.tokenAddress
                ],
            })
            txb.moveCall({
                target: `${intergratePackageId}::pool_script_v2::collect_reward`,
                typeArguments: [
                    tokenA.tokenAddress,
                    tokenB.tokenAddress,
                    rewarder.tokenAddress
                ],
                arguments: [
                    txb.object(globalConfigObject),
                    txb.object(state.static.poolAddress),
                    txb.object(bot.activePosition.positionId),
                    txb.object(rewarderGlobalVaultObject),
                    txb.object(zeroCoinTxResult),
                    txb.object(SUI_CLOCK_OBJECT_ID),
                ],
            })
        }
        txb.moveCall({
            target: `${intergratePackageId}::pool_script::close_position`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress
            ],
            arguments: [
                txb.object(globalConfigObject),
                txb.object(state.static.poolAddress),
                txb.object(bot.activePosition.positionId),
                txb.pure.u64(0),
                txb.pure.u64(0),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
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