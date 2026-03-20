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
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    CacheKey,
    CacheService,
    RotationBotAssignment,
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

@Injectable()
export class RotationService implements OnModuleInit {
    public botAssignments: Map<string, Omit<RotationBotAssignment, "botId">> =
        new Map()

    constructor(
        private readonly cacheService: CacheService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly dayjsService: DayjsService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(
            BotsLoaderService.name,
        )
        this.readinessWatcherFactoryService.createWatcher(
            RotationService.name,
        )
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
                cachedResult.results.map((r) => [
                    r.botId,
                    {
                        liquidityPoolIds: r.liquidityPoolIds,
                    },
                ]),
            )
            return
        }

        // 2. Load bots from DB.
        const bots = await this.connection
            .model<BotSchema>(BotSchema.name)
            .find({
                executor: {
                    $eq: envConfig().executor.id,
                },
            })

        const rotationBots: Array<RotationBot> = bots.map((bot) => ({
            id: bot.id,
            liquidityPoolIds: bot.liquidityPools?.map((p) => p.toString()) ?? [],
            assignedLiquidityPoolIds: [],
        }))

        // 3. Count current pool usage.
        const poolUsage = new Map<string, number>()

        // 4. Assign 1 pool per bot, greedily pick least-used pool.
        // Optional: shuffle first để tránh bias cố định theo thứ tự DB.
        const shuffledBots = _.shuffle(rotationBots)

        for (const bot of shuffledBots) {
            if (bot.liquidityPoolIds.length === 0) {
                continue
            }

            const candidates = _.shuffle(bot.liquidityPoolIds)

            let selectedPoolId: string | null = null
            let minUsage = Number.MAX_SAFE_INTEGER

            for (const poolId of candidates) {
                const usage = poolUsage.get(poolId) ?? 0
                if (usage < minUsage) {
                    minUsage = usage
                    selectedPoolId = poolId
                }
            }

            if (!selectedPoolId) {
                continue
            }

            bot.assignedLiquidityPoolIds = [selectedPoolId]
            poolUsage.set(selectedPoolId,
                (poolUsage.get(selectedPoolId) ?? 0) + 1)
        }

        // 5. Build results.
        const results: Array<RotationBotAssignment> = rotationBots.map((bot) => ({
            botId: bot.id,
            liquidityPoolIds: bot.assignedLiquidityPoolIds,
        }))

        // 6. Cache result.
        await this.cacheService.set({
            key: CacheKey.RotationBotAssignments,
            args: [],
            cacheResult: {
                results,
                snapshotAt: this.dayjsService.now(),
            },
        })

        // 7. Build in-memory map.
        this.botAssignments = new Map(
            results.map((result) => [
                result.botId,
                {
                    liquidityPoolIds: result.liquidityPoolIds,
                },
            ]),
        )
    }

    /**
     * Rotate the bots to the liquidity pools.
     */
    async rotate() {
        await this.processRotation()

        const assignedPoolIds = Array.from(this.botAssignments.values()).flatMap(
            (botAssignment) => botAssignment.liquidityPoolIds,
        )

        const liquidityPools = assignedPoolIds
            .map((id) => this.primaryMemoryStorageService.liquidityPoolMap.get(id))
            .filter((p): p is NonNullable<typeof p> => p != null)

        const liquidityPoolIdMap = new Map<string, LiquidityPoolId>()
        for (const liquidityPool of liquidityPools) {
            liquidityPoolIdMap.set(
                liquidityPool.id,
                liquidityPool.displayId,
            )
        }

        const logResults = Object.fromEntries(
            Array.from(this.botAssignments.entries()).map(
                ([botId,
                    assignment]) => [
                    botId,
                    assignment.liquidityPoolIds.map(
                        (id) => liquidityPoolIdMap.get(id)!,
                    ),
                ],
            ),
        )

        this.winstonService.log(
            WinstonLog.RotationBotAssignments,
            {
                results: logResults,
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