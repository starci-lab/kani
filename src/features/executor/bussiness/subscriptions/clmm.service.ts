import {
    EventName, 
    ClmmLiquidityPoolsSyncedEventPayload,
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
} from "../rotation"
import {
    Connection 
} from "mongoose"
import {
    BotSchema, 
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    Types 
} from "mongoose"

@Injectable()
export class ClmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly rotationService: RotationService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}
    
    /**
     * Triggered when CLMM liquidity pools are fetched.
     *
     * Intent:
     * - Fan-out the opportunity to open positions
     * - Bots are currently IDLE (no active liquidity pool)
     *
     * Pattern:
     * - BROADCAST (not load-balancing)
     * - Deterministic fan-out
     */
    @OnEvent(EventName.ClmmLiquidityPoolsSynced)
    async handleClmmLiquidityPoolsSynced(
        event: ClmmLiquidityPoolsSyncedEventPayload
    ) {
        const idleClmmBots = await this.connection.model<BotSchema>(BotSchema.name).find({
            // match executor
            executor: {
                $eq: envConfig().executor.id,
            },
            // no position assigned
            activePosition: {
                $exists: false,
            },
            activeJob: {
                $exists: false,
            },
            running: {
                $eq: true,
            },
            liquidityPools: {
                $in: [new Types.ObjectId(event.id)] 
            },
            // where liquidity pools assigned
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
        const activeClmmBots = await this.connection.model<BotSchema>(BotSchema.name).find({
            executor: {
                $eq: envConfig().executor.id,
            },
            activePosition: {
                $exists: true,
                $ne: null,
            },
            activeJob: {
                $exists: false,
            },
            liquidityPools: {
                $in: [new Types.ObjectId(event.id)] 
            },
        })
        // Broadcast open-position request to all idle bots on this pool.
        // No round-robin: each bot owns and opens its own position.
        for (const bot of idleClmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.ClmmPositionOpenRequested,
                    args: [bot.id],
                    payload: event,
                }
            )
        }
        for (const bot of activeClmmBots) {
            this.eventEmitterService.emit(
                {
                    event: EventName.ClmmPositionCloseRequested,
                    args: [bot.id],
                    payload: event,
                }
            )
        }
    }
}