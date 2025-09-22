import { Injectable, OnModuleInit } from "@nestjs/common"
import {
    DexId,
    LiquidityPoolId,
    PositionEntity,
    UserLike,
} from "@modules/databases"
import { ChainId, Network, PlatformId } from "@modules/common"
import BN from "bn.js"
import {
    FetchedPool,
    LiquidityPoolService,
    SuiFlexibleSwapService,
} from "@modules/blockchains"
import { Cache } from "cache-manager"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { ModuleRef } from "@nestjs/core"
import { DataSource } from "typeorm"
import { Connection } from "mongoose"
import { envConfig, LpBotType } from "@modules/env"
import { getDataSourceToken } from "@nestjs/typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger } from "winston"
import { DataLikeService } from "./data-like.service"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DataLikePositionService } from "./data-like-position.service"
import { RetryService } from "@modules/mixin"
import { DataLikeQueryService } from "./data-like-query.service"

export interface OpenPositionInternalParams {
    dexId: DexId;
    poolId: LiquidityPoolId;
    chainId: ChainId;
    amount: BN;
    network?: Network;
    user: UserLike;
    requireZapEligible?: boolean;
    stimulateOnly?: boolean;
}

export interface OpenPositionInternalResponse {
    txHash: string;
    liquidity: BN;
    depositAmount: BN;
    tickLower: number;
    tickUpper: number;
    positionId: string;
}

export type OpenPositionParams = OpenPositionInternalParams

export interface ClosePositionInternalParams {
    dexId: DexId;
    poolId: LiquidityPoolId;
    chainId: ChainId;
    network?: Network;
    user: UserLike;
    stimulateOnly?: boolean;
}

export interface ClosePositionInternalResponse {
    receivedAmountOut: BN;
    roiAmount: BN;
    closePositionTxHash: string;
    flexibleSwapTxHash: string;
}

export type ClosePositionParams = ClosePositionInternalParams

@Injectable()
export class PositionRecordManagerService implements OnModuleInit {
    private cacheManager: Cache
    private sqliteDataSource: DataSource
    private mongoDbConnection: Connection
    constructor(
        private readonly liquidityPoolService: LiquidityPoolService,
        private readonly dataLikeService: DataLikeService,
        private readonly cacheHelpersService: CacheHelpersService,
        private readonly moduleRef: ModuleRef,
        private readonly suiFlexibleSwapService: SuiFlexibleSwapService,
        private readonly dataLikePositionService: DataLikePositionService,
        private readonly retryService: RetryService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly logger: Logger,
    ) { }

    onModuleInit() {
        // get the proper cache manager
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
        // get the proper data source
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            this.mongoDbConnection = this.moduleRef.get(getConnectionToken(), {
                strict: false,
            })
            break
        }
        case LpBotType.System: {
            this.sqliteDataSource = this.moduleRef.get(getDataSourceToken(), {
                strict: false,
            })
            break
        }
        }
    }

    /**
   * Open a new LP position on any supported DEX
   */
    private async openPositionInternal({
        dexId,
        poolId,
        chainId,
        amount,
        network = Network.Mainnet,
        user,
        requireZapEligible = true,
        stimulateOnly = false,
    }: OpenPositionInternalParams): Promise<OpenPositionInternalResponse> {
        //find liquidity pools
        const liquidityPools = this.dataLikeService.liquidityPools
        const pool = liquidityPools.find(
            (liquidityPool) => liquidityPool.displayId === poolId,
        )
        if (!pool) throw new Error(`LiquidityPool ${poolId} not found`)
        // fetch live pool state
        const sertializedFetchedPools = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.LiquidityPools, {
                chainId,
                network,
            }),
        )
        if (!sertializedFetchedPools) throw new Error("FetchedPools not found")
        const fetchedPools = this.superjson.parse<Array<FetchedPool>>(
            sertializedFetchedPools,
        )
        const fetchedPool = fetchedPools.find(
            (fetchedPool) => fetchedPool.displayId === pool.displayId,
        )
        if (!fetchedPool)
            throw new Error(`FetchedPool ${pool.displayId} not found`)
        const [{ action }] = await this.liquidityPoolService.getDexs({
            dexIds: [dexId],
            chainId,
        })
        const tokenAId = pool.tokenAId
        const tokenBId = pool.tokenBId
        const suiWallet = user.wallets.find((wallet) => wallet.platformId === PlatformId.Sui)
        if (!suiWallet) throw new Error("Sui wallet not found")
        const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
            liquidityPool: pool,
            user,
            chainId,
            network,
        })
        const {
            depositAmount,
            liquidity,
            positionId,
            tickLower,
            tickUpper,
            txHash,
        } = await action.openPosition({
            accountAddress: suiWallet.accountAddress,
            priorityAOverB,
            pool: fetchedPool,
            amount,
            tokenAId,
            tokenBId,
            tokens: this.dataLikeService.tokens,
            user,
            requireZapEligible,
            chainId,
            network,
            stimulateOnly,
        })
        return {
            txHash: txHash || "",
            liquidity,
            depositAmount,
            tickLower,
            tickUpper,
            positionId,
        }
    }

    private async closePositionInternal({
        dexId,
        poolId,
        chainId,
        network = Network.Mainnet,
        user,
        stimulateOnly = false,
    }: ClosePositionInternalParams
    ): Promise<ClosePositionInternalResponse> {
        //find liquidity pools
        const liquidityPools = this.dataLikeService.liquidityPools
        const liquidityPool = liquidityPools.find(
            (liquidityPool) => liquidityPool.displayId === poolId,
        )
        if (!liquidityPool) throw new Error(`LiquidityPool ${poolId} not found`)
        // fetch live pool state
        const sertializedFetchedPools = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.LiquidityPools, {
                chainId,
                network,
            }),
        )
        if (!sertializedFetchedPools) throw new Error("FetchedPools not found")
        const fetchedPools = this.superjson.parse<Array<FetchedPool>>(
            sertializedFetchedPools,
        )
        const fetchedPool = fetchedPools.find(
            (fetchedPool) => fetchedPool.displayId === liquidityPool.displayId,
        )
        if (!fetchedPool)
            throw new Error(`FetchedPool ${liquidityPool.displayId} not found`)
        const [{ action }] = await this.liquidityPoolService.getDexs({
            dexIds: [dexId],
            chainId,
        })
        const tokenAId = liquidityPool.tokenAId
        const tokenBId = liquidityPool.tokenBId
        const suiWallet = user.wallets.find((wallet) => wallet.platformId === PlatformId.Sui)
        if (!suiWallet) throw new Error("Sui wallet not found")
        if (!user.id) throw new Error("User ID is required")
        const position = await this.dataLikePositionService.loadPosition({
            liquidityPoolId: poolId,
            userId: user.id,
        })
        const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
            liquidityPool,
            user,
            chainId,
            network,
        })
        const tokenOut = priorityAOverB ? tokenAId : tokenBId
        const { suiTokenOuts, txHash: closePositionTxHash } =
            await action.closePosition({
                accountAddress: suiWallet.accountAddress,
                pool: fetchedPool,
                tokenAId,
                tokenBId,
                tokens: this.dataLikeService.tokens,
                user,
                chainId,
                network,
                position,
                priorityAOverB,
                stimulateOnly,
            })
        const {
            receivedAmountOut,
            roiAmount,
            txHash: flexibleSwapTxHash,
        } = await this.suiFlexibleSwapService.suiFlexibleSwap({
            suiTokenIns: suiTokenOuts || {},
            accountAddress: suiWallet.accountAddress,
            depositAmount: new BN(position.depositAmount),
            tokenOut,
            tokens: this.dataLikeService.tokens,
            network,
            user,
        })
        return {
            receivedAmountOut,
            roiAmount,
            closePositionTxHash: closePositionTxHash || "",
            flexibleSwapTxHash: flexibleSwapTxHash || "",
        }
    }

    private async sqliteOpenPosition(params: OpenPositionParams) {
        const { user } = params
        if (!user.id) throw new Error("User ID is required")
        await this.sqliteDataSource.transaction(async (manager) => {
            // we try open position first
            const {
                txHash,
                liquidity,
                depositAmount,
                tickLower,
                tickUpper,
                positionId,
            } = await this.openPositionInternal(params)
            try {
                if (!user.id) throw new Error("User ID is required")
                const assignedLiquidityPool = user.assignedLiquidityPools.find((pool) => pool.poolId === params.poolId)
                if (!assignedLiquidityPool) throw new Error(`Assigned liquidity pool not found for pool ${params.poolId} and user ${user.id}`)
                await manager.insert(
                    PositionEntity, [
                        {
                            userId: user.id,
                            openTxHash: txHash,
                            depositAmount: depositAmount.toString(),
                            tickLower,
                            tickUpper,
                            liquidity: liquidity.toString(),
                            positionId,
                            assignedLiquidityPoolId: assignedLiquidityPool.id,
                        },
                    ])
                this.logger.info(WinstonLog.OpenPositionSuccess, {
                    positionId,
                    txHash,
                    depositAmount: depositAmount.toString(),
                })
            } catch (error) {
                this.logger.error(
                    WinstonLog.OpenPositionFailed, {
                        error: error.message,
                        stack: error.stack,
                    })
                throw error
            }
        })

    }

    private async sqliteClosePosition(params: ClosePositionParams) {
        await this.sqliteDataSource.transaction(async (manager) => {
            const {
                receivedAmountOut,
                roiAmount,
                closePositionTxHash,
                flexibleSwapTxHash,
            } = await this.closePositionInternal(params)
            if (!params.user.id) throw new Error("User ID is required")
            const position = await this.dataLikePositionService.loadPosition({
                userId: params.user.id,
                liquidityPoolId: params.poolId,
            })
            await manager.update(
                PositionEntity,
                { positionId: position.positionId },
                { 
                    closeTxHash: closePositionTxHash, 
                    flexibleSwapTxHash,
                    roi: roiAmount.toString(),
                    withdrawalAmount: receivedAmountOut.toString(),
                },
            )
        })
    }

    private async mongoDbOpenPosition(params: OpenPositionParams) {
        console.log("writeMongoDbPosition", params)
        throw new Error("Not implemented")
    }

    private async mongoDbClosePosition(params: ClosePositionParams) {
        console.log("writeMongoDbClosePosition", params)
        throw new Error("Not implemented")
    }

    public async openPosition(params: OpenPositionParams) {
        await this.retryService.retry({
            action: async () => {
                switch (envConfig().lpBot.type) {
                case LpBotType.UserBased: {
                    await this.mongoDbOpenPosition(params)
                    break
                }
                case LpBotType.System: {
                    await this.sqliteOpenPosition(params)
                    break
                }
                }
            },
            // 10 times retry to ensure the position is opened
            maxRetries: 10,
            delay: 100
        })
        
    }

    public async closePosition(params: ClosePositionParams) {
        await this.retryService.retry({
            action: async () => {
                switch (envConfig().lpBot.type) {
                case LpBotType.UserBased: {
                    await this.mongoDbClosePosition(params)
                    break
                }
                case LpBotType.System: {
                    await this.sqliteClosePosition(params)
                    break
                }
                }
            },
            delay: 100,
            maxRetries: 10
        })
    }
}
