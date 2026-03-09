/**
 * Module for monitoring CEX health.
 * Provides services for checking CEX price and volume health.
 */
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./cex-health-monitor.module-definition"
import {
    PriceCheckService,
} from "./price-check.service"
import {
    VolumeCheckService,
} from "./volume-check.service"

/**
 * Module for monitoring CEX health.
 * Provides services for checking CEX price and volume health.
 */
@Module(
    {
        providers: [
            PriceCheckService,
            VolumeCheckService,
        ],
    }
)
export class CexHealthMonitorModule extends ConfigurableModuleClass {}
