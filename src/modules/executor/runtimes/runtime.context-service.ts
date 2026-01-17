import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { createEventName, EventName, ExecutorBotUpdatedEvent } from "@modules/event"
import { Injectable, Scope, Inject } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { Connection } from "mongoose"
import { RetryService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"

@Injectable(
    {
        scope: Scope.REQUEST,
        durable: true,
    }
)
export class RuntimeContextService {
    /**
     * Cached bot state for the current request lifecycle.
     *
     * This value is refreshed either from the database or from the
     * `BotUpdatedEvent` payload.
     */
    private bot: BotSchema | null = null

    constructor(
        @Inject(REQUEST)
        private readonly context: RuntimeContext,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly eventEmitter2: EventEmitter2,
        private readonly retryService: RetryService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) { }

    private readonly botUpdatedHandler = (
        event: ExecutorBotUpdatedEvent,
    ) => {
        this.refreshBot(event)
    }

    /**
     * Update the cached bot state.
     *
     * - If an event is provided, use the bot from the event.
     * - Otherwise, fetch the bot from the database.
     */
    private async refreshBot(
        event?: ExecutorBotUpdatedEvent,
    ) {
        if (event) {
            this.bot = event
        } else {
            const bot = await this.connection
                .model<BotSchema>(BotSchema.name)
                .findById(this.context.id)

            if (!bot) {
                return
            }
            this.bot = bot.toJSON()
        }
    }

    /**
     * Initialize the runtime request lifecycle.
     *
     * - Subscribes to executor update events
     * - Loads the initial executor state
     */
    async initialize() {
        await this.retryService.retry(
            {
                // set the maximum retry time to infinity
                options: {
                    maxRetryTime: Infinity,
                    onFailedAttempt: (context) => {
                        this.logger.error(
                            WinstonLog.ExecutorRuntimeInitializationFailed, 
                            { 
                                error: context.error.message, 
                                executorId: this.context.id 
                            }
                        )
                    },
                },
                // set the action to initialize the runtime
                action: async () => {
                    // subscribe to executor updated events
                    this.eventEmitter2.on(
                        createEventName(
                            EventName.ExecutorBotUpdated,
                            {
                                id: this.context.id
                            }
                        ),
                        this.botUpdatedHandler,
                    )
                    // load the initial executor state
                    await this.refreshBot()
                }
            }
        )
    }

    /**
     * Dispose the runtime request lifecycle.
     *
     * Called when the request scope is destroyed.
     */
    async dispose() {
        if (!this.bot) {
            return
        }
        // unsubscribe from the executor updated event
        this.eventEmitter2.off(
            createEventName(
                EventName.ExecutorBotUpdated,
                {
                    id: this.context.id
                }
            ),
            this.botUpdatedHandler,
        )
        // clear the cached bot
        this.bot = null
    }

}


export interface RuntimeContext {
    id: string
}