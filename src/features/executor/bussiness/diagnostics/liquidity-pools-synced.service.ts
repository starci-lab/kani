import {
    Injectable,
    OnModuleInit,
    OnApplicationBootstrap,
} from "@nestjs/common"
import type {
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    DayjsService, LokiJSService 
} from "@modules/mixin"
import {
    LiquidityPoolsSyncedDiagnosticReadinessCacheService,
} from "@modules/cache"
import {
    EventEmitterService,
    EventName,
    LiquidityPoolsSyncedEventPayload,
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
import {
    Collection 
} from "lokijs"
import _ from "lodash"
import type {
    LiquidityPoolsSyncedDiagnosticMessage 
} from "../types"
  
  @Injectable()
export class LiquidityPoolSyncedDiagnosticService
implements OnModuleInit, OnApplicationBootstrap
{
    private liquidityPoolCollection: Collection<LiquidityPoolSchema>
  
    // Map<poolId, { snapshotAt }>
    private results: Map<string, LiquidityPoolsSyncedDiagnosticMessage> =
        new Map()
  
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
        await this.lokiJSService.createCollection<LiquidityPoolSchema>({
            name: "liquidity-pools-synced-diagnostic-pools",
            options: {
                indices: ["displayId",
                    "id"],
            },
        })
  
        const liquidityPools =
        this.primaryMemoryStorageService.liquidityPoolCollection
            .chain()
            .find({
                isActive: {
                    $eq: true 
                } 
            })
            .data({
                removeMeta: true 
            })
  
        this.liquidityPoolCollection.clear()
        this.liquidityPoolCollection.insert(liquidityPools)
    }
  
    /* ================= EVENTS ================= */
  
    @OnEvent(EventName.ClmmLiquidityPoolsSynced)
    async handleClmmSynced(event: LiquidityPoolsSyncedEventPayload) {
        this.winstonService.log(
            WinstonLog.ClmmLiquidityPoolsSyncedDiagnostic,
            {
                id: event.id 
            },
        )
        await this.updateAndCheckDiff(event.id)
    }
  
    @OnEvent(EventName.DlmmLiquidityPoolsSynced)
    async handleDlmmSynced(event: LiquidityPoolsSyncedEventPayload) {
        this.winstonService.log(
            WinstonLog.DlmmLiquidityPoolsSyncedDiagnostic,
            {
                id: event.id 
            },
        )
        await this.updateAndCheckDiff(event.id)
    }
  
    /* ================= CORE ================= */
  
    private isReady(msg?: LiquidityPoolsSyncedDiagnosticMessage): boolean {
        if (!msg?.snapshotAt) return false
  
        const stale =
        envConfig().executor.diagnose.liquidityPoolsSynced.stale
  
        const ageMs = this.dayjsService.now().diff(msg.snapshotAt,
            "ms")
        return ageMs <= stale
    }
  
    private async updateAndCheckDiff(id: string): Promise<void> {
        const prevResult = this.results.get(id)
        const prevReady = this.isReady(prevResult)
  
        // update cache snapshot
        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.set({
            id,
        })
  
        const cache =
        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.get()
  
        const cached = cache.results[id]
        if (!cached) return
  
        const snapshotAt = this.dayjsService.from(cached.snapshotAt)
  
        const newResult: LiquidityPoolsSyncedDiagnosticMessage = {
            snapshotAt,
        }
  
        this.results.set(id,
            newResult)
  
        const newReady = this.isReady(newResult)
  
        const becameReady = !prevReady && newReady
        const becameNotReady = prevReady && !newReady
  
        const liquidityPool = this.liquidityPoolCollection.findOne({
            id 
        })
        if (!liquidityPool) return
  
        if (becameReady) {
            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameReady,
                {
                    syncAges: [
                        {
                            liquidityPoolId: liquidityPool.displayId,
                            ageMs: this.dayjsService
                                .now()
                                .diff(snapshotAt,
                                    "ms"),
                        },
                    ],
                },
            )
            this.eventEmitterService.emit({
                event: EventName.LiquidityPoolsBecameReady,
                payload: {
                    ids: [id] 
                },
            })
        }
  
        if (becameNotReady) {
            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameNotReady,
                {
                    syncAges: [
                        {
                            liquidityPoolId: liquidityPool.displayId,
                            ageMs: this.dayjsService
                                .now()
                                .diff(snapshotAt,
                                    "ms"),
                        },
                    ],
                },
            )
            this.eventEmitterService.emit({
                event: EventName.LiquidityPoolsBecameNotReady,
                payload: {
                    ids: [id] 
                },
            })
        }
    }
  
    /* ================= FULL SCAN ================= */
  
    async diagnose(): Promise<
      Map<string, LiquidityPoolsSyncedDiagnosticMessage>
      > {
        const cache =
        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.get()
  
        const results = new Map<
        string,
        LiquidityPoolsSyncedDiagnosticMessage
      >()
  
        for (const pool of this.liquidityPoolCollection.find()) {
            const cached = cache.results[pool.id]
            if (!cached) continue
  
            results.set(pool.id,
                {
                    snapshotAt: this.dayjsService.from(cached.snapshotAt),
                })
        }
  
        return results
    }
  
    @Interval(envConfig().executor.diagnose.liquidityPoolsSynced.interval)
    async diagnoseInterval() {
        const newResults = await this.diagnose()
  
        if (this.results.size === 0) {
            this.results = new Map(newResults)
            return
        }
  
        const becameReady: string[] = []
        const becameNotReady: string[] = []
  
        for (const [id,
            newResult] of newResults.entries()) {
            const prevResult = this.results.get(id)
  
            const prevReady = this.isReady(prevResult)
            const newReady = this.isReady(newResult)
  
            if (!prevReady && newReady) becameReady.push(id)
            if (prevReady && !newReady) becameNotReady.push(id)
        }
  
        if (becameReady.length > 0) {
            const pools = _.uniqBy(
                this.liquidityPoolCollection.find({
                    id: {
                        $in: becameReady 
                    },
                }),
                (p) => p.id,
            )
  
            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameReady,
                {
                    syncAges: pools.map((p) => ({
                        liquidityPoolId: p.displayId,
                        ageMs: this.dayjsService
                            .now()
                            .diff(
                                newResults.get(p.id)?.snapshotAt ??
                    this.dayjsService.now(),
                                "ms",
                            ),
                    })),
                },
            )
  
            this.eventEmitterService.emit({
                event: EventName.LiquidityPoolsBecameReady,
                payload: {
                    ids: becameReady 
                },
            })
        }
  
        if (becameNotReady.length > 0) {
            const pools = _.uniqBy(
                this.liquidityPoolCollection.find({
                    id: {
                        $in: becameNotReady 
                    },
                }),
                (p) => p.id,
            )
  
            this.winstonService.log(
                WinstonLog.LiquidityPoolsBecameNotReady,
                {
                    syncAges: pools.map((p) => ({
                        liquidityPoolId: p.displayId,
                        ageMs: this.dayjsService
                            .now()
                            .diff(
                                newResults.get(p.id)?.snapshotAt ??
                    this.dayjsService.now(),
                                "ms",
                            ),
                    })),
                },
            )
  
            this.eventEmitterService.emit({
                event: EventName.LiquidityPoolsBecameNotReady,
                payload: {
                    ids: becameNotReady 
                },
            })
        }
  
        this.results = new Map(newResults)
    }
  
    onApplicationBootstrap() {
        this.diagnoseInterval()
    }
}
  