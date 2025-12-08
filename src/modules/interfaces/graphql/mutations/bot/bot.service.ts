import { Injectable } from "@nestjs/common"
import { 
    InjectPrimaryMongoose, 
    BotSchema,
    LiquidityPoolSchema, 
    UserSchema, 
    PrimaryMemoryStorageService} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    AddBotRequest,
    AddBotResponseData, 
    InitializeBotRequest,
    UpdateBotLiquidityPoolsRequest, 
    RunBotRequest,
    StopBotRequest,
    UpdateBotRpcsRequest,
    UpdateBotExplorerIdRequest,
} from "./bot.dto"
import { UserJwtLike } from "@modules/passport"
import {
    UserNotFoundException,
    BotNotFoundException,
    LiquidityPoolsValidationException,
} from "@exceptions"
import { KeypairsService } from "@modules/blockchains"
import { chainIdToPlatformId } from "@typedefs"
import { 
    LiquidityPoolNotFoundException,
    TokenNotFoundException
} from "@exceptions"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class BotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
        private readonly dayjsService: DayjsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async addBot(
        request: AddBotRequest,
        userLike: UserJwtLike,
    ): Promise<AddBotResponseData> {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we create a new bot
        const platformId = chainIdToPlatformId(request.chainId)
        const wallet = this.keypairsService.generateKeypair(platformId)
        const bot = await this.connection.model<BotSchema>(BotSchema.name).insertOne({
            user: userLike.id,
            chainId: request.chainId,
            accountAddress: wallet.accountAddress,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
        })
        return {
            id: bot.id,
            accountAddress: wallet.accountAddress,
        }
    }

    async initializeBot(
        {
            id,
            name,
            targetTokenId,
            liquidityPoolIds,
        }: InitializeBotRequest,
        userLike: UserJwtLike,
    ) {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findOne({
            user: userLike.id,
            _id: id,
        })
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${id}`)
        }
        // we find the priority token and the liquidity pools
        const targetTokenObject = this.primaryMemoryStorageService.tokens.find((token) => token.displayId === targetTokenId)
        if (!targetTokenObject) {
            throw new TokenNotFoundException("Target token not found with display id: " + targetTokenId)
        }
        const liquidityPoolsObjects = 
        this.primaryMemoryStorageService.liquidityPools
            .filter(
                (liquidityPool) => {
                    // condition 1: the liquidity pool must be in the list of liquidity pools
                    return liquidityPoolIds.includes(liquidityPool.displayId)
                    // condition 2: the liquidity pool must contain the target token (either as tokenA or tokenB)
                && (
                    liquidityPool.tokenA.toString() === targetTokenObject.id 
                || liquidityPool.tokenB.toString() === targetTokenObject.id
                )
                })
        if (liquidityPoolsObjects.length !== liquidityPoolIds.length) {
            throw new LiquidityPoolsValidationException(liquidityPoolIds)
        }
        // we update the liquidity provision bot
        await this
            .connection
            .model<BotSchema>(BotSchema.name).updateOne(
                { _id: id },
                { 
                    $set: { 
                        name, 
                        targetTokenId: targetTokenObject.id, 
                        liquidityPools: liquidityPoolsObjects.map((liquidityPool) => liquidityPool.id), 
                        initialized: true
                    } 
                },
            )
    }

    async updateBotLiquidityPools(
        { id, liquidityPoolIds }: UpdateBotLiquidityPoolsRequest,
        userLike: UserJwtLike,
    ) {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findOne({
            user: userLike.id,
            _id: id,
        })
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${id}`)
        }
        const liquidityPoolsObjects = await this.connection.model<LiquidityPoolSchema>(LiquidityPoolSchema.name).find({
            displayId: { $in: liquidityPoolIds },
        })
            .select("_id")
            .lean()
        if (liquidityPoolsObjects.length !== liquidityPoolIds.length) {
            throw new LiquidityPoolNotFoundException(liquidityPoolIds[0])
        }
        // we update the bot
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            { _id: id },
            { $set: 
                { 
                    liquidityPools: liquidityPoolsObjects.map((liquidityPool) => liquidityPool._id),
                } 
            },
        )
    }

    async runBot(
        { id }: RunBotRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const bot = await this.connection.model<BotSchema>(BotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!bot) throw new BotNotFoundException(id)

        await this.connection.model<BotSchema>(BotSchema.name)
            .updateOne({ _id: id }, { 
                $set: 
                { 
                    running: true, 
                    lastRunAt: this.dayjsService.now().toDate() 
                }
            })
    }

    /**
     * Stops a running liquidity provision bot.
     */
    async stopBot(
        { id }: StopBotRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const bot = await this.connection.model<BotSchema>(BotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!bot) throw new BotNotFoundException(id)

        await this.connection.model<BotSchema>(BotSchema.name)
            .updateOne({ _id: id }, { $set: { running: false, stoppedAt: new Date() } })
    }

    /**
     * Updates the RPC endpoints used by a liquidity provision bot.
     */
    async updateBotRpcs(
        { id, rpcUrls }: UpdateBotRpcsRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const bot = await this.connection.model<BotSchema>(BotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!bot) throw new BotNotFoundException(id)

        await this.connection.model<BotSchema>(BotSchema.name)
            .updateOne({ _id: id }, { $set: { rpcUrls } })
    }

    /**
     * Sets the explorer URL provider for a liquidity provision bot.
     */
    async updateBotExplorerId(
        { id, explorerId }: UpdateBotExplorerIdRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const bot = await this.connection.model<BotSchema>(BotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!bot) throw new BotNotFoundException(id)

        await this.connection.model<BotSchema>(BotSchema.name)
            .updateOne({ _id: id }, { $set: { explorerId } })
    }
}