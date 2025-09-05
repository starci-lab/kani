import { Injectable, OnModuleInit } from "@nestjs/common"
import { TokenSeeder } from "./data"

@Injectable()
export class SeedersService implements OnModuleInit {
    constructor(private readonly tokenSeeder: TokenSeeder) {}
    async onModuleInit() {
        await Promise.all([
            (async () => {
                await this.tokenSeeder.seed()
            })(),
        ])
    }
}
