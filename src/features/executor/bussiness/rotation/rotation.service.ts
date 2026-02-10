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
    BotSchema 
} from "@modules/databases"
import {
    BipartiteMatchingService 
} from "@modules/graph"
import {
    Types 
} from "mongoose"
import {
    CacheKey,
    CacheService, 
    RotationBotAssignmentsResult
} from "@modules/cache"
import {
    DayjsService 
} from "@modules/mixin"
import {
    LokiJSService 
} from "@modules/mixin"
import {
    Collection 
} from "lokijs"

/**
 * Rotation Service
 * 
 * Rotate the bots to the liquidity pools.
 */
@Injectable()
export class RotationService implements OnModuleInit {
    public botAssignmentsCollection: Collection<BotSchema>
    constructor(
        private readonly cacheService: CacheService,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly bipartiteMatchingService: BipartiteMatchingService,
        private readonly dayjsService: DayjsService,
        private readonly lokiJSService: LokiJSService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(BotsLoaderService.name)
        this.botAssignmentsCollection = await this.lokiJSService.createCollection<BotSchema>({
            name: "executor-bot-assignments",
            options: {
                indices: ["id"],
            },
        })
        this.readinessWatcherFactoryService.createWatcher(RotationService.name)
        this.rotate()
        this.readinessWatcherFactoryService.setReady(RotationService.name)
    }

    /**
     * Rotate.
     * 
     * Rotate the bots to the liquidity pools.
     * 
     * @returns Promise<Array<RotationBotAssignmentsResult>>
     */
    private async rotateCache(): Promise<Array<RotationBotAssignmentsResult>> {
        // if cache is still valid, return
        const cachedResult = await this.cacheService.get({
            key: CacheKey.RotationBotAssignments,
            args: [],
        })
        if (cachedResult && this.dayjsService.now()
            .diff(cachedResult.snapshotAt.toDate(),
                "ms") 
        <= envConfig().cache.stale.rotationBotAssignmentsMaxAgeMs) {
            return cachedResult.results
        }
        const bots = this.botsLoaderService.botCollection
            .chain()
            .find()
            .data({
                removeMeta: true 
            })
      
        const MAX_POOLS_PER_BOT = 2
      
        // collect liquidity pools
        const liquidityPoolSet = new Set<string>()
        for (const bot of bots) {
            for (const pool of bot.liquidityPools ?? []) {
                liquidityPoolSet.add(String(pool))
            }
        }
      
        // build bot slots
        const botSlots: Array<string> = []
        for (const bot of bots) {
            for (let i = 0; i < MAX_POOLS_PER_BOT; i++) {
                botSlots.push(`${bot.id}#${i}`)
            }
        }
      
        const liquidityPoolIds = Array.from(liquidityPoolSet)
      
        const botSlotIndex = new Map<string, number>()
        const poolIndex = new Map<string, number>()
      
        botSlots.forEach((id, i) => botSlotIndex.set(id,
            i))
        liquidityPoolIds.forEach((id, i) => poolIndex.set(id,
            i))
      
        const edges: Array<Array<number>> = []
      
        // build edges
        for (const bot of bots) {
            for (let i = 0; i < MAX_POOLS_PER_BOT; i++) {
                const uSlot = `${bot.id}#${i}`
                const u = botSlotIndex.get(uSlot)!
      
                for (const pool of bot.liquidityPools ?? []) {
                    const v = poolIndex.get(String(pool))!
                    edges.push(
                        [
                            u,
                            v
                        ]
                    )
                }
            }
        }
        // call matching
        const { result } = this.bipartiteMatchingService.find({
            n: botSlots.length,
            m: liquidityPoolIds.length,
            edges,
        })
        // reset pools
        const botMap = new Map<string, BotSchema>()
        for (const bot of bots) {
            bot.liquidityPools = []
            botMap.set(
                bot.id,
                bot
            )
        }
        // apply matching
        for (const [
            u,
            v
        ] of result) {
            const slot = botSlots[u]          // "botId#i"
            const [botId] = slot.split("#")   // "botId"

            const liquidityPoolId = liquidityPoolIds[v]
            const bot = botMap.get(botId)

            if (bot) {
                bot.liquidityPools.push(new Types.ObjectId(liquidityPoolId))
            }
        }
        // update bot assignments
        const results = Array.from(botMap.values()).map((bot) => ({
            botId: bot.id,
            liquidityPoolIds: bot.liquidityPools.map((liquidityPool) => liquidityPool.toString()),
        }))
        await this.cacheService.set({
            key: CacheKey.RotationBotAssignments,
            args: [],
            cacheResult: {
                results,
                snapshotAt: this.dayjsService.now(),
            },
        })
        return results
    }
    
    /**
     * Rotate interval.
     * 
     * Rotate the bots to the liquidity pools at a regular interval.
     * 
     * @returns void
     */
    @Interval(envConfig().executor.interval.rotate)
    rotateInterval() {
        this.rotate()
    }

    async rotate() {
        const results = await this.rotateCache()
        const botAssignments = this.botsLoaderService.botCollection
            .chain()
            .find({
            })
            .data({
                removeMeta: true 
            })
            .map((bot) => {
                // update bot assignments
                bot.liquidityPools = results
                    .find((result) => result.botId === bot.id)
                    ?.liquidityPoolIds
                    .map((liquidityPoolId) => new Types.ObjectId(liquidityPoolId)) ?? []
                // return bot
                return bot
            }
            )
        // remove old bot assignments
        this.botAssignmentsCollection.clear()
        // insert new bot assignments
        this.botAssignmentsCollection.insert(botAssignments)
    }
}