import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose 
} from "../mongodb.decorators"
import {
    Connection 
} from "mongoose"
import {
    BotSchema, PositionSchema 
} from "../schemas"
import {
    ActivePositionNotFoundException, AssociatedPositionNotFoundException 
} from "@exceptions"

@Injectable()
export class PositionAssociateService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async associateActivePosition(
        bot: BotSchema
    ) {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const position = await this.connection.model<PositionSchema>(
            PositionSchema.name
        ).findById(bot.activePosition.position)
        if (!position) {
            throw new AssociatedPositionNotFoundException({
                botId: bot.id,
            })
        }
        bot.activePosition.associatedPosition = position.toJSON<PositionSchema>()
    }
}

