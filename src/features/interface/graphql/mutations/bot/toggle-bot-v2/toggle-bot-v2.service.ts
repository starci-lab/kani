import {
    Injectable 
} from "@nestjs/common"
import { 
    InjectPrimaryMongoose, 
    BotSchema,
    UserSchema,
    AppVersion,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    ToggleBotV2Request, 
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    BotNotV2Exception,
    UserNotFoundException,
    CannotToggleBotRunningStateException,
} from "@modules/exceptions"
import {
    BalanceEvalStatus,
    EvalBalanceService,
} from "@modules/blockchains"
import {
    WinstonService,
} from "@modules/winston"

/**
 * Service for toggling the running state of a bot
 */
@Injectable()
export class ToggleBotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly evalBalanceService: EvalBalanceService,
        private readonly winstonService: WinstonService,
    ) { }
    
    /**
     * Toggles the running state of a bot
     * @param response - The response from the Privy API
     * @param id - The ID of the bot
     * @param running - The new running state of the bot
     */
    async toggleBotV2(
        response: VerifyAccessTokenResponse,
        {
            id,
            running,
        }: ToggleBotV2Request,
    ) {
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
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id,
                userId: user.id,
            })
        }
        // check if bot is v2
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception({
                id,
            })
        }
        // evaluate the balance
        const { status } = await this.evalBalanceService.eval(
            {
                bot,
            }
        )
        if (status !== BalanceEvalStatus.Ok) {
            throw new CannotToggleBotRunningStateException(
                {
                    id,
                    status,
                }
            )
        }
        // we toggle the bot running state
        await this.connection.model<BotSchema>(BotSchema.name)
            .updateOne(
                {
                    _id: id 
                },
                {
                    $set: {
                        running 
                    } 
                }
            )
    }
}

