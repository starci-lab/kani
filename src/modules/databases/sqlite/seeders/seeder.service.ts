import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { DexSeeder, LiquidityPoolSeeder, TokenSeeder } from "./data"

@Injectable()
export class SeedersService implements OnModuleInit {
    private readonly logger = new Logger(SeedersService.name)
    constructor(
        private readonly tokenSeeder: TokenSeeder,
        private readonly dexSeeder: DexSeeder,
        private readonly liquidityPoolSeeder: LiquidityPoolSeeder,
    ) {}

    async onModuleInit() {
        await Promise.all([
            (async () => {
                // drop
                this.logger.debug("Dropping existing data...")
                await this.liquidityPoolSeeder.drop()
                await this.tokenSeeder.drop()
                await this.dexSeeder.drop()
                this.logger.debug("Dropped existing data...")
                // seed
                this.logger.debug("Seeding data...")
                await this.tokenSeeder.seed()
                await this.dexSeeder.seed()
                await this.liquidityPoolSeeder.seed()
                this.logger.debug("Seeded data...")
            })(),
        ])
    }
}


