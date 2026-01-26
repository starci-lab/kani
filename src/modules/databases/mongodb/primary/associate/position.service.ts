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
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService 
} from "../memory"

@Injectable()
export class PositionAssociateService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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
    
    async associateLiquidityPool(
        position: PositionSchema
    ) {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
            id: {
                $eq: position.liquidityPool.toString(),
            },
        })
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: position.liquidityPool.toString(),
            })
        }
        position.associatedLiquidityPool = liquidityPool
    }
}

