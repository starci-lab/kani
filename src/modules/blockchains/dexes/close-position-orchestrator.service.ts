import {
    Inject, Injectable 
} from "@nestjs/common"
import {
    LiquidityPoolStateService 
} from "./liquidity-pool-state.service"
import {
    BotSchema, DexId, InjectPrimaryMongoose, JobSchema, JobStatus, JobType, LiquidityPoolSchema, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    DexNotFoundException, DexNotImplementedException 
} from "@modules/exceptions"
import {
    RaydiumClosePositionActionService 
} from "./raydium"
import {
    OrcaClosePositionActionService 
} from "./orca"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./dexes.module-definition"
import {
    MeteoraClosePositionActionService 
} from "./meteora"
import {
    FlowXClosePositionActionService 
} from "./flowx"
import {
    CetusClosePositionActionService 
} from "./cetus"
import {
    TurbosClosePositionActionService 
} from "./turbos"
import {
    MomentumClosePositionActionService 
} from "./momentum"
import { 
    PrepareClosePositionResult, 
    ExecuteClosePositionParams,
    PrepareClosePositionParams, 
} from "../interfaces"
// import {
//     InjectQueue 
// } from "@nestjs/bullmq"
// import {
//     bullData, BullQueueName 
// } from "@modules/bullmq"
// import {
//     Queue 
// } from "bullmq"
// import {
//     ClosePositionPayload 
// } from "../types"
// import {
//     v4 
// } from "uuid"
import {
    Connection 
} from "mongoose"
import {
    envConfig 
} from "@modules/env"
import {
    SettlementService 
} from "../settlement"
import {
    v4 
} from "uuid"
import {
    ClosePositionPayload 
} from "../types"
import SuperJSON from "superjson"
import {
    DayjsService, InjectSuperJson 
} from "@modules/mixin"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    Queue 
} from "bullmq"
import {
    WinstonLog 
} from "@modules/winston"
import {
    WinstonService 
} from "@modules/winston"

@Injectable()
export class ClosePositionOrchestratorService {
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly raydiumClosePositionActionService: RaydiumClosePositionActionService,
        private readonly orcaClosePositionActionService: OrcaClosePositionActionService,
        private readonly meteoraClosePositionActionService: MeteoraClosePositionActionService,
        private readonly flowXClosePositionActionService: FlowXClosePositionActionService,
        private readonly cetusClosePositionActionService: CetusClosePositionActionService,
        private readonly turbosClosePositionActionService: TurbosClosePositionActionService,
        private readonly momentumClosePositionActionService: MomentumClosePositionActionService,
        // private readonly winstonService: WinstonService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly settlementService: SettlementService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<string>,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * === Error-handling convention (DEX orchestrators) ===
     *
     * Stages:
     * - Input validation: required params are missing/invalid (throw immediately)
     * - State validation: bot/pool/dex state is missing or inconsistent (throw immediately)
     * - On-chain / data fetch: fetching required dynamic state fails (throws from called service)
     * - Transaction building: DEX-specific builder throws (bubble up)
     * - Execution: DEX-specific executor throws (bubble up)
     */

    /** State validation: resolve a DEX record from memory storage or throw `DexNotFoundException`. */
    private getDexOrThrow(id: string) {
        const dex = this.primaryMemoryStorageService.dexCollection.findOne(
            {
                id: {
                    $eq: id,
                },
            }
        )
        if (!dex) {
            throw new DexNotFoundException({
                id 
            })
        }
        return dex
    }

    /**
     * State/config validation: ensure the DEX is enabled for this executor instance.
     * Throws `DexNotImplementedException` (existing behavior) when disabled.
     */
    private assertDexEnabledOrThrow(displayId: DexId) {
        if (!this.options.dexIds?.includes(displayId)) {
            throw new DexNotImplementedException({
                displayId 
            })
        }
    }

    async enqueue(
        {
            liquidityPool,
            bot,
            jobId,
            isRetry,
        }: EnqueueClosePositionParams,
    ) {
        /**
         * Safety check, if the active position is not set, return and remind user to open a position first
         */
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            return
        }
        /**
         * Check if current liquidity pool is belong to the active position
         */
        if (bot.activePosition.liquidityPool.toString() !== liquidityPool.id) {
            return
        }
        /**
         * Fetch latest liquidity pool state
         * (DLMM and non-DLMM pools have different state handlers)
         */
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        /**
         * Stage: state/config validation (DEX must exist and be enabled to enqueue)
         */
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dex.displayId)
        /**
         * Check if the position can be closed
         */
        const { settled } = await this.settlementService.settle(
            {
                bot,
                state,
            }
        )
        if (!settled) {
            return
        }
        if (!isRetry) {
        // Persist job record + set bot activeJob + enqueue in one transaction (same pattern as open-position).
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    const [jobRaw] = await this.connection.model<JobSchema>(
                        JobSchema.name
                    ).create(
                        [
                            {
                                _id: jobId,
                                liquidityPool: liquidityPool.id,
                                bot: bot.id,
                                executor: envConfig().executor.id,
                                type: JobType.ClosePosition,
                                status: JobStatus.Pending,
                            }
                        ],
                        {
                            session,
                        }
                    )
                    const job = jobRaw.toJSON<JobSchema>()
                    await this.connection.model<BotSchema>(BotSchema.name).updateOne(
                        {
                            _id: bot.id,
                        },
                        {
                            $set: {
                                activeJob: {
                                    job: job.id,
                                    liquidityPool: liquidityPool.id,
                                    jobType: JobType.ClosePosition,
                                    queuedAt: this.dayjsService.now().toDate(),
                                },
                            },
                        },
                        {
                            session,
                        }
                    )
                }
            )
        }
        // check if the job is already in the queue
        const jobInQueue = await this.closePositionQueue.getJob(bot.id)
        if (jobInQueue) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyEnqueued,
                {
                    jobId,
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return null
        }   
        const payload: ClosePositionPayload = {
            jobId,
            botId: bot.id,
            liquidityPoolId: liquidityPool.displayId,
            isRetry,
        }
        return await this.closePositionQueue.add(
            v4(),
            this.superjson.stringify(payload),
            {
                jobId: bot.id,
            }
        )
    }

    async prepare(params: PrepareClosePositionParams,
    ): Promise<PrepareClosePositionResult> {
        const { bot, state } = params
        // Stage: state/config validation (DEX must exist and be enabled for transaction building)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        this.assertDexEnabledOrThrow(dex.displayId)
        switch (dex.displayId) {
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.prepare({
                state,
                bot,
            })
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.prepare(params)
        }
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.prepare(params)
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.prepare(params)
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.prepare(params)
        }
        default: {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
        }
    }

    async execute(
        params: ExecuteClosePositionParams,
    ): Promise<void> {
        const { state } = params
        // Stage: state validation (DEX must exist for execution routing)
        const dexId = state.static.dex.toString()
        const dex = this.getDexOrThrow(dexId)
        // NOTE: existing behavior: execute() does not enforce `options.dexIds` (enabled DEX set).
        // We keep that behavior and document it here.
        switch (dex.displayId) {
        case DexId.Raydium: {
            return await this.raydiumClosePositionActionService.execute(params)
        }
        case DexId.Orca: {
            return await this.orcaClosePositionActionService.execute(params)
        }
        case DexId.Meteora: {
            return await this.meteoraClosePositionActionService.execute(params)
        }
        case DexId.FlowX: {
            return await this.flowXClosePositionActionService.execute(params)
        }
        case DexId.Cetus: {
            return await this.cetusClosePositionActionService.execute(params)
        }
        case DexId.Turbos: {
            return await this.turbosClosePositionActionService.execute(params)
        }
        case DexId.Momentum: {
            return await this.momentumClosePositionActionService.execute(params)
        }
        default: {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
        }
    }
}

export interface EnqueueClosePositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    jobId: string
    isRetry?: boolean
}