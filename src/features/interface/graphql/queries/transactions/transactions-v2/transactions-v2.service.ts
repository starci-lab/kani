import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    TransactionsV2Request,
    TransactionsV2ResponseData,
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    UserNotFoundException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    envConfig 
} from "@modules/env"
import {
    ValidateService 
} from "@modules/api"

@Injectable()
export class TransactionsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly validateService: ValidateService,
    ) { }

    async transactionsV2(
        {
            filters: {
                limit = envConfig().pagination.transactions.limit.default,
                pageNumber = envConfig().pagination.transactions.pageNumber.default,
                asc = false,
            },
            botId
        }: TransactionsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<TransactionsV2ResponseData> {
        // validate the limit
        this.validateService.validateLimit({
            limit, min: envConfig().pagination.transactions.limit.min, max: envConfig().pagination.transactions.limit.max 
        })
        // validate the page number
        this.validateService.validatePageNumber({
            pageNumber, max: envConfig().pagination.transactions.pageNumber.max 
        })
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
        // retrieve the cursor from the filters
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
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
        // create the query to get the transactions
        const query = this.connection
            .model<TransactionSchema>(TransactionSchema.name)
            .find({
                bot: botId 
            })
        // get the sort order
        const sortOrder = asc ? 1 : -1
        // sort the transactions by createdAt
        query.sort({
            createdAt: sortOrder 
        })
        // limit the number of transactions to return
        query.limit(limit)
        // limit the number of transactions to return
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const transactions = await query.exec()
        // return the transactions
        return {
            count: transactions.length,
            data: transactions,
        }
    }
}

