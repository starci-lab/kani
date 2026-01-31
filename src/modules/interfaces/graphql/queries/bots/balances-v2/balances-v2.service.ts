import {
    Injectable 
} from "@nestjs/common"

import {
    InjectPrimaryMongoose, 
    BotSchema,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    TokenBalanceV2,
    BalancesV2Request,
} from "./balances-v2.dto"
import {
    BotNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    BalanceFetcherService 
} from "@modules/blockchains"
import {
    round,
} from "@modules/utils"

@Injectable()
export class BalancesV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly balanceFetcherService: BalanceFetcherService,
    ) {}

    async balancesV2(
        request: BalancesV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<Array<TokenBalanceV2>> {
        const {
            id,
        } = request
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne(
                {
                    privyUserId: response.user_id 
                }
            )
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        const bot = await this.connection
            .model<BotSchema>(
                BotSchema.name).findOne({
                user: user.id,
                _id: id,
            })
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        // const botJson = bot.toJSON<BotSchema>()
        // Optional associations for bot.activePosition.
        const tokens = await this.balanceFetcherService.fetchTokens({
            bot,
        })
        return tokens.tokens.map(
            (token) => ({
                id: token.token.id,
                balanceAmount: token.balanceAmount.toString(),
                balanceAmountDecimal: round(token.balanceAmountDecimal).toNumber(),
            }))
            .sort((tokenBalanceA, tokenBalanceB) => 
                tokenBalanceB.id.localeCompare(
                    tokenBalanceA.id
                )
            )
    }
}

