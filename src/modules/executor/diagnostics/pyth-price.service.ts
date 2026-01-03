import { Injectable, OnModuleInit } from "@nestjs/common"
import { GetPriceResponse, PythPriceService, PythUtilsService, BalanceEligibilityService } from "@modules/blockchains"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { AsyncService, DayjsService, ReadinessWatcherFactoryService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { sleep } from "@utils"
import { envConfig } from "@modules/env"

export interface DiagnosePythPriceParams {
  pythId: string
}

/**
 * PythPriceDiagnosticService
 *
 * Acts as a startup availability gate for Pyth price feeds.
 *
 * This service runs during application bootstrap and verifies that:
 *  - Pyth feeds are reachable
 *  - Associated token prices can be fetched (existence check)
 *
 * Price freshness is observed and logged but does NOT currently
 * affect the diagnostic outcome.
 *
 * If any feed fails to return price data after the configured retries,
 * the application will terminate immediately to avoid running without
 * required oracle inputs.
 */
@Injectable()
export class PythPriceDiagnosticService implements OnModuleInit {
    private pythIds: Array<string> = []

    constructor(
    private readonly pythUtilsService: PythUtilsService,
    private readonly pythPriceService: PythPriceService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly asyncService: AsyncService,
    private readonly dayjsService: DayjsService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    private readonly balanceEligibilityService: BalanceEligibilityService,
    ) {}

    /**
   * Application bootstrap hook.
   *
   * Performs an availability check for all configured Pyth feeds
   * before marking the service as READY.
   *
   * Readiness is only set once all feeds are confirmed to be reachable
   * and able to return price data.
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
   * Retries the availability check for a single Pyth feed.
   *
   * The check is retried up to `maxRetries` times with a fixed delay
   * between attempts to tolerate transient startup issues
   * (RPC warm-up, cache population, temporary network errors).
   *
   * If the feed remains unavailable after all retries,
   * the process is terminated (fail-fast).
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

        // The application must not run without required oracle data.
        process.exit(1)
    }

    /**
   * Diagnoses a single Pyth feed by checking the availability
   * of all associated token prices.
   *
   * A feed is considered UNAVAILABLE if:
   *  - Any token price cannot be fetched (null / undefined)
   *
   * Price freshness is logged for observability but does not
   * currently influence the diagnostic result.
   */
    async diagnose({ pythId }: DiagnosePythPriceParams): Promise<boolean> {
        const tokens = this.primaryMemoryStorageService.tokens.filter(
            token => token.pythFeedId === pythId,
        )

        const promises: Array<Promise<GetPriceResponse>> = tokens.map(token =>
            this.pythPriceService.getPrice({ tokenId: token.displayId }),
        )

        const responses = await this.asyncService.allIgnoreError(promises)

        const hasInvalidResponse = responses.some(response => {
            // Missing price data is considered a hard availability failure
            if (!response) {
                return true
            }

            // Price staleness is observed but not enforced
            if (this.balanceEligibilityService.isStalePrice(response)) {
                this.logger.warn(WinstonLog.PythPriceDiagnosticWarning, {
                    tokenIds: tokens.map(token => token.displayId),
                    ageMs: this.dayjsService.now().diff(response.snapshotAt, "millisecond"),
                })
            }

            return false
        })

        return !hasInvalidResponse
    }
}
