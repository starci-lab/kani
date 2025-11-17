import { Inject, Injectable, Scope } from "@nestjs/common"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { BotSchema } from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import { BotNotFoundException } from "@exceptions"
import { DispatchOpenPositionService } from "@modules/blockchains"
import { MutexService } from "@modules/lock"
import { Mutex } from "async-mutex"
import { getMutexKey, MutexKey } from "@modules/lock"
import { createObjectId } from "@utils"

// open position processor service is to process the open position of the liquidity pools
// to determine if a liquidity pool is eligible to open a position
// OpenPositionProcessorService
// This class handles all logic related to opening positions for a specific user.
// It runs inside its own request-scoped DI context so each processor instance
// gets its own `bot` state. Using `durable: true` allows Nest to reuse this
// processor across events that belong to the same logical bot context”.

@Injectable({
    scope: Scope.REQUEST,
    durable: true,
})
export class OpenPositionProcessorService  {
    private bot: BotSchema
    private mutex: Mutex
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: OpenPositionProcessorRequest,
        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        // inject the connection to the database
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dispatchOpenPositionService: DispatchOpenPositionService,
        private readonly mutexService: MutexService,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
        // initialize the mutex
        this.mutexService.mutex(
            getMutexKey(
                MutexKey.OpenPosition, 
                this.request.bot.id
            ))
        // re query the bot to ensure data is up to date
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(this.request.bot.id)
        if (!bot) {
            // bot not found, we skip here
            throw new BotNotFoundException(`Bot not found with id: ${this.request.bot.id}`)
        }
        // assign the bot to the instance
        this.bot = bot.toJSON()
        // register event listeners
        this.eventEmitter.on(
            EventName.InternalLiquidityPoolsFetched,
            async (payload: LiquidityPoolsFetchedEvent) => {
                // only run if the liquidity pool is belong to the bot
                if (
                    !bot.liquidityPools
                        .map((liquidityPool) => liquidityPool.toString())
                        .includes(createObjectId(payload.liquidityPoolId).toString())
                )
                {
                    // skip if the liquidity pool is not belong to the bot
                    return
                }
                // run the open position
                await this.dispatchOpenPositionService.dispatchOpenPosition({
                    liquidityPoolId: payload.liquidityPoolId,
                    bot: this.bot,
                })
            }
        )
    }
}

export interface OpenPositionProcessorRequest {
    bot: BotSchema
}