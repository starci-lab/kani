import {
    EventName,
    DlmmLiquidityPoolsSyncedEventPayload,
} from "@modules/event"
import {
    Injectable
} from "@nestjs/common"
import {
    OnEvent
} from "@nestjs/event-emitter"
import {
    EventEmitterService
} from "@modules/event"
import {
    RotationService
} from "../rotation/rotation.service"
import {
    BotSchema, 
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    Types,
    Connection
} from "mongoose"

@Injectable()
export class DlmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly rotationService: RotationService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
      * Triggered when DLMM liquidity pools are fetched.
      *
      * Intent:
      * - Fan-out the opportunity to close positions
      * - Bots are currently IDLE (no active liquidity pool)
      *
      * Pattern:
      * - BROADCAST (not load-balancing)
      * - Deterministic fan-out
      */
    @OnEvent(EventName.DlmmLiquidityPoolsSynced)
    async handleDlmmLiquidityPoolsSynced(
        event: DlmmLiquidityPoolsSyncedEventPayload
    ) {
        // Select bots that are currently idle and associated with THIS DLMM pool
        const idleDlmmBots = await this.connection.model<BotSchema>(BotSchema.name).find({
            executor: envConfig().executor.id,
            activePosition: {
                $exists: false,
            },
            running: {
                $eq: true,
            },
            liquidityPools: {
                $in: [new Types.ObjectId(event.id)] 
            },
            $or: Array.from(this.rotationService.botAssignments.entries()).map(([
                botId, 
                botAssignment
            ]) => ({
                _id: new Types.ObjectId(botId),
                liquidityPools: { 
                    $in: botAssignment.liquidityPoolIds.map(id => new Types.ObjectId(id)) 
                }
            }))
        })
        const activeDlmmBots = await this.connection.model<BotSchema>(BotSchema.name)
            .find({
                executor: envConfig().executor.id,
                activePosition: {
                    $exists: true,
                    $ne: null,
                },
                liquidityPools: {
                    $in: [new Types.ObjectId(event.id)] 
                },
                $or: Array.from(this.rotationService.botAssignments.entries()).map(([
                    botId, 
                    botAssignment
                ]) => ({
                    _id: new Types.ObjectId(botId),
                    liquidityPools: { 
                        $in: botAssignment.liquidityPoolIds.map(id => new Types.ObjectId(id)) 
                    }
                }))
            })
        // Broadcast close-position request to all idle bots on this pool.
        // No round-robin: each bot owns and closes its own position.
        for (const bot of idleDlmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.DlmmPositionCloseRequested,
                    args: [bot.id],
                    payload: event,
                }
            )
        }
        for (const bot of activeDlmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.DlmmPositionOpenRequested,
                    args: [bot.id],
                    payload: event,
                }
            )
        }
    }
}