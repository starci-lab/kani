import { TokensService } from "./tokens.service"
import { DexesService } from "./dexes.service"
import { LiquidityPoolsService } from "./liquidity-pools.service"
import { Inject, Injectable, OnModuleInit } from "@nestjs/common"
import { AsyncService, RetryService } from "@modules/mixin"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./seeders.module-definition"
import { ConfigService } from "./config.service"

@Injectable()
export class SeedersService implements OnModuleInit {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,   
        private readonly tokenService: TokensService,
        private readonly dexService: DexesService,
        private readonly liquidityPoolService: LiquidityPoolsService,
        private readonly configService: ConfigService,
        private readonly retryService: RetryService,
        private readonly asyncService: AsyncService
    ) { }

    private async process() {
        await this.asyncService.allMustDone([
            (
                async () => {
                    await this.retryService.retry({
                        action: async () => {
                            await this.tokenService.drop()
                            await this.tokenService.seed()
                        },
                    })
                })(),
            (
                async () => {
                    await this.retryService.retry({
                        action: async () => {
                            await this.dexService.drop()
                            await this.dexService.seed()
                        },
                    })
                })(),
            (
                async () => {
                    await this.retryService.retry({
                        action: async () => {
                            await this.liquidityPoolService.drop()
                            await this.liquidityPoolService.seed()
                        },
                    })
                })(),
            (
                async () => {
                    await this.retryService.retry({
                        action: async () => {
                            await this.configService.drop()
                            await this.configService.seed()
                        },
                    })
                })(),
        ])
    }

    async onModuleInit() {
        // if manual seed, do not seed
        if (this.options.manualSeed) {
            return
        }
        await this.process()
    }

    async seed() {
        await this.process()
    }
}