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
    Collection 
} from "lokijs"
import {
    BotSchema 
} from "@modules/databases"
import {
    LokiJSService 
} from "@modules/mixin"
@Injectable()
export class LiquidityPoolAssignmentsRotationService implements OnModuleInit {
    botAssignmentsCollection: Collection<BotSchema>
    constructor(
        private readonly botsLoaderService: BotsLoaderService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly lokiJSService: LokiJSService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(BotsLoaderService.name)
        this.readinessWatcherFactoryService.createWatcher(LiquidityPoolAssignmentsRotationService.name)
        this.botAssignmentsCollection = await this.lokiJSService.createCollection<BotSchema>(
            "executor-bot-assignments",
            {
                indices: ["id"],
            }
        )
        await this.rotate()
        this.readinessWatcherFactoryService.setReady(LiquidityPoolAssignmentsRotationService.name)
    }

    // rotate is a method to reallocate the liquidity pools to the bots
    async rotate() {
        // TECHNICAL DEBT: this is a temporary solution to get the bots from the database
        const bots = this.botsLoaderService.botCollection.chain().find().data({
            removeMeta: true
        })
        this.botAssignmentsCollection.clear()
        this.botAssignmentsCollection.insert(bots)
    }
    
    @Interval(envConfig().executor.interval.rotate)
    async rotateInterval() {
        await this.rotate()
    }
}