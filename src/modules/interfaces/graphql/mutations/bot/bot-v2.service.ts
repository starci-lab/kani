import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    PrimaryMemoryStorageService, 
    UserSchema 
} from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Connection } from "mongoose"
import { 
    CreateBotRequest, 
    CreateBotResponseData, 
    BackupBotPrivateKeyRequest, 
    BackupBotPrivateKeyResponseData 
} from "./bot-v2.dto"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    TokenNotFoundException,
    UserNotFoundException,
    BotAlreadyBackupedPrivateKeyException
} from "@exceptions"
import { KeypairsService } from "@modules/blockchains"
import { chainIdToPlatformId } from "@typedefs"
import { UserJwtLike } from "@modules/passport"
import { Decimal } from "decimal.js"

@Injectable()
export class BotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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

        const targetTokenInstance = this.primaryMemoryStorageService.tokens.find((token) => token.displayId.toString() === targetTokenId.toString())
        if (!targetTokenInstance) {
            throw new TokenNotFoundException("Target token not found with display id: " + targetTokenId)
        }
        const quoteTokenInstance = this.primaryMemoryStorageService.tokens.find((token) => token.displayId.toString() === quoteTokenId.toString())
        if (!quoteTokenInstance) {
            throw new TokenNotFoundException("Quote token not found with display id: " + quoteTokenId)
        }
        // if user do not pass any liquidity pool ids, 
        // we have to select random liquidity pools (3 at most)
        // TO DO: we will find the most recommended liquidity pools for the user
        if (!liquidityPoolIds || liquidityPoolIds.length === 0) {
            liquidityPoolIds = this.primaryMemoryStorageService.liquidityPools
                // this condition is to ensure the liquidity pool is on the same chain as the bot
                .filter((liquidityPool) => liquidityPool.chainId === chainId)
                // this condition is to ensure the liquidity pool contains the target token
                .filter(
                    (liquidityPool) => (
                        // this condition is to ensure the liquidity pool contains the target token
                        liquidityPool.tokenA.toString() === targetTokenInstance.id
                    && liquidityPool.tokenB.toString() === quoteTokenInstance.id
                    )
                    || (
                        // this condition is to ensure the liquidity pool contains the quote token
                        liquidityPool.tokenA.toString() === quoteTokenInstance.id
                    && liquidityPool.tokenB.toString() === targetTokenInstance.id
                    )
                )
                // we sort the liquidity pools by a random number
                .sort(() => Decimal.random().sub(0.5).toNumber())
                // we take the top 3 liquidity pools
                .slice(0, 3)
                // we map the liquidity pools to their display ids
                .map((liquidityPool) => liquidityPool.displayId)     
        }
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException("User not found with id: " + userLike.id)
        }
        // create embedded wallet for the bot
        const platformId = chainIdToPlatformId(chainId)
        const wallet = await this.keypairsService.generateKeypair(platformId)
        // retrieve the liquidity pools from the cache
        const liquidityPools = this.primaryMemoryStorageService
            .liquidityPools
            .filter((liquidityPool) => liquidityPoolIds.includes(liquidityPool.displayId))
        // create bot
        const [
            botRaw
        ] = await this.connection
            .model<BotSchema>(BotSchema.name)
            .create(
                [
                    {
                        user: userLike.id,
                        name,
                        chainId,
                        targetToken: targetTokenInstance.id,
                        quoteToken: quoteTokenInstance.id,
                        liquidityPools: liquidityPools.map((liquidityPool) => liquidityPool.id),
                        accountAddress: wallet.accountAddress,
                        encryptedPrivateKey: wallet.encryptedPrivateKey,
                        isExitToUsdc,
                    }
                ]
            )
        const bot = botRaw.toJSON()
        return {
            id: bot.id,
            accountAddress: wallet.accountAddress,
        }
    }

    async backupBotPrivateKey(
        userLike: UserJwtLike,
        { botId }: BackupBotPrivateKeyRequest,
    ): Promise<BackupBotPrivateKeyResponseData> {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(botId)
        }
        if (bot.backupPrivateKey) {
            throw new BotAlreadyBackupedPrivateKeyException("Bot already backuped private key")
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("User is not the owner of the bot")
        }
        const platformId = chainIdToPlatformId(bot.chainId)
        const privateKey = await this.keypairsService.getPrivateKey(
            platformId, 
            bot.encryptedPrivateKey
        )
        // update the bot backup private key
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            { _id: botId },
            { $set: { backupPrivateKey: true } }
        )
        return {
            privateKey,
        }   
    }
}