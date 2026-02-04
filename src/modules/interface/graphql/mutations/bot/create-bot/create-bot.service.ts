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
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    CreateBotRequest, 
    CreateBotResponseData, 
} from "./create-bot.dto"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    UserNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    KeypairsService 
} from "@modules/blockchains"
import {
    chainIdToPlatformId 
} from "@modules/typedefs"
import _ from "lodash"
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
    envConfig 
} from "@modules/env"
import {
    GoogleDriveFolderName 
} from "@modules/typedefs"

@Injectable()
export class CreateBotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly googleDriveService: GoogleDriveService,
        @InjectSuperJson()
        private readonly superJson: SuperJson,
    ) { }

    async createBot(
        userLike: UserJwtLike,
        {
            name,
            chainId,
            targetTokenId,
            quoteTokenId,
            liquidityPoolIds,
            isExitToUsdc,
        }: CreateBotRequest,
    ): Promise<CreateBotResponseData> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: targetTokenId 
            } 
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: targetTokenId,
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: quoteTokenId 
            } 
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: quoteTokenId,
            })
        }
        // if user do not pass any liquidity pool ids, 
        // we have to select random liquidity pools (3 at most)
        // TO DO: we will find the most recommended liquidity pools for the user
        if (!liquidityPoolIds || liquidityPoolIds.length === 0) { 
            const selectedPoolIds = _
                .chain(this.primaryMemoryStorageService.liquidityPoolCollection.find({
                    chainId: {
                        $eq: chainId 
                    },
                }))
                .filter((liquidityPool) => {
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
            liquidityPoolIds = selectedPoolIds as typeof liquidityPoolIds
        }
        // we try to find the user in the database
        const user = await this.connection.model<UserSchema>(UserSchema.name)
            .findOne({
                _id: userLike.id 
            })
        if (!user) {
            throw new UserNotFoundException(
                {
                    id: userLike.id,
                }
            )
        }
        // retrieve the liquidity pools from the cache
        const liquidityPools = this.primaryMemoryStorageService
            .liquidityPoolCollection.find(
                {
                    id: {
                        $in: liquidityPoolIds 
                    }
                }
            )
        // create embedded wallet for the bot
        const platformId = chainIdToPlatformId(chainId)
        const generatedKeypair = await this.keypairsService.generateKeypair(platformId)
        // encrypt the private key
        const encryptedPrivateKeyPayload = generatedKeypair.encryptedPrivateKeyPayload
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
                                accountAddress: generatedKeypair.accountAddress,
                                encryptedPrivateKeyPayload,
                                version: AppVersion.V1,
                                isExitToUsdc,
                            }
                        ],
                        {
                            session 
                        }
                    )
                    // return the bot
                const bot = botRaw.toJSON()
                // find the executor with the lowest bot count
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
                            $setOnInsert: {
                                version: 0,
                            }
                        },
                        {
                            sort: {
                                botCount: 1 
                            },
                            new: true, // return the document after the update
                            session,
                        }
                    )
                    // return the bot
                if (!executor) {
                    // create a new executor
                    await this.connection
                        .model<ExecutorSchema>(ExecutorSchema.name)
                        .create(
                            [
                                {
                                    assignedBots: [
                                        {
                                            bot: bot.id,
                                        }
                                    ],
                                    botCount: 1 
                                }
                            ],
                            {
                                session 
                            }
                        )      
                }
                return {
                    bot,
                    id: bot.id,
                    accountAddress: generatedKeypair.accountAddress,
                }
            }
        )
        const content = Buffer.from(
            this
                .superJson
                .stringify(encryptedPrivateKeyPayload),
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

