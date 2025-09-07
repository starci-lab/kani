import { Injectable, OnModuleInit } from "@nestjs/common"
import { DexSeeder, LiquidityPoolSeeder, TokenSeeder } from "./data"

@Injectable()
export class SeedersService implements OnModuleInit {
    constructor(
        private readonly tokenSeeder: TokenSeeder,
        private readonly dexSeeder: DexSeeder,
        private readonly lpPoolSeeder: LiquidityPoolSeeder,
    ) {}

    async onModuleInit() {
        await Promise.all([
            (async () => {
                await this.tokenSeeder.drop()
                await this.tokenSeeder.seed()

                await this.dexSeeder.drop()
                await this.dexSeeder.seed()

                await this.lpPoolSeeder.drop()
                await this.lpPoolSeeder.seed()
            })(),
        ])
    }
}


