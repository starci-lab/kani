import {
    Injectable 
} from "@nestjs/common"

import {
    InjectPrimaryMongoose, 
    BotSchema,
    UserSchema,
    ActivePositionAssociateService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    BotV2Request,
} from "./bot-v2.dto"
import {
    BotNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Injectable()
export class BotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
    ) {}

    async botV2(
        request: BotV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<BotSchema> {
        const {
            id,
            associate: {
                activePosition: {
                    liquidityPool: activePositionLiquidityPoolAssociate = false,
                    position: activePositionPositionAssociate = false,
                } = {
                },
            } = {
            },
        } = request
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
        const botJson = bot.toJSON<BotSchema>()
        // Optional associations for bot.activePosition.
        if (activePositionPositionAssociate) {
            await this.activePositionAssociateService
                .attachAssociatedPositionsToBotActivePositions({ bots: [botJson] })
        }
        if (activePositionLiquidityPoolAssociate) {
            await this.activePositionAssociateService
                .attachAssociatedLiquidityPoolToBotActivePositions({ bots: [botJson] })
        }
        return botJson
    }
}

