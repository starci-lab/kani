import {
    Injectable 
} from "@nestjs/common"
import { 
    InjectPrimaryMongoose, 
    BotSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    ToggleBotRequest, 
} from "./graphql-types"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    BotNotFoundException,
    BotNotOwnedByUserException
} from "@modules/exceptions"

@Injectable()
export class ToggleBotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async toggleBot(
        userLike: UserJwtLike,
        {
            id,
            running,
        }: ToggleBotRequest,
    ) {
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id,
                userId: userLike.id,
            })
        }
        // we toggle the bot running state
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
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

