import { LiquidityPoolState } from "../../../interfaces"
import { 
    BotSchema, 
    PrimaryMemoryStorageService, 
    TurbosLiquidityPoolMetadata 
} from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import { DayjsService } from "@modules/mixin"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    TargetOperationalGasAmountNotFoundException 
} from "@exceptions"
import { ChainId } from "@typedefs"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { MAX_UINT_64 } from "@utils"
import { RewardInfo } from "../struct"
import { deprecatedPoolRewards } from "turbos-clmm-sdk"

@Injectable()
export class ClosePositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    async createClosePositionTxb(
        {
            txb,
            state,
            bot,     
        }: CreateClosePositionTxbParams
    ): Promise<CreateClosePositionTxbResponse> {
        txb = txb ?? new Transaction()
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const targetOperationalAmount = this.primaryMemoryStorageService.
            gasConfig.
            gasAmountRequired[ChainId.Sui]?.
            targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                ChainId.Sui,
                "Target operational gas amount not found"
            )
        }
        const {
            packageId,
            feeType,
            positionsObject,
            versionObject 
        } = state.static.metadata as TurbosLiquidityPoolMetadata
        const deadline = this.dayjsService.now().add(5, "minute").utc().valueOf().toString()
        const [coinA, coinB] = txb.moveCall({
            target: `${packageId}::position_manager::mint`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType
            ],
            arguments: [
                // pool address
                txb.object(state.static.poolAddress),
                // positions object
                txb.object(positionsObject),
                // position id
                txb.object(bot.activePosition.positionId),
                // liquidity
                txb.pure.u128(bot.activePosition.liquidity?.toString() || "0"),
                // minimum amount A
                txb.pure.u64(0),
                // minimum amount B
                txb.pure.u64(0),
                // deadline
                txb.pure.u64(deadline),
                // SUI clock object ID
                txb.object(SUI_CLOCK_OBJECT_ID),
                // version object
                txb.object(versionObject),
            ],
        })
        txb.transferObjects([coinA, coinB], bot.accountAddress)
        txb.moveCall({
            target: `${packageId}::position_manager::collect`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType
            ],
            arguments: [
                // pool address
                txb.object(state.static.poolAddress),
                // positions object
                txb.object(positionsObject),
                // position id
                txb.object(bot.activePosition.positionId),
                // max amount A
                txb.pure.u64(MAX_UINT_64.toString()),
                // max amount B
                txb.pure.u64(MAX_UINT_64.toString()),
                // bot account address
                txb.pure.address(bot.accountAddress),
                // deadline
                txb.pure.u64(deadline),
                // SUI clock object ID
                txb.object(SUI_CLOCK_OBJECT_ID),
                // version object
            ],
        })
        const rewardInfos = state.dynamic.rewards as Array<RewardInfo>
        for (const [index, rewardInfo] of rewardInfos.entries()) {
            if (deprecatedPoolRewards(state.static.poolAddress, index)) {
                continue
            }
            txb.moveCall({
                target: `${packageId}::position_manager::collect_reward`,
                typeArguments: [
                    tokenA.tokenAddress,
                    tokenB.tokenAddress,
                    feeType,
                    rewardInfo.vaultCoinType,
                ],
                arguments: [
                    txb.object(state.static.poolAddress),
                    txb.object(positionsObject),
                    txb.object(bot.activePosition.positionId),
                    txb.pure.address(rewardInfo.vault),
                    txb.pure.u64(index),
                    txb.pure.u64(MAX_UINT_64.toString()),
                    txb.pure.u64(bot.accountAddress),
                    txb.pure.u64(deadline),
                    txb.object(SUI_CLOCK_OBJECT_ID),
                    txb.object(versionObject),
                ]
            })
        }
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