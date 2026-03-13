import {
    BotsLoaderService 
} from "../../loaders"
import {
    Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    Interval 
} from "@nestjs/schedule"
import {
    envConfig 
} from "@modules/env"
import {
    BotSchema, 
    InjectPrimaryMongoose,
    LiquidityPoolId,
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    BipartiteMatchingService 
} from "@modules/graph"
import {
    Connection 
} from "mongoose"
import {
    CacheKey,
    CacheService, 
    RotationBotAssignment
} from "@modules/cache"
import {
    DayjsService
} from "@modules/mixin"
import {
    WinstonService,
    WinstonLog,
} from "@modules/winston"
import {
    RotationBot 
} from "./types"
import _ from "lodash"

/**
 * Rotation Service
 * 
 * Rotate the bots to the liquidity pools.
 */
const MAX_POOLS_PER_BOT = 2

@Injectable()
export class RotationService implements OnModuleInit {
    public botAssignments: Map<string, Omit<RotationBotAssignment, "botId">> = new Map()

    constructor(
        private readonly cacheService: CacheService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly bipartiteMatchingService: BipartiteMatchingService,
        private readonly dayjsService: DayjsService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(BotsLoaderService.name)
        this.readinessWatcherFactoryService.createWatcher(RotationService.name)
        await this.rotate() 
        this.readinessWatcherFactoryService.setReady(RotationService.name)
    }

    /**
     * Process rotation.
     */
    private async processRotation() {
        // 1. Cache check.
        const cachedResult = await this.cacheService.get({
            key: CacheKey.RotationBotAssignments,
            args: [],
        })
          
        if (
            cachedResult &&
              cachedResult.results.length > 0 &&
              this.dayjsService
                  .now()
                  .diff(cachedResult.snapshotAt.toDate(),
                      "ms") <=
                envConfig().cache.stale.rotationBotAssignmentsMaxAgeMs
        ) {
            this.botAssignments = new Map(
                cachedResult.results.map(r => [
                    r.botId,
                    {
                        liquidityPoolIds: r.liquidityPoolIds 
                    },
                ])
            )
            return
        }
          
        // 2. Load bots from DB.
        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                executor: {
                    $eq: envConfig().executor.id 
                } 
            })
          
        // Convert to rotation model
        const rotationBots: RotationBot[] = bots.map(bot => ({
            id: bot.id,
            liquidityPoolIds: bot.liquidityPools?.map(p => p.toString()) ?? [],
            assignedLiquidityPoolIds: [],
        }))
          
        // 3. Collect unique liquidity pools.
        const liquidityPoolSet = new Set<string>()
        for (const bot of rotationBots) {
            for (const poolId of bot.liquidityPoolIds) {
                liquidityPoolSet.add(poolId)
            }
        }
          
        const liquidityPoolIds = Array.from(liquidityPoolSet)
          
        // 4. Build bot slots (max 2 per bot).
        const botSlots: Array<string> = []
        for (const bot of rotationBots) {
            for (let i = 0; i < MAX_POOLS_PER_BOT; i++) {
                botSlots.push(`${bot.id}#${i}`) // ⚠ MUST MATCH EDGE FORMAT
            }
        }
          
        const botSlotIndex = new Map<string, number>()
        const poolIndex = new Map<string, number>()
          
        botSlots.forEach((id, i) => botSlotIndex.set(id,
            i))
        liquidityPoolIds.forEach((id, i) => poolIndex.set(id,
            i))
          
        // 5. Build edges (bot slot → pool).
        const edges: Array<[number, number]> = []
          
        for (const bot of rotationBots) {
            for (let i = 0; i < MAX_POOLS_PER_BOT; i++) {
                const slotId = `${bot.id}#${i}`
                const u = botSlotIndex.get(slotId)
                if (u === undefined) continue
          
                for (const poolId of bot.liquidityPoolIds) {
                    const v = poolIndex.get(poolId)
                    if (v === undefined) continue
                    edges.push([u,
                        v])
                }
            }
        }
          
        // 6. Run matching.
        const { result } = this.bipartiteMatchingService.find({
            n: botSlots.length,
            m: liquidityPoolIds.length,
            edges,
        })
          
        // 7. Apply matching result.
        const botMap = new Map(rotationBots.map(b => [b.id,
            b]))
          
        for (const [u,
            v] of result) {
            const slot = botSlots[u]
            if (!slot) continue
          
            const [botId] = slot.split("#")
            const liquidityPoolId = liquidityPoolIds[v]
            if (!liquidityPoolId) continue
          
            const bot = botMap.get(botId)
            if (!bot) continue
          
            bot.assignedLiquidityPoolIds.push(liquidityPoolId)
        }
          
        // 8. Supplement (ensure up to 2 pools per bot).
        for (const bot of rotationBots) {
            if (bot.assignedLiquidityPoolIds.length >= MAX_POOLS_PER_BOT) continue
          
            const remainingPools = bot.liquidityPoolIds.filter(
                poolId => !bot.assignedLiquidityPoolIds.includes(poolId)
            )
          
            if (remainingPools.length === 0) continue
          
            const need = MAX_POOLS_PER_BOT - bot.assignedLiquidityPoolIds.length
            const toAdd = _.sampleSize(remainingPools,
                need)
          
            bot.assignedLiquidityPoolIds.push(...toAdd)
        }
          
        // 9. Build results.
        const results: Array<RotationBotAssignment> = rotationBots.map(bot => ({
            botId: bot.id,
            liquidityPoolIds: bot.assignedLiquidityPoolIds,
        }))
          
        // 10. Cache result.
        await this.cacheService.set({
            key: CacheKey.RotationBotAssignments,
            args: [],
            cacheResult: {
                results,
                snapshotAt: this.dayjsService.now(),
            },
        })
          
        // 11. Build in-memory map.
        this.botAssignments = new Map(
            results.map(result => [
                result.botId,
                {
                    liquidityPoolIds: result.liquidityPoolIds 
                },
            ])
        )          
    }
    /**
     * Rotate the bots to the liquidity pools.
     */
    async rotate() {
        await this.processRotation()
        const assignedPoolIds = Array.from(this.botAssignments.values())
            .flatMap(botAssignment => botAssignment.liquidityPoolIds)

        const liquidityPools = assignedPoolIds
            .map((id) => this.primaryMemoryStorageService.liquidityPoolMap.get(id))
            .filter((p): p is NonNullable<typeof p> => p != null)

        // build fast lookup map: poolId -> displayId
        const liquidityPoolIdMap = new Map<string, LiquidityPoolId>()
        for (const liquidityPool of liquidityPools) {
            liquidityPoolIdMap.set(
                liquidityPool.id,
                liquidityPool.displayId
            )
        }
        // build log results
        const logResults = Object.fromEntries(
            Array.from(
                this.botAssignments.entries())
                .map(
                    ([botId,
                        assignment]) => [
                        botId,
                        assignment.liquidityPoolIds.map(
                            id => liquidityPoolIdMap.get(id)!
                        ),
                    ],
                ),
        )
        // log the results
        this.winstonService.log(
            WinstonLog.RotationBotAssignments,
            {
                results: logResults 
            },
        )
    }

    /**
     * Rotate the bots to the liquidity pools at interval.
     */
    @Interval(envConfig().executor.interval.rotate)
    async rotateInterval() {
        await this.rotate()
    }
}