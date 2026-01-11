import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { Connection } from "mongoose"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    TokenNotFoundException, 
    UserNotFoundException,
} from "@exceptions"
import { 
    FundingSnapshotV2Request, 
    FundingSnapshotV2ResponseData 
} from "./funding-snapshot-v2.dto"
import BN from "bn.js"
import { BalanceEligibilityService } from "@modules/blockchains"
import { computeDenomination } from "@utils"
import { TokenType } from "@typedefs"

@Injectable()
export class FundingSnapshotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly balanceEligibilityService: BalanceEligibilityService,
    ) { }

    async fundingSnapshotV2(
        {
            botId,
        }: FundingSnapshotV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<FundingSnapshotV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${botId}`)
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException(`Bot not owned by user with id: ${user.id}`)
        }
        // check status of the funding snapshot
        const eligibilityResult = await this.balanceEligibilityService.evaluateBalanceEligibility({
            bot,
        })
        const targetToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.targetToken.toString())
        if (!targetToken) {
            throw new TokenNotFoundException("Target token not found")
        }
        const quoteToken = this.primaryMemoryStorageService.tokens.find(token => token.id === bot.quoteToken.toString())
        if (!quoteToken) {
            throw new TokenNotFoundException("Quote token not found")
        }
        const gasToken = this.primaryMemoryStorageService.tokens.find(token => token.type === TokenType.Native && token.chainId === bot.chainId)
        if (!gasToken) {
            throw new TokenNotFoundException("Gas token not found")
        }
        return {
            targetBalanceAmount: computeDenomination(new BN(bot.snapshotTargetBalanceAmount), targetToken.decimals).toNumber(),   
            quoteBalanceAmount: computeDenomination(new BN(bot.snapshotQuoteBalanceAmount), quoteToken.decimals).toNumber(),
            gasBalanceAmount: computeDenomination(new BN(bot.snapshotGasBalanceAmount), gasToken.decimals).toNumber(),
            balanceEligibilityStatus: eligibilityResult.status,
            balanceExcludingGasInUsdc: eligibilityResult.balanceExcludingGasInUsdc?.toNumber() ?? 0,
            balanceIncludingGasInUsdc: eligibilityResult.balanceIncludingGasInUsdc?.toNumber() ?? 0,
            isEligible: eligibilityResult.isEligible,
        }
    }
}

