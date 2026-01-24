import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    DynamicLiquidityPoolInfoDiagnosticService 
} from "./dynamic-liquidity-pool-info.service"
import {
    PriceDiagnosticService 
} from "./price.service"
import {
    AsyncService, ReadinessWatcherFactoryService, DayjsService
} from "@modules/mixin"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"

@Injectable()
export class DiagnosticsService implements OnApplicationBootstrap {
    public ready = false
    constructor(
        private readonly dynamicLiquidityPoolInfoDiagnosticService: DynamicLiquidityPoolInfoDiagnosticService,
        private readonly priceDiagnosticService: PriceDiagnosticService,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
    ) {}

    async onApplicationBootstrap() {
        await this.diagnose()
    }

    async diagnose(): Promise<void> {
        this.readinessWatcherFactoryService.createWatcher(DiagnosticsService.name)
        const bootstrapTime = this.dayjsService.now()
        await this.asyncService.allMustDone(
            [
                this.dynamicLiquidityPoolInfoDiagnosticService.diagnose(),
                this.priceDiagnosticService.diagnose(),
            ]
        )
        this.ready = true
        this.winstonService.log(
            WinstonLog.DiagnosticsReady,
            {
                bootstrapTimeMs: this.dayjsService.now().diff(bootstrapTime,
                    "millisecond"
                ),
            }
        )
        this.readinessWatcherFactoryService.setReady(DiagnosticsService.name)
    }
}