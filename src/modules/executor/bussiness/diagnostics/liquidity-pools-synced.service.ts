import {
    Injectable,
    OnModuleInit,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    PrimaryMemoryStorageService,
    LiquidityPoolSchema,
    LiquidityPoolId,
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    DayjsService,
    LokiJSService,
} from "@modules/mixin"
import {
    LiquidityPoolsSyncedDiagnosticReadinessCacheService
} from "@modules/cache"
import {
    EventEmitterService,
    EventName,
    LiquidityPoolsSyncedEventPayload 
} from "@modules/event"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import _ from "lodash"

export interface LiquidityPoolsSyncedDiagnosticMessage {
    ready: boolean
    ageMs?: number
}

@Injectable()
export class LiquidityPoolSyncedDiagnosticService
implements OnModuleInit, OnApplicationBootstrap {

    private liquidityPoolCollection: Collection<LiquidityPoolSchema>

    private results: Partial<
        Record<LiquidityPoolId, LiquidityPoolsSyncedDiagnosticMessage>
    >

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly lokiJSService: LokiJSService,
        private readonly dayjsService: DayjsService,
        private readonly liquidityPoolsSyncedDiagnosticReadinessCacheService: LiquidityPoolsSyncedDiagnosticReadinessCacheService,
        private readonly eventEmitterService: EventEmitterService,
    ) {}

    async onModuleInit() {
        this.liquidityPoolCollection =
            await this.lokiJSService.createCollection<LiquidityPoolSchema>(
                "liquidity-pools-synced-diagnostic-pools",
                {
                    indices: ["displayId",
                        "id"],
                }
            )

        const liquidityPools = this.primaryMemoryStorageService
            .liquidityPoolCollection.chain()
            .find({
                isActive: {
                    $eq: true 
                },
            })
            .data({
                removeMeta: true 
            })

        this.liquidityPoolCollection.clear()
        this.liquidityPoolCollection.insert(liquidityPools)
    }

    @OnEvent(EventName.ClmmLiquidityPoolsSynced)
    async handleLiquidityPoolsSynced(
        event: LiquidityPoolsSyncedEventPayload
    ) {
        this.winstonService.log(
            WinstonLog.ClmmLiquidityPoolsSyncedDiagnostic,
            {
                id: event.id 
            }
        )

        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.set({
            id: event.id,
        })
    }
    
    @OnEvent(EventName.DlmmLiquidityPoolsSynced)
    async handleDlmmLiquidityPoolsSynced(
        event: LiquidityPoolsSyncedEventPayload
    ) {
        this.winstonService.log(
            WinstonLog.DlmmLiquidityPoolsSyncedDiagnostic,
            {
                id: event.id 
            }
        )

        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.set({
            id: event.id,
        })
    }

    async diagnose(): Promise<
        Partial<Record<LiquidityPoolId, LiquidityPoolsSyncedDiagnosticMessage>>
        > {
        const cacheResult =
            await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.get()

        const results: Partial<
            Record<LiquidityPoolId, LiquidityPoolsSyncedDiagnosticMessage>
        > = {
        }

        for (const liquidityPool of this.liquidityPoolCollection.find()) {
            const result = cacheResult.results[liquidityPool.id]

            if (!result) {
                results[liquidityPool.id] = {
                    ready: false 
                }
                continue
            }

            const ageMs = this.dayjsService.now().diff(
                result.snapshotAt,
                "ms"
            )

            if (
                ageMs >
                envConfig().executor.diagnose.liquidityPoolsSynced.stale
            ) {
                results[liquidityPool.id] = {
                    ready: false,
                    ageMs,
                }
                continue
            }

            results[liquidityPool.id] = {
                ready: true,
                ageMs,
            }
        }

        return results
    }

    @Interval(envConfig().executor.diagnose.liquidityPoolsSynced.interval)
    async diagnoseInterval() {
        const newResults = await this.diagnose()

        if (!this.results) {
            this.results = newResults
            return
        }

        const prevResults = this.results

        const becameReady = _.pickBy(newResults,
            (v, k) =>
                v?.ready === true && prevResults[k]?.ready === false
        )

        const becameNotReady = _.pickBy(newResults,
            (v, k) =>
                v?.ready === false && prevResults[k]?.ready === true
        )

        if (!_.isEmpty(becameReady)) {
            const liquidityPools = _.uniqBy(
                this.liquidityPoolCollection.find({
                    id: {
                        $in: Object.keys(becameReady) 
                    },
                }),
                liquidityPool => liquidityPool.id
            )
            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameReady,
                {
                    syncAges: liquidityPools.map(liquidityPool => ({
                        liquidityPoolId: liquidityPool.displayId,
                        ageMs: newResults[liquidityPool.id]?.ageMs,
                    })),
                }
            )
            this.eventEmitterService.emit(
                {
                    event: EventName.LiquidityPoolsBecameReady,
                    payload: {
                        ids: Object.keys(becameReady),
                    },
                }
            )
        }

        if (!_.isEmpty(becameNotReady)) {
            const liquidityPools = _.uniqBy(
                this.liquidityPoolCollection.find({
                    id: {
                        $in: Object.keys(becameNotReady) 
                    },
                }),
                liquidityPool => liquidityPool.id
            )

            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameNotReady,
                {
                    syncAges: liquidityPools.map(liquidityPool => ({
                        liquidityPoolId: liquidityPool.displayId,
                        ageMs: newResults[liquidityPool.id]?.ageMs,
                    })),
                }
            )

            this.eventEmitterService.emit({
                event: EventName.LiquidityPoolsBecameNotReady,
                payload: {
                    ids: Object.keys(becameNotReady),
                },
            })
        }

        this.results = newResults
    }

    onApplicationBootstrap() {
        this.diagnoseInterval()
    }
}