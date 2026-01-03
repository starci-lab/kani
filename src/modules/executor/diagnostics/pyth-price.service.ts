import { Injectable, OnModuleInit } from "@nestjs/common"
import { GetPriceResponse, PythPriceService, PythUtilsService } from "@modules/blockchains"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { AsyncService, DayjsService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { sleep } from "@utils"
import { envConfig } from "@modules/env"

export interface DiagnosePythPriceParams {
  pythId: string;
}
/**
 * Service responsible for diagnosing Pyth price feeds.
 * The application will terminate if any feed is unhealthy after retries.
 */
/**
 * PythPriceDiagnosticService
 *
 * Acts as a startup safety gate for all Pyth price feeds.
 *
 * This service runs during application bootstrap and verifies that:
 *  - All configured Pyth feeds are reachable
 *  - All associated token prices are present
 *  - All prices are fresh (not older than the configured max age)
 *
 * If any feed remains unhealthy after the configured number of retries,
 * the application will terminate immediately to prevent running
 * with invalid or stale price data.
 */
@Injectable()
export class PythPriceDiagnosticService implements OnModuleInit {
    private pythIds: string[] = []

    constructor(
    private readonly pythUtilsService: PythUtilsService,
    private readonly pythPriceService: PythPriceService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly asyncService: AsyncService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    private readonly dayjsService: DayjsService,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
   * Application bootstrap hook.
   *
   * Performs a full diagnostic check for every configured Pyth feed
   * before the service is marked as READY.
   *
   * Readiness will only be set once all feeds have passed diagnostics.
   */
    async onModuleInit(): Promise<void> {
        this.readinessWatcherFactoryService.createWatcher(
            PythPriceDiagnosticService.name,
        )

        this.pythIds = this.pythUtilsService.getPythIds()

        await this.asyncService.allMustDone(
            this.pythIds.map(pythId => this.retryDiagnose(pythId)),
        )

        this.logger.info(WinstonLog.PythPriceDiagnosticSuccess, {
            pythIds: this.pythIds.length,
        })

        this.readinessWatcherFactoryService.setReady(
            PythPriceDiagnosticService.name,
        )
    }

    /**
   * Retries the diagnostic check for a single Pyth feed.
   *
   * The check is retried up to `maxRetries` times with a fixed delay
   * between attempts. This allows transient issues (network warm-up,
   * cache population, RPC delays) to recover.
   *
   * If the feed is still unhealthy after all retries, the process
   * is terminated immediately (fail-fast).
   */
    private async retryDiagnose(pythId: string): Promise<boolean> {
        const { maxRetries, delayMs } = envConfig().diagnostics.pythPrice

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const healthy = await this.diagnose({ pythId })

            if (healthy) {
                return true
            }

            this.logger.warn(WinstonLog.PythPriceDiagnosticWarning, {
                pythId,
                attempt,
                maxRetries,
            })

            if (attempt < maxRetries - 1) {
                await sleep(delayMs)
            }
        }

        // The application must not run with broken or stale oracle data.
        process.exit(1)
    }

    /**
   * Diagnoses a single Pyth feed by validating all associated token prices.
   *
   * A feed is considered UNHEALTHY if:
   *  - Any token price is missing (null / undefined)
   *  - Any price snapshot is older than the configured max age
   *
   * The feed is only considered healthy if ALL token prices pass validation.
   */
    async diagnose({ pythId }: DiagnosePythPriceParams): Promise<boolean> {
        const tokens = this.primaryMemoryStorageService.tokens.filter(
            token => token.pythFeedId === pythId,
        )

        const promises: Array<Promise<GetPriceResponse>> = tokens.map(token =>
            this.pythPriceService.getPrice({ tokenId: token.displayId }),
        )

        const responses = await this.asyncService.allIgnoreError(promises)

        const now = this.dayjsService.now()
        const maxAgeMs = envConfig().diagnostics.pythPrice.maxAgeMs

        const hasInvalidResponse = responses.some(response => {
            // Missing price data is considered a hard failure
            if (!response) {
                return true
            }

            // Price snapshot must be recent enough to be considered valid
            const ageMs = now.diff(response.snapshotAt, "millisecond")

            if (ageMs > maxAgeMs) {
                this.logger.warn(WinstonLog.PythPriceTooOld, {
                    tokenIds: tokens.map(token => token.displayId),
                    ageMs,
                })
            }

            return false
        })

        return !hasInvalidResponse
    }
}
