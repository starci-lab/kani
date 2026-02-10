import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from "@nestjs/common"
import {
    PriceService 
} from "@modules/blockchains"
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
    AsyncService, LokiJSService, DayjsService 
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
import {
    Collection 
} from "lokijs"
import type {
    PriceDiagnosticReadinessResult 
} from "../types"
  
  @Injectable()
export class PriceDiagnosticService
implements OnModuleInit, OnApplicationBootstrap
{
    private tokenCollection: Collection<TokenSchema>
    private results: Collection<PriceDiagnosticReadinessResult>
  
    constructor(
      private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
      private readonly priceService: PriceService,
      private readonly winstonService: WinstonService,
      private readonly asyncService: AsyncService,
      private readonly lokiJSService: LokiJSService,
      private readonly dayjsService: DayjsService,
    ) {}
  
    onApplicationBootstrap() {
        this.diagnoseInterval()
    }
  
    @Interval(envConfig().executor.diagnose.price.interval)
    async diagnoseInterval() {
        const results = await this.diagnose()
        this.results.clear()
        this.results.insert(results)
    }
  
    async onModuleInit() {
        this.tokenCollection =
        await this.lokiJSService.createCollection<TokenSchema>({
            name: "price-diagnostic-tokens",
            options: {
                indices: ["displayId",
                    "id"],
            },
        })
  
        const tokens =
        this.primaryMemoryStorageService.tokenCollection
            .chain()
            .find({
                selectable: {
                    $eq: true 
                },
            })
            .data({
                removeMeta: true 
            })
  
        this.tokenCollection.insert(tokens)
  
        this.results =
        await this.lokiJSService.createCollection<PriceDiagnosticReadinessResult>({
            name: "price-diagnostic-results",
            options: {
                indices: ["id"],
            },
        })
    }
  
    /* ================= CORE ================= */
  
    private isReady(result?: PriceDiagnosticReadinessResult): boolean {
        if (!result?.snapshotAt) return false
  
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        const ageMs = this.dayjsService
            .now()
            .diff(result.snapshotAt,
                "ms")
  
        return ageMs <= maxAgeMs
    }
  
    async diagnose(): Promise<Array<PriceDiagnosticReadinessResult>> {
        const tokens = this.tokenCollection.find()
  
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
        const result = this.results.findOne({
            id: {
                $eq: id 
            },
        })
        if (!result) return false
        return this.isReady(result)
    }
}
  