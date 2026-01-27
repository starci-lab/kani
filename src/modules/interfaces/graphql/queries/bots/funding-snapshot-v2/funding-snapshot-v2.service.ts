import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    TokenNotFoundException, 
    UserNotFoundException,
} from "@modules/exceptions"
import { 
    FundingSnapshotV2Request, 
    FundingSnapshotV2ResponseData 
} from "./funding-snapshot-v2.dto"
import BN from "bn.js"
import {
    BalanceEligibilityStatus 
} from "@modules/blockchains"
import {
    computeDenomination 
} from "@modules/utils"
import {
    TokenType 
} from "@modules/typedefs"

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
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: user.id,
            })
        }
        // check status of the funding snapshot
        const eligibilityResult = await this.balanceEligibilityService.evaluateBalanceEligibility({
            bot,
        })
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString(),
            },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString(),
            },
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native,
            },
            chainId: {
                $eq: bot.chainId,
            },
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    type: TokenType.Native,
                    chainId: bot.chainId,
                },
            })
        }
        return {
            targetBalanceAmount: computeDenomination(new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0"),
                targetToken.decimals).toNumber(),   
            quoteBalanceAmount: computeDenomination(new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0"),
                quoteToken.decimals).toNumber(),
            gasBalanceAmount: computeDenomination(new BN(bot.balanceSnapshots?.gasBalanceAmount ?? "0"),
                gasToken.decimals).toNumber(),
            balanceExcludingGasInUsdc: eligibilityResult.balanceExcludingGasInUsdc?.toNumber() ?? 0,
            balanceIncludingGasInUsdc: eligibilityResult.balanceIncludingGasInUsdc?.toNumber() ?? 0,
            isEligible: eligibilityResult.status === BalanceEligibilityStatus.Eligible.toString(),
        };
    }
}
