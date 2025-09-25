import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import {
    InstanceSchema,
    LiquidityPoolEntity,
    TokenId,
    UserLike,
    UserEntity,
} from "@modules/databases"
import { envConfig, LpBotType } from "@modules/env"
import { Connection } from "mongoose"
import { ModuleRef } from "@nestjs/core"
import { DataSource, DeepPartial, FindOptionsWhere, Like } from "typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { getDataSourceToken } from "@nestjs/typeorm"
import { KeypairsService } from "@modules/blockchains"
import { ChainId, Network, PlatformId, TokenType, waitUntil } from "@modules/common"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { AsyncService, InjectSuperJson } from "@modules/mixin"
import { DataLikeService } from "../data-like"

@Injectable()
export class UserLoaderService implements OnModuleInit, OnApplicationBootstrap {
    private connection: Connection
    private dataSource: DataSource
    private cacheManager: Cache
    public loaded = false

    constructor(
        private readonly keypairsService: KeypairsService,
        private readonly moduleRef: ModuleRef,
        private readonly cacheHelpersService: CacheHelpersService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly asyncService: AsyncService,
        private readonly dataLikeService: DataLikeService,
    ) { }

    async onModuleInit() {
        switch (envConfig().lpBot.type) {
        case LpBotType.UserBased: {
            this.connection = this.moduleRef.get<Connection>(getConnectionToken(), { strict: false })
            break
        }
        case LpBotType.System: {
            this.dataSource = this.moduleRef.get<DataSource>(getDataSourceToken(), { strict: false })
            break
        }
        }
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    async onApplicationBootstrap() {
        await waitUntil(async () => {
            return this.dataLikeService.loaded
        })
        await this.loadUsers(true)
        this.loaded = true
    }

    /** Load all active users or system user */
    async loadUsers(
        withCache = true
    ): Promise<Array<UserLike>> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const userId = envConfig().lpBot.userId
            const whereCondition: FindOptionsWhere<UserEntity> = {}
            if (userId) {
                whereCondition.id = userId
            } else {
                whereCondition.isActive = true
            }
            const user = await this.findOrCreateUser(whereCondition)
            const users = [this.toUserLike(user)]
            if (withCache) {
                await this.asyncService.allIgnoreError([
                    // mset the users to the cache
                    (async () => {
                        await this.cacheHelpersService.mset(
                            {
                                entries: users.map(user => ({
                                    key: createCacheKey(CacheKey.User, user.id),
                                    value: this.superjson.stringify(user),
                                })),
                                autoSelect: true,
                            }
                        )
                    })(),
                    (async () => {
                        await this.cacheManager.set(
                            createCacheKey(CacheKey.UserIds),
                            this.superjson.stringify(users.map(user => user.id!)),
                        )
                    })(),
                ])
            }
            return users
        }

        // user-based bot
        const instance = await this.connection.model<InstanceSchema>(InstanceSchema.name).findOne({
            _id: envConfig().lpBot.instanceId,
        })
        if (!instance) {
            throw new Error("Instance not found")
        }
        throw new Error("User-based bot is not supported")
    }

    async cacheUser(
        userId: string
    ) {
        const user = await this.findOrCreateUser({ id: userId })
        // add the user to the cache
        // not to overwrite the user if it already exists
        await this.cacheManager.set(
            createCacheKey(CacheKey.User, userId),
            this.superjson.stringify(user)
        )
    }

    /** Load a single user by userId */
    async loadUser(
        userId: string
    ): Promise<UserLike | null> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const user = await this.findOrCreateUser({ id: userId })
            // return the user
            return this.toUserLike(user)
        }

        // user-based bot
        const instance = await this.connection.model<InstanceSchema>(InstanceSchema.name).findOne({
            _id: envConfig().lpBot.instanceId,
        })
        if (!instance) {
            throw new Error("Instance not found")
        }
        throw new Error("User-based bot is not supported")
    }

    /** Core: find existing or create user if not exist */
    private async findOrCreateUser(whereCondition: FindOptionsWhere<UserEntity>): Promise<UserEntity> {
        let user = await this.dataSource.manager.findOne(UserEntity, {
            where: whereCondition,
            relations: {
                wallets: {
                    chainConfigs: {
                        assignedLiquidityPools: {
                            liquidityPool: true,
                            positions: {
                                assignedLiquidityPool: {
                                    liquidityPool: true,
                                }
                            }
                        },
                    },
                },
            },
        })

        if (!user) {
            // Create new user if not found
            const keypairs = await this.keypairsService.generateKeypairs()
            const defaultFarmType = TokenType.StableUsdc
            const suiPools = await this.dataSource.manager.find(
                LiquidityPoolEntity, {
                    where: {
                        chainId: ChainId.Sui,
                        farmTokenTypes: Like(`%${defaultFarmType}%`) as unknown as TokenType,
                    },
                })
            const randomSuiPools = suiPools.sort(() => Math.random() - 0.5).slice(0, 3)

            const userData: DeepPartial<UserEntity> = {
                exitToUsdc: envConfig().lpBot.exitToUsdc,
                priorityTokenId: envConfig().lpBot.priorityToken as TokenId || TokenId.SuiUsdc,
                cummulatives: [],
                deposits: [],
                wallets: [
                    {
                        accountAddress: keypairs.evmKeypair.publicKey,
                        encryptedPrivateKey: keypairs.evmKeypair.encryptedPrivateKey,
                        platformId: PlatformId.Evm,
                        chainConfigs: [],
                    },
                    {
                        accountAddress: keypairs.suiKeypair.publicKey,
                        encryptedPrivateKey: keypairs.suiKeypair.encryptedPrivateKey,
                        platformId: PlatformId.Sui,
                        chainConfigs: [
                            {
                                farmTokenType: defaultFarmType,
                                chainId: ChainId.Sui,
                                network: Network.Mainnet,
                                assignedLiquidityPools: [
                                    ...randomSuiPools.map((liquidityPool) => ({
                                        liquidityPoolId: liquidityPool.id,
                                        positions: [],
                                    })),
                                ]
                            },
                        ],
                    },
                    {
                        accountAddress: keypairs.solanaKeypair.publicKey,
                        encryptedPrivateKey: keypairs.solanaKeypair.encryptedPrivateKey,
                        platformId: PlatformId.Solana,
                        chainConfigs: [],
                    },
                ],
                isActive: true,
            }
            user = await this.dataSource.manager.save(UserEntity, userData)
        }

        return user
    }

    /** Convert UserEntity → UserLike */
    private toUserLike(user: UserEntity): UserLike {
        return {
            ...user,
            id: user.id,
            wallets: user.wallets.map((wallet) => ({
                id: wallet.id,
                accountAddress: wallet.accountAddress,
                encryptedPrivateKey: wallet.encryptedPrivateKey,
                platformId: wallet.platformId,
                chainConfigs: wallet.chainConfigs.map((chainConfig) => ({
                    id: chainConfig.id,
                    chainId: chainConfig.chainId,
                    farmTokenType: chainConfig.farmTokenType,
                    network: chainConfig.network,
                    assignedLiquidityPoolIds: chainConfig.assignedLiquidityPools.map((assignedLiquidityPool) => assignedLiquidityPool.liquidityPool.displayId),
                    providedAssignedLiquidityPoolId: chainConfig.providedAssignedLiquidityPoolId,
                    assignedLiquidityPools: chainConfig.assignedLiquidityPools.map((assignedLiquidityPool) => ({
                        id: assignedLiquidityPool.id,
                        liquidityPoolId: assignedLiquidityPool.liquidityPool.displayId,
                    })),
                })),
            })),
            activePositions:
                user
                    .wallets
                    .flatMap((wallet) => wallet.chainConfigs
                        .flatMap((chainConfig) => chainConfig.assignedLiquidityPools
                            .flatMap((assignedLiquidityPool) => assignedLiquidityPool.positions)))
                    // filter out closed positions
                    .filter((position) => !position.isClosed)
                    // map to position like
                    .map((position) => ({
                        id: position.id,
                        liquidityPoolId: position.assignedLiquidityPool.liquidityPool.displayId,
                        tickLower: position.tickLower,
                        tickUpper: position.tickUpper,
                        depositAmount: position.depositAmount,
                        liquidity: position.liquidity,
                        positionId: position.positionId,
                    })),
        }
    }
}