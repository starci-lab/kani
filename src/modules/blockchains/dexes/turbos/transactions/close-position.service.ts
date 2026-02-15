import {
    PrimaryMemoryStorageService, 
    TurbosLiquidityPoolMetadata 
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    Injectable 
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import { 
    ActivePositionNotFoundException,
    InvalidPoolTokensException, 
    PositionClmmStateNotFoundException, 
    TargetOperationalGasAmountNotFoundException 
} from "@modules/exceptions"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    ChainId,
    MAX_UINT_64 
} from "@modules/common"
import {
    deprecatedPoolRewards 
} from "turbos-clmm-sdk"
import {
    CreateClosePositionTxbParams, CreateClosePositionTxbResult 
} from "../types"

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
            liquidityPool,
        }: CreateClosePositionTxbParams
    ): Promise<CreateClosePositionTxbResult> {
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new PositionClmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: liquidityPool.tokenA.toString()
            }
        )
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: liquidityPool.tokenB.toString()
            }
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const targetOperationalAmount = this.primaryMemoryStorageService.
            gasConfig.
            gasAmountRequired[ChainId.Sui]?.
            targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: ChainId.Sui,
                }
            )
        }
        const deadline = this.dayjsService.now().add(100,
            "year").utc().valueOf().toString()
        const {
            packageId,
            feeType,
            positionsObject,
            versionObject 
        } = liquidityPool.metadata as TurbosLiquidityPoolMetadata
        const [coinA,
            coinB] = txb.moveCall({
            target: `${packageId}::position_manager::decrease_liquidity_with_return_`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType,
            ],
            arguments: [
                // pool address
                txb.object(liquidityPool.poolAddress),
                // positions object
                txb.object(positionsObject),
                // position id
                txb.object(bot.activePosition.associatedPosition.positionId),
                // liquidity
                txb.pure.u128(bot.activePosition.associatedPosition.clmmState.liquidity?.toString() || "0"),
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
        txb.moveCall({
            target: `${packageId}::position_manager::collect`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType,
            ],
            arguments: [
                // pool address
                txb.object(liquidityPool.poolAddress),
                // positions object
                txb.object(positionsObject),
                // position id
                txb.object(bot.activePosition.associatedPosition?.positionId ?? ""),
                // amount A max
                txb.pure.u64(MAX_UINT_64.toString()),
                // amount B max
                txb.pure.u64(MAX_UINT_64.toString()),
                // recipient
                txb.pure.address(bot.accountAddress),
                // deadline
                txb.pure.u64(deadline),
                // SUI clock object ID
                txb.object(SUI_CLOCK_OBJECT_ID),
                // version object
                txb.object(versionObject),
            ],
        })
        const rewards = state.rewards
        for (const [index,
            reward] of rewards.entries()) {
            if (
                !deprecatedPoolRewards(liquidityPool.poolAddress,
                    index)
            ) {
                txb.moveCall({
                    target: `${packageId}::position_manager::collect_reward`,
                    typeArguments: [
                        tokenA.tokenAddress, 
                        tokenB.tokenAddress, 
                        feeType,
                        reward.tokenAddress
                    ],
                    arguments: [
                        // pool address
                        txb.object(liquidityPool.poolAddress),
                        // positions object
                        txb.object(positionsObject),
                        // position id
                        txb.object(bot.activePosition.associatedPosition?.positionId ?? ""),
                        // vault
                        txb.object(reward.vaultAddress ?? ""),
                        // index
                        txb.pure.u64(index),
                        // amount max
                        txb.pure.u64(MAX_UINT_64.toString()),
                        // recipient
                        txb.pure.address(bot.accountAddress),
                        // deadline
                        txb.pure.u64(deadline),
                        // SUI clock object ID
                        txb.object(SUI_CLOCK_OBJECT_ID),
                        // version object
                        txb.object(versionObject),
                    ],
                })
            }
        }
        txb.moveCall({
            target: `${packageId}::position_manager::burn`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType,
            ],
            arguments: [
                txb.object(positionsObject),
                txb.object(bot.activePosition.associatedPosition?.positionId ?? ""),
                txb.object(versionObject),
            ],
        })
        txb.transferObjects(
            [
                coinA, 
                coinB
            ], 
            txb.pure.address(bot.accountAddress)
        )
        return {
            txb,
        }
    }
}
