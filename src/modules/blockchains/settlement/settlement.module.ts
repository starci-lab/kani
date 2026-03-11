import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./settlement.module-definition"
import {
    OutOfRangeSettlementService,
} from "./out-of-range-settlement.service"
import {
    ViolateIndicatorsTriggeredSettlementService,
} from "./violate-indicators-triggered-settlement.service"
import {
    SettlementService,
} from "./settlement.service"

@Module({
    providers: [
        SettlementService,
        OutOfRangeSettlementService,
        ViolateIndicatorsTriggeredSettlementService,
    ],
    exports: [
        SettlementService,
    ],
})
export class SettlementModule extends ConfigurableModuleClass {}
