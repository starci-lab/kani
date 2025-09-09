import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { 
    InstanceSchema, 
    LiquidityPoolEntity, 
    TokenId, 
    UserLike, 
    UserEntity,
    WalletType
} from "@modules/databases"
import { envConfig, LpBotType } from "@modules/env"
import { Connection } from "mongoose"
import { ModuleRef } from "@nestjs/core"
import { DataSource, DeepPartial, FindOptionsWhere } from "typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { getDataSourceToken } from "@nestjs/typeorm"
import { KeypairsService } from "@modules/blockchains"
import { ChainId } from "@modules/common"

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
        this.users = await this.fetchUsers()
    }

    async fetchUsers(): Promise<Array<UserLike>> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const userId = envConfig().lpBot.userId
            // we will use this condition to find the user
            const whereCondition: FindOptionsWhere<UserEntity> = {}
            if (userId) {
                whereCondition.id = userId
            } else {
                whereCondition.isActive = true
            }
            let user = await this.dataSource.manager.findOne(UserEntity, {
                where: whereCondition,
                relations: {
                    wallets: true,
                    assignedLiquidityPools: true,
                },
            })
            if (!user) {
                // create user
                const keypairs = await this.keypairsService.generateKeypairs()
                // we work 
                const suiPools = await this.dataSource.manager.find(
                    LiquidityPoolEntity, {
                        where: {
                            chainId: ChainId.Sui,
                        }
                    })
                const randomSuiPools = suiPools.sort(() => Math.random() - 0.5).slice(0, 3)
                const userData: DeepPartial<UserEntity> = {
                    id: userId,
                    exitToUsdc: envConfig().lpBot.exitToUsdc,
                    priorityTokenId: envConfig().lpBot.priorityToken as TokenId || TokenId.SuiUsdc,
                    cummulatives: [],
                    deposits: [],
                    wallets: [  
                        {
                            type: WalletType.Evm,
                            accountAddress: keypairs.evmKeypair.publicKey,
                            encryptedPrivateKey: keypairs.evmKeypair.encryptedPrivateKey,
                        },
                        {
                            type: WalletType.Sui,
                            accountAddress: keypairs.suiKeypair.publicKey,
                            encryptedPrivateKey: keypairs.suiKeypair.encryptedPrivateKey,
                        },
                        {
                            type: WalletType.Solana,
                            accountAddress: keypairs.solanaKeypair.publicKey,
                            encryptedPrivateKey: keypairs.solanaKeypair.encryptedPrivateKey,
                        },
                    ],
                    isActive: true,
                    assignedLiquidityPools: 
                    [
                        ...randomSuiPools.map((pool) => ({
                            pool,
                            chain: ChainId.Sui,
                        })),
                    ]
                }
                user = await this.dataSource.manager.save(
                    UserEntity,
                    userData,
                )
            }
            const getWallet = (type: WalletType) => user.wallets.find((wallet) => wallet.type === type)
            return [
                {
                    ...user,
                    solanaWallet: {
                        accountAddress: getWallet(WalletType.Solana)?.accountAddress || "",
                        encryptedPrivateKey: getWallet(WalletType.Solana)?.encryptedPrivateKey || "",
                    },
                    suiWallet: {
                        accountAddress: getWallet(WalletType.Sui)?.accountAddress || "",
                        encryptedPrivateKey: getWallet(WalletType.Sui)?.encryptedPrivateKey || "",
                    },
                    evmWallet: {
                        accountAddress: getWallet(WalletType.Evm)?.accountAddress || "",
                        encryptedPrivateKey: getWallet(WalletType.Evm)?.encryptedPrivateKey || "",
                    },
                    userId: user.id,
                    assignedSuiPools: user.assignedLiquidityPools.map((pool) => ({
                        poolId: pool.id,
                    })),
                    assignedSolanaPools: user.assignedLiquidityPools.map((pool) => ({
                        poolId: pool.id,
                    })),       
                }
            ]
        }
        const instance = await this.connection.model<InstanceSchema>(InstanceSchema.name).findOne({
            _id: envConfig().lpBot.instanceId,
        })
        if (!instance) {
            throw new Error("Instance not found")
        }
        throw new Error("User-based bot is not supported")
    }
}
