import {
    BotSchema, InjectPrimaryMongoose 
} from "@modules/databases"
import {
    EventName, 
    ExecutorBotUpdatedEventPayload,
} from "@modules/event"
import {
    Injectable, Scope, Inject 
} from "@nestjs/common"
import {
    REQUEST 
} from "@nestjs/core"
import {
    EventEmitterService 
} from "@modules/event"
import {
    Connection 
} from "mongoose"
import {
    RetryService 
} from "@modules/mixin"
import {
    WinstonService, WinstonLog
} from "@modules/winston"
import {
    envConfig 
} from "@modules/env"
import type {
    RuntimeContext,
} from "./types"
import {
    HandleClmmPositionOpenRequestedEventService,
    HandleDlmmPositionOpenRequestedEventService,
    HandleReconcileBalanceService,
    HandleClmmPositionCloseRequestedEventService,
    HandleDlmmPositionCloseRequestedEventService,
    HandleWithdrawService,
    HandleNotSyncedService,
} from "./handlers"

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
        private readonly retryService: RetryService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly winstonService: WinstonService,
        private readonly handleClmmPositionOpenRequestedEventService: HandleClmmPositionOpenRequestedEventService,
        private readonly handleDlmmPositionOpenRequestedEventService: HandleDlmmPositionOpenRequestedEventService,
        private readonly handleReconcileBalanceService: HandleReconcileBalanceService,
        private readonly handleClmmPositionCloseRequestedEventService: HandleClmmPositionCloseRequestedEventService,
        private readonly handleDlmmPositionCloseRequestedEventService: HandleDlmmPositionCloseRequestedEventService,
        private readonly handleWithdrawService: HandleWithdrawService,
        private readonly handleNotSyncedService: HandleNotSyncedService,
    ) { }

    private readonly executorBotUpdatedHandler = (
        event: ExecutorBotUpdatedEventPayload,
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
        event?: ExecutorBotUpdatedEventPayload,
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

    invokeAndSchedule(
        interval: number,
        callback: (bot: BotSchema) => void,
    ) {
        setInterval(() => {
            if (!this.bot) {
                return
            }
            callback(this.bot)
        },
        interval)
        if (!this.bot) {
            return
        }
        callback(this.bot)
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
                        this.winstonService.log(
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
                    this.eventEmitterService.on({
                        event: EventName.ExecutorBotUpdated,
                        args: [this.context.id],
                        listener: this.executorBotUpdatedHandler,
                    })
                    // subscribe to clmm position open requested events
                    this.eventEmitterService.on({
                        event: EventName.ClmmPositionOpenRequested,
                        args: [this.context.id],
                        listener: (event) => {
                            if (!this.bot) {
                                return
                            }
                            this.handleClmmPositionOpenRequestedEventService.process(
                                this.bot,
                                event
                            )
                        },
                    })
                    // subscribe to dlmm position open requested events
                    this.eventEmitterService.on({
                        event: EventName.DlmmPositionOpenRequested,
                        args: [this.context.id],
                        listener: (event) => {
                            if (!this.bot) {
                                return
                            }
                            this.handleDlmmPositionOpenRequestedEventService.process(
                                this.bot,
                                event
                            )
                        },
                    })
                    // subscribe to clmm position close requested events
                    this.eventEmitterService.on({
                        event: EventName.ClmmPositionCloseRequested,
                        args: [this.context.id],
                        listener: (event) => {
                            if (!this.bot) {
                                return
                            }
                            this.handleClmmPositionCloseRequestedEventService.process(
                                this.bot,
                                event
                            )
                        },
                    })
                    // subscribe to dlmm position close requested events
                    this.eventEmitterService.on({
                        event: EventName.DlmmPositionCloseRequested,
                        args: [this.context.id],
                        listener: (event) => {
                            if (!this.bot) {
                                return
                            }
                            this.handleDlmmPositionCloseRequestedEventService.process(this.bot,
                                event)
                        },
                    })
                    // invoke and schedule the handle not synced service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.notSynced.interval,
                        (bot) => this.handleNotSyncedService.process(bot),
                    )
                    // invoke and schedule the reconcile balance service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.reconcileBalance.interval.poll,
                        (bot) => this.handleReconcileBalanceService.process(bot),
                    )
                    // invoke and schedule the withdraw service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.withdraw.interval.poll,
                        (bot) => this.handleWithdrawService.process(bot),
                    )
                    // gradually load the initial executor state
                    setInterval(() => {
                        this.refreshBot()
                    }, 
                    envConfig().executor.runtime.interval.refresh
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
        this.eventEmitterService.off({
            event: EventName.ExecutorBotUpdated,
            args: [this.context.id],
            listener: this.executorBotUpdatedHandler,
        })
        // clear the cached bot
        this.bot = null
    }
}