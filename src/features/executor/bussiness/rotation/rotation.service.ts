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
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    BipartiteMatchingService 
} from "@modules/graph"
import {
    Types, Connection 
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
        // if cache is still valid, return
        const cachedResult = await this.cacheService.get({
            key: CacheKey.RotationBotAssignments,
            args: [],
        })
        const disableCache = false
        if (
            !disableCache &&
            cachedResult &&
            cachedResult.results.length > 0 &&
            this.dayjsService
                .now()
                .diff(cachedResult.snapshotAt.toDate(),
                    "ms") 
                <= envConfig().cache.stale.rotationBotAssignmentsMaxAgeMs
        ) {
            this.botAssignments = new Map(
                cachedResult.results.map(result => [
                    result.botId,
                    {
                        liquidityPoolIds: result.liquidityPoolIds 
                    },
                ])
            )
            return
        }

        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                executor: envConfig().executor.id 
            }
            )
        // collect liquidity pools
        const liquidityPoolSet = new Set<string>()
        for (const bot of bots) {
            for (const liquidityPool of bot.liquidityPools ?? []) {
                liquidityPoolSet.add(String(liquidityPool))
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

        const edges: Array<[number, number]> = []

        // build edges
        for (const bot of bots) {
            for (let i = 0; i < MAX_POOLS_PER_BOT; i++) {
                const uSlot = `${bot.id}#${i}`
                const u = botSlotIndex.get(uSlot)
                if (u === undefined) continue

                for (const pool of bot.liquidityPools ?? []) {
                    const v = poolIndex.get(String(pool))
                    if (v === undefined) continue //
                    edges.push([u,
                        v])
                }
            }
        }

        // reset pools
        const botMap = new Map<string, BotSchema>()
        for (const bot of bots) {
            bot.liquidityPools = []
            botMap.set(bot.id,
                bot)
        }
        
        // find matching
        const { result } = this.bipartiteMatchingService.find({
            n: botSlots.length,
            m: liquidityPoolIds.length,
            edges,
        })

        // apply matching
        for (const [
            u,
            v
        ] of result) {
            const slot = botSlots[u]
            if (!slot) continue

            const [botId] = slot.split("#")
            const liquidityPoolId = liquidityPoolIds[v]
            if (!liquidityPoolId) continue

            const bot = botMap.get(botId)
            if (!bot) continue

            bot.liquidityPools.push(new Types.ObjectId(liquidityPoolId))
        }

        // build results
        const results: Array<RotationBotAssignment> = Array.from(botMap.values()).map(
            (bot) => ({
                botId: bot.id,
                liquidityPoolIds: bot.liquidityPools.map((p) => p.toString()),
            })
        )

        // cache
        await this.cacheService.set({
            key: CacheKey.RotationBotAssignments,
            args: [],
            cacheResult: {
                results,
                snapshotAt: this.dayjsService.now(),
            },
        })

        // build in-memory map
        this.botAssignments = new Map(
            results.map((result) => [
                result.botId,
                {
                    liquidityPoolIds: result.liquidityPoolIds 
                },
            ])
        )
    }

    async rotate() {
        await this.processRotation()
        this.winstonService.log(
            WinstonLog.RotationBotAssignments, 
            {
                results: Object.fromEntries(this.botAssignments.entries()),
            }
        )
    }

    @Interval(envConfig().executor.interval.rotate)
    async rotateInterval() {
        await this.rotate()
    }
}