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
    VerifyAccessTokenResponse
} from "@privy-io/node"
import {
    WithdrawV2Request
} from "./withdraw-v2.dto"

@Injectable()
export class WithdrawV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async withdrawV2(
        response: VerifyAccessTokenResponse,
        {
            id,
            tokens,
        }: WithdrawV2Request,
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
        console.log(tokens)
        return {
            data: {
                jobId: "123",
            },
        }
    }
}
