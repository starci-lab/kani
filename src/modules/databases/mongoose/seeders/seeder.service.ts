import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { TokenSeeder, LiquidityPoolSeeder, DexSeeder } from "./data"

@Injectable()
export class SeedersService implements OnModuleInit {
    private readonly logger = new Logger(SeedersService.name)
    constructor(
        private readonly tokenSeeder: TokenSeeder,
        private readonly dexSeeder: DexSeeder,
        private readonly liquidityPoolSeeder: LiquidityPoolSeeder,
    ) { }

    async onModuleInit() {
        await Promise.all([
            (async () => {
                // re-seed tokens
                await this.tokenSeeder.drop()
                await this.tokenSeeder.seed()
                this.logger.debug("Seeded tokens...")
                // re-seed dexes
                await this.dexSeeder.drop()
                await this.dexSeeder.seed()
                this.logger.debug("Seeded dexes...")
                // re-seed lp pools
                await this.liquidityPoolSeeder.drop()
                await this.liquidityPoolSeeder.seed()
                this.logger.debug("Seeded lp pools...")
            })(),
        ])
    }
}
