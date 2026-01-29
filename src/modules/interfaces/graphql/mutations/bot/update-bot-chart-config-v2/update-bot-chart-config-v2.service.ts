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
    UpdateBotChartConfigV2Request
} from "./update-bot-chart-config-v2.dto"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"

@Injectable()
export class UpdateBotChartConfigV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async updateBotChartConfigV2(
        response: VerifyAccessTokenResponse,
        {
            id,
            chartUnit,
            chartInterval,
        }: UpdateBotChartConfigV2Request,
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
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            {
                _id: id,
            },
            {
                $set: {
                    ...(chartUnit && {
                        "chartConfig.chartUnit": chartUnit 
                    }),
                    ...(chartInterval && {
                        "chartConfig.chartInterval": chartInterval 
                    }),
                },
            },
        )
    }
}
