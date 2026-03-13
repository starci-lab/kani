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
    InjectPrimaryMongoose,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    envConfig
} from "@modules/env"
import {
    Types
} from "mongoose"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    LiquidityPoolNotFoundException
} from "@modules/exceptions"

@Injectable()
export class ClmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly rotationService: RotationService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

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
        event: ClmmLiquidityPoolsSyncedEventPayload,
    ) {
        const idleClmmBots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                // match executor
                executor: {
                    $eq: new Types.ObjectId(envConfig().executor.id),
                },
                // no position assigned
                activePosition: {
                    $exists: false,
                },
                // no active job
                activeJob: {
                    $exists: false,
                },
                // running
                running: {
                    $eq: true,
                },
                // match liquidity pool
                liquidityPools: {
                    $in: [new Types.ObjectId(event.id)],
                },
                // where liquidity pools assigned
                $or: Array.from(
                    this.rotationService.botAssignments.entries()).map(
                    ([botId,
                        botAssignment]) => ({
                        _id: new Types.ObjectId(botId),
                        liquidityPools: {
                            $in: botAssignment.liquidityPoolIds.map(
                                (id) => new Types.ObjectId(id),
                            ),
                        },
                    }),
                ),
            }
            )
        const activeClmmBots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                executor: {
                    $eq: new Types.ObjectId(envConfig().executor.id),
                },
                activePosition: {
                    $exists: true,
                },
                "activePosition.liquidityPool": {
                    $eq: new Types.ObjectId(event.id),
                },
                "activePosition.positionClosed": {
                    $ne: true 
                },
                activeJob: {
                    $exists: false,
                },
            }
            )
        const liquidityPool =
            this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
                {
                    id: {
                        $eq: event.id,
                    },
                }
            )
        console.log(`${liquidityPool?.displayId}: ${activeClmmBots.length}`)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: event.id,
            })
        }
        this.winstonService.log(
            WinstonLog.ClmmLiquidityPoolsSynced,
            {
                liquidityPoolId: liquidityPool.displayId,
                idleClmmBots: idleClmmBots.length,
                activeClmmBots: activeClmmBots.length,
            }
        )
        // Broadcast open-position request to all idle bots on this pool.
        // No round-robin: each bot owns and opens its own position.
        for (const bot of idleClmmBots) {
            this.eventEmitterService.emit({
                event: EventName.ClmmPositionOpenRequested,
                args: [bot.id],
                payload: event,
            })
        }
        for (const bot of activeClmmBots) {
            this.eventEmitterService.emit({
                event: EventName.ClmmPositionCloseRequested,
                args: [bot.id],
                payload: event,
            })
        }
    }
}
