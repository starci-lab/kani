import {
    BotSchema, InjectPrimaryMongoose 
} from "@modules/databases"
import {
    EventName,
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
    HandleViolateIndicatorsService,
    HandleNotSyncedService,
    HandleTransferFeesService,
} from "./handlers"
import {
    BotNotFoundException 
} from "@modules/exceptions"

@Injectable(
    {
        scope: Scope.REQUEST,
        durable: true,
    }
)
export class RuntimeContextService {
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
        private readonly handleViolateIndicatorsService: HandleViolateIndicatorsService,
        private readonly handleNotSyncedService: HandleNotSyncedService,
        private readonly handleTransferFeesService: HandleTransferFeesService,
    ) { }

    /**
     * Get the bot by id using the database connection as source of truth.
     *
     * @returns The bot schema.
     */
    async findBot() {
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(this.context.id)
        if (!bot) {
            throw new BotNotFoundException(
                {
                    id: this.context.id,
                }
            )
        }
        return bot.toJSON()
    }

    /**
     * Invoke and schedule a callback at a given interval.
     *
     * @param interval - The interval in milliseconds.
     * @param callback - The callback to invoke.
     */
    invokeAndSchedule(
        interval: number,
        callback: () => Promise<void>,
    ) {
        setInterval(async () => {
            await callback()
        },
        interval)
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
                    // subscribe to clmm position open requested events
                    this.eventEmitterService.on({
                        event: EventName.ClmmPositionOpenRequested,
                        args: [this.context.id],
                        listener: async (event) => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            this.handleClmmPositionOpenRequestedEventService.process(
                                bot,
                                event
                            )
                        },
                    })
                    // subscribe to dlmm position open requested events
                    this.eventEmitterService.on({
                        event: EventName.DlmmPositionOpenRequested,
                        args: [this.context.id],
                        listener: async (event) => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            this.handleDlmmPositionOpenRequestedEventService.process(
                                bot,
                                event
                            )
                        },
                    })
                    // subscribe to clmm position close requested events
                    this.eventEmitterService.on({
                        event: EventName.ClmmPositionCloseRequested,
                        args: [this.context.id],
                        listener: async (event) => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            this.handleClmmPositionCloseRequestedEventService.process(
                                bot,
                                event
                            )
                        },
                    })
                    // subscribe to dlmm position close requested events
                    this.eventEmitterService.on({
                        event: EventName.DlmmPositionCloseRequested,
                        args: [this.context.id],
                        listener: async (event) => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            this.handleDlmmPositionCloseRequestedEventService.process(
                                bot,
                                event
                            )
                        },
                    })
                    // invoke and schedule the handle not synced service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.notSynced.interval,
                        async () => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            await this.handleNotSyncedService.process(
                                bot
                            )
                        },
                    )
                    // invoke and schedule the transfer fees service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.reconcileBalance.interval.poll,
                        async () => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            // handle reconcile balance
                            await this.handleReconcileBalanceService.process(
                                bot
                            )
                        },
                    )
                    // invoke and schedule the withdraw service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.withdraw.interval.poll,
                        async () => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            await this.handleWithdrawService.process(
                                bot
                            )
                        },
                    )
                    // invoke and schedule the transfer fees service
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.transferFees.interval.poll,
                        async () => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            await this.handleTransferFeesService.process(
                                bot
                            )
                        },
                    )
                    // invoke and schedule the violate indicators handler (loop over each indicator)
                    this.invokeAndSchedule(
                        envConfig().executor.runtime.operation.violateIndicators.interval.poll,
                        async () => {
                            const bot = await this.findBot()
                            if (!bot) {
                                return
                            }
                            await this.handleViolateIndicatorsService.process(
                                bot,
                            )
                        },
                    )
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
    }
}