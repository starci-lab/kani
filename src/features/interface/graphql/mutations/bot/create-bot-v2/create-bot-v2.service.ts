import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema,
    PrimaryMemoryStorageService,
    AppVersion,
    ExecutorSchema,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    MountStorageService,
} from "@modules/filesystem"
import {
    Connection 
} from "mongoose"
import { 
    CreateBotV2Request, 
    CreateBotV2ResponseData, 
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    UserNotFoundException,
    TokenNotFoundException,
    MaxBotsPerAccountReachedException,
} from "@modules/exceptions"
import {
    PrivyCoreService 
} from "@modules/privy"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import _ from "lodash"
import {
    envConfig 
} from "@modules/env"
import {
    GoogleDriveService 
} from "@modules/gcp"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJson from "superjson"
import {
    Readable 
} from "stream"
import {
    GoogleDriveFolderName,
} from "@modules/gcp"

@Injectable()
export class CreateBotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly mountStorageService: MountStorageService,
        private readonly privyCoreService: PrivyCoreService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        private readonly googleDriveService: GoogleDriveService,
        @InjectSuperJson()
        private readonly superJson: SuperJson,
    ) { }

    async createBotV2(
        response: VerifyAccessTokenResponse,
        {
            name,
            chainId,
            targetTokenId,
            quoteTokenId,
            liquidityPoolIds,
            isExitToUsdc,
            withdrawalAddress
        }: CreateBotV2Request,
    ): Promise<CreateBotV2ResponseData> {
        const targetToken = this.primaryMemoryStorageService.tokenMap.get(targetTokenId)
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: targetTokenId,
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenMap.get(quoteTokenId)
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: quoteTokenId,
            })
        }
        // if user do not pass any liquidity pool ids, 
        // we have to select random liquidity pools (3 at most)
        // TO DO: we will find the most recommended liquidity pools for the user
        if (!liquidityPoolIds || liquidityPoolIds.length === 0) { 
            liquidityPoolIds = _
                .chain(
                    Array.from(
                        this.primaryMemoryStorageService.liquidityPoolMap.values()
                    ).filter(
                        (liquidityPool): liquidityPool is NonNullable<LiquidityPoolSchema> => liquidityPool != null
                    ).filter(
                        (liquidityPool) => liquidityPool.chainId === chainId,
                    ),
                )
                .filter(
                    (liquidityPool) => {
                        const tokenA = liquidityPool.tokenA.toString()
                        const tokenB = liquidityPool.tokenB.toString()
                        return (
                            (tokenA === targetToken.id && tokenB === quoteToken.id) ||
                    (tokenA === quoteToken.id && tokenB === targetToken.id)
                        )
                    })
                .sampleSize(3)
                .map((liquidityPool) => liquidityPool.id)
                .value()
        }
        const maxBotsPerAccount = this.mountStorageService.appConfig.accountLimits.maxBotsPerAccount
        // we try to find the user in the database
        const user = await this.connection.model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException(
                {
                    privyUserId: response.user_id,
                }
            )
        }
        // we retrieve t
        // retrieve the liquidity pools from the cache
        const liquidityPools = liquidityPoolIds
            .map((id) => this.primaryMemoryStorageService.liquidityPoolMap.get(id))
            .filter((liquidityPool): liquidityPool is NonNullable<LiquidityPoolSchema> => liquidityPool != null)
            // create the signer
        const { keyPair, keyQuorum } = await this.privyCoreService.createSigner()
        // create the wallet
        const wallet = await this.privyCoreService.createWallet({
            additionalSigners: [
                {
                    signerId: keyQuorum.id,
                },
            ],
            userId: user.privyUserId,
            chainId,
        })
        // encrypt the signer private key
        const encryptedPrivySignerPrivateKeyPayload = this.derivedAesKeyService.encrypt(keyPair.privateKey)
        const session = await this.connection.startSession()
        const result = await session.withTransaction(
            async () => {
                // create the bot
                const [
                    botRaw
                ] = await this.connection
                    .model<BotSchema>(BotSchema.name)
                    .create(
                        [
                            {
                                user: user.id,
                                name,
                                chainId,
                                targetToken: targetToken.id,
                                quoteToken: quoteToken.id,
                                liquidityPools: liquidityPools.map((liquidityPool) => liquidityPool.id),
                                accountAddress: wallet.address,
                                encryptedPrivySignerPrivateKeyPayload,
                                privyMetadata: {
                                    walletId: wallet.id,
                                    signerPublicKey: keyPair.publicKey,
                                    walletPublicKey: wallet.public_key  
                                },
                                avatarUrl: this.mountStorageService.appConfig.avatars.avatarUrls[
                                    Math.floor(
                                        Math.random() * this.mountStorageService.appConfig.avatars.avatarUrls.length)
                                ],
                                version: AppVersion.V2,
                                isExitToUsdc,
                                withdrawalAddress,
                            }
                        ],
                        {
                            session 
                        }
                    )
                    // return the bot
                const bot = botRaw.toJSON()
                // find the executor with the lowest bot count and update it
                const executor = await this.connection
                    .model<ExecutorSchema>(ExecutorSchema.name)
                    .findOneAndUpdate(
                        {
                            botCount: {
                                $lt: envConfig().executor.capacity.maxBots 
                            },
                        },
                        {
                            $inc: {
                                botCount: 1 
                            },
                            $push: {
                                assignedBots: {
                                    bot: bot.id,
                                }
                            },
                        },
                        {
                            setOnInsert: {
                                version: 0,
                                assignedBots: [
                                    {
                                        bot: bot.id,
                                    }
                                ],
                            },
                            sort: {
                                botCount: 1 
                            },
                            new: true, // return the document after the update
                            session,
                        }
                    )
                // update the user with the new bot id
                const result = await this.connection
                    .model<UserSchema>(UserSchema.name)
                    .updateOne(
                        {
                            _id: user.id,
                            $expr: {
                                $lt: [
                                    {
                                        $size: {
                                            $ifNull: [
                                                "$ownedBots",
                                                []
                                            ] 
                                        } 
                                    },
                                    maxBotsPerAccount
                                ]
                            }
                        },
                        {
                            $push: {
                                ownedBots: bot.id,
                            },
                        },
                        {
                            session,
                        }
                    )
                if (result.matchedCount === 0) {
                    throw new MaxBotsPerAccountReachedException(
                        {
                            userId: user.id,
                            maxBotsPerAccount,
                        }
                    )
                }
                // update the bot with the executor id
                await this.connection
                    .model<BotSchema>(BotSchema.name)
                    .updateOne(
                        {
                            _id: bot.id,
                        },
                        {
                            $set: {
                                executor: executor?._id,
                            },
                        },
                        {
                            session,
                        }
                    )
                return {
                    bot,
                    id: bot.id,
                    accountAddress: wallet.address
                }
            }
        )
        const content = Buffer.from(
            this
                .superJson
                .stringify(encryptedPrivySignerPrivateKeyPayload),
            "utf8"
        )
        const fileName = `${result.bot.id}.json`
        await this.googleDriveService.uploadFiles({
            files: [
                {
                    buffer: content,
                    originalname: fileName,
                    mimetype: "application/octet-stream",
                    fieldname: "",
                    encoding: "utf8",
                    size: content.length,
                    stream: Readable.from(content),
                    filename: fileName,
                    path: "",
                    destination: "",
                }
            ],
            folderName: GoogleDriveFolderName.Keys,
        })
        return result
    }
}
