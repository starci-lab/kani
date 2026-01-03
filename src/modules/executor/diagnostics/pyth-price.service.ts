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
@Injectable()
export class PythPriceDiagnosticService implements OnModuleInit {
    private pythIds: Array<string> = []

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
   * Called once the module has been initialized.
   * Performs a startup health check on all Pyth feeds.
   */
    async onModuleInit(): Promise<void> {
        this.readinessWatcherFactoryService.createWatcher(PythPriceDiagnosticService.name)
        this.pythIds = this.pythUtilsService.getPythIds()
        await this.asyncService.allMustDone(
            this.pythIds.map(pythId => this.retryDiagnose(pythId)),
        )
        this.logger.info(
            WinstonLog.PythPriceDiagnosticSuccess, {
                pythIds: this.pythIds.length,
            }
        )
        this.readinessWatcherFactoryService.setReady(PythPriceDiagnosticService.name)
    }
    /**
   * Retries the diagnosis of a Pyth feed multiple times.
   */
    private async retryDiagnose(
        pythId: string,
    ): Promise<boolean> {
        // get the max retries and delay from the environment configuration
        const maxRetries = envConfig().diagnostics.pythPrice.maxRetries
        const delayMs = envConfig().diagnostics.pythPrice.delayMs
        // retry the diagnosis of the Pyth feed multiple times
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const healthy = await this.diagnose({ pythId })
            if (healthy) {
                return true
            }
            this.logger.warn(
                WinstonLog.PythPriceDiagnosticWarning,
                {
                    pythId,
                    attempt,
                    maxRetries,
                },
            )
            if (attempt < maxRetries) {
                await sleep(delayMs)
            }
        }
        // if the feed is unhealthy after all retries, exit the application
        process.exit(1)
    }

    /**
   * Fetches prices for all tokens associated with a Pyth feed
   * and verifies that none of them are too old.
   */
    async diagnose({ pythId }: DiagnosePythPriceParams): Promise<boolean> {
        // get the tokens associated with the Pyth feed
        const tokens = this.primaryMemoryStorageService.tokens.filter(
            token => token.pythFeedId === pythId,
        )
        // get the prices for the tokens
        const promises: Array<Promise<GetPriceResponse>> = tokens.map(token =>
            this.pythPriceService.getPrice({ tokenId: token.displayId }),
        )
        // wait for all the prices to be fetched
        const responses = await this.asyncService.allIgnoreError(promises)
        // check if any of the prices are too old
        const now = this.dayjsService.now()
        const maxAgeMs = envConfig().diagnostics.pythPrice.maxAgeMs
        // check if any of the prices are too old
        const hasInvalidResponse = responses.some(response => {
            // case 1: null / undefined
            if (!response) {
                return true
            }
            // case 2: snapshot is too old
            const ageMs = now.diff(response.snapshotAt, "millisecond")
            if (ageMs > maxAgeMs) {
                this.logger.warn(
                    WinstonLog.PythPriceTooOld,
                    {
                        tokenIds: tokens.map(token => token.displayId),
                        ageMs
                    },
                )
            }
            return false
        })
        // return true if no invalid responses
        return !hasInvalidResponse
    }
}
