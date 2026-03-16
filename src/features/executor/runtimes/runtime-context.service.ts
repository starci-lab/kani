import {
    BotSchema,
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    ClmmPositionCloseRequestedEventPayload,
    DlmmPositionOpenRequestedEventPayload,
    EventName,
    DlmmPositionCloseRequestedEventPayload,
    ClmmPositionOpenRequestedEventPayload,
} from "@modules/event"
import {
    Injectable,
} from "@nestjs/common"
import {
    EventEmitterService,
} from "@modules/event"
import {
    Connection,
} from "mongoose"
import {
    envConfig,
} from "@modules/env"
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
    BotNotFoundException,
} from "@modules/exceptions"
import {
    AsyncService,
} from "@modules/mixin"
import type {
    RuntimeState,
    RuntimeListener,
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

/**
 * Service responsible for managing the runtime context for a single bot.
 */
@Injectable()
export class RuntimeContextService {
    /**
     * Map of runtime states for each bot.
     */
    private readonly runtimeMap: Map<string, RuntimeState> = new Map()
    /**
     * Constructor.
     */
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly eventEmitterService: EventEmitterService,
        private readonly handleClmmPositionOpenRequestedEventService: HandleClmmPositionOpenRequestedEventService,
        private readonly handleDlmmPositionOpenRequestedEventService: HandleDlmmPositionOpenRequestedEventService,
        private readonly handleReconcileBalanceService: HandleReconcileBalanceService,
        private readonly handleClmmPositionCloseRequestedEventService: HandleClmmPositionCloseRequestedEventService,
        private readonly handleDlmmPositionCloseRequestedEventService: HandleDlmmPositionCloseRequestedEventService,
        private readonly handleWithdrawService: HandleWithdrawService,
        private readonly handleViolateIndicatorsService: HandleViolateIndicatorsService,
        private readonly handleNotSyncedService: HandleNotSyncedService,
        private readonly handleTransferFeesService: HandleTransferFeesService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Get the bot by id using the database connection as source of truth.
     *
     * @param id - The id of the bot to find.
     * @returns The bot.
     */
    async findBot(id: string) {
        /**
         * Find the bot by id.
         */
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(id)

        if (!bot) {
            /**
             * If the bot is not found, throw a bot not found exception.
             */
            throw new BotNotFoundException({
                id 
            })
        }

        /**
         * Return the bot.
         */
        return bot.toJSON()
    }

    /**
     * Get or create runtime state for a bot.
     *
     * @param id - The id of the bot to get or create the runtime state for.
     * @returns The runtime state.
     */
    private getOrCreateRuntimeState(
        id: string
    ): RuntimeState {
        /**
         * Get the existing runtime state for the bot.
         */
        const existing = this.runtimeMap.get(id)
        if (existing) {
            return existing
        }

        /**
         * Create a new runtime state for the bot.
         */
        const state: RuntimeState = {
            initialized: false,
            disposing: false,
            intervals: [],
            listeners: [],
        }

        /**
         * Set the runtime state for the bot.
         */
        this.runtimeMap.set(id,
            state)
        return state
    }

    /**
     * Subscribe to an event and retain the exact listener reference for cleanup.
     *
     * @param id - The id of the bot to subscribe to the event for.
     * @param event - The event to subscribe to.
     * @param listener - The listener to subscribe to the event.
     */
    private subscribe(
        id: string,
        event: EventName,
        listener: (event: unknown) => Promise<void>,
    ): void {
        /**
         * Get or create the runtime state for the bot.
         */
        const state = this.getOrCreateRuntimeState(id)

        const runtimeListener: RuntimeListener = {
            event,
            args: [id],
            listener,
        }

        /**
         * Subscribe to the event.
         */
        this.eventEmitterService.on(runtimeListener)
        state.listeners.push(runtimeListener)
    }

    /**
     * Invoke callback immediately and then schedule it periodically.
     *
     * @param id - The id of the bot to invoke and schedule the callback for.
     * @param interval - The interval to schedule the callback for.
     * @param callback - The callback to invoke and schedule.
     */
    private invokeAndSchedule(
        id: string,
        interval: number,
        callback: () => Promise<void>,
    ): void {
        /**
         * Get or create the runtime state for the bot.
         */
        const state = this.getOrCreateRuntimeState(id)

        /**
         * Run the callback once immediately.
         */
        void this.asyncService.safeRun(callback)

        /**
         * Set the interval to schedule the callback for.
         */
        const timer = setInterval(() => {
            void this.asyncService.safeRun(callback)
        },
        interval)

        /**
         * Add the interval to the runtime state.
         */
        state.intervals.push(timer)
    }

    /**
     * Initialize runtime lifecycle for a bot.
     *
     * @param id - The id of the bot to initialize the runtime lifecycle for.
     */
    initialize(
        id: string
    ): void {
        /**
         * Get or create the runtime state for the bot.
         */
        const state = this.getOrCreateRuntimeState(id)

        /**
         * If the bot is already initialized, return.
         */
        if (state.initialized) {
            return
        }

        /**
         * Set the initialized and disposing flags to true.
         */
        state.initialized = true
        state.disposing = false

        /**
         * Subscribe to the ClmmPositionOpenRequested event.
         */
        this.subscribe(
            id,
            EventName.ClmmPositionOpenRequested,
            async (event: ClmmPositionOpenRequestedEventPayload) => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleClmmPositionOpenRequestedEventService.process(
                            bot,
                            event,
                        )
                    }
                )
            },
        )

        /**
         * Subscribe to the DlmmPositionOpenRequested event.
         */
        this.subscribe(
            id,
            EventName.DlmmPositionOpenRequested,
            async (event: DlmmPositionOpenRequestedEventPayload) => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleDlmmPositionOpenRequestedEventService.process(
                            bot,
                            event,
                        )
                    }
                )
            },
        )

        /**
         * Subscribe to the ClmmPositionCloseRequested event.
         */
        this.subscribe(
            id,
            EventName.ClmmPositionCloseRequested,
            async (event: ClmmPositionCloseRequestedEventPayload) => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleClmmPositionCloseRequestedEventService.process(
                            bot,
                            event,
                        )
                    }
                )
            },
        )

        /**
         * Subscribe to the DlmmPositionCloseRequested event.
         */
        this.subscribe(
            id,
            EventName.DlmmPositionCloseRequested,
            async (event: DlmmPositionCloseRequestedEventPayload) => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleDlmmPositionCloseRequestedEventService.process(
                            bot,
                            event,
                        )
                    }
                )
            },
        )

        /**
         * Invoke and schedule the handleNotSyncedService.
         */
        this.invokeAndSchedule(
            id,
            envConfig().executor.runtime.operation.notSynced.interval,
            async () => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleNotSyncedService.process(bot)
                    }
                )
            },
        )

        /**
         * Invoke and schedule the handleReconcileBalanceService.
         */
        this.invokeAndSchedule(
            id,
            envConfig().executor.runtime.operation.reconcileBalance.interval.poll,
            async () => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleReconcileBalanceService.process(bot)
                    }
                )
            },
        )

        /**
         * Invoke and schedule the handleWithdrawService.
         */
        this.invokeAndSchedule(
            id,
            envConfig().executor.runtime.operation.withdraw.interval.poll,
            async () => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleWithdrawService.process(bot)
                    }
                )
            },
        )

        /**
         * Invoke and schedule the handleTransferFeesService.
         */
        this.invokeAndSchedule(
            id,
            envConfig().executor.runtime.operation.transferFees.interval.poll,
            async () => {
                await this.asyncService.safeRun(async () => {
                    const bot = await this.findBot(id)
                    await this.handleTransferFeesService.process(bot)
                })
            },
        )

        /**
         * Invoke and schedule the handleViolateIndicatorsService.
         */
        this.invokeAndSchedule(
            id,
            envConfig().executor.runtime.operation.violateIndicators.interval.poll,
            async () => {
                await this.asyncService.safeRun(
                    async () => {
                        const bot = await this.findBot(id)
                        await this.handleViolateIndicatorsService.process(bot)
                    }
                )
            },
        )
        
        this.winstonService.log(
            WinstonLog.BotRuntimeInitialized,
            {
                id,
            }
        )
    }

    /**
     * Dispose runtime lifecycle for a bot.
     *
     * @param id - The id of the bot to dispose the runtime lifecycle for.
     */
    async dispose(
        id: string
    ): Promise<void> {
        /**
         * Get the runtime state for the bot.
         */
        const state = this.runtimeMap.get(id)
        if (!state || state.disposing) {
            return
        }

        /**
         * Set the disposing flag to true.
         */
        state.disposing = true

        /**
         * Clear all intervals.
         */
        for (const timer of state.intervals) {
            clearInterval(timer)
        }
        state.intervals.length = 0

        /**
         * Unsubscribe from all events.
         */
        for (const runtimeListener of state.listeners) {
            this.eventEmitterService.off({
                event: runtimeListener.event,
                args: runtimeListener.args,
                listener: runtimeListener.listener,
            })
        }
        state.listeners.length = 0

        /**
         * Reset the initialized and disposing flags.
         */
        state.initialized = false
        state.disposing = false

        /**
         * Delete the runtime state for the bot.
         */
        this.runtimeMap.delete(id)
    }
}