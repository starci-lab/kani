import { Injectable, OnModuleInit } from "@nestjs/common"
import { 
    InstanceSchema, 
    TokenId, 
    UserAllocationLike, 
    UserEntity
} from "@modules/databases"
import { envConfig, LpBotType } from "@modules/env"
import { Connection } from "mongoose"
import { ModuleRef } from "@nestjs/core"
import { DataSource } from "typeorm"
import { getConnectionToken } from "@nestjs/mongoose"
import { getDataSourceToken } from "@nestjs/typeorm"
import { KeypairsService } from "@modules/blockchains"

@Injectable()
export class UserFetcherService implements OnModuleInit {
    private connection: Connection
    private dataSource: DataSource
    public userAllocations: Array<UserAllocationLike> = []
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
        this.userAllocations = await this.fetchUserAllocations()
    }

    async fetchUserAllocations(): Promise<Array<UserAllocationLike>> {
        if (envConfig().lpBot.type === LpBotType.System) {
            const userId = envConfig().lpBot.userId
            let user: UserEntity | null = null
            if (userId) {
                user = await this.dataSource.manager.findOne(UserEntity, {
                    where: {
                        id: userId,
                    },
                })
            } else {
                //find the active user
                user = await this.dataSource.manager.findOne(UserEntity, {
                    where: {
                        isActive: true,
                    },
                })
            }
            if (!user) {
                // create user
                const keypairs = await this.keypairsService.generateKeypairs()
                user = await this.dataSource.manager.save(
                    UserEntity,
                    {
                        id: userId,
                        exitToUsdc: envConfig().lpBot.exitToUsdc,
                        priorityTokenId: envConfig().lpBot.priorityToken as TokenId || TokenId.SuiUsdc,
                        cummulatives: [],
                        deposits: [],
                        evmWalletAccountAddress: keypairs.evmKeypair.publicKey,
                        evmWalletEncryptedPrivateKey: keypairs.evmKeypair.encryptedPrivateKey,
                        suiWalletAccountAddress: keypairs.suiKeypair.publicKey,
                        suiWalletEncryptedPrivateKey: keypairs.suiKeypair.encryptedPrivateKey,
                        solanaWalletAccountAddress: keypairs.solanaKeypair.publicKey,
                        solanaWalletEncryptedPrivateKey: keypairs.solanaKeypair.encryptedPrivateKey,
                        isActive: true,
                    })
            }
            return [
                {
                    solanaWallet: {
                        accountAddress: user.solanaWalletAccountAddress || "",
                        encryptedPrivateKey: user.solanaWalletEncryptedPrivateKey || "",
                    },
                    suiWallet: {
                        accountAddress: user.suiWalletAccountAddress || "",
                        encryptedPrivateKey: user.suiWalletEncryptedPrivateKey || "",
                    },
                    evmWallet: {
                        accountAddress: user.evmWalletAccountAddress || "",
                        encryptedPrivateKey: user.evmWalletEncryptedPrivateKey || "",
                    },
                    priorityTokenId: user.priorityTokenId || TokenId.SuiUsdc,
                    userId: user.id,
                    ...user
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
