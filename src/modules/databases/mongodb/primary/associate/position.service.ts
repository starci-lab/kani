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
    PositionSchema
} from "../schemas"
import {
    ActivePositionNotFoundException, AssociatedPositionNotFoundException, LiquidityPoolNotFoundException
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService
} from "../memory"
import type {
    AssociateActivePositionParams,
    AssociateActivePositionResult,
    AssociateLiquidityPoolParams,
    AssociateLiquidityPoolResult,
} from "./types"

@Injectable()
export class PositionAssociateService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Associate active position (and its associated position document) to the bot.
     */
    async associateActivePosition(
        params: AssociateActivePositionParams,
    ): Promise<AssociateActivePositionResult> {
        const { bot } = params
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

    /**
     * Associate liquidity pool to the position from memory storage.
     */
    async associateLiquidityPool(
        params: AssociateLiquidityPoolParams,
    ): Promise<AssociateLiquidityPoolResult> {
        const { position } = params
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(position.liquidityPool.toString())
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: position.liquidityPool.toString(),
            })
        }
        position.associatedLiquidityPool = liquidityPool
    }
}

