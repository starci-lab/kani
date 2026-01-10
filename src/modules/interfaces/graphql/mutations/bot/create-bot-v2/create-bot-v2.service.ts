import { Injectable } from "@nestjs/common"
import { 
    InjectPrimaryMongoose, 
    BotSchema,
    UserSchema, 
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    CreateBotV2Request, 
    CreateBotV2ResponseData, 
} from "./create-bot-v2.dto"
import { UserJwtLike } from "@modules/passport"
import {
    UserNotFoundException,
    TokenNotFoundException
} from "@exceptions"
import { Decimal } from "decimal.js"
import { PrivyWalletService } from "@modules/privy"
import { DerivedAesKeyService } from "@modules/derived"

@Injectable()
export class CreateBotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly privyWalletService: PrivyWalletService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) { }

    async createBotV2(
        userLike: UserJwtLike,
        {
            name,
            chainId,
            targetTokenId,
            quoteTokenId,
            liquidityPoolIds,
            isExitToUsdc,
        }: CreateBotV2Request,
    ): Promise<CreateBotV2ResponseData> {
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
        // retrieve the liquidity pools from the cache
        const liquidityPools = this.primaryMemoryStorageService
            .liquidityPools
            .filter((liquidityPool) => liquidityPoolIds.includes(liquidityPool.displayId))
        // create the signer
        const { keyPair, keyQuorum } = await this.privyWalletService.createSigner()
        // create the wallet
        const wallet = await this.privyWalletService.createWallet({
            policyIds: [],
            additionalSigners: [
                {
                    signerId: keyQuorum.id,
                    policyIds: [],
                },
            ],
            userId: userLike.id,
            chainId,
        })
        // encrypt the signer private key
        const encryptedPrivySignerPrivateKeyPayload = this.derivedAesKeyService.encrypt(keyPair.privateKey)
        const session = await this.connection.startSession()
        return await session.withTransaction(
            async () => {
                // create the bot
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
                                accountAddress: wallet.address,
                                encryptedPrivySignerPrivateKeyPayload,
                                privyMetadata: {
                                    walletId: wallet.id,
                                    publicKeyHex: keyPair.publicKey,
                                },
                                isExitToUsdc,
                            }
                        ],
                        { session }
                    )
                // return the bot
                const bot = botRaw.toJSON()
                return {
                    id: bot.id,
                    accountAddress: wallet.address,
                }
            })
    }
}

