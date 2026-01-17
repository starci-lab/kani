import { BotsLoaderService } from "../../loaders"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { LiquidityPoolId } from "@modules/databases"
import { PrimaryMemoryStorageService } from "@modules/databases"

@Injectable()
export class LiquidityPoolAssignmentsRotationService implements OnModuleInit {
    private readonly liquidityPoolAssignments: Map<string, Array<LiquidityPoolId>> = new Map()
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(BotsLoaderService.name)
        this.readinessWatcherFactoryService.createWatcher(LiquidityPoolAssignmentsRotationService.name)
        this.readinessWatcherFactoryService.setReady(LiquidityPoolAssignmentsRotationService.name)
    }

    // rotate is a method to reallocate the liquidity pools to the bots
    rotate() {
        const bots = Array.from(this.botsLoaderService.bots.values())
        const map = new Map<LiquidityPoolId, number>()
        const liquidityPools = this.primaryMemoryStorageService.liquidityPools
        for (const bot of bots) {
            // retrieve the liquidity pool ids from the bot
            const liquidityPoolIds = bot.liquidityPools
                .map((liquidityPool) => liquidityPools
                    .find((_liquidityPool) => _liquidityPool.id === liquidityPool.toString())?.displayId)
                .filter((liquidityPoolId) => liquidityPoolId !== undefined)
        }
    }
}