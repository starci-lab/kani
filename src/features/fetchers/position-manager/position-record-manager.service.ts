import { Injectable, OnModuleInit } from "@nestjs/common"
import {
    ChainConfigEntity,
    LiquidityPoolId,
    PositionEntity,
    UserLike,
} from "@modules/databases"
import { ChainId, chainIdToPlatform, computePercentage, computeRatio, Network, PlatformId } from "@modules/common"
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
import { DataLikeService } from "../data-like"
import { DayjsService, InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { RetryService } from "@modules/mixin"
import { DataLikeQueryService } from "../data-like"
import { UserLoaderService } from "../user-loader"

export interface OpenPositionInternalParams {
    poolId: LiquidityPoolId;
    chainId: ChainId;
    amount?: BN;
    network?: Network;
    user: UserLike;
    requireZapEligible?: boolean;
    stimulateOnly?: boolean;
}

export interface OpenPositionInternalResponse {
    txHash: string;
    liquidity: BN;
    depositAmount?: BN;
    tickLower: number;
    tickUpper: number;
    positionId: string;
}

export type OpenPositionParams = OpenPositionInternalParams;

export interface ClosePositionInternalParams {
    poolId: LiquidityPoolId;
    chainId: ChainId;
    network?: Network;
    user: UserLike;
    stimulateOnly?: boolean;
}

export interface ClosePositionInternalResponse {
    receivedAmountOut: BN;
    profitAmount: BN;
    closePositionTxHash: string;
    flexibleSwapTxHash: string;
    stimulateOnly: boolean;
}

export type ClosePositionParams = ClosePositionInternalParams;

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
        private readonly retryService: RetryService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly logger: Logger,
        private readonly userLoaderService: UserLoaderService,
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
            dexIds: [pool.dexId],
            chainId,
        })
        const tokenAId = pool.tokenAId
        const tokenBId = pool.tokenBId
        const suiWallet = user.wallets.find(
            (wallet) => wallet.platformId === PlatformId.Sui,
        )
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
        } = await this.retryService.retry({
            action: async () => {
                return await action.openPosition({
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
            },
            maxRetries: 10,
            delay: 500,
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
        poolId,
        chainId,
        network = Network.Mainnet,
        user,
        stimulateOnly = false,
    }: ClosePositionInternalParams): Promise<ClosePositionInternalResponse> {
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
        this.logger.info(WinstonLog.FetchedPools, {
            fetchedPools: fetchedPools.map((fetchedPool) => fetchedPool.displayId),
        })
        const fetchedPool = fetchedPools.find(
            (fetchedPool) => fetchedPool.displayId === liquidityPool.displayId,
        )
        if (!fetchedPool)
        {
            throw new Error(`FetchedPool ${liquidityPool.displayId} not found`)
        }
        const [{ action }] = await this.liquidityPoolService.getDexs({
            dexIds: [liquidityPool.dexId],
            chainId,
        })
        const tokenAId = liquidityPool.tokenAId
        const tokenBId = liquidityPool.tokenBId
        const suiWallet = user.wallets.find(
            (wallet) => wallet.platformId === PlatformId.Sui,
        )
        if (!suiWallet) throw new Error("Sui wallet not found")
        if (!user.id) throw new Error("User ID is required")
        const position = user.activePositions.find(
            (position) => position.liquidityPoolId === poolId,
        )
        if (!position) throw new Error(`Position not found for pool ${poolId} and user ${user.id}`)
        const priorityAOverB = this.dataLikeQueryService.determinePriorityAOverB({
            liquidityPool,
            user,
            chainId,
            network,
        })
        const tokenOut = priorityAOverB ? tokenAId : tokenBId
        const { suiTokenOuts, txHash: closePositionTxHash } =
        await this.retryService.retry({
            action: async () => {
                return await action.closePosition({
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
            },
            maxRetries: 10,
            delay: 500,
        })
        const {
            receivedAmountOut,
            profitAmount,
            txHash: flexibleSwapTxHash,
        } = await this.retryService.retry({
            action: async () => {
                return await this.suiFlexibleSwapService.suiFlexibleSwap({
                    suiTokenIns: suiTokenOuts || {},
                    accountAddress: suiWallet.accountAddress,
                    depositAmount: new BN(position.depositAmount),
                    tokenOut,
                    tokens: this.dataLikeService.tokens,
                    network,
                    stimulateOnly,
                    user,
                })
            },
            maxRetries: 10,
            delay: 500,
        })
        return {
            receivedAmountOut,
            profitAmount,
            closePositionTxHash: closePositionTxHash || "",
            flexibleSwapTxHash: flexibleSwapTxHash || "",
            stimulateOnly,
        }
    }

    private async sqliteOpenPosition(
        params: OpenPositionParams
    ) {
        const { 
            user, 
            chainId, 
            network = Network.Mainnet,
        } = params
        if (!user.id) throw new Error("User ID is required")
        // we try open position first
        const {
            txHash,
            liquidity,
            depositAmount,
            tickLower,
            tickUpper,
            positionId,
        } = await this.openPositionInternal(params)
        // begin a transaction to update the position
        await this.sqliteDataSource.transaction(async (manager) => {
            try {
                if (!user.id) throw new Error("User ID is required")
                const assignedLiquidityPools = this.dataLikeQueryService.getAssignedLiquidityPools(
                    user, 
                    chainId, 
                    network
                )
                const assignedLiquidityPool = assignedLiquidityPools.find(
                    (assignedLiquidityPool) => assignedLiquidityPool.liquidityPoolId === params.poolId,
                )
                if (!assignedLiquidityPool)
                    throw new Error(
                        `Assigned liquidity pool not found for pool ${params.poolId} and user ${user.id}`,
                    )
                await manager.save(
                    PositionEntity, {
                        openTxHash: txHash,
                        depositAmount: depositAmount?.toString(),
                        tickLower,
                        tickUpper,
                        liquidity: liquidity.toString(),
                        positionId,
                        assignedLiquidityPoolId: assignedLiquidityPool.id,
                    })
                const platformId = chainIdToPlatform(params.chainId)
                const wallet = user.wallets.find(
                    (wallet) => wallet.platformId === platformId,
                )
                if (!wallet) throw new Error(`${platformId} wallet not found`)
                // update user chain config
                await manager.update(
                    ChainConfigEntity,
                    {  
                        walletId: wallet.id,
                        chainId: params.chainId,
                        network: params.network,
                    },
                    {
                        providedAssignedLiquidityPoolId: assignedLiquidityPool.id,
                    },
                )
                this.logger.info(WinstonLog.OpenPositionSuccess, {
                    positionId,
                    txHash,
                    depositAmount: depositAmount?.toString(),
                })
            } catch (error) {
                this.logger.error(WinstonLog.OpenPositionFailed, {
                    error: error.message,
                    stack: error.stack,
                })
                throw error
            }
        })
        // cache user after open position
        await this.userLoaderService.cacheUser(user.id)
    }

    private async sqliteClosePosition(
        params: ClosePositionParams
    ) {
        try {
            // close position first
            const {
                receivedAmountOut,
                profitAmount,
                closePositionTxHash,
                flexibleSwapTxHash,
            } = await this.closePositionInternal(params)
            // begin a transaction to update the position
            const { user } = params
            if (!user.id) throw new Error("User ID is required")
            await this.sqliteDataSource.transaction(
                async (manager) => {     
                    const {
                        poolId,
                        chainId,
                        network = Network.Mainnet,
                    } = params
                    const position = user.activePositions.find(
                        (position) => position.liquidityPoolId === poolId,
                    )
                    if (!position) throw new Error(`Position not found for pool ${poolId} and user ${user.id}`)
                    const roi = computePercentage(
                        computeRatio(profitAmount,
                            new BN(position.depositAmount)
                        ).toNumber(),
                    )
                    await manager.update(
                        PositionEntity,
                        { positionId: position.positionId },
                        {
                            closeTxHash: closePositionTxHash,
                            flexibleSwapTxHash,
                            profitAmount: profitAmount.toString(),
                            roi,
                            withdrawalAmount: receivedAmountOut.toString(),
                            closeAt: this.dayjsService.now().toDate(),
                            isClosed: true,
                        },
                    )
                    const platformId = chainIdToPlatform(chainId)
                    const wallet = user.wallets.find(
                        (wallet) => wallet.platformId === platformId,
                    )
                    if (!wallet) throw new Error(`${platformId} wallet not found`)
                    await manager.update(
                        ChainConfigEntity,
                        {
                            walletId: wallet.id,
                            chainId: chainId,
                            network: network,
                        },
                        {
                            providedAssignedLiquidityPoolId: () => "NULL",
                        },
                    )
                    this.logger.info(
                        WinstonLog.ClosePositionSuccess, {
                            closePositionTxHash,
                            flexibleSwapTxHash,
                            receivedAmountOut: receivedAmountOut.toString(),
                            profitAmount: profitAmount.toString(),
                            roi,
                        })
                })
            
            // cache user after close position
            await this.userLoaderService.cacheUser(user.id)
        } catch (error) {
            this.logger.error(WinstonLog.ClosePositionFailed, {
                error: error.message,
                stack: error.stack,
            })
            throw error
        }
    }

    private async mongoDbOpenPosition(params: OpenPositionParams) {
        console.log("writeMongoDbPosition", params)
        throw new Error("Not implemented")
    }

    private async mongoDbClosePosition(params: ClosePositionParams) {
        console.log("writeMongoDbClosePosition", params)
        throw new Error("Not implemented")
    }

    public async openPosition(
        params: OpenPositionParams
    ) {
        try {
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
        } catch (error) {
            this.logger.error(WinstonLog.OpenPositionFailed, {
                error: error.message,
                stack: error.stack,
            })
            throw error
        }
    }

    public async closePosition(
        params: ClosePositionParams
    ) {
        try {
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
        } catch (error) {
            this.logger.error(WinstonLog.ClosePositionFailed, {
                error: error.message,
                stack: error.stack,
            })
            throw error
        }
    }
}
