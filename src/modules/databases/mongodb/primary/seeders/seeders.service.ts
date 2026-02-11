import {
    TokensService 
} from "./tokens.service"
import {
    DexesService 
} from "./dexes.service"
import {
    LiquidityPoolsService 
} from "./liquidity-pools.service"
import {
    Inject, Injectable, OnModuleInit 
} from "@nestjs/common"
import {
    ReadinessWatcherFactoryService,
} from "@modules/mixin"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./seeders.module-definition"
import {
    ConfigService 
} from "./config.service"
import {
    InjectPrimaryMongoose 
} from "../mongodb.decorators"
import {
    Connection 
} from "mongoose"

/**
 * The service for the Seeders.
 */
@Injectable()
export class SeedersService implements OnModuleInit {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly tokenService: TokensService,
        private readonly dexService: DexesService,
        private readonly liquidityPoolService: LiquidityPoolsService,
        private readonly configService: ConfigService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) { }

    /**
     * Process the seeding and dropping.
     * @returns void.
     */
    private async process() {
        this.readinessWatcherFactoryService.createWatcher(SeedersService.name)
        const session = await this.connection.startSession()
        // drop and seed in a transaction
        await session.withTransaction(
            async (session) => {
                // drop and seed in order
                await this.tokenService.drop(session)
                await this.tokenService.seed(session)
                // drop and seed in order
                await this.dexService.drop(session)
                await this.dexService.seed(session)
                // drop and seed in order
                await this.liquidityPoolService.drop(session)
                await this.liquidityPoolService.seed(session)
                // drop and seed in order
                await this.configService.drop(session)
                await this.configService.seed(session)
            }
        )
        this.readinessWatcherFactoryService.setReady(SeedersService.name)
    }

    /**
     * On module init.
     * @returns void.
     */
    async onModuleInit() {
        // if manual seed, do not seed
        if (this.options.manualSeed) {
            return
        }
        await this.process()
    }

    /**
     * Seed the data.
     * @returns void.
     */
    async seed() {
        await this.process()
    }
}