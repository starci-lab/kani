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
    LiquidityPoolAssignmentsRotationService 
} from "./liquidity-pool-assignments-rotation.service"

@Injectable()
export class ClmmSubscriptionService {
    constructor(
        private readonly eventEmitterService: EventEmitterService,
        private readonly liquidityPoolAssignmentsRotationService: LiquidityPoolAssignmentsRotationService,
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
        // Select bots that are currently idle and associated with THIS CLMM pool
        // const idleClmmBots =
        //     this.liquidityPoolAssignmentsRotationService.botAssignmentsCollection.find()
        //         .filter((bot) => !bot.activePosition)
        //         .filter((bot) => bot.liquidityPools.some((liquidityPool) => liquidityPool?.toString() === event.id))
        const idleClmmBots = this.liquidityPoolAssignmentsRotationService.botAssignmentsCollection.find(
            {
                activePosition: {
                    $eq: undefined,
                },
                liquidityPools: {
                    $where: (liquidityPools: Array<string>) => liquidityPools.includes(event.id),
                },
            }
        )
        const activeClmmBots = this.liquidityPoolAssignmentsRotationService.botAssignmentsCollection.find(
            {
                liquidityPools: {
                    $where: (liquidityPools: Array<string>) => liquidityPools.includes(event.id),
                },
                activePosition: {
                    $ne: undefined,
                },
            }
        )
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