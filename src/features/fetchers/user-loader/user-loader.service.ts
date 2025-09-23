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
import { ChainId, Network, PlatformId, TokenType } from "@modules/common"

@Injectable()
export class UserLoaderService implements OnModuleInit, OnApplicationBootstrap {
    private connection: Connection
    private dataSource: DataSource
    public users: Array<UserLike> = []

    constructor(
        private readonly keypairsService: KeypairsService,
        private readonly moduleRef: ModuleRef,
    ) {}

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
    }

    async onApplicationBootstrap() {
        this.users = await this.loadUsers()
    }

    /** Load all active users or system user */
    async loadUsers(): Promise<Array<UserLike>> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const userId = envConfig().lpBot.userId
            const whereCondition: FindOptionsWhere<UserEntity> = {}
            if (userId) {
                whereCondition.id = userId
            } else {
                whereCondition.isActive = true
            }
            const user = await this.findOrCreateUser(whereCondition)
            return [this.toUserLike(user)]
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

    /** Load a single user by userId */
    async loadUser(userId: string): Promise<UserLike | null> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const user = await this.findOrCreateUser({ id: userId })
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
                        assignedLiquidityPool: { liquidityPool: true },
                    },
                },
                assignedLiquidityPools: { liquidityPool: true },
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
                assignedLiquidityPools: [
                    ...randomSuiPools.map((liquidityPool) => ({
                        liquidityPoolId: liquidityPool.id,
                    })),
                ],
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
            assignedLiquidityPools: user.assignedLiquidityPools.map((assignedLiquidityPool) => ({
                id: assignedLiquidityPool.id,
                liquidityPoolId: assignedLiquidityPool.liquidityPool.displayId,
            })),
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
                    assignedLiquidityPoolId: chainConfig.assignedLiquidityPool?.liquidityPool.displayId,
                })),
            })),
        }
    }
}