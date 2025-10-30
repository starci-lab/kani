import { Injectable } from "@nestjs/common"
import { InjectMongoose, LiquidityPoolSchema, LiquidityProvisionBotSchema, TokenSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { AddLiquidityProvisionBotRequest, AddLiquidityProvisionBotResponseData, InitializeLiquidityProvisionBotRequest, UpdateLiquidityProvisionBotLiquidityPoolsRequest, RunLiquidityProvisionBotRequest, StopLiquidityProvisionBotRequest, UpdateLiquidityProvisionBotRpcsRequest, UpdateLiquidityProvisionBotExplorerIdRequest } from "./liquidity-provision.dto"
import { UserJwtLike } from "@modules/passport"
import {
    UserNotFoundException,
} from "@modules/errors"
import { KeypairsService } from "@modules/blockchains"
import { chainIdToPlatformId } from "@modules/common"
import { 
    LiquidityProvisionBotNotFoundException, 
    LiquidityPoolNotFoundException,
    TokenNotFoundException
} from "@modules/errors"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class LiquidityProvisionService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
        private readonly dayjsService: DayjsService,
    ) { }

    async addLiquidityProvisionBot(
        request: AddLiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ): Promise<AddLiquidityProvisionBotResponseData> {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we create a new liquidity provision bot
        const platformId = chainIdToPlatformId(request.chainId)
        const wallet = await this.keypairsService.generateKeypair(platformId)
        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name).insertOne({
            user: userLike.id,
            chainId: request.chainId,
            accountAddress: wallet.accountAddress,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
        })
        return {
            id: liquidityProvisionBot.id,
            accountAddress: wallet.accountAddress,
        }
    }

    async initializeLiquidityProvisionBot(
        {
            id,
            name,
            priorityTokenId,
            liquidityPoolIds,
        }: InitializeLiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ) {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we try to find the liquidity provision bot in the database
        const liquidityProvisionBot = 
        await this
            .connection
            .model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .findOne({
                user: userLike.id,
                _id: id,
            })
        if (!liquidityProvisionBot) {
            throw new LiquidityProvisionBotNotFoundException()
        }
        // we find the priority token and the liquidity pools
        const priorityTokenObject = await this.connection.model<TokenSchema>(TokenSchema.name).findOne({
            displayId: priorityTokenId,
        })
            .select("_id")
            .lean()
        if (!priorityTokenObject) {
            throw new TokenNotFoundException()
        }
        const liquidityPoolsObjects = await this.connection.model<LiquidityPoolSchema>(LiquidityPoolSchema.name).find({
            displayId: { $in: liquidityPoolIds },
        })
            .select("_id")
            .lean()
        if (liquidityPoolsObjects.length !== liquidityPoolIds.length) {
            throw new LiquidityPoolNotFoundException()
        }
        // we update the liquidity provision bot
        await this
            .connection
            .model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name).updateOne(
                { _id: id },
                { $set: { 
                    name, 
                    priorityToken: priorityTokenObject._id, 
                    liquidityPools: liquidityPoolsObjects.map((liquidityPool) => liquidityPool._id), 
                    initialized: true
                } 
                },
            )
    }

    async updateLiquidityProvisionBotLiquidityPools(
        { id, liquidityPoolIds }: UpdateLiquidityProvisionBotLiquidityPoolsRequest,
        userLike: UserJwtLike,
    ) {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we try to find the liquidity provision bot in the database
        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name).findOne({
            user: userLike.id,
            _id: id,
        })
        if (!liquidityProvisionBot) {
            throw new LiquidityProvisionBotNotFoundException()
        }
        const liquidityPoolsObjects = await this.connection.model<LiquidityPoolSchema>(LiquidityPoolSchema.name).find({
            displayId: { $in: liquidityPoolIds },
        })
            .select("_id")
            .lean()
        if (liquidityPoolsObjects.length !== liquidityPoolIds.length) {
            throw new LiquidityPoolNotFoundException()
        }
        // we update the liquidity provision bot
        await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name).updateOne(
            { _id: id },
            { $set: 
                { 
                    liquidityPools: liquidityPoolsObjects.map((liquidityPool) => liquidityPool._id),
                } 
            },
        )
    }

    async runLiquidityProvisionBot(
        { id }: RunLiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!liquidityProvisionBot) throw new LiquidityProvisionBotNotFoundException()

        await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
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
    async stopLiquidityProvisionBot(
        { id }: StopLiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!liquidityProvisionBot) throw new LiquidityProvisionBotNotFoundException()

        await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .updateOne({ _id: id }, { $set: { running: false, stoppedAt: new Date() } })
    }

    /**
     * Updates the RPC endpoints used by a liquidity provision bot.
     */
    async updateLiquidityProvisionBotRpcs(
        { id, rpcUrls }: UpdateLiquidityProvisionBotRpcsRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!liquidityProvisionBot) throw new LiquidityProvisionBotNotFoundException()

        await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .updateOne({ _id: id }, { $set: { rpcUrls } })
    }

    /**
     * Sets the explorer URL provider for a liquidity provision bot.
     */
    async updateLiquidityProvisionBotExplorerId(
        { id, explorerId }: UpdateLiquidityProvisionBotExplorerIdRequest,
        userLike: UserJwtLike,
    ) {
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) throw new UserNotFoundException()

        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .findOne({ _id: id, user: userLike.id })
        if (!liquidityProvisionBot) throw new LiquidityProvisionBotNotFoundException()

        await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name)
            .updateOne({ _id: id }, { $set: { explorerId } })
    }
}