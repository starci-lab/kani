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
    AsyncService, ReadinessWatcherFactoryService
} from "@modules/mixin"

@Injectable()
export class DiagnosticsService implements OnApplicationBootstrap {
    constructor(
        private readonly dynamicLiquidityPoolInfoDiagnosticService: DynamicLiquidityPoolInfoDiagnosticService,
        private readonly priceDiagnosticService: PriceDiagnosticService,
        private readonly asyncService: AsyncService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onApplicationBootstrap() {
        await this.diagnose()
    }

    async diagnose(): Promise<void> {
        this.readinessWatcherFactoryService.createWatcher(DiagnosticsService.name)
        await this.asyncService.allMustDone(
            [
                this.dynamicLiquidityPoolInfoDiagnosticService.diagnose(),
                this.priceDiagnosticService.diagnose(),
            ]
        )
        this.readinessWatcherFactoryService.setReady(DiagnosticsService.name)
    }
}