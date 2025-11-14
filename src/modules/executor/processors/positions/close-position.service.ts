import { Inject, Injectable, Scope } from "@nestjs/common"
import { EventName, LiquidityPoolsFetchedEvent } from "@modules/event"
import { REQUEST } from "@nestjs/core"
import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { BotNotFoundException } from "@exceptions"

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
export class ClosePositionProcessorService {
    private bot: BotSchema
    constructor(
        // The request object injected into this processor. It contains
        // the `user` instance for whom the processor is running.
        @Inject(REQUEST)
        private readonly request: ClosePositionProcessorRequest,

        // Used to manually subscribe to events. We bind listeners here instead
        // of using @OnEvent so Nest doesn't override our request context.
        private readonly eventEmitter: EventEmitter2,
        // inject the connection to the database
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    // Register event listeners for this processor instance.
    // This lets every user have their own isolated event handling logic.
    async initialize() {
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
            (payload: LiquidityPoolsFetchedEvent) => {
                // find liquidity pools that are eligible to open a position
                console.log(this.bot.id)
            }
        )
    }
}

export interface ClosePositionProcessorRequest {
    bot: BotSchema
}