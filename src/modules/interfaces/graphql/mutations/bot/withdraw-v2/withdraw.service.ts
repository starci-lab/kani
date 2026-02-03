import {
    Injectable
} from "@nestjs/common"
import {
    AppVersion,
    BotSchema,
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    BotNotV2Exception,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    WithdrawRequest
} from "./withdraw.dto"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"

@Injectable()
export class WithdrawService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async withdraw(
        response: VerifyAccessTokenResponse,
        {
            id,
        }: WithdrawRequest,
    ) {
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
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id,
                userId: user.id,
            })
        }
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception({
                id,
            })
        }
        // TODO: Implement withdrawal logic
    }
}
