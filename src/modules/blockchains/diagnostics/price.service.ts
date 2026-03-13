import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    PriceService
} from "../math"
import type {
    TokenSchema
} from "@modules/databases"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    WinstonLog, WinstonService
} from "@modules/winston"
import {
    AsyncService, DayjsService
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException,
} from "@modules/exceptions"
import {
    Interval
} from "@nestjs/schedule"
import {
    envConfig
} from "@modules/env"
import type {
    PriceDiagnosticReadinessResult
} from "./types"

@Injectable()
export class PriceDiagnosticService
implements OnModuleInit, OnApplicationBootstrap {
    private tokenMap: Map<string, TokenSchema> = new Map()
    private results: Map<string, PriceDiagnosticReadinessResult> = new Map()

    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly priceService: PriceService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
    ) { }

    /**
     * On application bootstrap.
     */
    onApplicationBootstrap() {
        this.diagnoseInterval()
    }

    /**
     * Diagnose interval.
     */
    @Interval(envConfig().executor.diagnose.price.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        this.results = new Map(results.map((result) => [result.id,
            result]))
    }

    async onModuleInit() {
        const tokens = Array.from(
            this.primaryMemoryStorageService.tokenMap.values()).filter(
            (t) => t.selectable === true,
        )
        this.tokenMap = new Map(tokens.map((token) => [token.id,
            token
        ]))
    }

    /* ================= CORE ================= */

    private isReady(result?: PriceDiagnosticReadinessResult): boolean {
        if (!result?.snapshotAt) return false

        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        const ageMs = this.dayjsService
            .now()
            .diff(result.snapshotAt,
                "ms")
        const isReady = ageMs <= maxAgeMs
        return isReady
    }

    async diagnose(): Promise<Array<PriceDiagnosticReadinessResult>> {
        const tokens = Array.from(this.tokenMap.values())
        const promises: Array<
            Promise<PriceDiagnosticReadinessResult>
        > = tokens.map(async (token) => {
            try {
                const { isStale, ageMs, price } =
                    await this.priceService.resolvePrice({
                        token
                    })

                if (isStale) {
                    this.winstonService.log(
                        WinstonLog.PriceDiagnosticFailedStale,
                        {
                            tokenId: token.displayId,
                            ageMs,
                            price: price.toNumber(),
                        },
                    )
                }

                return {
                    id: token.id,
                    snapshotAt: this.dayjsService.now(),
                    price: price.toNumber(),
                }
            } catch (error) {
                if (
                    error instanceof
                    AggregatedTokenPriceNotFoundException
                ) {
                    this.winstonService.log(
                        WinstonLog.PriceDiagnosticFailedNotFound,
                        {
                            tokenId: token.displayId,
                        },
                    )
                    return {
                        id: token.id
                    }
                }

                this.winstonService.log(
                    WinstonLog.PriceDiagnosticFailed,
                    {
                        tokenId: token.displayId,
                        error: error.message,
                    },
                )
                return {
                    id: token.id
                }
            }
        })

        return await this.asyncService.allMustDone(promises)
    }

    /* ================= PUBLIC ================= */

    async ready(id: string): Promise<boolean> {
        const result = this.results.get(id)
        if (!result) return false
        return this.isReady(result)
    }
}
