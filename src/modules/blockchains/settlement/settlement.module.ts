import {
    SettlementService 
} from "./settlement.service"
import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./keypairs.module-definition"
import {
    OutOfRangeSettlementService 
} from "./out-of-range-settlement.service"    

@Module({
    providers: [SettlementService,
        OutOfRangeSettlementService],
    exports: [SettlementService],
})
export class SettlementModule extends ConfigurableModuleClass {}
