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
    ClosePositionPayload 
} from "../types"
import {
    v4 
} from "uuid"
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
    WinstonLog, WinstonService 
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
        private readonly winstonService: WinstonService,
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<ClosePositionPayload>,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly settlementService: SettlementService,
    ) {}

    async enqueue(
        {
            liquidityPool,
            bot,
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
         * Validate that the pool's DEX exists
         */
        const dex = this.primaryMemoryStorageService.dexCollection.findOne({
            id: {
                $eq: state.static.dex.toString(),
            },
        })
        if (!dex) {
            throw new DexNotFoundException({
                id: state.static.dex.toString(),
            })
        }   
        /**
         * Ensure the DEX is supported by current bot configuration
         */
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
        /**
         * Check if the position can be closed
         */
        const { settled, reason } = await this.settlementService.settle({
            bot,
            state,
        })
        console.log(settled,
            reason)
        if (!settled) {
            return
        }
        /**
             * Persist job record.
             */
        const [ jobRaw ] = await this.connection.model<JobSchema>(
            JobSchema.name
        ).create(
            [
                {
                    liquidityPool: liquidityPool.id,
                    bot: bot.id,
                    executor: envConfig().executor.id,
                    type: JobType.ClosePosition,
                    status: JobStatus.Pending,
                }
            ]
        )
        /**
            * Add close position job to the queue
            */
        await this.closePositionQueue.add(
            v4(),
            {
                jobId: jobRaw.toJSON().id,
                botId: bot.id,
                liquidityPoolId: liquidityPool.displayId,
            }
        )
        /**
            * Structured logging for observability.
            */
        this.winstonService.log(
            WinstonLog.ClosePositionEnqueued,
            {
                botId: bot.id,
                liquidityPoolId: liquidityPool.displayId,
            }
        )
    }

    async prepare(params: PrepareClosePositionParams,
    ): Promise<PrepareClosePositionResult> {
        const { bot, state } = params
        const dex = this.primaryMemoryStorageService.dexCollection.findOne({
            id: {
                $eq: state.static.dex.toString(),
            },
        })
        if (!dex) throw new DexNotFoundException({
            id: state.static.dex.toString(),
        })
        if (!this.options.dexIds?.includes(dex.displayId)) {
            throw new DexNotImplementedException({
                id: state.static.dex.toString(),
            })
        }
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
        const dex = this.primaryMemoryStorageService.dexCollection.findOne({
            id: {
                $eq: state.static.dex.toString(),
            },
        })
        if (!dex) throw new DexNotFoundException({
            id: state.static.dex.toString(),
        })
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
}