import {
    Injectable,
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    VerifyAccessTokenResponse,
} from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    TokenNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    PortfolioValueV2Request,
    PortfolioValueV2ResponseData,
    PortfolioValueV2Snapshot,
} from "./portfolio-value-v2.dto"
import BN from "bn.js"
import {
    EvalBalanceService,
} from "@modules/blockchains"
import {
    toDecimalAmount,
} from "@modules/utils"
import {
    TokenType,
} from "@modules/typedefs"
import Decimal from "decimal.js"

@Injectable()
export class PortfolioValueV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly evalBalanceService: EvalBalanceService,
    ) { }

    async portfolioValueV2(
        {
            botId,
        }: PortfolioValueV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<PortfolioValueV2ResponseData> {
        // Retrieve the user from the Privy response.
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id,
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }

        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }

        // Ensure the bot belongs to the authenticated user.
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: user.id,
            })
        }

        // Compute portfolio value using the same evaluator used by executor logic.
        const evalResult = await this.evalBalanceService.eval({
            bot,
        })

        // Resolve token metadata for human-readable balance amounts.
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

        const portfolioValue: PortfolioValueV2Snapshot = {
            excludingGas: evalResult.fundingSnapsot.excludingGas.toNumber(),
            includingGas: evalResult.fundingSnapsot.includingGas.toNumber(),
        }
        const portfolioValueInUsd: PortfolioValueV2Snapshot = {
            excludingGas: evalResult.fundingSnapshotInUsd.excludingGas.toNumber(),
            includingGas: evalResult.fundingSnapshotInUsd.includingGas.toNumber(),
        }

        return {
            targetBalanceAmount: 
                toDecimalAmount(
                    {
                        amount: new BN(bot.balanceSnapshots?.targetBalanceAmount ?? "0"),
                        decimals: new Decimal(targetToken.decimals),
                    })
                    .toNumber(),
            quoteBalanceAmount: 
                toDecimalAmount(
                    {
                        amount: new BN(bot.balanceSnapshots?.quoteBalanceAmount ?? "0"),
                        decimals: new Decimal(quoteToken.decimals),
                    })
                    .toNumber(),
            gasBalanceAmount: 
                toDecimalAmount(
                    {
                        amount: new BN(bot.balanceSnapshots?.gasBalanceAmount ?? "0"),
                        decimals: new Decimal(gasToken.decimals),
                    })
                    .toNumber(),
            portfolioValue,
            portfolioValueInUsd,
            status: evalResult.status,
        }
    }
}


